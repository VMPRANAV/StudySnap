# StudySnap AI Service (FastAPI)

Internal AI processing service used by the Node backend.

## Local run

1. Create a virtualenv and install deps:
   - `python -m venv .venv`
   - `source .venv/bin/activate`
   - `pip install -r requirements.txt`
2. Set env vars (copy `.env.example` → `.env` and fill values).
3. Run:
   - `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`

## Notes
- All endpoints are **internal-only** and require `X-AI-Internal-Token`.
- This service writes/reads from the existing MongoDB `chunks` collection and uses your Atlas Vector Search index `vector_index`.
