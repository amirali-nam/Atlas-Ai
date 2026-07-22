"""Voice endpoints: offline STT (faster-whisper) and TTS (Piper).

Audio arrives as base64 in JSON (not multipart) — see analysis router note.
"""
import base64

from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from pydantic import BaseModel, Field

from ..schemas import SpeakRequest
from ..services import stt_service, tts_service

router = APIRouter(prefix="/api/voice", tags=["voice"])

MAX_AUDIO_BYTES = 25 * 1024 * 1024


class TranscribeRequest(BaseModel):
    audio_b64: str = Field(min_length=1)


@router.post("/transcribe")
async def transcribe(req: TranscribeRequest):
    try:
        data = base64.b64decode(req.audio_b64)
    except Exception as exc:
        raise HTTPException(400, "Invalid base64 payload") from exc
    if not data:
        raise HTTPException(400, "Empty audio upload")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "Audio exceeds 25 MB limit")
    try:
        text = await run_in_threadpool(stt_service.transcribe, data)
    except Exception as exc:
        raise HTTPException(500, f"Transcription failure: {exc}") from exc
    return {"text": text}


@router.post("/speak")
async def speak(req: SpeakRequest):
    if not tts_service.is_available():
        raise HTTPException(503, "Piper voice model not installed. Run scripts/setup.sh.")
    try:
        wav = await run_in_threadpool(tts_service.synthesize, req.text)
    except Exception as exc:
        raise HTTPException(500, f"Synthesis failure: {exc}") from exc
    return Response(content=wav, media_type="audio/wav")
