from __future__ import annotations

import asyncio
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

    retries = max(0, SETTINGS.embedding_max_retries)
    base_delay_s = max(0, SETTINGS.embedding_retry_base_ms) / 1000
    data = None

    for attempt in range(retries + 1):
        res = await client.post(url, params={"key": SETTINGS.gemini_api_key}, json=body)
        if res.status_code not in (429, 500, 502, 503, 504):
            res.raise_for_status()
            data = res.json()
            break

        if attempt >= retries:
            res.raise_for_status()

        retry_after = res.headers.get("retry-after")
        if retry_after:
            try:
                delay_s = max(float(retry_after), base_delay_s)
            except ValueError:
                delay_s = base_delay_s * (2 ** attempt)
        else:
            delay_s = base_delay_s * (2 ** attempt)

        await asyncio.sleep(delay_s)

    if data is None:
        raise RuntimeError("Gemini embedding request failed without a response payload")

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
