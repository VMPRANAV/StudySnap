from __future__ import annotations

import json
import asyncio  # Required for concurrent embedding generation
import httpx
from bson import ObjectId

from .config import SETTINGS
from .mongo import delete_chunks, get_chunks_for_file, insert_chunks, vector_search
from .pdf_utils import extract_text_from_pdf_bytes
from .providers.gemini_embeddings import embed_text
from .providers.groq_chat import chat_completion
from .text_utils import chunk_text, clean_ai_json_text


def _parse_ai_json(text: str):
    if text is None:
        raise RuntimeError("AI returned no content")

    cleaned = clean_ai_json_text(text)
    if not cleaned:
        raise RuntimeError("AI returned empty content")

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to salvage the first JSON array in the text
        start = cleaned.find("[")
        end = cleaned.rfind("]")
        if start != -1 and end != -1 and end > start:
            return json.loads(cleaned[start : end + 1])
        # Try to salvage the first JSON object in the text
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise


def _ensure_list_payload(data, *, preferred_keys: list[str], label: str):
    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        for key in preferred_keys:
            value = data.get(key)
            if isinstance(value, list):
                return value

        for value in data.values():
            if isinstance(value, list):
                return value

    raise RuntimeError(f"{label} output must be a JSON array")


def _validate_quiz_payload(data, *, desired: int):
    data = _ensure_list_payload(
        data,
        preferred_keys=["questions", "quiz", "items", "mcqs"],
        label="Quiz",
    )
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
        print(f"[AI][index_pdf] file_id={file_id} user_id={user_id} extracted_text_chars=0")
        return 0

    chunks = chunk_text(text, chunk_size=1000, chunk_overlap=200)
    print(
        f"[AI][index_pdf] file_id={file_id} user_id={user_id} "
        f"extracted_text_chars={len(text)} chunk_count={len(chunks)}"
    )
    await delete_chunks(user_id, file_id)

    # FIX: Fire off all embedding network requests concurrently via asyncio.gather
    # to stop sequential loop blocking and avoid Render 503 timeouts on indexing.
    tasks = [embed_text(client, c) for c in chunks]
    vectors = await asyncio.gather(*tasks)

    docs: list[dict] = [
        {
            "fileId": str(file_id),   # Force string matching type
            "userId": str(user_id),   # Convert ObjectId into clean string format
            "text": chunk,
            "embedding": vec,
        }
        for chunk, vec in zip(chunks, vectors)
    ]

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
    print(
        f"[AI][retrieve_context] file_id={file_id} user_id={user_id} "
        f"query={query!r} result_count={len(results)}"
    )
    if not results:
        fallback_results = await get_chunks_for_file(file_id=file_id, user_id=user_id, limit=limit)
        print(
            f"[AI][retrieve_context] vector_search_empty file_id={file_id} "
            f"user_id={user_id} fallback_result_count={len(fallback_results)}"
        )
        results = fallback_results

    context = "\n\n".join(r.get("text", "") for r in results if r.get("text"))
    if not context or len(context.strip()) < 50:
        preview = []
        for item in results[:3]:
          preview.append({
              "fileId": item.get("fileId"),
              "userId": item.get("userId"),
              "text_len": len(item.get("text", "")),
          })
        print(
            f"[AI][retrieve_context] insufficient_context file_id={file_id} "
            f"user_id={user_id} context_chars={len(context.strip())} preview={preview}"
        )
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
    print(f"[AI][generate_flashcards] raw_response_preview={content[:300]!r}")
    data = _parse_ai_json(content)
    data = _ensure_list_payload(data, preferred_keys=["flashcards", "cards", "items"], label="Flashcards")
        
    # FIX: Guard logic parsing schema to verify internal field presence 
    # before returning responses to Node/Mongoose backend pipelines.
    for item in data:
        if not isinstance(item, dict):
            raise RuntimeError("Flashcard items must be objects")
        if "question" not in item or "answer" not in item:
            raise RuntimeError("Invalid flashcard item structure: missing 'question' or 'answer'")
            
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
    print(f"[AI][generate_quiz] raw_response_preview={content[:300]!r}")
    try:
        data = _parse_ai_json(content)
        return _validate_quiz_payload(data, desired=desired)
    except Exception as first_error:
        # Retry once with deterministic settings when the model returns non-JSON text.
        retry_prompt = f"""Return ONLY valid JSON.
Generate exactly {desired} MCQ(s) from the context.
Output schema: [{{"questionText":"...","options":["...","...","...","..."],"correctAnswerIndex":0}}]
Rules:
- No markdown fences.
- No prose.
- Exactly 4 options per question.
- correctAnswerIndex must be an integer from 0 to 3.

Context:
{context}

User Request:
{prompt}"""
        retry_content = await chat_completion(client, prompt=retry_prompt, temperature=0.2)
        print(f"[AI][generate_quiz] retry_response_preview={retry_content[:300]!r}")
        try:
            retry_data = _parse_ai_json(retry_content)
            return _validate_quiz_payload(retry_data, desired=desired)
        except Exception as retry_error:
            raise RuntimeError(
                f"Quiz generation returned invalid JSON after retry: {first_error}"
            ) from retry_error


async def generate_qa(
    client: httpx.AsyncClient,
    *,
    user_id: ObjectId,
    file_id: str,
    prompt: str,
    marks_distribution: dict,
):
    # FIX: Lower context retrieval limits from 8 down to 5 to mitigate upstream 
    # prompt token delays and safely resolve Render's 30-second request abort dropouts.
    context = await _retrieve_context(
        client, user_id=user_id, file_id=file_id, query=prompt, num_candidates=150, limit=5
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
    print(f"[AI][generate_qa] raw_response_preview={content[:300]!r}")
    data = _parse_ai_json(content)
    data = _ensure_list_payload(data, preferred_keys=["questions", "qa", "items"], label="Q&A")
        
    # FIX: Added tight schema contract loops ensuring valid structure type checking
    for item in data:
        if not isinstance(item, dict):
            raise RuntimeError("Q&A items must be objects")
        if "question" not in item or "answer" not in item or "marks" not in item:
            raise RuntimeError("Invalid Q&A item structure: missing 'question', 'answer', or 'marks'")
            
    return data
