from __future__ import annotations

import httpx

from ..config import SETTINGS


def _model_path(model: str) -> str:
    # Allow passing "models/..." or plain model id like "gemini-embedding-001"
    if model.startswith("models/"):
        return model
    return f"models/{model}"


async def embed_text(client: httpx.AsyncClient, text: str) -> list[float]:
    model = _model_path(SETTINGS.gemini_embedding_model)
    url = f"{SETTINGS.gemini_base_url}/{model}:embedContent"

    body: dict = {
        "content": {"parts": [{"text": text}]},
        "taskType": SETTINGS.gemini_task_type,
    }

    # Some Gemini embedding endpoints accept outputDimensionality; keep it optional and configurable.
    if SETTINGS.embedding_dimensions:
        body["outputDimensionality"] = SETTINGS.embedding_dimensions

    res = await client.post(url, params={"key": SETTINGS.gemini_api_key}, json=body)
    res.raise_for_status()
    data = res.json()

    embedding_obj = data.get("embedding")
    values = None
    if isinstance(embedding_obj, dict):
        for key in ("values", "value"):
            if isinstance(embedding_obj.get(key), list):
                values = embedding_obj[key]
                break
    elif isinstance(embedding_obj, list):
        values = embedding_obj

    if not isinstance(values, list) or not values:
        raise RuntimeError(f"Unexpected Gemini embed response shape: {data}")

    if SETTINGS.embedding_dimensions and len(values) != SETTINGS.embedding_dimensions:
        raise RuntimeError(
            f"Embedding dimension mismatch: expected {SETTINGS.embedding_dimensions}, got {len(values)}"
        )

    return [float(v) for v in values]

