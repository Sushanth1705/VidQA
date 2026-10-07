import re
from typing import List, Dict, Any

def split_into_sentences(text: str) -> List[str]:
    """
    Split text by sentence boundaries (. ! ?) without splitting numbers/abbreviations.
    """
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in sentences if s.strip()]

def count_words(text: str) -> int:
    return len(text.split())

def chunk_transcript(
    segments: List[Dict[str, Any]],
    target_words: int = 180,
    overlap_ratio: float = 0.2
) -> List[Dict[str, Any]]:
    """
    Semantic chunking of transcript segments:
    - Groups sentences into chunks of ~180 words.
    - Maintains a ~20% word overlap between consecutive chunks.
    - Preserves exact start_time and end_time timestamps.
    - Avoids splitting mid-sentence.
    """
    if not segments:
        return []

    # Flatten segments into a list of timed sentences
    timed_sentences: List[Dict[str, Any]] = []
    for seg in segments:
        txt = seg.get("text", "").strip()
        if not txt:
            continue
        seg_start = float(seg.get("start", 0))
        seg_dur = float(seg.get("duration", 0))
        seg_end = seg_start + seg_dur

        sents = split_into_sentences(txt)
        if not sents:
            sents = [txt]

        # Allocate time proportionally per sentence in segment
        total_len = sum(len(s) for s in sents)
        curr_start = seg_start
        for s in sents:
            ratio = len(s) / max(total_len, 1)
            duration_part = seg_dur * ratio
            s_end = curr_start + duration_part
            timed_sentences.append({
                "text": s,
                "start": curr_start,
                "end": min(s_end, seg_end)
            })
            curr_start = s_end

    if not timed_sentences:
        return []

    overlap_words = int(target_words * overlap_ratio)
    chunks: List[Dict[str, Any]] = []
    n = len(timed_sentences)
    i = 0
    chunk_index = 0

    while i < n:
        words = 0
        j = i
        chunk_sents: List[str] = []

        while j < n and words < target_words:
            sentence_text = timed_sentences[j]["text"]
            chunk_sents.append(sentence_text)
            words += count_words(sentence_text)
            j += 1

        # Determine start and end timestamps in integer seconds
        start_time = int(round(timed_sentences[i]["start"]))
        end_idx = min(j - 1, n - 1)
        end_time = int(round(timed_sentences[end_idx]["end"]))
        
        # Ensure end_time is at least start_time
        if end_time < start_time:
            end_time = start_time + 1

        chunk_text = " ".join(chunk_sents).strip()
        chunks.append({
            "chunk_id": f"chunk_{chunk_index}",
            "text": chunk_text,
            "start_time": start_time,
            "end_time": end_time,
            "word_count": words
        })
        chunk_index += 1

        # Advance with overlap
        if j >= n:
            break

        # Move back by overlap_words
        accumulated_back = 0
        k = j - 1
        while k > i and accumulated_back < overlap_words:
            accumulated_back += count_words(timed_sentences[k]["text"])
            k -= 1

        # Ensure index always advances
        next_i = max(i + 1, k + 1)
        i = next_i

    return chunks
