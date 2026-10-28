"""
hashing.py
----------
Cryptographic hashing utilities.

Uses SHA-256 (via Python's hashlib) and reads files in chunks so that
large files are never fully loaded into memory at once.

Security note:
  Hashes stored in a database can be altered by an attacker who has direct
  database access. For stronger guarantees, add HMAC-based integrity checks
  or digitally signed baseline records, with the secret or signing key stored
  separately from the database.
"""

import hashlib
from pathlib import Path

# Read in 64-KB chunks for memory-efficient hashing of large files
CHUNK_SIZE = 65_536  # 64 KB


def hash_file_path(file_path: str | Path) -> str:
    """
    Calculate the SHA-256 hash of a file located at *file_path*.

    Reads the file incrementally in chunks to avoid loading the entire
    file into memory, making it safe for large files.

    Args:
        file_path: Absolute or relative path to the file.

    Returns:
        Lowercase hexadecimal SHA-256 digest string.

    Raises:
        FileNotFoundError: If the file does not exist.
        OSError: If the file cannot be read.
    """
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(CHUNK_SIZE):
            sha256.update(chunk)
    return sha256.hexdigest()


def hash_bytes_stream(file_obj) -> str:
    """
    Calculate the SHA-256 hash from a file-like object (supports .read()).

    Reads the stream in chunks. The caller is responsible for seeking to
    the beginning of the stream before calling this function if needed.

    Args:
        file_obj: A binary file-like object (e.g., SpooledTemporaryFile).

    Returns:
        Lowercase hexadecimal SHA-256 digest string.
    """
    sha256 = hashlib.sha256()
    while chunk := file_obj.read(CHUNK_SIZE):
        sha256.update(chunk)
    return sha256.hexdigest()
