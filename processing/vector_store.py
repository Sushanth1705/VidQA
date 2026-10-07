import os
import re
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from dotenv import load_dotenv

load_dotenv()

CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db")

def get_chroma_client():
    os.makedirs(CHROMA_PATH, exist_ok=True)
    return chromadb.PersistentClient(
        path=CHROMA_PATH,
        settings=Settings(anonymized_telemetry=False, is_persistent=True)
    )

def sanitize_collection_name(video_id: str) -> str:
    """
    Ensure collection name conforms to ChromaDB rules:
    - 3-63 characters
    - Contains only alphanumeric, underscores, hyphens, periods
    - Starts and ends with alphanumeric
    """
    safe_id = re.sub(r'[^a-zA-Z0-9_-]', '_', video_id)
    return f"video_{safe_id}"

class VectorStoreManager:
    def __init__(self):
        self.client = get_chroma_client()

    def collection_exists(self, video_id: str) -> bool:
        col_name = sanitize_collection_name(video_id)
        try:
            col = self.client.get_collection(name=col_name)
            return col.count() > 0
        except Exception:
            return False

    def get_collection_provider(self, video_id: str) -> str:
        col_name = sanitize_collection_name(video_id)
        try:
            col = self.client.get_collection(name=col_name)
            if col.metadata and "provider" in col.metadata:
                return col.metadata["provider"]
        except Exception:
            pass
        return "local_minilm"

    def store_chunks(
        self,
        video_id: str,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]],
        provider: str = "local_minilm"
    ) -> int:
        """
        Stores chunk documents, metadata, and embeddings into a dedicated ChromaDB collection.
        If the collection already exists and has documents, returns existing count.
        """
        col_name = sanitize_collection_name(video_id)

        # Check if already processed
        try:
            col = self.client.get_collection(name=col_name)
            if col.count() > 0:
                return col.count()
        except Exception:
            pass

        # Create or recreate collection with cosine distance and provider metadata
        try:
            col = self.client.get_or_create_collection(
                name=col_name,
                metadata={"hnsw:space": "cosine", "provider": provider}
            )
        except Exception as e:
            raise RuntimeError(f"Failed to create ChromaDB collection: {str(e)}")

        ids = [f"{video_id}_{i}" for i in range(len(chunks))]
        documents = [c["text"] for c in chunks]
        metadatas = [
            {
                "start_time": int(c["start_time"]),
                "end_time": int(c["end_time"]),
                "chunk_index": i,
                "video_id": video_id
            }
            for i, c in enumerate(chunks)
        ]

        col.add(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas
        )

        return len(chunks)

    def query_chunks(
        self,
        video_id: str,
        query_embedding: List[float],
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Retrieves the top_k most relevant chunks for a question embedding.
        """
        col_name = sanitize_collection_name(video_id)
        try:
            col = self.client.get_collection(name=col_name)
        except Exception:
            raise ValueError(f"No vector collection found for video {video_id}. Please process the video first.")

        results = col.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, max(1, col.count())),
            include=["documents", "metadatas", "distances"]
        )

        retrieved: List[Dict[str, Any]] = []
        if not results or not results.get("documents"):
            return retrieved

        docs = results["documents"][0]
        metas = results["metadatas"][0] if results.get("metadatas") else []
        distances = results["distances"][0] if results.get("distances") else []

        for idx, doc in enumerate(docs):
            meta = metas[idx] if idx < len(metas) else {}
            dist = distances[idx] if idx < len(distances) else None
            retrieved.append({
                "text": doc,
                "start_time": meta.get("start_time", 0),
                "end_time": meta.get("end_time", 0),
                "chunk_index": meta.get("chunk_index", 0),
                "distance": dist
            })

        # Sort chronologically by start_time for cohesive context reading
        retrieved.sort(key=lambda x: x["start_time"])
        return retrieved

    def delete_collection(self, video_id: str) -> bool:
        col_name = sanitize_collection_name(video_id)
        try:
            self.client.delete_collection(name=col_name)
            return True
        except Exception:
            return False
