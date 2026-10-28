# File Tampering Detection System

A full-stack cybersecurity web application that detects unauthorized file modifications using **SHA-256 cryptographic hashing**.

Built with **React + Vite + Tailwind CSS** (frontend) and **Python FastAPI + SQLite** (backend).

---

## How It Works

1. **Register** an original file → the server computes its SHA-256 hash and stores it as the trusted baseline.
2. **Verify** a file later → the server recomputes the hash and compares it to the stored baseline.
3. If hashes match → **INTEGRITY VERIFIED** (contents unchanged).
4. If hashes differ → **TAMPERING DETECTED** (even a single byte change is detected).

SHA-256 hashes are always computed **server-side** — never trust a hash from the client.

---

## Project Structure

```
file-tampering-detection/
├── backend/
│   ├── app/
│   │   ├── main.py          ← FastAPI app entry point
│   │   ├── database.py      ← SQLite initialization (aiosqlite)
│   │   ├── hashing.py       ← SHA-256 chunk-based hashing
│   │   ├── schemas.py       ← Pydantic request/response models
│   │   ├── services.py      ← Business logic layer
│   │   └── routes/
│   │       ├── files.py     ← /api/files endpoints
│   │       ├── history.py   ← /api/history endpoint
│   │       ├── dashboard.py ← /api/dashboard/stats endpoint
│   │       └── reports.py   ← /api/reports/export endpoint
│   ├── tests/
│   │   └── test_api.py      ← pytest test suite (12 tests)
│   ├── data/                ← SQLite database (auto-created)
│   ├── requirements.txt
│   └── pytest.ini
├── frontend/
│   ├── src/
│   │   ├── components/      ← Reusable UI components
│   │   ├── pages/           ← Dashboard, Register, Verify, etc.
│   │   ├── services/api.js  ← Axios API service
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── storage/                 ← Uploaded original files (auto-created)
├── .gitignore
└── README.md
```

---

## Prerequisites

- **Python 3.9+** (tested on Python 3.14)
- **Node.js 18+** and **npm**

---

## Installation & Setup

### 1. Clone / Open the project

```
cd "IS project"
```

### 2. Backend Setup

Open **Terminal 1**:

```powershell
cd backend

# Install Python dependencies
pip install fastapi uvicorn[standard] python-multipart aiosqlite pydantic pydantic-settings python-dotenv httpx pytest pytest-asyncio anyio

# (Optional) Copy environment config
copy .env.example .env

# Start the backend server
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend will be available at: **http://127.0.0.1:8000**  
Interactive API docs: **http://127.0.0.1:8000/docs**

### 3. Frontend Setup

Open **Terminal 2**:

```powershell
cd frontend

# Install Node.js dependencies
npm install

# Start the frontend dev server
npm run dev
```

The frontend will be available at: **http://localhost:5173**

---

## Running Tests

```powershell
cd backend
python -m pytest tests/ -v
```

Expected output: **12 tests passed**.

### Test cases covered

| # | Test |
|---|------|
| 1 | Register a new original file |
| 2 | Verify an identical file (INTEGRITY VERIFIED) |
| 3 | Detect a modified file (TAMPERING DETECTED) |
| 4 | Detect a different file with the same name |
| 5 | Handle an empty file (rejected with 400) |
| 6 | Handle an invalid file ID (404) |
| 7 | Reject an oversized file (400) |
| 8 | Verify failed attempts are recorded in history |
| 9 | Confirm that deleting a registration works |
| 10 | Dashboard statistics remain consistent |
| 11 | Single-byte change causes hash mismatch |
| 12 | CSV export includes registered file data |
| 13 | List and search files by name |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/files/register` | Register an original file |
| GET | `/api/files` | List registered files (search, filter) |
| GET | `/api/files/{file_id}` | Get file details |
| DELETE | `/api/files/{file_id}` | Delete a registration |
| POST | `/api/files/{file_id}/verify` | Verify a file |
| GET | `/api/history` | Verification history (filter, search) |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/reports/export` | Download CSV report |

---

## Features

- ✅ **Dashboard** — Live stats, charts, recent activity
- ✅ **Register File** — SHA-256 baseline registration with drag-and-drop
- ✅ **Registered Files** — Searchable/sortable table, delete with confirmation
- ✅ **Verify File** — Upload-and-compare with visual hash diff
- ✅ **History** — All attempts with search, filter, detail modal
- ✅ **Reports** — CSV export (no file contents exposed)
- ✅ **Automated Tests** — 12+ pytest test cases

---

## Security Design

- SHA-256 hashing only (no MD5 or SHA-1)
- Hashes always computed server-side — client hashes are never trusted
- Files stored with UUID-based names to prevent path traversal
- Maximum file size enforced (configurable via `MAX_FILE_SIZE` env var)
- Empty files rejected at registration and verification
- Absolute server paths never exposed in API responses
- Files stored outside the web-accessible frontend directory

> **Note:** Hashes stored in this database could be altered by an attacker with direct database access. For production use, add HMAC-based integrity checks or digitally signed records, with the signing key stored separately.

---

## Troubleshooting

### Backend won't start — "Address already in use"
```powershell
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Frontend won't start — "Port 5173 in use"
```powershell
# Vite will automatically try port 5174
# Or kill the process using port 5173
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### "Module not found" errors
```powershell
pip install fastapi uvicorn[standard] python-multipart aiosqlite pydantic pydantic-settings python-dotenv httpx pytest pytest-asyncio anyio
```

### pydantic-core build error on Python 3.14
The pre-built wheel for pydantic-core may not exist for Python 3.14. In that case, install from a system-level package that already has a compatible wheel:
```powershell
pip install pydantic --upgrade
```

### Frontend shows "Cannot connect to backend"
Ensure the backend is running on http://127.0.0.1:8000 before starting the frontend.
The frontend proxy in `vite.config.js` forwards `/api` requests to the backend automatically.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and adjust:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `./data/file_tampering.db` | SQLite database path |
| `STORAGE_DIR` | `../storage` | Directory for stored original files |
| `MAX_FILE_SIZE` | `104857600` (100 MB) | Maximum upload file size in bytes |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Allowed frontend origins |
