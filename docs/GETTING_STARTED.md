# Corridoor AI — How to make it work

End-to-end setup for the Hack Nation project on branch  
`feature/atlas-ai`.

Repo: [Sayandip-S/hack-nation-project](https://github.com/Sayandip-S/hack-nation-project)  
Frontend contributor: [RohanMallikarjun](https://github.com/RohanMallikarjun)

---

## What you get

| Piece | Stack | Port |
|-------|--------|------|
| **Frontend** | React 19 + Vite + Tailwind | `5173` |
| **Backend** | FastAPI + uv + Uvicorn | `8000` |

The UI currently runs on **in-browser mocks** (no API required). The backend health endpoint is ready for integration — see [BACKEND_SETUP.md](./BACKEND_SETUP.md).

---

## 1. Clone & branch

```powershell
git clone https://github.com/Sayandip-S/hack-nation-project.git
cd hack-nation-project
git fetch origin
git checkout feature/atlas-ai
```

---

## 2. Frontend (required for the demo)

### Prerequisites

- **Node.js 18+** (20 LTS recommended)
- npm (comes with Node)

### Install & run

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

### Demo login

| Email | Password | User |
|-------|----------|------|
| `demo@corridoor.ai` | `demo1234` | John Doe (Munich → Berlin) |
| `sara@corridoor.ai` | `sara1234` | Sara Chen |

### Suggested click-path

1. Welcome → Sign in with demo account  
2. **Home** — Mission Control desk  
3. **Inventory** — upload / camera photo survey  
4. **Calls** — run quote waves  
5. **Moving Companies** — ranking + comparison  
6. Optional: Timeline, Budget, Analytics, Documents

### Frontend scripts

```powershell
npm run dev      # development server
npm run build    # production build → frontend/dist
npm run preview  # preview production build
```

---

## 3. Backend (optional for UI demo; required for API work)

### Prerequisites

- **Python ≥ 3.12**
- **[uv](https://docs.astral.sh/uv/)**  

Install uv (Windows):

```powershell
irm https://astral.sh/uv/install.ps1 | iex
```

Open a **new** terminal so `uv` is on PATH.

### Install & run

```powershell
cd backend
uv sync
uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

| URL | Purpose |
|-----|---------|
| http://127.0.0.1:8000/ | Health: `{"message":"Backend is running"}` |
| http://127.0.0.1:8000/docs | Swagger UI |
| http://127.0.0.1:8000/openapi.json | OpenAPI schema |

Full API contract & domain model: **[BACKEND_SETUP.md](./BACKEND_SETUP.md)**.

---

## 4. Run both together

**Terminal A — API**

```powershell
cd backend
uv run uvicorn main:app --reload --port 8000
```

**Terminal B — UI**

```powershell
cd frontend
npm run dev
```

When you wire the frontend to the API, enable CORS for `http://localhost:5173` (snippet in BACKEND_SETUP.md).

---

## 5. Troubleshooting

| Problem | Fix |
|---------|-----|
| `uv` not found | Reinstall uv; restart terminal; check `%USERPROFILE%\.local\bin` on PATH |
| Port 5173 in use | Stop other Vite processes or use `npm run dev -- --port 5174` |
| Blank UI after big change | Hard refresh `Ctrl+Shift+R` |
| `npm run build` fails | Run from `frontend/`; ensure Node 18+ |
| Push 403 to GitHub | You need write access on the repo; accept collaborator invite |
---

## 6. Project map

```
frontend/src/
  pages/           Welcome, Auth, Onboarding, Dashboard
  views/           Mission Control, Inventory, Timeline, Budget, …
  components/      Calls, quotes, photo capture, shell
  mock/            Seed JobSpec, movers, call engine, vision mock
  types.ts         Shared domain types (API should match these)

backend/
  main.py          FastAPI entry
  pyproject.toml   uv / dependencies
```

---

## 7. Product note

Corridoor AI coordinates a **physical move** (inventory → calls → quotes → close).  
Demo corridor: **Munich → Berlin**, move date **14 Aug 2026**, budget ~**€1800**.
