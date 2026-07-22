"""Sandboxed local file search — restricted to user-approved roots."""
import fnmatch
import os
from pathlib import Path

from ..config import settings
from ..core.security import is_path_allowed

MAX_RESULTS = 100
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", ".next"}


def search(query: str) -> dict:
    """Case-insensitive filename search inside ALLOWED_SEARCH_ROOTS."""
    if not settings.search_roots:
        return {"enabled": False, "results": [], "message": "File search disabled. Set ALLOWED_SEARCH_ROOTS in backend/.env."}

    pattern = f"*{query.lower()}*"
    results: list[dict] = []
    for root in settings.search_roots:
        if not root.exists():
            continue
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
            for name in filenames:
                if fnmatch.fnmatch(name.lower(), pattern):
                    p = Path(dirpath) / name
                    if not is_path_allowed(p):
                        continue  # defense in depth (symlink escapes)
                    try:
                        stat = p.stat()
                    except OSError:
                        continue
                    results.append({"name": name, "path": str(p), "size_bytes": stat.st_size, "modified": stat.st_mtime})
                    if len(results) >= MAX_RESULTS:
                        return {"enabled": True, "results": results, "truncated": True}
    return {"enabled": True, "results": results, "truncated": False}
