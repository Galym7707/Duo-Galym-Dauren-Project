from app.models import PromoteAnomalyRequest
from app.services.demo_store import DemoStore


def test_promote_anomaly_records_measurement_and_incident_activity() -> None:
    store = DemoStore()

    incident = store.promote_anomaly("AN-117", PromoteAnomalyRequest(owner="ESG desk"))
    incident_events = store.list_incident_activity(incident.id)

    assert incident.id == "INC-117"
    assert incident_events[0].action == "anomaly_promoted"
    assert incident_events[1].action == "screening_loaded"
    assert incident_events[1].entity_type == "anomaly"


def test_seeded_anomalies_expose_numeric_geolocation() -> None:
    store = DemoStore()

    anomalies = store.list_anomalies()
    regions = {anomaly.region for anomaly in anomalies}

    assert all(isinstance(anomaly.latitude, float) for anomaly in anomalies)
    assert all(isinstance(anomaly.longitude, float) for anomaly in anomalies)
    assert len(anomalies) >= 7
    assert {"Atyrau Region", "Mangystau Region", "Aktobe Region", "West Kazakhstan Region", "Kyzylorda Region"} <= regions
    assert anomalies[0].latitude == 46.094
    assert anomalies[0].longitude == 53.452


def test_generate_report_and_export_html_include_audit_timeline() -> None:
    store = DemoStore()

    generated = store.generate_report("INC-204")
    report_html = store.export_report_html("INC-204")

    assert len(generated.report) == 3
    assert "Audit Timeline" in report_html
    assert "Saryna MRV Report: INC-204" in report_html
    assert "MRV report generated" in report_html


def test_clear_live_evidence_restores_seeded_state() -> None:
    store = DemoStore()
    seeded_snapshot = store.screening_snapshot()

    store.apply_fresh_screening_evidence(
        synced_at="2026-03-27 08:05 UTC",
        project_id="demo-project",
        observed_window="Latest TROPOMI scene compared with Kazakhstan historical mean.",
        latest_observation_at="2026-03-27 08:00 UTC",
        mean_ch4_ppb=1892.4,
        baseline_ch4_ppb=1831.1,
        delta_abs_ppb=61.3,
        delta_pct=3.35,
        screening_level="medium",
        status_message="Earth Engine CH4 screening summary fetched successfully.",
    )

    assert store.screening_snapshot().freshness == "fresh"
    assert any(event.source == "gee" for event in store.list_activity())

    store.clear_live_evidence()

    restored_snapshot = store.screening_snapshot()
    assert restored_snapshot.freshness == seeded_snapshot.freshness
    assert restored_snapshot.evidence_source == seeded_snapshot.evidence_source
    assert restored_snapshot.current_ch4_ppb == seeded_snapshot.current_ch4_ppb
    assert all(event.source != "gee" for event in store.dashboard().activity_feed)
