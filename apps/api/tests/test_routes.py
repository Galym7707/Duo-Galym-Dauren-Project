from fastapi.testclient import TestClient

from app.api import routes
from app.main import app
from app.models import CreateTaskRequest
from app.providers.gee import GeeSyncSummary
from app.services.demo_store import DemoStore
from app.services.pipeline_service import PipelineService


def make_client() -> TestClient:
    routes.store = DemoStore()
    routes.pipeline_service = PipelineService(routes.store)
    return TestClient(app)


def test_health_and_dashboard_contract() -> None:
    client = make_client()

    health = client.get("/health")
    dashboard = client.get("/api/v1/dashboard")

    assert health.status_code == 200
    assert health.json() == {"status": "ok"}
    assert dashboard.status_code == 200
    payload = dashboard.json()
    assert len(payload["kpis"]) == 4
    assert len(payload["anomalies"]) >= 3
    assert len(payload["incidents"]) >= 1
    assert len(payload["activity_feed"]) >= 1


def test_pipeline_sync_handles_provider_error_with_typed_response() -> None:
    client = make_client()
    routes.pipeline_service.provider.sync_summary = lambda: GeeSyncSummary(
        project_id="demo-project",
        status="error",
        message="Earth Engine initialization failed.",
    )

    response = client.post("/api/v1/pipeline/sync", json={"source": "gee"})

    assert response.status_code == 200
    payload = response.json()["status"]
    assert payload["source"] == "gee"
    assert payload["state"] == "error"
    assert payload["provider_label"] == "Google Earth Engine"
    assert payload["project_id"] == "demo-project"


def test_incident_task_report_flow_preserves_audit_contract() -> None:
    client = make_client()

    promote = client.post("/api/v1/anomalies/AN-117/promote", json={"owner": "ESG desk"})
    incident = promote.json()
    incident_id = incident["id"]

    created = client.post(
        f"/api/v1/incidents/{incident_id}/tasks",
        json=CreateTaskRequest(
            title="Collect operator comment",
            owner="ESG lead",
            eta_hours=3,
            notes="Needed for MRV note.",
        ).model_dump(),
    )
    created_task_ids = [task["id"] for task in created.json()["tasks"] if task["status"] == "open"]

    for task_id in created_task_ids:
        completed = client.post(f"/api/v1/incidents/{incident_id}/tasks/{task_id}/complete")
        assert completed.status_code == 200

    report = client.post(f"/api/v1/incidents/{incident_id}/report")
    audit = client.get(f"/api/v1/incidents/{incident_id}/audit")
    export = client.get(f"/api/v1/incidents/{incident_id}/report/export")

    assert promote.status_code == 201
    assert created.status_code == 200
    assert report.status_code == 200
    assert audit.status_code == 200
    assert export.status_code == 200
    assert report.json()["incident"]["status"] == "mitigation"
    assert any(event["action"] == "report_generated" for event in audit.json()["events"])
    assert "Audit Timeline" in export.text
