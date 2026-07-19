"""Shared isolated application fixtures."""

from collections.abc import Iterator
from hashlib import sha256
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def _file_fingerprint(path: Path) -> tuple[bool, int | None, str | None]:
    if not path.exists():
        return False, None, None
    content = path.read_bytes()
    return True, len(content), sha256(content).hexdigest()


@pytest.fixture(scope="session", autouse=True)
def preserve_development_database() -> Iterator[None]:
    database_path = Path(__file__).parents[1] / "negotiator.db"
    before = _file_fingerprint(database_path)
    yield
    assert _file_fingerprint(database_path) == before


@pytest.fixture
def app_settings(tmp_path: Path) -> Settings:
    return Settings(
        database_url=f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
        upload_dir=tmp_path / "uploads",
        max_upload_size_mb=1,
        _env_file=None,
    )


@pytest.fixture
def client(app_settings: Settings) -> Iterator[TestClient]:
    with TestClient(create_app(app_settings)) as test_client:
        yield test_client
