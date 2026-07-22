"""Safety layer: command allowlist and filesystem sandboxing.

The assistant can only run commands from APPROVED_COMMANDS (fixed argv lists,
no shell, no user-supplied arguments) and can only search inside roots the
user explicitly configured in ALLOWED_SEARCH_ROOTS.
"""
import platform
from pathlib import Path

from ..config import settings

_IS_WINDOWS = platform.system() == "Windows"
_IS_MAC = platform.system() == "Darwin"

# id -> (label, argv). Fixed argv lists executed WITHOUT a shell.
APPROVED_COMMANDS: dict[str, tuple[str, list[str]]] = {
    "uptime": ("System uptime", ["uptime"] if not _IS_WINDOWS else ["powershell", "-c", "(Get-Date) - (gcim Win32_OperatingSystem).LastBootUpTime"]),
    "date": ("Current date/time", ["date"] if not _IS_WINDOWS else ["powershell", "-c", "Get-Date"]),
    "whoami": ("Current user", ["whoami"]),
    "hostname": ("Host name", ["hostname"]),
    "disk_usage": ("Disk usage", ["df", "-h"] if not _IS_WINDOWS else ["powershell", "-c", "Get-PSDrive -PSProvider FileSystem"]),
    "network_info": ("Network interfaces", ["ifconfig"] if _IS_MAC else (["ipconfig"] if _IS_WINDOWS else ["ip", "addr"])),
}


def is_path_allowed(path: Path) -> bool:
    """True only when *path* resolves inside a user-approved search root."""
    try:
        resolved = path.resolve()
    except OSError:
        return False
    return any(resolved == root or root in resolved.parents for root in settings.search_roots)
