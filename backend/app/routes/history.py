"""
routes/history.py
-----------------
Endpoint for querying verification history.
"""

from fastapi import APIRouter, Depends, Query
import aiosqlite

from ..database import get_db
from ..schemas import VerificationHistoryItem
from .. import services

router = APIRouter(prefix="/api/history", tags=["history"])


async def _get_db():
    db = await get_db()
    try:
        yield db
    finally:
        await db.close()


@router.get("", response_model=list[VerificationHistoryItem])
async def get_history(
    file_id: str = Query(default="", description="Filter by file ID"),
    result: str = Query(default="", description="Filter by result"),
    search: str = Query(default="", description="Search by file name"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: aiosqlite.Connection = Depends(_get_db),
):
    """Retrieve verification history with optional filters."""
    return await services.get_verification_history(
        db,
        file_id=file_id or None,
        result_filter=result or None,
        search=search or None,
        limit=limit,
        offset=offset,
    )
