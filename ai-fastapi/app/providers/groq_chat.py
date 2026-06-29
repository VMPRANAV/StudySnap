from __future__ import annotations

import asyncio
import httpx

from ..config import SETTINGS

# Groq rate-limit / transient error codes that warrant a retry.
_RETRYABLE_STATUS_CODES = (429, 500, 502, 503, 504)


async def chat_completion(
    client: httpx.AsyncClient,
    *,
    prompt: str,
    temperature: float,
    max_tokens: int | None = None,
) -> str:
    url = f"{SETTINGS.groq_base_url}/chat/completions"
    headers = {"Authorization": f"Bearer {SETTINGS.groq_api_key}"}
    payload: dict = {
        "model": SETTINGS.groq_model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
    }
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens

    retries = max(0, SETTINGS.embedding_max_retries)
    base_delay_s = max(0, SETTINGS.embedding_retry_base_ms) / 1000

    for attempt in range(retries + 1):
        res = await client.post(url, headers=headers, json=payload)

        if res.status_code not in _RETRYABLE_STATUS_CODES:
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"]

        # On the last attempt, raise so callers get the real HTTP error.
        if attempt >= retries:
            res.raise_for_status()

        # Honour Groq's Retry-After header when present.
        retry_after = res.headers.get("retry-after") or res.headers.get("x-ratelimit-reset-requests")
        if retry_after:
            try:
                delay_s = max(float(retry_after), base_delay_s)
            except ValueError:
                delay_s = base_delay_s * (2 ** attempt)
        else:
            delay_s = base_delay_s * (2 ** attempt)

        print(
            f"[Groq] attempt={attempt + 1}/{retries + 1} "
            f"status={res.status_code} retrying in {delay_s:.1f}s"
        )
        await asyncio.sleep(delay_s)

    # Should be unreachable.
    raise RuntimeError("Groq chat_completion exhausted retries without a successful response")

