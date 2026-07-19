"""SQLAlchemy engine, sessions, and health utilities."""

from collections.abc import Generator

from fastapi import Request
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    """Base class for future SQLAlchemy models."""


def create_database_engine(database_url: str) -> Engine:
    """Create an engine with SQLite-specific thread handling when needed."""
    connect_args = (
        {"check_same_thread": False}
        if make_url(database_url).get_backend_name() == "sqlite"
        else {}
    )
    return create_engine(database_url, connect_args=connect_args)


def create_session_factory(engine: Engine) -> sessionmaker[Session]:
    """Create a SQLAlchemy 2 session factory bound to an engine."""
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


engine = create_database_engine(get_settings().database_url)
SessionLocal = create_session_factory(engine)


def get_db(request: Request) -> Generator[Session, None, None]:
    """Yield a request-scoped database session."""
    db = request.app.state.session_factory()
    try:
        yield db
    finally:
        db.close()


def database_is_healthy(database_engine: Engine) -> bool:
    """Return whether the database accepts a minimal query."""
    try:
        with database_engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError:
        return False
    return True
