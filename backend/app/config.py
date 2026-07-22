"""Central configuration loaded from environment / .env file."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """All runtime settings. Everything defaults to localhost-only values."""

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"
    whisper_model: str = "tiny"
    piper_voice: str = "models/en_US-ryan-high.onnx"
    database_path: str = "data/atlas.db"
    allowed_search_roots: str = ""
    frontend_origin: str = "http://localhost:3000"

    @property
    def db_file(self) -> Path:
        p = Path(self.database_path)
        return p if p.is_absolute() else BACKEND_DIR / p

    @property
    def piper_voice_path(self) -> Path:
        p = Path(self.piper_voice)
        return p if p.is_absolute() else BACKEND_DIR / p

    @property
    def search_roots(self) -> list[Path]:
        return [
            Path(r.strip()).expanduser().resolve()
            for r in self.allowed_search_roots.split(",")
            if r.strip()
        ]


settings = Settings()
