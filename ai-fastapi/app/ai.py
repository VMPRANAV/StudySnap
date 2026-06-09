from __future__ import annotations

import json
import asyncio
import gc
import httpx
import re
from bson import ObjectId
from pydantic import BaseModel, Field
from typing import List, Dict, Any

from crewai import Agent, Task, Crew, Process
from langchain_groq import ChatGroq

from .config import SETTINGS
from .mongo import delete_chunks, get_chunks_for_file, insert_chunks, vector_search
from .pdf_utils import extract_text_from_pdf_bytes

# =====================================================================
# 1. STRUCTURAL OUTPUT CONTRACT SCHEMAS (Enforced by LangChain)
# =====================================================================

class QuizQuestionSchema(BaseModel):
    questionText: str = Field(..., description="The multiple choice question text")
    options: List[str] = Field(..., description="Exactly 4 option entries containing distractors and one correct option")
    correctAnswerIndex: int = Field(..., description="Integer index from 0 to 3 pointing to the true option placement")

class QuizOutputPayload(BaseModel):
    quiz: List[QuizQuestionSchema] = Field(..., description="Collection array of generated multiple choice questions")

class FlashcardSchema(BaseModel):
    question: str = Field(..., description="The question, term, or prompt on the front of the flashcard")
    answer: str = Field(..., description="The definitive answer key explanation on the back of the flashcard")

class FlashcardOutputPayload(BaseModel):
    flashcards: List[FlashcardSchema] = Field(..., description="Collection array of generated flashcards")

class QaSchema(BaseModel):
    question: str = Field(..., description="The descriptive test exam question text")
    answer: str = Field(..., description="A comprehensive, deeply detailed analytical answer key matching the point weight scale")
    marks: int = Field(..., description="The total structural mark weight assigned to this question segment")

class QaOutputPayload(BaseModel):
    questions: List[QaSchema] = Field(..., description="Collection array of generated descriptive Q&A pairs")

# =====================================================================
# 2. OPTIMIZED SEQUENTIAL INGESTION PIPELINE (SOLVES 429 RATE LIMITS)
# =====================================================================

async def index_pdf(
    client: httpx.AsyncClient,
    *,
    pdf_bytes: bytes,
    user_id: ObjectId,
    file_id: str,
) -> int:
    """
    Processes document chunks sequentially using a strict serial for-loop.
    Guarantees your backend application stays under Gemini's 15 RPM Free Tier cap.
    """
    text = extract_text_from_pdf_bytes(pdf_bytes)
    if not text:
        print(f"[AI][index_pdf] file_id={file_id} user_id={user_id} extracted_text_chars=0")
        return 0

    from .text_utils import chunk_text
    chunks = chunk_text(text, chunk_size=1000, chunk_overlap=200)
    total_chunks = len(chunks)
    print(f"[AI][index_pdf] file_id={file_id} user_id={user_id} chunk_count={total_chunks}")
    
    # Clear out any stale historical vector entries for this file before processing
    await delete_chunks(user_id, file_id)

    from .providers.gemini_embeddings import embed_text
    vectors = []
    
    # Process sequentially one by one to completely avoid asyncio.gather burst noise
    for idx, chunk in enumerate(chunks):
        print(f"[AI][index_pdf] Encoding text chunk block {idx + 1}/{total_chunks}...")
        
        # Enforce a 4.5-second time guard delay between consecutive API requests
        if idx > 0:
            await asyncio.sleep(4.5)
            
        try:
            vec = await embed_text(client, chunk)
            vectors.append(vec)
        except Exception as api_err:
            print(f"[AI][index_pdf] 429 rate limit hit at block index {idx}. Sleeping 10s for cool-down...")
            # Apply an immediate 10-second cool-down window and retry on burst exceptions
            await asyncio.sleep(10)
            try:
                vec = await embed_text(client, chunk)
                vectors.append(vec)
            except Exception as retry_err:
                print(f"[AI][index_pdf] Hard fallback failure at chunk {idx}: {str(retry_err)}")
                raise retry_err

    docs = [
        {
            "fileId": str(file_id),
            "userId": str(user_id),
            "text": chunk,
            "embedding": vec,
        }
        for chunk, vec in zip(chunks, vectors)
    ]

    await insert_chunks(docs)
    return len(docs)

# =====================================================================
# 3. UNIFIED CREWAI + LANGCHAIN SYSTEM ORCHESTRATOR
# =====================================================================

class StudySnapAgentOrchestrator:
    """
    Coordinates state tracking and task execution cascades across distinct agents.
    Engineered to operate cleanly within 512MB RAM infrastructure caps.
    """
    def __init__(self, client: httpx.AsyncClient, user_id: ObjectId, file_id: str, prompt: str):
        self.client = client
        self.user_id = user_id
        self.file_id = file_id
        self.prompt = prompt
        
        # Explicit 'groq/' provider tracking string prefix for correct LiteLLM routing
        self.llm = ChatGroq(
            api_key=SETTINGS.groq_api_key,
            model_name="groq/llama-3.3-70b-versatile",
            temperature=0.2
        )

    async def _get_dense_rag_context(self) -> str:
        from .providers.gemini_embeddings import embed_text
        
        # Calculate prompt embedding vector array matching database expectations
        query_vec = await embed_text(self.client, self.prompt)
        
        raw_results = await vector_search(
            index_name=SETTINGS.vector_index_name,
            query_vector=query_vec,
            file_id=self.file_id,
            user_id=self.user_id,
            num_candidates=100,
            limit=5
        )
        context_str = "\n\n".join([r.get("text", "") for r in raw_results if r.get("text")])
        
        if not context_str.strip():
            fallback_results = await get_chunks_for_file(file_id=self.file_id, user_id=self.user_id, limit=5)
            context_str = "\n\n".join([r.get("text", "") for r in fallback_results if r.get("text")])
            
        return context_str if context_str.strip() else "No matching baseline vector references found."

    def _compile_agentic_crew(self, task_description: str, task_expected_output: str, schema_contract: Any) -> Crew:
        # Agent A: The Noise Filter specialist
        context_compressor = Agent(
            role="Senior Context Optimization Specialist",
            goal="Filter raw formatting elements, noise, headers, and pull clean high-density factual blocks.",
            backstory="An automated context extraction engine designed to optimize strings into dense factual lists.",
            verbose=True,
            allow_delegation=False,
            llm=self.llm
        )

        # Agent B: The Structural Content Creator
        content_generator = Agent(
            role="Principal Curriculum Architect",
            goal="Compile top-tier academic materials that conform exactly to specified target payload schemas.",
            backstory="An expert academic planner built to deliver structured study items and item collections.",
            verbose=True,
            allow_delegation=False,
            llm=self.llm
        )

        task_compression = Task(
            description=f"Analyze raw context blocks and pull facts targeting objective: '{self.prompt}'\nRaw Background Input:\n{{raw_context_placeholder}}",
            expected_output="A list of pure high-yield factual reference markers.",
            agent=context_compressor
        )

        task_generation = Task(
            description=task_description,
            expected_output=task_expected_output,
            agent=content_generator,
            output_json=schema_contract  # Integrated structured schema parameter engine
        )

        # Ensure verbose is a valid boolean for strict Pydantic v2 validation
        return Crew(
            agents=[context_compressor, content_generator],
            tasks=[task_compression, task_generation],
            process=Process.sequential,
            verbose=True
        )

    async def run_quiz_workflow(self, desired_count: int) -> List[Dict[str, Any]]:
        try:
            context = await self._get_dense_rag_context()
            description = f"Read compressed facts. Compile exactly {desired_count} MCQs for request: '{self.prompt}'."
            crew = self._compile_agentic_crew(description, "Perfect JSON payload array matching Quiz requirements.", QuizOutputPayload)
            
            # Offload blocking synchronous Crew execution cleanly to an async thread pool
            result = await asyncio.to_thread(crew.kickoff, inputs={"raw_context_placeholder": context})
            
            # Extract out the JSON dictionary from the modern CrewOutput model object
            if hasattr(result, 'json_dict') and result.json_dict:
                parsed = result.json_dict
            else:
                raw_str = result.raw if hasattr(result, 'raw') else str(result)
                parsed = json.loads(raw_str)
                
            return parsed.get("quiz", parsed)
        finally:
            gc.collect()

    async def run_flashcard_workflow(self) -> List[Dict[str, Any]]:
        try:
            context = await self._get_dense_rag_context()
            description = f"Analyze optimized facts. Build a set of highly comprehensive flashcards for theme: '{self.prompt}'."
            crew = self._compile_agentic_crew(description, "Perfect JSON payload array matching Flashcard requirements.", FlashcardOutputPayload)
            
            result = await asyncio.to_thread(crew.kickoff, inputs={"raw_context_placeholder": context})
            
            if hasattr(result, 'json_dict') and result.json_dict:
                parsed = result.json_dict
            else:
                raw_str = result.raw if hasattr(result, 'raw') else str(result)
                parsed = json.loads(raw_str)
                
            return parsed.get("flashcards", parsed)
        finally:
            gc.collect()

    async def run_qa_workflow(self, marks_distribution: dict) -> List[Dict[str, Any]]:
        try:
            context = await self._get_dense_rag_context()
            marks_lines = "\n".join([f"- {count} question(s) worth {marks} marks each" for marks, count in marks_distribution.items()])
            description = f"Assemble a formal exam paper covering: '{self.prompt}'. Target Plan:\\n{marks_lines}"
            
            crew = self._compile_agentic_crew(description, "Perfect JSON payload array matching Descriptive Q&A requirements.", QaOutputPayload)
            
            result = await asyncio.to_thread(crew.kickoff, inputs={"raw_context_placeholder": context})
            
            if hasattr(result, 'json_dict') and result.json_dict:
                parsed = result.json_dict
            else:
                raw_str = result.raw if hasattr(result, 'raw') else str(result)
                parsed = json.loads(raw_str)
                
            return parsed.get("questions", parsed)
        finally:
            gc.collect()

def _infer_count(prompt: str) -> int | None:
    p = prompt.lower()
    for pattern in (r"(\d+)\s*(?:questions|question|qns|qn|mcqs|mcq)\b", r"(\d+)\s*(?:quizzes|quiz)\b"):
        m = re.search(pattern, p)
        if m:
            try:
                n = int(m.group(1))
                if 1 <= n <= 50: return n
            except Exception: return None
    return None