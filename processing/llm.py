import json
import re
from typing import List, Dict, Any, Optional
import numpy as np
from embeddings import get_openai_client, is_openai_configured, get_local_embedding_function

LLM_MODEL = "gpt-4o-mini"

SYSTEM_PROMPT = """You are VidQA, an expert AI assistant providing grounded answers about YouTube videos using strictly the provided transcript excerpts.

STRICT OPERATING RULES:
1. Answer the question using ONLY the facts directly stated in the Context below.
2. If the answer cannot be determined directly from the Context, you MUST respond with:
   "I don't know based on this video."
3. Do NOT make up, assume, extrapolate, or bring in outside knowledge.
4. For every claim you make in your answer, identify which context segment it comes from and cite its start_time timestamp (in seconds).
5. Output your response STRICTLY as a single JSON object with these exact keys:
   {
     "answer": "<clear, concise answer>",
     "timestamps": [<list of integer seconds representing the start times of the supporting segments>]
   }
6. If you cannot find the answer, return:
   {
     "answer": "I don't know based on this video.",
     "timestamps": []
   }
"""

def clean_json_string(raw: str) -> str:
    """Extract JSON object from markdown code blocks or surrounding text."""
    trimmed = raw.strip()
    match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', trimmed, re.DOTALL)
    if match:
        return match.group(1).strip()
    
    first_brace = trimmed.find('{')
    last_brace = trimmed.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        return trimmed[first_brace:last_brace+1].strip()

    return trimmed

def format_timestamp_label(seconds: int) -> str:
    mins = seconds // 60
    secs = seconds % 60
    return f"{mins:02d}:{secs:02d}"

def cosine_sim(a: List[float], b: List[float]) -> float:
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    norm_a = np.linalg.norm(va)
    norm_b = np.linalg.norm(vb)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(va, vb) / (norm_a * norm_b))

def local_semantic_grounded_answer(
    question: str,
    retrieved_chunks: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Extractive semantic grounded answer generator when OpenAI key is not configured.
    Uses ONNX MiniLM semantic sentence similarity + keyword overlap to identify
    exact grounded answers and timestamps.
    """
    if not retrieved_chunks:
        return {
            "answer": "I don't know based on this video.",
            "timestamps": []
        }

    # Comprehensive English stop words including pronouns and auxiliary verbs
    stop_words = {
        "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours",
        "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", "herself",
        "it", "its", "itself", "they", "them", "their", "theirs", "themselves", "what", "which",
        "who", "whom", "this", "that", "these", "those", "am", "is", "are", "was", "were", "be",
        "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an",
        "the", "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by",
        "for", "with", "about", "against", "between", "into", "through", "during", "before",
        "after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over",
        "under", "again", "further", "then", "once", "here", "there", "when", "where", "why",
        "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such",
        "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can",
        "will", "just", "don", "should", "now", "video", "tell", "me", "show", "give", "explain",
        "say", "says", "said", "mention", "mentions", "discussed", "discuss", "talk", "talks"
    }

    q_clean = question.strip()
    q_words = [
        w.lower().strip(".,!?;:\"'()[]{}")
        for w in q_clean.split()
        if len(w.strip(".,!?;:\"'()[]{}")) > 2
    ]
    key_terms = [w for w in q_words if w not in stop_words]

    # Gather sentences across chunks with their timestamps
    candidate_sentences = []
    sentence_texts = []
    
    for c in retrieved_chunks:
        c_text = c.get("text", "")
        st = int(c.get("start_time", 0))
        # Split sentences
        sents = re.split(r'(?<=[.!?])\s+', c_text)
        for s in sents:
            s_clean = s.strip()
            if len(s_clean) > 8:
                candidate_sentences.append({"text": s_clean, "timestamp": st})
                sentence_texts.append(s_clean)

    if not candidate_sentences:
        return {
            "answer": "I don't know based on this video.",
            "timestamps": []
        }

    # Compute semantic sentence embeddings
    local_fn = get_local_embedding_function()
    q_emb = local_fn([q_clean])[0]
    s_embs = local_fn(sentence_texts)

    scored_candidates = []
    for idx, cand in enumerate(candidate_sentences):
        sim = cosine_sim(q_emb, s_embs[idx])
        s_lower = cand["text"].lower()
        keyword_hits = sum(1 for term in key_terms if term in s_lower)
        combined_score = sim + (0.15 * keyword_hits)
        scored_candidates.append({
            "text": cand["text"],
            "timestamp": cand["timestamp"],
            "sim": sim,
            "keyword_hits": keyword_hits,
            "score": combined_score
        })

    scored_candidates.sort(key=lambda x: x["score"], reverse=True)
    best = scored_candidates[0]

    # Threshold for relevance
    # If the question has key terms not found anywhere in transcript AND semantic similarity is weak:
    is_summary_query = any(phrase in q_clean.lower() for phrase in [
        "summary", "summarize", "main topic", "overview", "what is this video about", "what is the video about"
    ])
    
    if not is_summary_query:
        if best["keyword_hits"] == 0 and best["sim"] < 0.33:
            return {
                "answer": "I don't know based on this video. The indexed transcript does not contain information discussing this.",
                "timestamps": []
            }

    # Build answer from top 1-2 most relevant sentences
    selected = [best]
    seen = {best["text"]}
    for c in scored_candidates[1:4]:
        if c["text"] not in seen and (c["score"] > 0.3 or c["keyword_hits"] > 0):
            seen.add(c["text"])
            selected.append(c)
            if len(selected) >= 2:
                break

    selected_timestamps = sorted(list(set(s["timestamp"] for s in selected)))
    time_label = format_timestamp_label(selected_timestamps[0])
    quotes = " ".join([s["text"] for s in selected])

    answer_text = f"According to the video transcript (at {time_label}):\n\n\"{quotes}\""

    return {
        "answer": answer_text,
        "timestamps": selected_timestamps
    }

def generate_answer(
    question: str,
    retrieved_chunks: List[Dict[str, Any]],
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Constructs grounded prompt with retrieved chunks, queries GPT-4o-mini (if configured),
    or falls back to local semantic grounded extraction.
    """
    if not retrieved_chunks:
        return {
            "answer": "I don't know based on this video.",
            "timestamps": []
        }

    # If OpenAI is configured, use GPT-4o-mini
    if is_openai_configured(api_key):
        context_lines = []
        available_timestamps = []
        for idx, c in enumerate(retrieved_chunks):
            st = c.get("start_time", 0)
            et = c.get("end_time", 0)
            txt = c.get("text", "")
            available_timestamps.append(st)
            context_lines.append(f"[Segment {idx+1} | Start: {st}s | End: {et}s]\n{txt}")

        context_str = "\n\n".join(context_lines)

        user_prompt = f"""Context from video transcript:
------------------------------------
{context_str}
------------------------------------

Question: {question}

Return your response strictly as JSON."""

        try:
            client = get_openai_client(api_key)
            response = client.chat.completions.create(
                model=LLM_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                max_tokens=600,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content or "{}"
            cleaned = clean_json_string(content)
            parsed = json.loads(cleaned)

            answer = parsed.get("answer", "").strip()
            raw_timestamps = parsed.get("timestamps", [])

            valid_timestamps = []
            if isinstance(raw_timestamps, list):
                for t in raw_timestamps:
                    try:
                        val = int(round(float(t)))
                        if val in available_timestamps or any(abs(val - a) <= 15 for a in available_timestamps):
                            valid_timestamps.append(val)
                    except (ValueError, TypeError):
                        continue

            if not valid_timestamps and "I don't know" not in answer:
                valid_timestamps = [available_timestamps[0]] if available_timestamps else []

            valid_timestamps = sorted(list(set(valid_timestamps)))

            return {
                "answer": answer or "I don't know based on this video.",
                "timestamps": valid_timestamps
            }

        except Exception as e:
            print(f"[LLM Warning] OpenAI call failed: {e}. Falling back to local semantic answering.")

    # Local semantic fallback
    return local_semantic_grounded_answer(question, retrieved_chunks)
