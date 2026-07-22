"""Safe execution of allowlisted commands only.

Guarantees: no shell interpretation, no user-supplied arguments,
hard timeout, output capped.
"""
import subprocess

from ..core.security import APPROVED_COMMANDS

TIMEOUT_S = 10
MAX_OUTPUT = 8000


def list_commands() -> list[dict]:
    return [{"id": cid, "label": label} for cid, (label, _argv) in APPROVED_COMMANDS.items()]


def execute(command_id: str) -> dict:
    if command_id not in APPROVED_COMMANDS:
        return {"ok": False, "output": "", "error": f"Command '{command_id}' is not on the approved list."}
    label, argv = APPROVED_COMMANDS[command_id]
    try:
        proc = subprocess.run(argv, capture_output=True, text=True, timeout=TIMEOUT_S, shell=False)
        out = (proc.stdout or proc.stderr or "").strip()[:MAX_OUTPUT]
        return {"ok": proc.returncode == 0, "label": label, "output": out, "error": None}
    except FileNotFoundError:
        return {"ok": False, "output": "", "error": f"'{argv[0]}' not found on this system."}
    except subprocess.TimeoutExpired:
        return {"ok": False, "output": "", "error": "Command timed out."}
