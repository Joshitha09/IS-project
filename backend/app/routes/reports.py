"""
routes/reports.py
-----------------
CSV export endpoint.
"""

from fastapi import APIRouter, Depends
from fastapi.responses import Response
import aiosqlite

from ..database import get_db
from .. import services

router = APIRouter(prefix="/api/reports", tags=["reports"])


async def _get_db():
    db = await get_db()
    try:
        yield db
    finally:
        await db.close()


@router.get("/export")
async def export_report(db: aiosqlite.Connection = Depends(_get_db)):
    """
    Download a CSV report containing registered file metadata and
    verification history. File contents are never included.
    """
    csv_data = await services.export_csv(db)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="file_tampering_report.csv"'
        },
    )
