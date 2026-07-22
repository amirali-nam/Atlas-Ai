"""ATLAS Command — FastAPI entry point. Binds to localhost only."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .routers import analysis, chat, commands, files, settings as settings_router, system, voice


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="ATLAS Command",
    description="Fully local military-style AI assistant. No data leaves this machine.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    # Any localhost port — still loopback-only, so nothing external is admitted.
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (chat.router, voice.router, system.router, files.router, commands.router, settings_router.router, analysis.router):
    app.include_router(r)


@app.get("/")
def root():
    return {"system": "ATLAS Command", "status": "operational"}
