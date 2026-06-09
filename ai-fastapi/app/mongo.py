import asyncio

from bson import ObjectId
from pymongo import MongoClient

from .config import SETTINGS


_client: MongoClient | None = None
_db = None


def _get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(SETTINGS.mongodb_uri)
    return _client


def _get_db():
    global _db
    if _db is not None:
        return _db

    client = _get_client()
    db = client.get_default_database()
    if db is not None:
        _db = db
        return _db
    if SETTINGS.mongodb_db:
        _db = client[SETTINGS.mongodb_db]
        return _db
    raise RuntimeError("MONGODB_URI has no default DB; set MONGODB_DB")


def _get_chunks():
    return _get_db()["chunks"]


async def delete_chunks(user_id: ObjectId, file_id: str) -> None:
    chunks = _get_chunks()
    await asyncio.to_thread(chunks.delete_many, {"userId": str(user_id), "fileId": str(file_id)})

async def insert_chunks(docs: list[dict]) -> None:
    if not docs:
        return
    chunks = _get_chunks()
    await asyncio.to_thread(chunks.insert_many, docs)


async def vector_search(
    *,
    index_name: str,
    query_vector: list[float],
    file_id: str,
    user_id: ObjectId,
    num_candidates: int,
    limit: int,
) -> list[dict]:
    pipeline = [
        {
            "$vectorSearch": {
                "index": index_name,
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": num_candidates,
                "limit": limit,
                "filter": {"fileId": str(file_id), "userId": str(user_id)}, # Cast both to strings
            }
        }
    ]
    chunks = _get_chunks()
    return await asyncio.to_thread(lambda: list(chunks.aggregate(pipeline)))


async def get_chunks_for_file(
    *,
    file_id: str,
    user_id: ObjectId,
    limit: int,
) -> list[dict]:
    chunks = _get_chunks()
    query = {"fileId": str(file_id), "userId": str(user_id)}
    cursor = chunks.find(query, {"text": 1, "fileId": 1, "userId": 1}).limit(limit)
    return await asyncio.to_thread(lambda: list(cursor))
