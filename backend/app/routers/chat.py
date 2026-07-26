"""Chat endpoint — agentic loop with tool use, streamed over Server-Sent Events."""
import json

from fastapi.concurrency import run_in_threadpool
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..core.personality import build_system_prompt
from ..core import tools as tool_registry
from ..database import Conversation, Message, Preference, get_db
from ..schemas import ChatRequest, ConversationDetail, ConversationOut
from ..services import ollama_service

router = APIRouter(prefix="/api", tags=["chat"])

HISTORY_WINDOW = 20  # messages of context sent to the model
MAX_TOOL_STEPS = 4   # safety cap on tool-call iterations per turn


@router.post("/chat")
async def chat(req: ChatRequest, db: Session = Depends(get_db)):
    # 1 — find or create the conversation
    conv = db.get(Conversation, req.conversation_id) if req.conversation_id else None
    if conv is None:
        conv = Conversation(title=req.message[:60])
        db.add(conv)
        db.commit()

    db.add(Message(conversation_id=conv.id, role="user", content=req.message))
    db.commit()

    # 2 — build model context: persona + recent history
    prefs = {p.key: p.value for p in db.query(Preference).all()}
    system_prompt = build_system_prompt(prefs.get("persona"), prefs.get("callsign"))
    history = db.query(Message).filter_by(conversation_id=conv.id).order_by(Message.id.desc()).limit(HISTORY_WINDOW).all()
    messages = [{"role": "system", "content": system_prompt}] + [
        {"role": m.role, "content": m.content} for m in reversed(history)
    ]
    conv_id = conv.id

    # 3 — agentic loop: let the model call tools, then stream the final answer
    async def event_stream():
        yield f"data: {json.dumps({'type': 'meta', 'conversation_id': conv_id})}\n\n"
        reply = ""
        try:
            # Tool-resolution phase (non-streaming). Emit a status line per tool.
            for _ in range(MAX_TOOL_STEPS):
                resp = await ollama_service.chat_once(messages, tools=tool_registry.TOOL_SPECS)
                msg = resp.get("message", {})
                calls = msg.get("tool_calls") or []
                if not calls:
                    reply = msg.get("content", "")
                    break
                messages.append(msg)  # assistant turn carrying the tool calls
                for call in calls:
                    fn = call.get("function", {})
                    name = fn.get("name", "")
                    args = fn.get("arguments", {}) or {}
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except json.JSONDecodeError:
                            args = {}
                    label = tool_registry.TOOL_LABELS.get(name, name)
                    yield f"data: {json.dumps({'type': 'tool', 'content': label})}\n\n"
                    result = await run_in_threadpool(tool_registry.execute_tool, name, args)
                    messages.append({"role": "tool", "content": result})

            # Final answer, streamed token by token for the typing effect.
            if reply:
                for chunk in reply.split(" "):
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk + ' '})}\n\n"
            else:
                async for token in ollama_service.stream_chat(messages):
                    reply += token
                    yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        except Exception as exc:  # Ollama offline, model missing, tools param unsupported…
            yield f"data: {json.dumps({'type': 'error', 'content': f'LLM link failure: {exc}'})}\n\n"

        if reply:
            session = next(get_db())
            session.add(Message(conversation_id=conv_id, role="assistant", content=reply))
            session.commit()
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(db: Session = Depends(get_db)):
    return db.query(Conversation).order_by(Conversation.id.desc()).all()


@router.get("/conversations/{conv_id}", response_model=ConversationDetail)
def get_conversation(conv_id: int, db: Session = Depends(get_db)):
    conv = db.get(Conversation, conv_id)
    if conv is None:
        raise HTTPException(404, "Conversation not found")
    return conv


@router.delete("/conversations/{conv_id}")
def delete_conversation(conv_id: int, db: Session = Depends(get_db)):
    conv = db.get(Conversation, conv_id)
    if conv is None:
        raise HTTPException(404, "Conversation not found")
    db.delete(conv)
    db.commit()
    return {"ok": True}
