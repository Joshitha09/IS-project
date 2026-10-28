"""
services.py
-----------
Business logic layer — keeps routes thin and testable.
All database interactions happen here.
"""

import os
import uuid
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import aiosqlite

from .database import get_db
from .hashing import hash_bytes_stream, hash_file_path
from .schemas import (
    RegisteredFileResponse,
    RegisteredFileListItem,
    VerificationResult,
    VerificationHistoryItem,
    DashboardStats,
)

# ---------------------------------------------------------------------------
# Configuration (read once at import time; override in tests via env vars)
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = Path(os.getenv("STORAGE_DIR", str(BASE_DIR / "storage")))
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", str(100 * 1024 * 1024)))  # 100 MB default

# Verification result constants
RESULT_VERIFIED = "INTEGRITY VERIFIED"
RESULT_TAMPERED = "TAMPERING DETECTED"
RESULT_FAILED   = "VERIFICATION FAILED"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# File Registration
# ---------------------------------------------------------------------------

async def register_file(file_name: str, file_obj, db: aiosqlite.Connection) -> RegisteredFileResponse:
    """
    Register a new original file.

    Steps:
      1. Validate file size.
      2. Calculate SHA-256 hash.
      3. Store file safely in STORAGE_DIR.
      4. Insert record into registered_files.

    Security: Never trusts a hash from the client; always computes on the server.
    """
    # --- Read all bytes for size check (streaming) --------------------------
    file_obj.seek(0)
    total_bytes = 0
    chunks = []
    while chunk := file_obj.read(65_536):
        total_bytes += len(chunk)
        if total_bytes > MAX_FILE_SIZE:
            raise ValueError(
                f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024*1024)} MB."
            )
        chunks.append(chunk)

    if total_bytes == 0:
        raise ValueError("Empty files cannot be registered.")

    # --- Hash in memory from collected chunks --------------------------------
    import hashlib
    sha256 = hashlib.sha256()
    for c in chunks:
        sha256.update(c)
    file_hash = sha256.hexdigest()

    # --- Check for exact duplicate (same name AND same hash) ----------------
    async with db.execute(
        "SELECT file_id FROM registered_files WHERE sha256_hash = ? AND file_name = ?",
        (file_hash, file_name),
    ) as cursor:
        existing = await cursor.fetchone()
    if existing:
        raise ValueError(
            f"A file with the same name and identical content is already registered "
            f"(ID: {existing['file_id']})."
        )

    # --- Generate a safe, unique file ID ------------------------------------
    file_id = str(uuid.uuid4())
    registered_at = _now_iso()

    # --- Store the file safely outside the web root -------------------------
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    # Use file_id as the stored filename to prevent path traversal
    safe_extension = Path(file_name).suffix[:10]  # cap extension length
    stored_name = f"{file_id}{safe_extension}"
    storage_path = STORAGE_DIR / stored_name

    with open(storage_path, "wb") as out:
        for c in chunks:
            out.write(c)

    # --- Persist to database ------------------------------------------------
    await db.execute(
        """
        INSERT INTO registered_files
            (file_id, file_name, sha256_hash, file_size, registered_at, storage_path)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (file_id, file_name, file_hash, total_bytes, registered_at, str(storage_path)),
    )
    await db.commit()

    return RegisteredFileResponse(
        file_id=file_id,
        file_name=file_name,
        sha256_hash=file_hash,
        file_size=total_bytes,
        registered_at=registered_at,
        storage_path=None,  # Do NOT expose absolute server path in response
    )


# ---------------------------------------------------------------------------
# List Registered Files
# ---------------------------------------------------------------------------

async def list_registered_files(
    db: aiosqlite.Connection,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
) -> list[RegisteredFileListItem]:
    """Return all registered files, optionally filtered by name or last verification status."""

    # Subquery to get the latest verification result per file_id
    query = """
        SELECT
            rf.file_id,
            rf.file_name,
            rf.sha256_hash,
            rf.file_size,
            rf.registered_at,
            (
                SELECT vh.result
                FROM verification_history vh
                WHERE vh.file_id = rf.file_id
                ORDER BY vh.verified_at DESC
                LIMIT 1
            ) AS last_verification_result
        FROM registered_files rf
    """
    conditions = []
    params: list = []

    if search:
        conditions.append("rf.file_name LIKE ?")
        params.append(f"%{search}%")

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY rf.registered_at DESC"

    rows = []
    async with db.execute(query, params) as cursor:
        async for row in cursor:
            item = RegisteredFileListItem(
                file_id=row["file_id"],
                file_name=row["file_name"],
                sha256_hash=row["sha256_hash"],
                file_size=row["file_size"],
                registered_at=row["registered_at"],
                last_verification_result=row["last_verification_result"],
            )
            if status_filter and item.last_verification_result != status_filter:
                continue
            rows.append(item)
    return rows


# ---------------------------------------------------------------------------
# Get Single File Details
# ---------------------------------------------------------------------------

async def get_file_details(file_id: str, db: aiosqlite.Connection) -> RegisteredFileResponse:
    async with db.execute(
        "SELECT * FROM registered_files WHERE file_id = ?", (file_id,)
    ) as cursor:
        row = await cursor.fetchone()

    if not row:
        raise LookupError(f"No registered file found with ID '{file_id}'.")

    # Get last verification result
    async with db.execute(
        """
        SELECT result FROM verification_history
        WHERE file_id = ?
        ORDER BY verified_at DESC LIMIT 1
        """,
        (file_id,),
    ) as cursor:
        vh = await cursor.fetchone()

    return RegisteredFileResponse(
        file_id=row["file_id"],
        file_name=row["file_name"],
        sha256_hash=row["sha256_hash"],
        file_size=row["file_size"],
        registered_at=row["registered_at"],
        storage_path=None,  # Do not expose server path
        last_verification_result=vh["result"] if vh else None,
    )


# ---------------------------------------------------------------------------
# Delete Registered File
# ---------------------------------------------------------------------------

async def delete_registered_file(file_id: str, db: aiosqlite.Connection) -> None:
    async with db.execute(
        "SELECT storage_path FROM registered_files WHERE file_id = ?", (file_id,)
    ) as cursor:
        row = await cursor.fetchone()

    if not row:
        raise LookupError(f"No registered file found with ID '{file_id}'.")

    # Remove stored file from disk (if it exists)
    if row["storage_path"]:
        stored = Path(row["storage_path"])
        if stored.exists():
            stored.unlink()

    await db.execute("DELETE FROM registered_files WHERE file_id = ?", (file_id,))
    await db.commit()


# ---------------------------------------------------------------------------
# Verify File Integrity
# ---------------------------------------------------------------------------

async def verify_file(
    file_id: str, file_obj, db: aiosqlite.Connection
) -> VerificationResult:
    """
    Compare the uploaded file's hash against the trusted original hash.

    Returns a VerificationResult with one of three outcomes:
      INTEGRITY VERIFIED  — hashes match
      TAMPERING DETECTED  — hashes differ
      VERIFICATION FAILED — an error occurred during processing
    """
    verified_at = _now_iso()

    # --- Fetch trusted record -----------------------------------------------
    async with db.execute(
        "SELECT * FROM registered_files WHERE file_id = ?", (file_id,)
    ) as cursor:
        row = await cursor.fetchone()

    if not row:
        error_msg = f"No registered file found with ID '{file_id}'."
        await _record_history(
            db, file_id, "Unknown", "", None, RESULT_FAILED, verified_at, error_msg
        )
        raise LookupError(error_msg)

    file_name = row["file_name"]
    original_hash = row["sha256_hash"]

    # --- Hash the uploaded file ---------------------------------------------
    try:
        file_obj.seek(0)
        # Size check
        file_obj.seek(0, 2)  # seek to end
        size = file_obj.tell()
        file_obj.seek(0)

        if size == 0:
            raise ValueError("Uploaded file for verification is empty.")
        if size > MAX_FILE_SIZE:
            raise ValueError(
                f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024*1024)} MB."
            )

        current_hash = hash_bytes_stream(file_obj)
    except Exception as exc:
        error_msg = str(exc)
        await _record_history(
            db, file_id, file_name, original_hash, None,
            RESULT_FAILED, verified_at, error_msg
        )
        raise

    # --- Compare hashes -----------------------------------------------------
    result = RESULT_VERIFIED if current_hash == original_hash else RESULT_TAMPERED

    await _record_history(
        db, file_id, file_name, original_hash, current_hash,
        result, verified_at, None
    )

    return VerificationResult(
        file_id=file_id,
        file_name=file_name,
        original_hash=original_hash,
        current_hash=current_hash,
        result=result,
        verified_at=verified_at,
    )


async def _record_history(
    db, file_id, file_name, original_hash, current_hash,
    result, verified_at, error_message
):
    await db.execute(
        """
        INSERT INTO verification_history
            (file_id, file_name, original_hash, current_hash, result, verified_at, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (file_id, file_name, original_hash, current_hash, result, verified_at, error_message),
    )
    await db.commit()


# ---------------------------------------------------------------------------
# Verification History
# ---------------------------------------------------------------------------

async def get_verification_history(
    db: aiosqlite.Connection,
    file_id: Optional[str] = None,
    result_filter: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> list[VerificationHistoryItem]:
    query = "SELECT * FROM verification_history"
    conditions = []
    params: list = []

    if file_id:
        conditions.append("file_id = ?")
        params.append(file_id)
    if result_filter:
        conditions.append("result = ?")
        params.append(result_filter)
    if search:
        conditions.append("file_name LIKE ?")
        params.append(f"%{search}%")

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY verified_at DESC LIMIT ? OFFSET ?"
    params += [limit, offset]

    items = []
    async with db.execute(query, params) as cursor:
        async for row in cursor:
            items.append(
                VerificationHistoryItem(
                    id=row["id"],
                    file_id=row["file_id"],
                    file_name=row["file_name"],
                    original_hash=row["original_hash"],
                    current_hash=row["current_hash"],
                    result=row["result"],
                    verified_at=row["verified_at"],
                    error_message=row["error_message"],
                )
            )
    return items


# ---------------------------------------------------------------------------
# Dashboard Statistics
# ---------------------------------------------------------------------------

async def get_dashboard_stats(db: aiosqlite.Connection) -> DashboardStats:
    async with db.execute("SELECT COUNT(*) AS cnt FROM registered_files") as cursor:
        total_registered = (await cursor.fetchone())["cnt"]

    async with db.execute(
        "SELECT COUNT(DISTINCT file_id) AS cnt FROM verification_history"
    ) as cursor:
        total_verified = (await cursor.fetchone())["cnt"]

    async with db.execute(
        "SELECT COUNT(DISTINCT file_id) AS cnt FROM verification_history WHERE result = ?",
        (RESULT_TAMPERED,),
    ) as cursor:
        total_tampered = (await cursor.fetchone())["cnt"]

    async with db.execute(
        "SELECT COUNT(*) AS cnt FROM verification_history"
    ) as cursor:
        total_attempts = (await cursor.fetchone())["cnt"]

    # Status distribution
    dist: dict[str, int] = {RESULT_VERIFIED: 0, RESULT_TAMPERED: 0, RESULT_FAILED: 0}
    async with db.execute(
        "SELECT result, COUNT(*) AS cnt FROM verification_history GROUP BY result"
    ) as cursor:
        async for row in cursor:
            dist[row["result"]] = row["cnt"]

    # Recent 10 activities
    recent = await get_verification_history(db, limit=10, offset=0)

    return DashboardStats(
        total_registered=total_registered,
        total_verified=total_verified,
        total_tampered=total_tampered,
        total_verification_attempts=total_attempts,
        recent_activities=recent,
        status_distribution=dist,
    )


# ---------------------------------------------------------------------------
# CSV Export
# ---------------------------------------------------------------------------

async def export_csv(db: aiosqlite.Connection) -> str:
    """
    Generate and return a CSV string combining registered files and
    verification history. Does NOT include file contents.
    """
    import csv
    import io

    output = io.StringIO()
    writer = csv.writer(output)

    # -- Registered Files section --
    writer.writerow(["=== REGISTERED FILES ==="])
    writer.writerow(["File ID", "File Name", "SHA-256 Hash", "File Size (bytes)", "Registered At"])
    async with db.execute(
        "SELECT file_id, file_name, sha256_hash, file_size, registered_at FROM registered_files ORDER BY registered_at DESC"
    ) as cursor:
        async for row in cursor:
            writer.writerow([row["file_id"], row["file_name"], row["sha256_hash"], row["file_size"], row["registered_at"]])

    writer.writerow([])

    # -- Verification History section --
    writer.writerow(["=== VERIFICATION HISTORY ==="])
    writer.writerow([
        "ID", "File ID", "File Name", "Original Hash",
        "Current Hash", "Result", "Verified At", "Error Message"
    ])
    async with db.execute(
        "SELECT * FROM verification_history ORDER BY verified_at DESC"
    ) as cursor:
        async for row in cursor:
            writer.writerow([
                row["id"], row["file_id"], row["file_name"],
                row["original_hash"], row["current_hash"] or "",
                row["result"], row["verified_at"], row["error_message"] or ""
            ])

    return output.getvalue()
