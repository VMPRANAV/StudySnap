import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables from the shared .env file
load_dotenv()

app = FastAPI(title="StudySnap AI Service")

# Initialize MongoDB Client (Asynchronous for better performance on EC2)
mongo_client = AsyncIOMotorClient(os.getenv("MONGO_URI"))
db = mongo_client.get_database() # Uses the DB name from your URI
chunk_collection = db["chunks"]

# Initialize LangChain Embeddings
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-001", 
    google_api_key=os.getenv("GEMINI_API_KEY")
)

# Data structure for the request from Node.js
class PDFProcessRequest(BaseModel):
    pdf_path: str
    user_id: str
    file_id: str

@app.post("/process-pdf")
async def process_pdf(request: PDFProcessRequest):
    try:
        # 1. Extract Text from PDF
        loader = PyPDFLoader(request.pdf_path)
        docs = loader.load()
        
        # 2. Chunking Logic
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        split_docs = text_splitter.split_documents(docs)
        
        # 3. Generate Embeddings & Save to MongoDB
        chunk_docs = []
        for doc in split_docs:
            # We use embed_query for individual chunk vectors
            vector = await embeddings.aembed_query(doc.page_content)
            
            chunk_docs.append({
                "fileId": request.file_id,
                "userId": request.user_id,
                "text": doc.page_content,
                "embedding": vector
            })
        
        # Bulk Insert into MongoDB
        if chunk_docs:
            await chunk_collection.insert_many(chunk_docs)
            
        return {"status": "success", "chunks_processed": len(chunk_docs)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/embed")
async def embed_text(request: EmbedRequest):
    try:
        vector=await embeddings.aembed_query(request.text)
        return {"embedding":vector}
    except Exception as e:
        raise HTTPException(status_code=500,detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)