import os
import sys
import json
import re
import math
import html
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
    CouldNotRetrieveTranscript
)

# Reconfigure stdout/stderr for Unicode support on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

app = FastAPI(title="VidQA Standalone Processing Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

class ProcessRequest(BaseModel):
    url: Optional[str] = None
    video_id: Optional[str] = None
    videoId: Optional[str] = None

class AskRequest(BaseModel):
    video_id: Optional[str] = None
    videoId: Optional[str] = None
    question: str

def clean_video_id(url_or_id: str) -> Optional[str]:
    if not url_or_id:
        return None
    raw = url_or_id.strip()
    if re.match(r'^[a-zA-Z0-9_-]{11}$', raw):
        return raw
    patterns = [
        re.compile(r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})'),
        re.compile(r'(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})'),
        re.compile(r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})'),
        re.compile(r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})'),
    ]
    for p in patterns:
        m = p.search(raw)
        if m and re.match(r'^[a-zA-Z0-9_-]{11}$', m.group(1)):
            return m.group(1)
    return None

def split_into_sentences(text: str) -> List[str]:
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in sentences if s.strip()]

def words_count(text: str) -> int:
    return len(text.split())

def chunk_sentences(sentences: List[str], sentence_timestamps: List[tuple], target_words: int = 180, overlap_ratio: float = 0.2):
    chunks = []
    i = 0
    n = len(sentences)
    overlap_words = int(target_words * overlap_ratio)
    chunk_index = 0

    while i < n:
        words = 0
        j = i
        chunk_sents = []
        while j < n and words < target_words:
            s = sentences[j]
            chunk_sents.append(s)
            words += words_count(s)
            j += 1

        start = int(round(sentence_timestamps[i][0]))
        end = int(round(sentence_timestamps[min(j - 1, n - 1)][1]))
        if end <= start:
            end = start + 1

        chunk_text = ' '.join(chunk_sents).strip()
        chunks.append({
            'chunk_id': f"chunk_{chunk_index}",
            'text': chunk_text,
            'start': start,
            'end': end,
            'words': words
        })
        chunk_index += 1

        if j >= n:
            break

        moved = 0
        k = j - 1
        while k > i and moved < overlap_words:
            moved += words_count(sentences[k])
            k -= 1
        i = max(i + 1, k + 1)

    return chunks

def extract_snippet_data(s: Any) -> Dict[str, Any]:
    if isinstance(s, dict):
        text = str(s.get("text", ""))
        start = float(s.get("start", 0))
        duration = float(s.get("duration", 0))
    else:
        text = str(getattr(s, "text", ""))
        start = float(getattr(s, "start", 0))
        duration = float(getattr(s, "duration", 0))
    clean_text = html.unescape(text).replace("\n", " ").strip()
    return {
        "text": clean_text,
        "start": round(max(0.0, start), 2),
        "duration": round(max(0.1, duration), 2)
    }

def fetch_transcript_robust(video_id: str):
    api_instance = YouTubeTranscriptApi() if isinstance(YouTubeTranscriptApi, type) else YouTubeTranscriptApi
    transcript_list = None
    if hasattr(api_instance, "list"):
        try:
            transcript_list = api_instance.list(video_id)
        except Exception:
            pass
    if transcript_list is None and hasattr(YouTubeTranscriptApi, "list_transcripts"):
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        except Exception:
            pass

    transcript_obj = None
    target_langs = ['en', 'en-US', 'en-GB', 'en-CA', 'en-AU', 'en-IN']
    if transcript_list:
        try:
            transcript_obj = transcript_list.find_manually_created_transcript(target_langs)
        except Exception:
            pass
        if not transcript_obj:
            try:
                transcript_obj = transcript_list.find_generated_transcript(target_langs)
            except Exception:
                pass
        if not transcript_obj:
            for t in transcript_list:
                transcript_obj = t
                if getattr(t, "is_translatable", False):
                    try:
                        transcript_obj = t.translate('en')
                    except Exception:
                        pass
                break

    raw_segments = []
    if transcript_obj:
        fetched = transcript_obj.fetch()
        if hasattr(fetched, "to_raw_data"):
            raw_segments = fetched.to_raw_data()
        elif isinstance(fetched, list):
            raw_segments = fetched
        elif hasattr(fetched, "snippets"):
            raw_segments = fetched.snippets
        else:
            raw_segments = list(fetched)
    else:
        if hasattr(api_instance, "fetch"):
            fetched = api_instance.fetch(video_id, languages=target_langs)
        else:
            fetched = YouTubeTranscriptApi.get_transcript(video_id, languages=target_langs)
        if hasattr(fetched, "to_raw_data"):
            raw_segments = fetched.to_raw_data()
        elif isinstance(fetched, list):
            raw_segments = fetched
        else:
            raw_segments = list(fetched)

    cleaned = []
    for s in raw_segments:
        item = extract_snippet_data(s)
        if item["text"]:
            cleaned.append(item)
    return cleaned

def save_processed(video_id: str, meta: Dict[str, Any]):
    path = os.path.join(DATA_DIR, f'{video_id}.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

def load_processed(video_id: str) -> Optional[Dict[str, Any]]:
    path = os.path.join(DATA_DIR, f'{video_id}.json')
    if not os.path.exists(path):
        return None
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None

# Simple TF-IDF / keyword similarity for standalone vector search
def compute_term_vector(text: str, vocab: Dict[str, int]) -> List[float]:
    words = re.findall(r'\b[a-zA-Z0-9_]{3,}\b', text.lower())
    vec = [0.0] * len(vocab)
    for w in words:
        if w in vocab:
            vec[vocab[w]] += 1.0
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
    return vec

def cosine(a: List[float], b: List[float]) -> float:
    return sum(x * y for x, y in zip(a, b))

@app.get('/health')
def health():
    return {"status": "ok", "service": "VidQA Standalone Processing"}

@app.post('/process_video')
@app.post('/process')
def process_video(req: ProcessRequest):
    raw = req.video_id or req.videoId or req.url or ""
    vid = clean_video_id(raw)
    if not vid:
        raise HTTPException(status_code=400, detail="Invalid YouTube video URL or ID.")

    existing = load_processed(vid)
    if existing:
        return {
            'video_id': vid,
            'videoId': vid,
            'status': 'already_processed',
            'chunks': len(existing.get('chunks', []))
        }

    try:
        transcript = fetch_transcript_robust(vid)
    except TranscriptsDisabled:
        raise HTTPException(status_code=422, detail='Transcripts are disabled for this video.')
    except NoTranscriptFound:
        raise HTTPException(status_code=404, detail='No captions or transcripts found.')
    except VideoUnavailable:
        raise HTTPException(status_code=404, detail='Video is unavailable or private.')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch transcript: {str(e)}")

    if not transcript:
        raise HTTPException(status_code=422, detail='Transcript is empty.')

    sentence_timestamps = []
    sentences = []
    for seg in transcript:
        txt = seg["text"]
        sents = split_into_sentences(txt)
        if not sents:
            sents = [txt]
        seg_start = seg["start"]
        seg_end = seg_start + seg["duration"]
        for s in sents:
            sentences.append(s)
            sentence_timestamps.append((seg_start, seg_end))

    chunks = chunk_sentences(sentences, sentence_timestamps, target_words=180, overlap_ratio=0.2)
    if not chunks:
        raise HTTPException(status_code=422, detail='Could not create chunks from transcript.')

    # Build vocabulary for vector search
    all_words = set()
    for c in chunks:
        words = re.findall(r'\b[a-zA-Z0-9_]{3,}\b', c['text'].lower())
        all_words.update(words)
    vocab = {w: i for i, w in enumerate(sorted(all_words))}

    meta = {
        'video_id': vid,
        'source': req.url or f"https://www.youtube.com/watch?v={vid}",
        'chunks': chunks,
        'vocab': vocab
    }
    save_processed(vid, meta)

    return {
        'video_id': vid,
        'videoId': vid,
        'status': 'ready',
        'chunks': len(chunks)
    }

@app.post('/ask')
def ask(req: AskRequest):
    raw = req.video_id or req.videoId or ""
    vid = clean_video_id(raw)
    if not vid:
        raise HTTPException(status_code=400, detail="Missing or invalid videoId.")

    meta = load_processed(vid)
    if not meta:
        raise HTTPException(status_code=404, detail='Video not processed yet.')

    chunks = meta.get('chunks', [])
    vocab = meta.get('vocab', {})
    question = req.question.strip()

    q_vec = compute_term_vector(question, vocab)
    sims = []
    for i, c in enumerate(chunks):
        c_vec = compute_term_vector(c['text'], vocab)
        sim = cosine(q_vec, c_vec)
        sims.append((i, sim))

    sims.sort(key=lambda x: x[1], reverse=True)
    top_indices = [idx for idx, s in sims[:4] if s > 0]
    if not top_indices and sims:
        top_indices = [sims[0][0]]

    retrieved = [chunks[i] for i in top_indices]

    # Format timestamp objects
    timestamps = [
        {
            'start': c['start'],
            'end': c['end'],
            'label': f"{int(c['start']//60):02d}:{int(c['start']%60):02d}"
        }
        for c in retrieved
    ]

    first_time = timestamps[0]['label'] if timestamps else "00:00"
    quotes = " ".join([c['text'] for c in retrieved[:2]])
    answer = f"According to the video transcript (referenced at {first_time}):\n\n\"{quotes}\""

    return {
        'answer': answer,
        'timestamps': timestamps,
        'sourceChunks': retrieved
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("processing_service:app", host="0.0.0.0", port=8000, reload=True)
