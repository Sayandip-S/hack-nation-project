# Hack Nation Project — Atlas.ai

AI moving coordinator: plans the move, calls providers, compares quotes, and tracks inventory & budget.

**Full setup (clone → run → demo):** **[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)**

Also: **[Backend setup & API contract](docs/BACKEND_SETUP.md)**

## Quick start

**Frontend** (demo UI — mocks, no API required)

```powershell
git checkout feature/atlas-ai
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — login `demo@keyline.app` / `demo1234`

**Backend** (optional for the UI demo)

```powershell
cd backend
uv sync
uv run uvicorn main:app --reload --port 8000
```

Health: http://127.0.0.1:8000/ · Docs: http://127.0.0.1:8000/docs

## Branch

All Atlas.ai frontend + docs live on:

`feature/atlas-ai`
