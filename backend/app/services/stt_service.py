"""Offline speech-to-text via faster-whisper (lazy-loaded singleton)."""
import io
import threading

from ..config import settings

_model = None
_lock = threading.Lock()


def _get_model():
    global _model
    with _lock:
        if _model is None:
            from faster_whisper import WhisperModel

            # int8 keeps CPU inference fast; switch to "float16" + device="cuda" on GPU.
            _model = WhisperModel(settings.whisper_model, device="auto", compute_type="int8")
    return _model


def transcribe(audio_bytes: bytes) -> str:
    """Transcribe an audio file (webm/ogg/wav/mp3 — decoded by PyAV) to text."""
    model = _get_model()
    segments, _info = model.transcribe(io.BytesIO(audio_bytes), vad_filter=True)
    return " ".join(seg.text.strip() for seg in segments).strip()
