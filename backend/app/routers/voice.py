"""Voice endpoints: offline STT (faster-whisper) and TTS (Piper)."""
from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response

from ..schemas import SpeakRequest
from ..services import stt_service, tts_service

router = APIRouter(prefix="/api/voice", tags=["voice"])

MAX_AUDIO_BYTES = 25 * 1024 * 1024


@router.post("/transcribe")
async def transcribe(audio: UploadFile):
    data = await audio.read()
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
