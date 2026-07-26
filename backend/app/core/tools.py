"""Agent tools ATLAS can call during a conversation.

Every tool maps to an existing, already-sandboxed service (read-only telemetry,
sandboxed file search, allowlisted command execution). Nothing here can perform
a destructive or unapproved action — the model can only reach what these
functions expose.
"""
from ..services import command_service, file_service, system_service

# ── Tool schemas advertised to the model (Ollama "tools" format) ──────────
TOOL_SPECS = [
    {
        "type": "function",
        "function": {
            "name": "get_system_status",
            "description": "Get live system telemetry: CPU %, RAM usage, disk usage, "
            "uptime and platform. Use when the Administrator asks about this machine's status.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_files",
            "description": "Search filenames inside the Administrator-approved directories. "
            "Returns matching file paths. Use when asked to find or locate a file.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Text to match in file names."}
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_directory",
            "description": "List what is inside a folder (files and subfolders) within the "
            "approved directories, e.g. the Desktop, Documents or Downloads. "
            "Use when the Administrator asks what is in a folder.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Folder to list, e.g. 'Desktop', '~/Documents', or an absolute path.",
                    }
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read the text contents of a file (txt, md, csv, json, code, etc.) "
            "inside an approved directory. Use when asked to read, summarize or quote a file.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "File to read, e.g. 'Desktop/notes.txt' or an absolute path.",
                    }
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_system_command",
            "description": "Run one APPROVED, read-only system command and return its output. "
            "Allowed command ids: uptime, date, whoami, hostname, disk_usage, network_info. "
            "Use for precise system facts.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command_id": {
                        "type": "string",
                        "enum": ["uptime", "date", "whoami", "hostname", "disk_usage", "network_info"],
                    }
                },
                "required": ["command_id"],
            },
        },
    },
]

# Human-readable labels shown in the UI while a tool runs.
TOOL_LABELS = {
    "get_system_status": "Accessing system telemetry",
    "search_files": "Searching local files",
    "list_directory": "Scanning directory",
    "read_file": "Reading file",
    "run_system_command": "Executing approved command",
}


def execute_tool(name: str, args: dict) -> str:
    """Run a tool by name with model-provided args; return a compact text result."""
    try:
        if name == "get_system_status":
            s = system_service.get_stats()
            return (
                f"CPU {s['cpu']['percent']}% ({s['cpu']['cores']} cores); "
                f"RAM {s['memory']['used_gb']}/{s['memory']['total_gb']} GB ({s['memory']['percent']}%); "
                f"Disk {s['disk']['used_gb']}/{s['disk']['total_gb']} GB ({s['disk']['percent']}%); "
                f"uptime {s['uptime_seconds']}s; {s['platform']} on {s['hostname']}."
            )

        if name == "search_files":
            res = file_service.search(str(args.get("query", "")).strip())
            if not res.get("enabled"):
                return "File search is disabled (no approved directories configured)."
            hits = res.get("results", [])
            if not hits:
                return "No matching files found."
            listing = "; ".join(f"{h['name']} ({h['path']})" for h in hits[:15])
            return f"Found {len(hits)} file(s): {listing}"

        if name == "list_directory":
            res = file_service.list_directory(str(args.get("path", "")))
            if not res.get("enabled"):
                return res.get("message", "File access disabled.")
            if res.get("error"):
                return res["error"]
            items = res.get("entries", [])
            if not items:
                return f"{res['path']} is empty."
            listing = "; ".join(
                f"{e['name']}{'/' if e['type'] == 'dir' else ''}" for e in items
            )
            return f"{res['path']} contains {res['count']} item(s): {listing}"

        if name == "read_file":
            res = file_service.read_file(str(args.get("path", "")))
            if not res.get("enabled"):
                return res.get("message", "File access disabled.")
            if res.get("error"):
                return res["error"]
            note = " (truncated)" if res.get("truncated") else ""
            return f"Contents of {res['path']}{note}:\n{res['content']}"

        if name == "run_system_command":
            out = command_service.execute(str(args.get("command_id", "")))
            if not out.get("ok"):
                return f"Command failed: {out.get('error') or 'unknown error'}"
            return f"{out.get('label', 'Result')}:\n{out.get('output', '').strip()}"

        return f"Unknown tool: {name}"
    except Exception as exc:  # never let a tool crash the agent loop
        return f"Tool '{name}' error: {exc}"
