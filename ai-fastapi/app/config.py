import os
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


def _require(name: str) -> str:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        raise RuntimeError(f"Missing required env var: {name}")
    return value


@dataclass(frozen=True)
class Settings:
    ai_internal_token: str
    mongodb_uri: str
    mongodb_db: str | None

    groq_api_key: str
    groq_model: str
    groq_base_url: str

    gemini_api_key: str
    gemini_embedding_model: str
    gemini_base_url: str
    gemini_task_type: str
    embedding_dimensions: int

    vector_index_name: str
    http_timeout_s: float
    embedding_concurrency: int
    embedding_max_retries: int
    embedding_retry_base_ms: int


def load_settings() -> Settings:
    return Settings(
        ai_internal_token=_require("AI_INTERNAL_TOKEN"),
        mongodb_uri=_require("MONGODB_URI"),
        mongodb_db=os.getenv("MONGODB_DB"),
        groq_api_key=_require("GROQ_API_KEY"),
        groq_model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        groq_base_url=os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
        gemini_api_key=_require("GEMINI_API_KEY"),
        gemini_embedding_model=os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001"),
        gemini_base_url=os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta"),
        gemini_task_type=os.getenv("GEMINI_TASK_TYPE", "RETRIEVAL_DOCUMENT"),
        embedding_dimensions=int(os.getenv("EMBEDDING_DIMENSIONS", "768")),
        vector_index_name=os.getenv("VECTOR_INDEX_NAME", "vector_index"),
        http_timeout_s=float(os.getenv("HTTP_TIMEOUT_S", "60")),
        embedding_concurrency=int(os.getenv("EMBEDDING_CONCURRENCY", "4")),
        embedding_max_retries=int(os.getenv("EMBEDDING_MAX_RETRIES", "4")),
        embedding_retry_base_ms=int(os.getenv("EMBEDDING_RETRY_BASE_MS", "800")),
    )


SETTINGS = load_settings()
