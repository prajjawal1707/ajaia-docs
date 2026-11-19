# Ajaia Docs

A lightweight document editor MVP with a React/Vite frontend and FastAPI backend.

## Run locally

### 1. Backend
```bash
cd backend
python -m venv .venv
# Windows PowerShell
.venv\\Scripts\\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (new terminal)
```bash
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```
Open http://localhost:5173. Seeded demo users: `alex@ajaia.demo`, `sam@ajaia.demo`, `jordan@ajaia.demo`.

## Production
Deploy frontend to Vercel and backend to Render. Use managed PostgreSQL for production. Set frontend `VITE_API_URL` to `https://YOUR-API/api`. Set backend `DATABASE_URL`, a strong `SECRET_KEY`, and `FRONTEND_ORIGINS` to your Vercel URL.

See `frontend/README.md` and `backend/README.md` for the API contract, deployment and limitations. Demo login is passwordless and intended only for evaluation, not production.
