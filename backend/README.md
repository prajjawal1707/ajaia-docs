# Ajaia Docs — FastAPI backend

## Requirements
- Python 3.11+
- pip

## Local setup
```bash
cd backend
python -m venv .venv
# macOS/Linux
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Windows PowerShell: Copy-Item .env.example .env
# macOS/Linux: cp .env.example .env
uvicorn app.main:app --reload --port 8000
```
API health: http://localhost:8000/api/health  
Interactive API docs: http://localhost:8000/docs

The default database is SQLite (`./ajaia.db`) for quick local setup. For production, set `DATABASE_URL` to a managed PostgreSQL connection string, e.g. `postgresql+psycopg://USER:PASSWORD@HOST/DBNAME?sslmode=require`. Set a strong random `SECRET_KEY` and `FRONTEND_ORIGINS` to the deployed Vercel origin.

## Seeded demo users
- Alex Morgan — `alex@ajaia.demo`
- Sam Rivera — `sam@ajaia.demo`
- Jordan Lee — `jordan@ajaia.demo`

Demo login is intentionally passwordless and is for assignment evaluation only. Do not use this auth flow for a public production app.

## Authorization model
- Owner: read, edit, delete, share, revoke access.
- Editor: read and edit.
- Viewer: read only.
- Non-members receive 404 for document reads to avoid revealing document existence.
- Share-management routes are owner-only.

## File import
`POST /api/upload` accepts UTF-8 `.txt` and `.md` files up to 2 MB. Imported text becomes editable Tiptap paragraphs. Markdown syntax is retained as text; full Markdown parsing is intentionally out of scope.

## Tests
```bash
pytest -q
```
The integration test covers document creation, sharing, viewer read access, viewer edit denial, and persistence after update/reopen.

## Deployment
Deploy the backend as a Render Web Service:
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Add environment variables: `DATABASE_URL`, `SECRET_KEY`, `FRONTEND_ORIGINS`
- Use managed PostgreSQL (Neon or Render PostgreSQL), not ephemeral local SQLite for production.

For production, add Alembic migrations, proper OAuth/password auth, rate limiting, audit logs, upload malware scanning, optimistic concurrency, and structured logging.
