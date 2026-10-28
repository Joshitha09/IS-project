"""
routes/dashboard.py
-------------------
Endpoint for dashboard statistics.
"""

from fastapi import APIRouter, Depends
import aiosqlite

from ..database import get_db
from ..schemas import DashboardStats
from .. import services

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


async def _get_db():
    db = await get_db()
    try:
        yield db
    finally:
        await db.close()


@router.get("/stats", response_model=DashboardStats)
async def dashboard_stats(db: aiosqlite.Connection = Depends(_get_db)):
    """Return summary statistics for the dashboard."""
    return await services.get_dashboard_stats(db)
