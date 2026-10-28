"""
database.py
-----------
Handles SQLite database initialization and connection management using aiosqlite.
Tables are created automatically on startup.
"""

import aiosqlite
import os
from pathlib import Path

# Resolve the database path relative to this file
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = os.getenv("DATABASE_URL", str(BASE_DIR / "data" / "file_tampering.db"))


async def get_db() -> aiosqlite.Connection:
    """Open and return an async SQLite connection with row_factory set."""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


async def init_db() -> None:
    """Create all required tables if they do not already exist."""
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.executescript(
            """
            PRAGMA journal_mode=WAL;

            CREATE TABLE IF NOT EXISTS registered_files (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                file_id       TEXT    NOT NULL UNIQUE,
                file_name     TEXT    NOT NULL,
                sha256_hash   TEXT    NOT NULL,
                file_size     INTEGER NOT NULL,
                registered_at TEXT    NOT NULL,
                storage_path  TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_registered_files_file_id
                ON registered_files (file_id);

            CREATE INDEX IF NOT EXISTS idx_registered_files_file_name
                ON registered_files (file_name);

            CREATE TABLE IF NOT EXISTS verification_history (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                file_id       TEXT    NOT NULL,
                file_name     TEXT    NOT NULL,
                original_hash TEXT    NOT NULL,
                current_hash  TEXT,
                result        TEXT    NOT NULL,
                verified_at   TEXT    NOT NULL,
                error_message TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_verification_history_file_id
                ON verification_history (file_id);

            CREATE INDEX IF NOT EXISTS idx_verification_history_result
                ON verification_history (result);
            """
        )
        await db.commit()
