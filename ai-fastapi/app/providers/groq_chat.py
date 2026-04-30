from __future__ import annotations

import httpx

from ..config import SETTINGS


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

    res = await client.post(url, headers=headers, json=payload)
    res.raise_for_status()
    data = res.json()
    return data["choices"][0]["message"]["content"]

