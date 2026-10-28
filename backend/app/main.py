"""
main.py
-------
FastAPI application entry point.

- Initializes the database on startup.
- Configures CORS so the React frontend (localhost:5173) can call the API.
- Registers all route modules.
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load .env if present
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from .database import init_db
from .routes import files, history, dashboard, reports


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables before accepting requests."""
    await init_db()
    yield


app = FastAPI(
    title="File Tampering Detection System",
    description=(
        "A cybersecurity tool that detects unauthorized file modifications "
        "using SHA-256 cryptographic hashing."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
_raw_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
)
origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ───────────────────────────────────────────────────────────────────
app.include_router(files.router)
app.include_router(history.router)
app.include_router(dashboard.router)
app.include_router(reports.router)


@app.get("/", tags=["health"])
async def root():
    return {"status": "ok", "service": "File Tampering Detection System"}


@app.get("/api/health", tags=["health"])
async def health():
    return {"status": "ok"}
