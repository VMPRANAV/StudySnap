def chunk_text(text: str, *, chunk_size: int = 3500, chunk_overlap: int = 400) -> list[str]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be > 0")
    if chunk_overlap < 0 or chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be >= 0 and < chunk_size")

    chunks: list[str] = []
    step = chunk_size - chunk_overlap
    i = 0
    while i < len(text):
        chunks.append(text[i : i + chunk_size])
        i += step
    return [c for c in chunks if c.strip()]


def clean_ai_json_text(text: str) -> str:
    cleaned = text.strip()
    if cleaned.lower().startswith("```json"):
        cleaned = cleaned[7:].lstrip("\n")
    if cleaned.startswith("```"):
        cleaned = cleaned[3:].lstrip("\n")
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].rstrip()
    cleaned = cleaned.strip("`").strip()

    # Trim leading junk before JSON start
    for idx, ch in enumerate(cleaned):
        if ch in "[{":
            cleaned = cleaned[idx:]
            break

    # Trim trailing junk after JSON end
    last_bracket = cleaned.rfind("]")
    last_brace = cleaned.rfind("}")
    end = max(last_bracket, last_brace)
    if end != -1:
        cleaned = cleaned[: end + 1]

    return cleaned

