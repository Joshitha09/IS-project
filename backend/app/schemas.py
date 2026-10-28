"""
schemas.py
----------
Pydantic request/response schemas for the FastAPI application.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ──────────────────────────────────────────────
# Registered Files
# ──────────────────────────────────────────────

class RegisteredFileBase(BaseModel):
    file_name: str
    sha256_hash: str
    file_size: int


class RegisteredFileResponse(RegisteredFileBase):
    file_id: str
    registered_at: str
    storage_path: Optional[str] = None
    last_verification_result: Optional[str] = None

    model_config = {"from_attributes": True}


class RegisteredFileListItem(BaseModel):
    """Lightweight representation used in list endpoints."""
    file_id: str
    file_name: str
    sha256_hash: str
    file_size: int
    registered_at: str
    last_verification_result: Optional[str] = None

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────
# Verification History
# ──────────────────────────────────────────────

class VerificationResult(BaseModel):
    file_id: str
    file_name: str
    original_hash: str
    current_hash: Optional[str]
    result: str          # "INTEGRITY VERIFIED" | "TAMPERING DETECTED" | "VERIFICATION FAILED"
    verified_at: str
    error_message: Optional[str] = None


class VerificationHistoryItem(VerificationResult):
    id: int

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────
# Dashboard Statistics
# ──────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_registered: int
    total_verified: int           # Unique files that have been verified at least once
    total_tampered: int           # Unique files with at least one TAMPERING DETECTED result
    total_verification_attempts: int
    recent_activities: list[VerificationHistoryItem]
    status_distribution: dict[str, int]   # { "INTEGRITY VERIFIED": N, "TAMPERING DETECTED": M, ... }


# ──────────────────────────────────────────────
# Generic Response
# ──────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None
