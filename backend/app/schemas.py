"""Pydantic request/response models."""
from datetime import datetime

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    conversation_id: int | None = None


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    id: int
    title: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetail(ConversationOut):
    messages: list[MessageOut]


class SpeakRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class CommandRequest(BaseModel):
    command_id: str


class PreferencesUpdate(BaseModel):
    values: dict[str, str]
