import re
from typing import Optional, Dict, Any
import requests

YOUTUBE_ID_REGEX = re.compile(r'^[a-zA-Z0-9_-]{11}$')

YOUTUBE_URL_PATTERNS = [
    re.compile(r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})'),
    re.compile(r'(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})'),
    re.compile(r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})'),
    re.compile(r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})'),
]

def extract_video_id(url_or_id: str) -> Optional[str]:
    """
    Extract and validate an 11-character YouTube video ID from various URL formats
    or bare video IDs. Returns None if invalid.
    """
    if not url_or_id:
        return None
    
    cleaned = url_or_id.strip()

    # Direct 11-character ID check
    if YOUTUBE_ID_REGEX.match(cleaned):
        return cleaned

    # Regex patterns check
    for pattern in YOUTUBE_URL_PATTERNS:
        match = pattern.search(cleaned)
        if match:
            candidate = match.group(1)
            if YOUTUBE_ID_REGEX.match(candidate):
                return candidate

    return None

def fetch_video_metadata(video_id: str) -> Dict[str, Any]:
    """
    Fetches title, author, and thumbnail from YouTube's public oEmbed endpoint.
    Falls back to sensible defaults if unreachable.
    """
    default_thumb = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
    default_meta = {
        "videoId": video_id,
        "title": f"YouTube Video ({video_id})",
        "author": "YouTube Creator",
        "thumbnail": default_thumb,
        "youtubeUrl": f"https://www.youtube.com/watch?v={video_id}"
    }

    try:
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        resp = requests.get(oembed_url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            return {
                "videoId": video_id,
                "title": data.get("title", default_meta["title"]),
                "author": data.get("author_name", default_meta["author"]),
                "thumbnail": data.get("thumbnail_url", default_thumb),
                "youtubeUrl": f"https://www.youtube.com/watch?v={video_id}"
            }
    except Exception:
        pass

    return default_meta
