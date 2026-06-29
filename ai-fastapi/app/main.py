from __future__ import annotations

from contextlib import asynccontextmanager
import uuid  # Added for unique task tracking

import httpx
from bson import ObjectId
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, BackgroundTasks, status
from pydantic import BaseModel, Field

from .ai import generate_flashcards, generate_qa, generate_quiz, index_pdf
from .config import SETTINGS

def require_internal_token(
    x_ai_internal_token: str | None = Header(default=None, alias="X-AI-Internal-Token"),
) -> None:
    if not x_ai_internal_token or x_ai_internal_token != SETTINGS.ai_internal_token:
        raise HTTPException(status_code=401, detail="Unauthorized")


class GenerateRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    file_id: str = Field(..., min_length=1)
    prompt: str = Field(..., min_length=1)


class GenerateQaRequest(GenerateRequest):
    marksDistribution: dict = Field(..., description="Map of marks -> count")


# --- In-Memory Task Store ---
# Keeps memory minimal; structure: { task_id: { "status": "processing"|"completed"|"failed", "data": ..., "error": ... } }
BACKGROUND_TASKS_STORE = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    timeout = httpx.Timeout(SETTINGS.http_timeout_s)
    async with httpx.AsyncClient(timeout=timeout) as client:
        app.state.http = client
        yield


app = FastAPI(title="StudySnap AI Service", lifespan=lifespan)


# --- Core Worker Wrappers ---
async def flashcards_worker(task_id: str, http_client, user_id, file_id, prompt):
    try:
        data = await generate_flashcards(http_client, user_id=user_id, file_id=file_id, prompt=prompt)
        BACKGROUND_TASKS_STORE[task_id] = {"status": "completed", "data": data, "error": None}
    except Exception as e:
        BACKGROUND_TASKS_STORE[task_id] = {"status": "failed", "data": None, "error": str(e)}

async def quiz_worker(task_id: str, http_client, user_id, file_id, prompt):
    try:
        data = await generate_quiz(http_client, user_id=user_id, file_id=file_id, prompt=prompt)
        BACKGROUND_TASKS_STORE[task_id] = {"status": "completed", "data": data, "error": None}
    except Exception as e:
        BACKGROUND_TASKS_STORE[task_id] = {"status": "failed", "data": None, "error": str(e)}

async def qa_worker(task_id: str, http_client, user_id, file_id, prompt, marks_distribution):
    try:
        data = await generate_qa(http_client, user_id=user_id, file_id=file_id, prompt=prompt, marks_distribution=marks_distribution)
        BACKGROUND_TASKS_STORE[task_id] = {"status": "completed", "data": data, "error": None}
    except Exception as e:
        BACKGROUND_TASKS_STORE[task_id] = {"status": "failed", "data": None, "error": str(e)}


@app.get("/health")
async def health():
    return {"ok": True}


# --- Status Check Polling Route ---
@app.get("/internal/tasks/status/{task_id}", dependencies=[Depends(require_internal_token)])
async def get_task_status(task_id: str):
    if task_id not in BACKGROUND_TASKS_STORE:
        raise HTTPException(status_code=404, detail="Task tracking token not found")
    return BACKGROUND_TASKS_STORE[task_id]


@app.post("/internal/index", dependencies=[Depends(require_internal_token)])
async def internal_index(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    file_id: str = Form(...),
):
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported")

    try:
        user_oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        chunk_count = await index_pdf(
            app.state.http,
            pdf_bytes=pdf_bytes,
            user_id=user_oid,
            file_id=file_id,
        )
        return {"fileId": file_id, "chunkCount": chunk_count}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Indexing failed: {str(e)}")


# --- Asynchronous Fire-and-Forget Routes ---

@app.post("/internal/generate/flashcards", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(require_internal_token)])
async def internal_generate_flashcards(req: GenerateRequest, background_tasks: BackgroundTasks):
    try:
        user_oid = ObjectId(req.user_id)
        task_id = str(uuid.uuid4())
        BACKGROUND_TASKS_STORE[task_id] = {"status": "processing", "data": None, "error": None}
        
        # Dispatch to background tasks instantly
        background_tasks.add_task(flashcards_worker, task_id, app.state.http, user_oid, req.file_id, req.prompt)
        
        return {"taskId": task_id, "status": "processing"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to initiate flashcards: {str(e)}")


@app.post("/internal/generate/quiz", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(require_internal_token)])
async def internal_generate_quiz(req: GenerateRequest, background_tasks: BackgroundTasks):
    try:
        user_oid = ObjectId(req.user_id)
        task_id = str(uuid.uuid4())
        BACKGROUND_TASKS_STORE[task_id] = {"status": "processing", "data": None, "error": None}
        
        background_tasks.add_task(quiz_worker, task_id, app.state.http, user_oid, req.file_id, req.prompt)
        
        return {"taskId": task_id, "status": "processing"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to initiate quiz: {str(e)}")


@app.post("/internal/generate/qa", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(require_internal_token)])
async def internal_generate_qa(req: GenerateQaRequest, background_tasks: BackgroundTasks):
    try:
        user_oid = ObjectId(req.user_id)
        if not isinstance(req.marksDistribution, dict) or not req.marksDistribution:
            raise HTTPException(status_code=400, detail="marksDistribution must be a non-empty object")
        
        task_id = str(uuid.uuid4())
        BACKGROUND_TASKS_STORE[task_id] = {"status": "processing", "data": None, "error": None}
        
        background_tasks.add_task(qa_worker, task_id, app.state.http, user_oid, req.file_id, req.prompt, req.marksDistribution)
        
        return {"taskId": task_id, "status": "processing"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to initiate Q&A: {str(e)}")
