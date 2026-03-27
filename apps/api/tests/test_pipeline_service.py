from app.providers.gee import GeeSyncSummary
from app.services.demo_store import DemoStore
from app.services.pipeline_service import PipelineService


def test_sync_gee_ready_updates_pipeline_and_store() -> None:
    store = DemoStore()
    service = PipelineService(store)
    seeded_anomaly = max(store.list_anomalies(), key=lambda anomaly: anomaly.signal_score)
    service.provider.sync_summary = lambda: GeeSyncSummary(
        project_id="demo-project",
        status="ready",
        message="Earth Engine CH4 screening summary fetched successfully.",
        latest_observation_at="2026-03-27 08:00 UTC",
        observed_window="Latest TROPOMI scene compared with Kazakhstan historical mean.",
        mean_ch4_ppb=1884.6,
        baseline_ch4_ppb=1822.4,
        delta_abs_ppb=62.2,
        delta_pct=3.41,
        scene_count=12,
    )

    status_model = service.sync_gee()
    strongest = max(store.list_anomalies(), key=lambda anomaly: anomaly.signal_score)
    snapshot = status_model.screening_snapshot

    assert status_model.source == "gee"
    assert status_model.state == "ready"
    assert status_model.project_id == "demo-project"
    assert snapshot is not None
    assert snapshot.freshness == "fresh"
    assert snapshot.current_ch4_ppb == 1884.6
    assert snapshot.baseline_ch4_ppb == 1822.4
    assert strongest.detected_at == seeded_anomaly.detected_at
    assert strongest.confidence == seeded_anomaly.confidence


def test_sync_gee_error_keeps_demo_safe_state() -> None:
    store = DemoStore()
    service = PipelineService(store)
    service.provider.sync_summary = lambda: GeeSyncSummary(
        project_id="demo-project",
        status="error",
        message="Earth Engine initialization failed.",
    )

    status_model = service.sync_gee()
    snapshot = status_model.screening_snapshot

    assert status_model.source == "gee"
    assert status_model.state == "error"
    assert snapshot is not None
    assert snapshot.freshness == "unavailable"
    assert snapshot.evidence_source == "Google Earth Engine / Sentinel-5P"
    assert snapshot.current_ch4_ppb is None
    assert snapshot.last_successful_sync_at is None
    assert "No previous verified live screening snapshot is available yet." in (snapshot.caveat or "")
    assert all(event.source != "gee" for event in store.dashboard().activity_feed)


def test_sync_gee_degraded_preserves_previous_live_snapshot_when_available() -> None:
    store = DemoStore()
    service = PipelineService(store)
    store.apply_fresh_screening_evidence(
        synced_at="2026-03-27 08:05 UTC",
        project_id="demo-project",
        observed_window="Latest TROPOMI scene compared with Kazakhstan historical mean.",
        latest_observation_at="2026-03-27 08:00 UTC",
        mean_ch4_ppb=1884.6,
        baseline_ch4_ppb=1822.4,
        delta_abs_ppb=62.2,
        delta_pct=3.41,
        screening_level="medium",
        status_message="Earth Engine CH4 screening summary fetched successfully.",
    )
    service.provider.sync_summary = lambda: GeeSyncSummary(
        project_id="demo-project",
        status="degraded",
        message="Earth Engine returned no fresh scene for the selected window.",
    )

    status_model = service.sync_gee()
    snapshot = status_model.screening_snapshot

    assert status_model.state == "degraded"
    assert snapshot is not None
    assert snapshot.freshness == "stale"
    assert snapshot.current_ch4_ppb == 1884.6
    assert snapshot.last_successful_sync_at == "2026-03-27 08:05 UTC"


def test_sync_seeded_clears_live_evidence_and_restores_baseline() -> None:
    store = DemoStore()
    service = PipelineService(store)
    seeded_snapshot = store.screening_snapshot()

    store.apply_fresh_screening_evidence(
        synced_at="2026-03-27 08:05 UTC",
        project_id="demo-project",
        observed_window="Latest TROPOMI scene compared with Kazakhstan historical mean.",
        latest_observation_at="2026-03-27 08:00 UTC",
        mean_ch4_ppb=1884.6,
        baseline_ch4_ppb=1822.4,
        delta_abs_ppb=62.2,
        delta_pct=3.41,
        screening_level="medium",
        status_message="Earth Engine CH4 screening summary fetched successfully.",
    )

    status_model = service.sync_seeded()
    restored_snapshot = store.screening_snapshot()

    assert status_model.source == "seeded"
    assert status_model.state == "ready"
    assert restored_snapshot.evidence_source == seeded_snapshot.evidence_source
    assert restored_snapshot.freshness == seeded_snapshot.freshness
    assert all(event.source != "gee" for event in store.dashboard().activity_feed)
