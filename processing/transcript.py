import html
from typing import List, Dict, Any, Tuple
from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
    CouldNotRetrieveTranscript
)

class TranscriptException(Exception):
    def __init__(self, message: str, status_code: int = 422):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

def _extract_snippet_data(s: Any) -> Dict[str, Any]:
    """Helper to extract text, start, duration from dict or FetchedTranscriptSnippet object."""
    if isinstance(s, dict):
        text = str(s.get("text", ""))
        start = float(s.get("start", 0))
        duration = float(s.get("duration", 0))
    else:
        text = str(getattr(s, "text", ""))
        start = float(getattr(s, "start", 0))
        duration = float(getattr(s, "duration", 0))
    
    # Unescape HTML entities (e.g., &amp; -> &, &#39; -> ')
    clean_text = html.unescape(text).replace("\n", " ").strip()
    return {
        "text": clean_text,
        "start": round(max(0.0, start), 2),
        "duration": round(max(0.1, duration), 2)
    }

def get_transcript(video_id: str) -> Tuple[List[Dict[str, Any]], bool]:
    """
    Fetches transcript segments for the provided video ID.
    Supports both youtube-transcript-api v1.x (instance-based) and v0.x (class-based).
    Returns:
        (segments, is_generated): list of segment dicts and boolean indicating if auto-generated.
    Raises:
        TranscriptException with user-friendly error message.
    """
    try:
        # Determine whether to use instance or class methods
        api_instance = YouTubeTranscriptApi() if isinstance(YouTubeTranscriptApi, type) else YouTubeTranscriptApi
        
        # 1. Retrieve transcript list
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
        is_generated = False
        target_langs = ['en', 'en-US', 'en-GB', 'en-CA', 'en-AU', 'en-IN']

        if transcript_list:
            # Priority 1: Manually created English transcript
            try:
                transcript_obj = transcript_list.find_manually_created_transcript(target_langs)
                is_generated = False
            except Exception:
                pass

            # Priority 2: Auto-generated English transcript
            if not transcript_obj:
                try:
                    transcript_obj = transcript_list.find_generated_transcript(target_langs)
                    is_generated = True
                except Exception:
                    pass

            # Priority 3: Fallback to any transcript, translating to English if possible
            if not transcript_obj:
                for t in transcript_list:
                    transcript_obj = t
                    is_generated = getattr(t, "is_generated", False)
                    # Attempt translation to English if available
                    if getattr(t, "is_translatable", False):
                        try:
                            transcript_obj = t.translate('en')
                        except Exception:
                            pass
                    break

        # 2. Fetch raw segments
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
            # Direct fetch fallback if listing didn't produce an object
            try:
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
                is_generated = getattr(fetched, "is_generated", True)
            except Exception as direct_err:
                raise direct_err

        if not raw_segments:
            raise TranscriptException(f"No transcripts found for video {video_id}.", 404)

        # 3. Clean segments
        cleaned_segments = []
        for s in raw_segments:
            item = _extract_snippet_data(s)
            if item["text"]:
                cleaned_segments.append(item)

        if not cleaned_segments:
            raise TranscriptException("Transcript is empty for this video.", 422)

        return cleaned_segments, is_generated

    except TranscriptsDisabled:
        raise TranscriptException("Captions/transcripts are disabled by the creator for this video.", 422)
    except NoTranscriptFound:
        raise TranscriptException("No captions or transcripts could be found for this video.", 404)
    except VideoUnavailable:
        raise TranscriptException("This YouTube video is unavailable or private.", 404)
    except CouldNotRetrieveTranscript as e:
        raise TranscriptException(f"Could not retrieve transcript from YouTube: {str(e)}", 502)
    except TranscriptException:
        raise
    except Exception as e:
        raise TranscriptException(f"Failed to fetch transcript: {str(e)}", 500)
