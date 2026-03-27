from app.providers.gee import GeeSyncSummary
from app.services.demo_store import DemoStore
from app.services.pipeline_service import PipelineService


def test_sync_gee_ready_updates_pipeline_and_store() -> None:
    store = DemoStore()
    service = PipelineService(store)
    service.provider.sync_summary = lambda: GeeSyncSummary(
        project_id="demo-project",
        status="ready",
        message="Earth Engine CH4 screening summary fetched successfully.",
        latest_observation_at="2026-03-27 08:00 UTC",
        mean_ch4_ppb=1884.6,
        scene_count=12,
    )

    status_model = service.sync_gee()
    strongest = max(store.list_anomalies(), key=lambda anomaly: anomaly.signal_score)

    assert status_model.source == "gee"
    assert status_model.state == "ready"
    assert status_model.project_id == "demo-project"
    assert strongest.detected_at == "2026-03-27 08:00 UTC"
    assert "live GEE sync verified" in strongest.confidence


def test_sync_gee_error_keeps_demo_safe_state() -> None:
    store = DemoStore()
    service = PipelineService(store)
    service.provider.sync_summary = lambda: GeeSyncSummary(
        project_id="demo-project",
        status="error",
        message="Earth Engine initialization failed.",
    )

    status_model = service.sync_gee()
    dashboard = store.dashboard()

    assert status_model.source == "gee"
    assert status_model.state == "error"
    assert dashboard.kpis[3].value == "Pilot-safe"
    assert all(event.source != "gee" for event in dashboard.activity_feed)


def test_sync_seeded_clears_live_evidence_and_restores_baseline() -> None:
    store = DemoStore()
    service = PipelineService(store)
    seeded_dashboard = store.dashboard()
    seeded_confidence = seeded_dashboard.anomalies[0].confidence

    store.apply_gee_evidence(
        project_id="demo-project",
        latest_observation_at="2026-03-27 08:00 UTC",
        mean_ch4_ppb=1884.6,
        status_message="Earth Engine CH4 screening summary fetched successfully.",
    )

    status_model = service.sync_seeded()
    restored_dashboard = store.dashboard()

    assert status_model.source == "seeded"
    assert status_model.state == "ready"
    assert restored_dashboard.kpis[3].value == "Pilot-safe"
    assert restored_dashboard.anomalies[0].confidence == seeded_confidence
    assert all(event.source != "gee" for event in restored_dashboard.activity_feed)
