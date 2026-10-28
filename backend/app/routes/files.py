"""
routes/files.py
---------------
REST endpoints for file registration and management.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Depends
from fastapi.responses import JSONResponse

import aiosqlite

from ..database import get_db
from ..schemas import (
    RegisteredFileResponse,
    RegisteredFileListItem,
    MessageResponse,
    VerificationResult,
)
from .. import services

router = APIRouter(prefix="/api/files", tags=["files"])


async def _get_db():
    db = await get_db()
    try:
        yield db
    finally:
        await db.close()


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/files/register
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=RegisteredFileResponse, status_code=201)
async def register_file(
    file: UploadFile = File(...),
    db: aiosqlite.Connection = Depends(_get_db),
):
    """
    Register an original file by calculating its SHA-256 hash on the server.
    The hash is NEVER trusted from the client.
    """
    try:
        result = await services.register_file(file.filename or "unknown", file.file, db)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal server error: {exc}")


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/files
# ──────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[RegisteredFileListItem])
async def list_files(
    search: str = Query(default="", description="Search by file name"),
    status: str = Query(default="", description="Filter by last verification status"),
    db: aiosqlite.Connection = Depends(_get_db),
):
    """List all registered files with optional search and status filter."""
    return await services.list_registered_files(
        db,
        search=search or None,
        status_filter=status or None,
    )


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/files/{file_id}
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/{file_id}", response_model=RegisteredFileResponse)
async def get_file(
    file_id: str,
    db: aiosqlite.Connection = Depends(_get_db),
):
    """Retrieve details of a single registered file."""
    try:
        return await services.get_file_details(file_id, db)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# ──────────────────────────────────────────────────────────────────────────────
# DELETE /api/files/{file_id}
# ──────────────────────────────────────────────────────────────────────────────

@router.delete("/{file_id}", response_model=MessageResponse)
async def delete_file(
    file_id: str,
    db: aiosqlite.Connection = Depends(_get_db),
):
    """
    Delete a registered file and its trusted baseline.
    Warning: This permanently removes the trusted hash for this file.
    """
    try:
        await services.delete_registered_file(file_id, db)
        return MessageResponse(message="File registration deleted successfully.")
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/files/{file_id}/verify
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/{file_id}/verify", response_model=VerificationResult)
async def verify_file(
    file_id: str,
    file: UploadFile = File(...),
    db: aiosqlite.Connection = Depends(_get_db),
):
    """
    Verify file integrity by comparing the uploaded file's SHA-256 hash
    against the trusted original hash stored in the database.
    """
    try:
        result = await services.verify_file(file_id, file.file, db)
        return result
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Verification error: {exc}")
