from pathlib import Path

import pytest

from app.api import routes
from app.db import configure_database, reset_database
from app.services.pipeline_service import PipelineService
from app.services.workflow_store import WorkflowStore


@pytest.fixture(autouse=True)
def isolated_database(tmp_path: Path) -> None:
    database_url = f"sqlite+pysqlite:///{(tmp_path / 'test.sqlite3').as_posix()}"
    configure_database(database_url)
    reset_database()
    routes.store = WorkflowStore()
    routes.pipeline_service = PipelineService(routes.store)
    yield
