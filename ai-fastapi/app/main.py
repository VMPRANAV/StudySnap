from __future__ import annotations

from contextlib import asynccontextmanager

import httpx
from bson import ObjectId
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel, Field

# Import your unified CrewAI + LangChain Orchestrator suite and helpers
from .ai import StudySnapAgentOrchestrator, _infer_count, index_pdf
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    timeout = httpx.Timeout(SETTINGS.http_timeout_s)
    async with httpx.AsyncClient(timeout=timeout) as client:
        app.state.http = client
        yield


app = FastAPI(title="StudySnap AI Service Suite", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"ok": True}


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


@app.post("/internal/generate/flashcards", dependencies=[Depends(require_internal_token)])
async def internal_generate_flashcards(req: GenerateRequest):
    try:
        user_oid = ObjectId(req.user_id)
        
        # Instantiate the Multi-Agent CrewAI + LangChain Orchestrator
        orchestrator = StudySnapAgentOrchestrator(
            client=app.state.http, 
            user_id=user_oid, 
            file_id=req.file_id, 
            prompt=req.prompt
        )
        
        # Run the CrewAI workflow pipeline for flashcards
        return await orchestrator.run_flashcard_workflow()
        
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"CrewAI Multi-Agent flashcard execution failed: {str(e)}")


@app.post("/internal/generate/quiz", dependencies=[Depends(require_internal_token)])
async def internal_generate_quiz(req: GenerateRequest):
    try:
        user_oid = ObjectId(req.user_id)
        inferred_count = _infer_count(req.prompt) or 5
        
        # Instantiate the Multi-Agent CrewAI + LangChain Orchestrator
        orchestrator = StudySnapAgentOrchestrator(
            client=app.state.http, 
            user_id=user_oid, 
            file_id=req.file_id, 
            prompt=req.prompt
        )
        
        # Run the CrewAI workflow pipeline for quizzes
        return await orchestrator.run_quiz_workflow(desired_count=inferred_count)
        
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"CrewAI Multi-Agent quiz execution failed: {str(e)}")


@app.post("/internal/generate/qa", dependencies=[Depends(require_internal_token)])
async def internal_generate_qa(req: GenerateQaRequest):
    try:
        user_oid = ObjectId(req.user_id)
        if not isinstance(req.marksDistribution, dict) or not req.marksDistribution:
            raise HTTPException(status_code=400, detail="marksDistribution must be a non-empty object")
            
        # Instantiate the Multi-Agent CrewAI + LangChain Orchestrator
        orchestrator = StudySnapAgentOrchestrator(
            client=app.state.http, 
            user_id=user_oid, 
            file_id=req.file_id, 
            prompt=req.prompt
        )
        
        # Run the CrewAI workflow pipeline for descriptive Q&A
        return await orchestrator.run_qa_workflow(marks_distribution=req.marksDistribution)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"CrewAI Multi-Agent Q&A execution failed: {str(e)}")