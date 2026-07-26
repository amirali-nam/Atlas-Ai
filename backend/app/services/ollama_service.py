"""Streaming client for the local Ollama runtime."""
import json
from collections.abc import AsyncIterator

import httpx

from ..config import settings


async def check_health() -> dict:
    """Return Ollama availability and installed models."""
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            r = await client.get(f"{settings.ollama_url}/api/tags")
            r.raise_for_status()
            models = [m["name"] for m in r.json().get("models", [])]
            return {"online": True, "models": models, "active_model": settings.ollama_model}
    except (httpx.HTTPError, OSError):
        return {"online": False, "models": [], "active_model": settings.ollama_model}


async def chat_once(
    messages: list[dict], tools: list[dict] | None = None, options: dict | None = None
) -> dict:
    """Single non-streaming /api/chat call. Returns the full response dict
    (message may contain tool_calls). Used by the agentic loop."""
    opts = {"num_ctx": 4096, "num_predict": 500}
    if options:
        opts.update(options)
    payload: dict = {
        "model": settings.ollama_model,
        "messages": messages,
        "stream": False,
        "keep_alive": "30m",
        "options": opts,
    }
    if tools:
        payload["tools"] = tools
    async with httpx.AsyncClient(timeout=None) as client:
        r = await client.post(f"{settings.ollama_url}/api/chat", json=payload)
        r.raise_for_status()
        return r.json()


async def stream_chat(
    messages: list[dict], model: str | None = None, options: dict | None = None
) -> AsyncIterator[str]:
    """Yield response tokens from Ollama's /api/chat streaming endpoint.

    `options` overrides the defaults (e.g. a larger num_ctx and lower
    temperature for data-analysis queries that must read a full table).
    """
    opts = {"num_ctx": 2048, "num_predict": 300}
    if options:
        opts.update(options)
    payload = {
        "model": model or settings.ollama_model,
        "messages": messages,
        "stream": True,
        # Keep the model resident in RAM between requests → no cold-start lag.
        "keep_alive": "30m",
        "options": opts,
    }
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("POST", f"{settings.ollama_url}/api/chat", json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.strip():
                    continue
                chunk = json.loads(line)
                token = chunk.get("message", {}).get("content", "")
                if token:
                    yield token
                if chunk.get("done"):
                    break
