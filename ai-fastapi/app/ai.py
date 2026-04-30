from __future__ import annotations

import json

import httpx
from bson import ObjectId

from .config import SETTINGS
from .mongo import delete_chunks, insert_chunks, vector_search
from .pdf_utils import extract_text_from_pdf_bytes
from .providers.gemini_embeddings import embed_text
from .providers.groq_chat import chat_completion
from .text_utils import chunk_text, clean_ai_json_text


def _parse_ai_json(text: str):
    cleaned = clean_ai_json_text(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to salvage the first JSON array in the text
        start = cleaned.find("[")
        end = cleaned.rfind("]")
        if start != -1 and end != -1 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise


def _infer_count(prompt: str) -> int | None:
    """
    Infer a desired item count from a natural-language prompt.

    We primarily support quiz-question counts (and optionally flashcards) expressed as:
      - "5 questions", "5 question", "5 MCQs"
      - sometimes users say "5 quizzes" but actually mean "5 quiz questions"
    """
    import re

    p = prompt.lower()
    for pattern in (
        r"(\d+)\s*(?:questions|question|qns|qn|mcqs|mcq)\b",
        r"(\d+)\s*(?:quizzes|quiz)\b",
    ):
        m = re.search(pattern, p)
        if m:
            try:
                n = int(m.group(1))
                if 1 <= n <= 50:
                    return n
            except Exception:
                return None
    return None


async def index_pdf(
    client: httpx.AsyncClient,
    *,
    pdf_bytes: bytes,
    user_id: ObjectId,
    file_id: str,
) -> int:
    text = extract_text_from_pdf_bytes(pdf_bytes)
    if not text:
        return 0

    chunks = chunk_text(text, chunk_size=1000, chunk_overlap=200)
    await delete_chunks(user_id, file_id)

    docs: list[dict] = []
    for c in chunks:
        vec = await embed_text(client, c)
        docs.append(
            {
                "fileId": file_id,
                "userId": user_id,
                "text": c,
                "embedding": vec,
            }
        )

    await insert_chunks(docs)
    return len(docs)


async def _retrieve_context(
    client: httpx.AsyncClient,
    *,
    user_id: ObjectId,
    file_id: str,
    query: str,
    num_candidates: int,
    limit: int,
) -> str:
    query_vec = await embed_text(client, query)
    results = await vector_search(
        index_name=SETTINGS.vector_index_name,
        query_vector=query_vec,
        file_id=file_id,
        user_id=user_id,
        num_candidates=num_candidates,
        limit=limit,
    )
    context = "\n\n".join(r.get("text", "") for r in results if r.get("text"))
    if not context or len(context.strip()) < 50:
        raise RuntimeError(
            "No relevant context found for this file. Re-upload/index the PDF, or use a more specific prompt."
        )
    return context


async def generate_flashcards(
    client: httpx.AsyncClient,
    *,
    user_id: ObjectId,
    file_id: str,
    prompt: str,
):
    context = await _retrieve_context(
        client, user_id=user_id, file_id=file_id, query=prompt, num_candidates=100, limit=5
    )

    ai_prompt = f"""Based on the following document context, generate flashcards.
Context:
{context}

User Request: {prompt}
Important:
- Use the document context to infer what the user means by generic phrases like "key topics" or "key definitions".
- Do NOT treat those phrases literally; pick the actual topics/definitions from the context.
Return ONLY a valid JSON array: [{{"question": "...", "answer": "..."}}]"""

    content = await chat_completion(client, prompt=ai_prompt, temperature=0.8)
    data = _parse_ai_json(content)

    if not isinstance(data, list):
        raise RuntimeError("Flashcards output must be a JSON array")
    return data


async def generate_quiz(
    client: httpx.AsyncClient,
    *,
    user_id: ObjectId,
    file_id: str,
    prompt: str,
):
    context = await _retrieve_context(
        client, user_id=user_id, file_id=file_id, query=prompt, num_candidates=100, limit=5
    )

    desired = _infer_count(prompt) or 5
    ai_prompt = f"""You are an expert educator. 
Context from Study Document:
{context}

Primary Instruction:
- Use the provided context to identify the actual "key topics" or subjects mentioned in the User Request. 
- Do NOT generate generic questions about the phrase "key topics"; instead, find the specific themes within the document and quiz the user on those.

User Request: {prompt}

Requirements:
- Generate exactly {desired} MCQ(s).
- Return ONLY a valid JSON array of objects with "questionText", "options" (4 strings), and "correctAnswerIndex" (0-3)."""

    content = await chat_completion(client, prompt=ai_prompt, temperature=0.8)
    data = _parse_ai_json(content)

    if not isinstance(data, list):
        raise RuntimeError("Quiz output must be a JSON array")
    for q in data:
        if not isinstance(q, dict):
            raise RuntimeError("Quiz items must be objects")
        options = q.get("options")
        if not q.get("questionText") or not isinstance(options, list) or len(options) != 4:
            raise RuntimeError("Invalid quiz structure")
        idx = q.get("correctAnswerIndex")
        if not isinstance(idx, int) or idx < 0 or idx > 3:
            raise RuntimeError("Invalid correctAnswerIndex")
    if len(data) > desired:
        return data[:desired]
    return data


async def generate_qa(
    client: httpx.AsyncClient,
    *,
    user_id: ObjectId,
    file_id: str,
    prompt: str,
    marks_distribution: dict,
):
    context = await _retrieve_context(
        client, user_id=user_id, file_id=file_id, query=prompt, num_candidates=150, limit=8
    )
    marks_lines = "\n".join(
        f"- {count} question(s) worth {marks} marks each" for marks, count in marks_distribution.items()
    )

    ai_prompt = f"""You are an exam paper generator.
Context from Study Document:
{context}

Primary Instruction:
- The user is asking for questions on: "{prompt}". 
- Identify the specific information in the context that matches this request. For example, if the user asks for "key topics," find the most important actual subjects in the document and generate questions about them.

Exam Requirements:
{marks_lines}

Formatting:
- Return ONLY a JSON array: [{{"question": "...", "answer": "...", "marks": number}}]
- Answers must be comprehensive and match the marks assigned."""

    content = await chat_completion(client, prompt=ai_prompt, temperature=0.7, max_tokens=4096)
    data = _parse_ai_json(content)

    if not isinstance(data, list):
        raise RuntimeError("Q&A output must be a JSON array")
    return data
