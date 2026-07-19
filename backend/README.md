# The Negotiator backend

Start the development API from this directory:

```powershell
uv sync
uv run uvicorn main:app --reload
```

Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

## Specification lifecycle

`PUT /api/v1/jobs/{job_id}/specification` returns `201 Created` when it creates the
job's specification and `200 OK` when it updates the existing draft. A confirmed
specification is immutable in the current MVP: subsequent updates and repeated
confirmation attempts return `409 Conflict`.
