"""Offline text-to-speech via Piper (lazy-loaded singleton). Returns WAV bytes."""
import io
import re
import threading
import wave

MAX_SPOKEN_CHARS = 700


def _clean(text: str) -> str:
    """Strip markdown noise and cap length so speech stays snappy."""
    text = re.sub(r"[*#`_]+", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > MAX_SPOKEN_CHARS:
        cut = text[:MAX_SPOKEN_CHARS]
        text = cut[: cut.rfind(".") + 1] or cut  # end on a sentence if possible
    return text

from ..config import settings

_voice = None
_lock = threading.Lock()


def is_available() -> bool:
    return settings.piper_voice_path.exists()


def _get_voice():
    global _voice
    with _lock:
        if _voice is None:
            from piper import PiperVoice

            _voice = PiperVoice.load(str(settings.piper_voice_path))
    return _voice


def synthesize(text: str) -> bytes:
    """Render *text* to a WAV byte buffer with the configured Piper voice.

    Handles both Piper APIs: piper-tts >= 1.3 exposes synthesize_wav();
    older releases take a wave file via synthesize().
    """
    text = _clean(text)
    voice = _get_voice()
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        if hasattr(voice, "synthesize_wav"):
            voice.synthesize_wav(text, wav)
        else:
            voice.synthesize(text, wav)
    return buf.getvalue()
