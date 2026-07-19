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

## Local database schema changes

This MVP uses `Base.metadata.create_all()` rather than migrations. That operation
creates missing tables but does not add columns to existing tables. After pulling
the intake-sequence schema change, an existing local `negotiator.db` must therefore
be deleted manually and recreated by restarting the API. The application will not
delete it automatically; preserve or export any local data you need first.
