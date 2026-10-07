import os
from typing import List, Optional, Tuple, Any
from dotenv import load_dotenv

load_dotenv()

OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"

# Singleton instance of local ONNX embedding function
_local_embedding_fn = None

def get_local_embedding_function():
    global _local_embedding_fn
    if _local_embedding_fn is None:
        from chromadb.utils import embedding_functions
        _local_embedding_fn = embedding_functions.DefaultEmbeddingFunction()
    return _local_embedding_fn

def is_openai_configured(api_key: Optional[Any] = None) -> bool:
    if not isinstance(api_key, str):
        api_key = os.getenv("OPENAI_API_KEY", "")
    if not isinstance(api_key, str):
        return False
    key = api_key.strip()
    if not key or key == "your_openai_api_key_here" or key == "sk-your-openai-api-key-here":
        return False
    return len(key) > 10

def get_openai_client(api_key: Optional[Any] = None):
    from openai import OpenAI
    key = api_key if isinstance(api_key, str) else os.getenv("OPENAI_API_KEY", "")
    key = key.strip() if isinstance(key, str) else ""
    if not is_openai_configured(key):
        raise ValueError("Valid OPENAI_API_KEY is not configured.")
    return OpenAI(api_key=key)

def get_embeddings(
    texts: List[str],
    api_key: Optional[Any] = None,
    preferred_provider: Optional[str] = None,
    batch_size: int = 64
) -> Tuple[List[List[float]], str]:
    """
    Generate embeddings for texts.
    Returns:
        (embeddings, provider_name) where provider_name is 'openai' or 'local_minilm'.
    """
    if not texts:
        return [], "local_minilm"

    use_openai = False
    if preferred_provider == "openai":
        use_openai = True
    elif preferred_provider == "local":
        use_openai = False
    else:
        use_openai = is_openai_configured(api_key)

    if use_openai:
        try:
            client = get_openai_client(api_key)
            all_embeddings: List[List[float]] = []
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                sanitized_batch = [t.replace("\n", " ").strip() for t in batch]
                response = client.embeddings.create(
                    input=sanitized_batch,
                    model=OPENAI_EMBEDDING_MODEL
                )
                batch_embeddings = [item.embedding for item in response.data]
                all_embeddings.extend(batch_embeddings)
            return all_embeddings, "openai"
        except Exception as e:
            # If OpenAI fails (e.g. quota exceeded or invalid key), fall back gracefully to local
            print(f"[Embeddings] OpenAI embeddings failed ({e}), falling back to local ONNX model.")

    # Fallback to local ONNX MiniLM
    local_fn = get_local_embedding_function()
    sanitized = [t.replace("\n", " ").strip() for t in texts]
    embs = local_fn(sanitized)
    clean_embs = [[float(x) for x in vec] for vec in embs]
    return clean_embs, "local_minilm"

def get_single_embedding(
    text: str,
    api_key: Optional[Any] = None,
    preferred_provider: Optional[str] = None
) -> Tuple[List[float], str]:
    """
    Generate embedding for a single query text.
    Returns:
        (embedding_vector, provider_name)
    """
    embs, provider = get_embeddings([text], api_key=api_key, preferred_provider=preferred_provider)
    if not embs:
        raise RuntimeError("Failed to generate embedding for query.")
    return embs[0], provider
