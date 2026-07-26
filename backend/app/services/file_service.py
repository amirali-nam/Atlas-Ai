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


def _resolve_within_roots(path_str: str) -> Path | None:
    """Turn a loose path ('~/Desktop', '/Desktop', 'Desktop') into a real path
    that lives inside an approved root, or None if it can't be placed there."""
    s = (path_str or "").strip()
    candidates = [
        Path(s).expanduser(),
        Path.home() / s.lstrip("~/").lstrip("/"),
        Path.home() / Path(s).name,
    ]
    for c in candidates:
        try:
            resolved = c.resolve()
        except OSError:
            continue
        if resolved.exists() and resolved.is_dir() and is_path_allowed(resolved):
            return resolved
    return None


def list_directory(path_str: str) -> dict:
    """List the immediate contents of a directory inside an approved root."""
    if not settings.search_roots:
        return {"enabled": False, "message": "File access disabled. Set ALLOWED_SEARCH_ROOTS in backend/.env."}

    target = _resolve_within_roots(path_str)
    if target is None:
        allowed = ", ".join(str(r) for r in settings.search_roots) or "(none)"
        return {"enabled": True, "error": f"'{path_str}' is not inside an approved directory. Approved: {allowed}"}

    entries: list[dict] = []
    try:
        for child in sorted(target.iterdir(), key=lambda p: (p.is_file(), p.name.lower())):
            try:
                is_dir = child.is_dir()
                size = child.stat().st_size if child.is_file() else None
            except OSError:
                continue
            entries.append({"name": child.name, "type": "dir" if is_dir else "file", "size_bytes": size})
            if len(entries) >= 300:
                break
    except OSError as exc:
        return {"enabled": True, "error": f"Could not read directory: {exc}"}

    return {"enabled": True, "path": str(target), "count": len(entries), "entries": entries}
