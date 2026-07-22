"""Sandboxed file search (only inside user-approved roots)."""
from fastapi import APIRouter, Query

from ..services import file_service

router = APIRouter(prefix="/api/files", tags=["files"])


@router.get("/search")
def search(q: str = Query(min_length=1, max_length=200)):
    return file_service.search(q)
