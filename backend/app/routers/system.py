"""System telemetry + service health."""
from fastapi import APIRouter

from ..services import ollama_service, system_service, tts_service

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/stats")
def stats():
    return system_service.get_stats()


@router.get("/health")
async def health():
    ollama = await ollama_service.check_health()
    return {
        "backend": "online",
        "ollama": ollama,
        "tts_ready": tts_service.is_available(),
    }
