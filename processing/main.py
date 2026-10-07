import os
import sys
from typing import Optional, Any, List, Dict
import uvicorn
from fastapi import FastAPI, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Reconfigure stdout/stderr for Unicode support on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

load_dotenv()

from youtube_utils import extract_video_id, fetch_video_metadata
from transcript import get_transcript, TranscriptException
from chunking import chunk_transcript
from embeddings import get_embeddings, get_single_embedding, is_openai_configured
from vector_store import VectorStoreManager
from llm import generate_answer

app = FastAPI(
    title="VidQA RAG Processing Service",
    description="Transcript extraction, semantic chunking, vector embeddings, and LLM question answering",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

vector_store = VectorStoreManager()

# Request schemas supporting both camelCase and snake_case
class ProcessRequest(BaseModel):
    videoId: Optional[str] = Field(None, description="11-character YouTube video ID or full URL")
    video_id: Optional[str] = Field(None, description="Snake case alias for videoId")
    url: Optional[str] = Field(None, description="YouTube URL")
    apiKey: Optional[str] = Field(None, description="Optional user-provided OpenAI API key")

class AskRequest(BaseModel):
    videoId: Optional[str] = Field(None, description="YouTube video ID")
    video_id: Optional[str] = Field(None, description="Snake case alias for videoId")
    question: str = Field(..., min_length=1, description="Question about the video")
    apiKey: Optional[str] = Field(None, description="Optional user-provided OpenAI API key")

def resolve_api_key(body_key: Optional[str], header_key: Any) -> Optional[str]:
    """Helper to safely extract string API key from body or header."""
    if isinstance(body_key, str) and body_key.strip():
        return body_key.strip()
    if isinstance(header_key, str) and header_key.strip():
        return header_key.strip()
    env_key = os.getenv("OPENAI_API_KEY", "")
    if isinstance(env_key, str) and env_key.strip():
        return env_key.strip()
    return None

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "VidQA Processing Service",
        "openaiConfigured": is_openai_configured()
    }

def _handle_process(req: ProcessRequest, x_openai_api_key: Optional[str] = None):
    raw_input = req.videoId or req.video_id or req.url or ""
    raw_id = raw_input.strip()
    video_id = extract_video_id(raw_id)
    if not video_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid YouTube video ID or URL format."
        )

    api_key = resolve_api_key(req.apiKey, x_openai_api_key)

    # Check if already processed and stored in ChromaDB
    if vector_store.collection_exists(video_id):
        meta = fetch_video_metadata(video_id)
        return {
            "status": "ready",
            "videoId": video_id,
            "video_id": video_id,
            "message": "Video already processed in vector store.",
            "title": meta.get("title"),
            "thumbnail": meta.get("thumbnail"),
            "chunks": 4
        }

    # Step 1: Fetch transcript
    try:
        segments, is_generated = get_transcript(video_id)
    except TranscriptException as te:
        raise HTTPException(status_code=te.status_code, detail=te.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcript extraction error: {str(e)}")

    # Step 2: Semantic Chunking
    chunks = chunk_transcript(segments, target_words=180, overlap_ratio=0.2)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not generate meaningful chunks from the transcript."
        )

    # Step 3: Embeddings (dual-mode: OpenAI or local ONNX MiniLM)
    try:
        chunk_texts = [c["text"] for c in chunks]
        embeddings, provider = get_embeddings(chunk_texts, api_key=api_key)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Embedding generation error: {str(e)}")

    # Step 4: Save to ChromaDB
    try:
        vector_store.store_chunks(video_id, chunks, embeddings, provider=provider)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ChromaDB storage error: {str(e)}")

    # Fetch metadata for frontend
    meta = fetch_video_metadata(video_id)

    return {
        "status": "ready",
        "videoId": video_id,
        "video_id": video_id,
        "chunksCount": len(chunks),
        "chunks": len(chunks),
        "isGeneratedTranscript": is_generated,
        "provider": provider,
        "title": meta.get("title"),
        "thumbnail": meta.get("thumbnail")
    }

@app.post("/process", status_code=status.HTTP_200_OK)
def process_video(
    req: ProcessRequest,
    x_openai_api_key: Optional[str] = Header(default=None, alias="x-openai-api-key")
):
    return _handle_process(req, x_openai_api_key)

@app.post("/process_video", status_code=status.HTTP_200_OK)
def process_video_alias(
    req: ProcessRequest,
    x_openai_api_key: Optional[str] = Header(default=None, alias="x-openai-api-key")
):
    return _handle_process(req, x_openai_api_key)

@app.post("/ask", status_code=status.HTTP_200_OK)
def ask_question(
    req: AskRequest,
    x_openai_api_key: Optional[str] = Header(default=None, alias="x-openai-api-key")
):
    """
    Embeds the question, retrieves top relevant chunks from ChromaDB,
    and generates a grounded answer with supporting timestamps.
    """
    raw_id = req.videoId or req.video_id or ""
    video_id = extract_video_id(raw_id)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube video ID.")

    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if not vector_store.collection_exists(video_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video {video_id} has not been processed yet. Please process the video first."
        )

    api_key = resolve_api_key(req.apiKey, x_openai_api_key)
    collection_provider = vector_store.get_collection_provider(video_id)

    # 1. Embed query using matching provider
    try:
        q_embedding, _ = get_single_embedding(
            question,
            api_key=api_key,
            preferred_provider=collection_provider
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate question embedding: {str(e)}")

    # 2. Retrieve top chunks
    try:
        top_chunks = vector_store.query_chunks(video_id, q_embedding, top_k=4)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vector search failed: {str(e)}")

    if not top_chunks:
        return {
            "answer": "I don't know based on this video.",
            "timestamps": [],
            "sourceChunks": []
        }

    # 3. Generate answer via LLM (GPT-4o-mini or local grounded synthesizer)
    try:
        result = generate_answer(question, top_chunks, api_key=api_key)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Answer generation failed: {str(e)}")

    raw_timestamps = result["timestamps"] or []
    formatted_timestamps = [
        {
            "start": t,
            "end": t + 15,
            "label": f"{t//60:02d}:{t%60:02d}"
        }
        for t in raw_timestamps
    ]

    return {
        "answer": result["answer"],
        "timestamps": formatted_timestamps,
        "rawTimestamps": raw_timestamps,
        "sourceChunks": top_chunks
    }

@app.delete("/video/{video_id}", status_code=status.HTTP_200_OK)
def delete_video_data(video_id: str):
    """
    Deletes ChromaDB collection for the given video.
    """
    clean_id = extract_video_id(video_id) or video_id
    deleted = vector_store.delete_collection(clean_id)
    return {"status": "deleted" if deleted else "not_found", "videoId": clean_id}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
