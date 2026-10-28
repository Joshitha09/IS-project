"""
tests/test_api.py
-----------------
Automated backend tests covering all specified test cases.
Uses an in-memory/temporary SQLite database so tests never touch real data.
"""

import io
import os
import tempfile
import pytest
import pytest_asyncio
from pathlib import Path
from httpx import AsyncClient, ASGITransport

# Point to a temp DB and temp storage before importing the app
_tmp_dir = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = str(Path(_tmp_dir) / "test.db")
os.environ["STORAGE_DIR"]  = str(Path(_tmp_dir) / "storage")
os.environ["MAX_FILE_SIZE"] = str(1 * 1024 * 1024)  # 1 MB for tests

from app.main import app
from app.database import init_db


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Re-initialize a fresh database before every test."""
    import aiosqlite
    db_path = os.environ["DATABASE_URL"]
    # Drop existing tables by deleting and re-creating
    if Path(db_path).exists():
        Path(db_path).unlink()
    await init_db()
    yield


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


def _make_file(content: bytes, filename: str = "test.txt"):
    return ("file", (filename, io.BytesIO(content), "application/octet-stream"))


# ─────────────────────────────────────────────────────────────────
# 1. Register a new original file
# ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_file(client):
    files = [_make_file(b"Hello, World! This is original content.", "original.txt")]
    resp = await client.post("/api/files/register", files=files)
    assert resp.status_code == 201
    data = resp.json()
    assert "file_id" in data
    assert data["file_name"] == "original.txt"
    assert len(data["sha256_hash"]) == 64  # SHA-256 hex = 64 chars
    assert data["file_size"] == len(b"Hello, World! This is original content.")


# ─────────────────────────────────────────────────────────────────
# 2. Verify an identical file successfully (INTEGRITY VERIFIED)
# ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_verify_identical_file(client):
    content = b"Identical content for verification test."
    # Register
    reg_resp = await client.post(
        "/api/files/register",
        files=[_make_file(content, "sample.txt")],
    )
    assert reg_resp.status_code == 201
    file_id = reg_resp.json()["file_id"]

    # Verify same content
    ver_resp = await client.post(
        f"/api/files/{file_id}/verify",
        files=[_make_file(content, "sample.txt")],
    )
    assert ver_resp.status_code == 200
    result = ver_resp.json()
    assert result["result"] == "INTEGRITY VERIFIED"
    assert result["original_hash"] == result["current_hash"]


# ─────────────────────────────────────────────────────────────────
# 3. Detect a modified file (TAMPERING DETECTED)
# ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_detect_modified_file(client):
    original = b"Original secure content."
    modified = b"Original secure content!"  # changed last char

    reg_resp = await client.post(
        "/api/files/register",
        files=[_make_file(original, "document.txt")],
    )
    assert reg_resp.status_code == 201
    file_id = reg_resp.json()["file_id"]

    ver_resp = await client.post(
        f"/api/files/{file_id}/verify",
        files=[_make_file(modified, "document.txt")],
    )
    assert ver_resp.status_code == 200
    result = ver_resp.json()
    assert result["result"] == "TAMPERING DETECTED"
    assert result["original_hash"] != result["current_hash"]


# ─────────────────────────────────────────────────────────────────
# 4. Detect a different file with the same file name
# ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_detect_different_file_same_name(client):
    original = b"Content of original report.pdf"
    different = b"Content of a completely different file"

    reg_resp = await client.post(
        "/api/files/register",
        files=[_make_file(original, "report.pdf")],
    )
    file_id = reg_resp.json()["file_id"]

    ver_resp = await client.post(
        f"/api/files/{file_id}/verify",
        files=[_make_file(different, "report.pdf")],
    )
    assert ver_resp.status_code == 200
    assert ver_resp.json()["result"] == "TAMPERING DETECTED"


# ─────────────────────────────────────────────────────────────────
# 5. Handle an empty file (should be rejected)
# ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_empty_file(client):
    resp = await client.post(
        "/api/files/register",
        files=[_make_file(b"", "empty.txt")],
    )
    assert resp.status_code == 400
    assert "empty" in resp.json()["detail"].lower()


# ─────────────────────────────────────────────────────────────────
# 6. Handle an invalid file ID
# ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_invalid_file_id_verify(client):
    resp = await client.post(
        "/api/files/nonexistent-id-12345/verify",
        files=[_make_file(b"some content", "file.txt")],
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_invalid_file_id_get(client):
    resp = await client.get("/api/files/nonexistent-id-12345")
    assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────
# 7. Reject an oversized upload (> MAX_FILE_SIZE = 1 MB in tests)
# ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_reject_oversized_file(client):
    big_content = b"X" * (2 * 1024 * 1024)  # 2 MB > 1 MB limit
    resp = await client.post(
        "/api/files/register",
        files=[_make_file(big_content, "huge.bin")],
    )
    assert resp.status_code == 400
    assert "size" in resp.json()["detail"].lower()


# ─────────────────────────────────────────────────────────────────
# 8. Verify that failed attempts are recorded in history
# ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_failed_attempt_recorded(client):
    # Attempt to verify against a non-existent file_id
    await client.post(
        "/api/files/bad-id/verify",
        files=[_make_file(b"content", "test.txt")],
    )
    # The history should contain a VERIFICATION FAILED entry
    hist_resp = await client.get("/api/history?file_id=bad-id")
    assert hist_resp.status_code == 200
    items = hist_resp.json()
    assert len(items) >= 1
    assert items[0]["result"] == "VERIFICATION FAILED"


# ─────────────────────────────────────────────────────────────────
# 9. Confirm that deleting a registration works
# ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_registration(client):
    reg_resp = await client.post(
        "/api/files/register",
        files=[_make_file(b"Delete me content.", "todelete.txt")],
    )
    file_id = reg_resp.json()["file_id"]

    del_resp = await client.delete(f"/api/files/{file_id}")
    assert del_resp.status_code == 200

    get_resp = await client.get(f"/api/files/{file_id}")
    assert get_resp.status_code == 404


# ─────────────────────────────────────────────────────────────────
# 10. Dashboard statistics remain consistent
# ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_dashboard_stats_consistency(client):
    # Start: 0 registered
    stats0 = (await client.get("/api/dashboard/stats")).json()
    assert stats0["total_registered"] == 0
    assert stats0["total_verification_attempts"] == 0

    # Register two files
    content_a = b"File A content."
    content_b = b"File B content."
    id_a = (await client.post("/api/files/register", files=[_make_file(content_a, "a.txt")])).json()["file_id"]
    id_b = (await client.post("/api/files/register", files=[_make_file(content_b, "b.txt")])).json()["file_id"]

    stats1 = (await client.get("/api/dashboard/stats")).json()
    assert stats1["total_registered"] == 2

    # Verify A (match) and B (tampered)
    await client.post(f"/api/files/{id_a}/verify", files=[_make_file(content_a, "a.txt")])
    await client.post(f"/api/files/{id_b}/verify", files=[_make_file(b"Modified B!", "b.txt")])

    stats2 = (await client.get("/api/dashboard/stats")).json()
    assert stats2["total_verification_attempts"] == 2
    assert stats2["total_tampered"] >= 1
    assert stats2["status_distribution"]["INTEGRITY VERIFIED"] >= 1
    assert stats2["status_distribution"]["TAMPERING DETECTED"] >= 1


# ─────────────────────────────────────────────────────────────────
# Bonus: One-byte change causes hash mismatch
# ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_single_byte_change_detected(client):
    original = b"Secure document content here." 
    # Change exactly one byte at position 0
    tampered = bytearray(original)
    tampered[0] = tampered[0] ^ 0xFF  # flip bits of first byte
    tampered = bytes(tampered)

    reg_resp = await client.post(
        "/api/files/register",
        files=[_make_file(original, "secure.doc")],
    )
    file_id = reg_resp.json()["file_id"]

    ver_resp = await client.post(
        f"/api/files/{file_id}/verify",
        files=[_make_file(tampered, "secure.doc")],
    )
    assert ver_resp.json()["result"] == "TAMPERING DETECTED"


# ─────────────────────────────────────────────────────────────────
# Bonus: CSV export works
# ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_csv_export(client):
    await client.post(
        "/api/files/register",
        files=[_make_file(b"export test content", "export.txt")],
    )
    resp = await client.get("/api/reports/export")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "export.txt" in resp.text


# ─────────────────────────────────────────────────────────────────
# Bonus: List files and search
# ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_and_search_files(client):
    await client.post("/api/files/register", files=[_make_file(b"alpha content", "alpha.txt")])
    await client.post("/api/files/register", files=[_make_file(b"beta content", "beta.txt")])

    all_resp = await client.get("/api/files")
    assert len(all_resp.json()) == 2

    search_resp = await client.get("/api/files?search=alpha")
    assert len(search_resp.json()) == 1
    assert search_resp.json()[0]["file_name"] == "alpha.txt"
