"""Allowlisted local command execution."""
from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool

from ..schemas import CommandRequest
from ..services import command_service

router = APIRouter(prefix="/api/commands", tags=["commands"])


@router.get("")
def list_commands():
    return command_service.list_commands()


@router.post("/execute")
async def execute(req: CommandRequest):
    return await run_in_threadpool(command_service.execute, req.command_id)
