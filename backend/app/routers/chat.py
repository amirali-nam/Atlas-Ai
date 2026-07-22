"""Chat endpoint — streams LLM tokens over Server-Sent Events and persists history."""
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..core.personality import build_system_prompt
from ..database import Conversation, Message, Preference, get_db
from ..schemas import ChatRequest, ConversationDetail, ConversationOut
from ..services import ollama_service

router = APIRouter(prefix="/api", tags=["chat"])

HISTORY_WINDOW = 20  # messages of context sent to the model


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

    # 3 — stream tokens as SSE, persisting the full reply at the end
    async def event_stream():
        yield f"data: {json.dumps({'type': 'meta', 'conversation_id': conv_id})}\n\n"
        full: list[str] = []
        try:
            async for token in ollama_service.stream_chat(messages):
                full.append(token)
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        except Exception as exc:  # Ollama offline, model missing, etc.
            yield f"data: {json.dumps({'type': 'error', 'content': f'LLM link failure: {exc}'})}\n\n"
        reply = "".join(full)
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
