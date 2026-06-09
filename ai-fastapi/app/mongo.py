import asyncio

from bson import ObjectId
from pymongo import MongoClient

from .config import SETTINGS


_client = MongoClient(SETTINGS.mongodb_uri)


def _get_db():
    db = _client.get_default_database()
    if db is not None:
        return db
    if SETTINGS.mongodb_db:
        return _client[SETTINGS.mongodb_db]
    raise RuntimeError("MONGODB_URI has no default DB; set MONGODB_DB")


_db = _get_db()
chunks = _db["chunks"]


async def delete_chunks(user_id: ObjectId, file_id: str) -> None:
    await asyncio.to_thread(chunks.delete_many, {"userId": str(user_id), "fileId": str(file_id)})

async def insert_chunks(docs: list[dict]) -> None:
    if not docs:
        return
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
    return await asyncio.to_thread(lambda: list(chunks.aggregate(pipeline)))
