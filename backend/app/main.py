"""FastAPI application setup for The Negotiator."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import models  # noqa: F401 - register model metadata before create_all
from app.config import Settings, get_settings
from app.database import (
    Base,
    SessionLocal,
    create_database_engine,
    create_session_factory,
    database_is_healthy,
    engine,
)
from app.routers.jobs import router as jobs_router


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build an application, optionally with isolated settings for tests."""
    app_settings = settings or get_settings()
    app_engine = (
        engine if settings is None else create_database_engine(settings.database_url)
    )
    session_factory = (
        SessionLocal if settings is None else create_session_factory(app_engine)
    )

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        application.state.settings.upload_dir.mkdir(parents=True, exist_ok=True)
        Base.metadata.create_all(bind=application.state.engine)
        try:
            yield
        finally:
            application.state.engine.dispose()

    application = FastAPI(
        title="The Negotiator API",
        version="0.1.0",
        lifespan=lifespan,
    )
    application.state.settings = app_settings
    application.state.engine = app_engine
    application.state.session_factory = session_factory

    application.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.frontend_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(jobs_router)

    @application.get("/")
    def root() -> dict[str, str]:
        return {"message": "Backend is running"}

    @application.get("/health")
    def health() -> JSONResponse:
        if not database_is_healthy(application.state.engine):
            return JSONResponse(
                status_code=503,
                content={"status": "unhealthy", "database": "disconnected"},
            )
        return JSONResponse(content={"status": "ok", "database": "connected"})

    return application


app = create_app()
