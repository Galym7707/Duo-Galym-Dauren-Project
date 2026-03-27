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


def test_generate_report_and_export_html_include_audit_timeline() -> None:
    store = DemoStore()

    generated = store.generate_report("INC-204")
    report_html = store.export_report_html("INC-204")

    assert len(generated.report) == 3
    assert "Audit Timeline" in report_html
    assert "MRV Incident Report: INC-204" in report_html
    assert "MRV report generated" in report_html


def test_clear_live_evidence_restores_seeded_state() -> None:
    store = DemoStore()
    seeded_confidence = store.list_anomalies()[0].confidence
    seeded_posture = store.dashboard().kpis[3].value

    store.apply_gee_evidence(
        project_id="demo-project",
        latest_observation_at="2026-03-27 08:00 UTC",
        mean_ch4_ppb=1892.4,
        status_message="Earth Engine CH4 screening summary fetched successfully.",
    )

    assert store.dashboard().kpis[3].value == "GEE verified"
    assert any(event.source == "gee" for event in store.list_activity())

    store.clear_live_evidence()

    restored_dashboard = store.dashboard()
    assert restored_dashboard.kpis[3].value == seeded_posture
    assert restored_dashboard.anomalies[0].confidence == seeded_confidence
    assert all(event.source != "gee" for event in restored_dashboard.activity_feed)
