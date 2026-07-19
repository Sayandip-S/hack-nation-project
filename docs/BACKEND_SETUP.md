# Corridoor AI — Backend setup & integration guide

For the backend team working on [Sayandip-S/hack-nation-project](https://github.com/Sayandip-S/hack-nation-project).

Branch with the current frontend: `feature/atlas-ai-moving-universe`.

---

## What this product is

**Corridoor AI** is an AI moving coordinator (not an apartment finder).

The agent:

1. Locks one **JobSpec** (origin → destination, inventory, dates)
2. Finds movers and **calls** them with the same pitch
3. Extracts structured quotes, ranks providers, recommends a deal
4. Tracks budget, timeline, documents, and analytics

The frontend (`frontend/`) is a React + Vite demo that currently runs **entirely on mock data** in the browser. There are **no API calls yet**. Your job is to stand up FastAPI endpoints (and later voice / vision / telephony) that the UI can switch onto.

---

## Repo layout

```
hack-nation-project/
├── backend/                 # FastAPI + uv (your area)
│   ├── main.py              # Minimal app today
│   ├── pyproject.toml
│   └── .venv/               # local only — gitignored
├── frontend/                # Corridoor AI Mission Control
│   └── src/
│       ├── types.ts         # Domain contracts (source of truth for shapes)
│       ├── lib/store.tsx    # Client state (replace with API later)
│       ├── mock/            # Seed data + call simulation
│       └── ...
└── docs/
    └── BACKEND_SETUP.md     # This file
```

---

## Prerequisites

| Tool | Version / notes |
|------|------------------|
| Python | **≥ 3.12** |
| [uv](https://docs.astral.sh/uv/) | Package manager used by this backend |
| Node.js | Only if you also run the frontend (18+ recommended) |
| Git | Clone the repo; use branch `feature/atlas-ai-moving-universe` for latest UI |

### Install uv (Windows)

```powershell
irm https://astral.sh/uv/install.ps1 | iex
```

Ensure `uv` is on your PATH (new terminal after install). Default install location is often:

`%USERPROFILE%\.local\bin`

---

## Backend setup

```powershell
cd path\to\hack-nation-project
git fetch origin
git checkout feature/atlas-ai-moving-universe   # or main once merged

cd backend
uv sync
```

### Run the API

```powershell
cd backend
uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

- Health check: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)  
  Expected: `{"message":"Backend is running"}`
- Interactive docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- OpenAPI JSON: [http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)

### Dev dependencies (tests)

```powershell
cd backend
uv sync --group dev
uv run pytest
```

### Environment variables

Create `backend/.env` (gitignored) when you add secrets. Suggested keys for the hackathon stack:

```env
# App
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Optional integrations (wire when ready)
# OPENAI_API_KEY=
# ELEVENLABS_API_KEY=
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=
# DATABASE_URL=
```

Load with something like `pydantic-settings` (add to `pyproject.toml` when needed).

---

## CORS (required for the Vite frontend)

The UI runs on **http://localhost:5173**. Allow that origin before the frontend calls you:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Corridoor AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Running frontend + backend together

**Terminal A — API**

```powershell
cd backend
uv run uvicorn main:app --reload --port 8000
```

**Terminal B — UI**

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Demo logins (frontend mock auth today)

| Email | Password | Notes |
|-------|----------|--------|
| `demo@corridoor.ai` | `demo1234` | John Doe — Munich → Berlin, onboarded |
| `sara@corridoor.ai` | `sara1234` | Second demo account |

When you own auth, keep these as seed users or document replacements.

---

## Domain model (align API with these types)

Canonical TypeScript definitions: `frontend/src/types.ts`.

### Core entities

| Entity | Purpose |
|--------|---------|
| **User** | `id`, `name`, `email` |
| **JobSpec** | Frozen move brief: cities, stairs, distance, inventory, date window, services, `specHash` |
| **Mover** | Provider: company, phone, rating, status, facts, calls, quote, risks |
| **Call** | Wave `1\|2\|3`, status, transcript, quote lines, leverage fields |
| **Quote** | Normalized total EUR, line items, comparability, rank, vs median |
| **InventoryPhoto** | Room photo → detected items + confidence |
| **DealRecommendation** | Chosen mover + savings + evidence |
| **Performance** | Calls made, quotes, savings, activity log |

### JobSpec (must be identical on every outbound call)

```ts
{
  specHash: string;
  originCity: string;
  originStairs: number;
  destCity: string;
  destStairs: number;
  distanceMiles: number;
  inventory: { item: string; qty: number }[];
  longCarryFt: number;
  dateWindow: [string, string];  // ISO dates
  services: string[];
  notes?: string;
  inventorySource?: "manual" | "photo_survey" | "mixed";
  photoSurveyCount?: number;
}
```

Demo scenario: **Munich → Berlin**, move date **2026-08-14**, budget ~**€1800**.

---

## Suggested API surface (to replace mocks)

The frontend store currently owns everything. Prioritize these endpoints so the UI can migrate off `frontend/src/mock/`:

### Auth

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/auth/signup` | name, email, password |
| `POST` | `/auth/login` | returns session / JWT |
| `POST` | `/auth/logout` | |
| `POST` | `/auth/forgot-password` | |

### Move / JobSpec

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/me/move` | Active move + JobSpec |
| `PUT` | `/me/move/job-spec` | Patch + recompute `specHash` |
| `POST` | `/me/move/job-spec/confirm` | Locks spec before dials |

### Inventory / vision

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/me/move/inventory/photos` | multipart images; return detected items |
| `GET` | `/me/move/inventory` | Current list + volume estimate |

### Providers & calls

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/me/move/providers/search` | Places / directory scan |
| `GET` | `/me/move/providers` | List movers + latest quotes |
| `POST` | `/me/move/calls/waves` | Start quote waves (async / webhook) |
| `GET` | `/me/move/calls` | Call list + status |
| `GET` | `/me/move/calls/{id}` | Transcript, recording URL, extraction |
| `POST` | `/me/move/calls/{id}/negotiate` | Wave 2/3 leverage |

### Ranking & close

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/me/move/recommendation` | DealRecommendation |
| `GET` | `/me/move/performance` | Analytics counters + activity |

### Documents / budget (phase 2)

| Method | Path | Notes |
|--------|------|--------|
| `GET/POST` | `/me/move/documents` | Contracts, invoices, transcripts |
| `GET` | `/me/move/budget` | Line items vs limit |

Prefer **JSON** matching `frontend/src/types.ts` field names so the UI can swap mocks with minimal mapping.

---

## Behaviour the mock engine already demonstrates

See `frontend/src/mock/engine.ts` and `frontend/src/config/vertical.ts`.

1. **Pitch** — Same JobSpec text on every call (includes photo-survey inventory when present).
2. **Waves** — Wave 1 gather quotes → Wave 2 cite best valid quote → Wave 3 close.
3. **Personas** — cooperative / guarded / evasive / upseller style counterparts.
4. **Extraction** — Itemised fees → Facts with transcript citations.
5. **Risks** — e.g. lowball vs market median, hidden stair fees.
6. **Ranking** — Score from price, rating, insurance signals, ETA.

Backend should preserve this contract even if implementations use Twilio + ElevenLabs + LLM extractors.

---

## Integration checklist

- [ ] `uv sync` + `uvicorn` health endpoint green  
- [ ] CORS for `localhost:5173`  
- [ ] Seed John Doe Munich → Berlin JobSpec  
- [ ] Auth endpoints (or shared mock JWT for demo)  
- [ ] JobSpec CRUD + confirm lock  
- [ ] Photo upload → inventory estimate  
- [ ] Provider search + call orchestration (can start with simulated calls)  
- [ ] WebSocket or polling for live call status (UI Call Board)  
- [ ] Recommendation + performance aggregates  
- [ ] Document OpenAPI so frontend can generate a thin client  

---

## Current backend code

`backend/main.py` today:

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Backend is running"}
```

Expand from here; keep `uv` as the package manager (`uv add <package>`, `uv sync`).

---

## Questions / ownership

| Area | Owner hint |
|------|------------|
| FastAPI, DB, auth, OpenAPI | Backend |
| UI, Mission Control, mock UX | Frontend (`frontend/`) |
| Voice agent / ElevenLabs | Backend + shared agent prompts |
| Telephony / Twilio | Backend |
| Vision inventory | Backend (UI already uploads client-side) |

Frontend type source of truth: **`frontend/src/types.ts`**.  
Call script / levers: **`frontend/src/config/vertical.ts`**.
