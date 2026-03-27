from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from html import escape
from typing import Literal

from app.models import (
    ActivityEvent,
    Anomaly,
    CreateTaskRequest,
    DashboardPayload,
    GenerateReportResponse,
    Incident,
    IncidentTask,
    KpiCard,
    PromoteAnomalyRequest,
    ReportSection,
    ScreeningEvidenceSnapshot,
    SitePosition,
    TrendPoint,
)


class DemoStore:
    # [temporary MVP shortcut]
    # We keep state in memory first so the team can stabilize the
    # contest demo loop before wiring real ingestion, PostGIS, and jobs.
    def __init__(self) -> None:
        self.kpis = [
            KpiCard(
                label="Open anomalies",
                value="3",
                detail="2 methane clusters, 1 flare persistence signal",
            ),
            KpiCard(
                label="Potential CO2e",
                value="428 tCO2e",
                detail="Current week across seeded Kazakhstan pilot assets",
            ),
            KpiCard(
                label="Time to triage",
                value="< 6 h",
                detail="From satellite signal to incident owner assignment",
            ),
            KpiCard(
                label="Demo posture",
                value="Pilot-safe",
                detail="Open data in, workflow out, no operator lock-in required",
            ),
        ]

        self.anomalies: list[Anomaly] = [
            Anomaly(
                id="AN-104",
                asset_name="Tengiz satellite cluster",
                region="Atyrau Region",
                facility_type="Gathering and compression",
                severity="high",
                detected_at="2026-03-26 08:20",
                methane_delta_pct=34,
                co2e_tonnes=182,
                flare_hours=11,
                signal_score=91,
                confidence="High confidence / persistent over 8 days",
                coordinates="46.094 N, 53.452 E",
                latitude=46.094,
                longitude=53.452,
                summary="Elevated methane column overlaps recurring Nightfire activity close to a compression corridor.",
                recommended_action="Escalate to field integrity desk and request same-day verification route.",
                site_position=SitePosition(x=62, y=44),
                trend=self._trend([39, 42, 44, 57, 61, 79]),
                linked_incident_id="INC-204",
            ),
            Anomaly(
                id="AN-117",
                asset_name="Karabatan processing block",
                region="Atyrau Region",
                facility_type="Processing and storage",
                severity="medium",
                detected_at="2026-03-26 05:50",
                methane_delta_pct=19,
                co2e_tonnes=96,
                flare_hours=6,
                signal_score=73,
                confidence="Medium confidence / single-week deviation",
                coordinates="46.190 N, 51.858 E",
                latitude=46.190,
                longitude=51.858,
                summary="Methane anomaly is above 12-week median, but flare persistence is less stable than the leading incident.",
                recommended_action="Create watchlist incident only if another pass confirms persistence in the next 24 hours.",
                site_position=SitePosition(x=48, y=63),
                trend=self._trend([28, 31, 29, 41, 44, 58]),
            ),
            Anomaly(
                id="AN-121",
                asset_name="Mangystau export hub",
                region="Mangystau Region",
                facility_type="Terminal and flare line",
                severity="watch",
                detected_at="2026-03-25 23:10",
                methane_delta_pct=11,
                co2e_tonnes=41,
                flare_hours=14,
                signal_score=58,
                confidence="Watchlist / flare-led signal",
                coordinates="43.690 N, 51.167 E",
                latitude=43.690,
                longitude=51.167,
                summary="Nightfire signal is strong, methane spread remains low. Good candidate for trend monitoring rather than emergency dispatch.",
                recommended_action="Keep visible in weekly MRV review and compare against operator maintenance schedule.",
                site_position=SitePosition(x=25, y=72),
                trend=self._trend([16, 17, 19, 23, 29, 34]),
            ),
        ]

        self.incidents: dict[str, Incident] = {
            "INC-204": Incident(
                id="INC-204",
                anomaly_id="AN-104",
                title="Persistent methane uplift near compression corridor",
                status="verification",
                owner="Field integrity desk",
                priority="P1",
                verification_window="Next 12 hours",
                report_generated_at="2026-03-26 12:10",
                narrative="Current workflow assumes a screening layer: we are not claiming pinpoint source identification, only a clear operational priority for field verification.",
                report_sections=[
                    ReportSection(
                        title="Measurement",
                        body="Satellite screening flagged Tengiz satellite cluster in Atyrau Region with +34% methane uplift and 11 flare-observed hours.",
                    ),
                    ReportSection(
                        title="Reporting",
                        body="Current potential impact is estimated at 182 tCO2e. 1/3 verification tasks are complete.",
                    ),
                    ReportSection(
                        title="Verification",
                        body="Field integrity desk owns the case under P1 priority with a next 12 hours window.",
                    ),
                ],
                tasks=[
                    IncidentTask(
                        id="TASK-1",
                        title="Dispatch LDAR walkdown request",
                        owner="Ops coordinator",
                        eta_hours=2,
                        status="done",
                        notes="Route aligned with maintenance shift in Atyrau.",
                    ),
                    IncidentTask(
                        id="TASK-2",
                        title="Cross-check flare line maintenance history",
                        owner="Reliability engineer",
                        eta_hours=6,
                        status="open",
                        notes="Look for compressor upset or flare purge event.",
                    ),
                    IncidentTask(
                        id="TASK-3",
                        title="Draft regulator-facing MRV note",
                        owner="ESG lead",
                        eta_hours=8,
                        status="open",
                        notes="Prepare incident context and verification plan.",
                    ),
                ],
            )
        }
        self.activity_feed: list[ActivityEvent] = [
            ActivityEvent(
                id="ACT-1001",
                occurred_at="2026-03-26 07:40",
                stage="ingest",
                source="seeded",
                action="screening_loaded",
                title="Seeded CH4 screening loaded",
                detail="Kazakhstan pilot anomaly set was loaded for contest-safe playback.",
                actor="Demo pipeline",
                incident_id="INC-204",
                entity_type="pipeline",
                entity_id="seeded-screening",
                metadata={
                    "provider": "Seeded contest dataset",
                    "scope": "Kazakhstan pilot assets",
                },
            ),
            ActivityEvent(
                id="ACT-1002",
                occurred_at="2026-03-26 08:20",
                stage="incident",
                source="workflow",
                action="anomaly_promoted",
                title="Tengiz anomaly promoted",
                detail="AN-104 was escalated into incident INC-204 for verification ownership.",
                actor="MRV response lead",
                incident_id="INC-204",
                entity_type="incident",
                entity_id="INC-204",
                metadata={
                    "anomaly_id": "AN-104",
                    "owner": "MRV response lead",
                },
            ),
            ActivityEvent(
                id="ACT-1003",
                occurred_at="2026-03-26 10:10",
                stage="verification",
                source="workflow",
                action="task_completed",
                title="LDAR walkdown dispatched",
                detail="Field verification route was aligned with the Atyrau maintenance shift.",
                actor="Ops coordinator",
                incident_id="INC-204",
                entity_type="task",
                entity_id="TASK-1",
                metadata={
                    "task_id": "TASK-1",
                    "status": "done",
                },
            ),
            ActivityEvent(
                id="ACT-1004",
                occurred_at="2026-03-26 12:10",
                stage="report",
                source="workflow",
                action="report_generated",
                title="MRV preview generated",
                detail="Incident INC-204 now has a seeded MRV report preview for stakeholder review.",
                actor="ESG lead",
                incident_id="INC-204",
                entity_type="report",
                entity_id="INC-204-report",
                metadata={
                    "incident_id": "INC-204",
                    "artifact": "seeded-preview",
                },
            ),
        ]
        self.incident_activity_feed: dict[str, list[ActivityEvent]] = {
            incident_id: [
                event.model_copy(deep=True)
                for event in self.activity_feed
                if event.incident_id == incident_id
            ]
            for incident_id in self.incidents
        }
        self._activity_index = 1004
        self._seeded_screening_snapshot = ScreeningEvidenceSnapshot(
            area_label="Kazakhstan pilot screening area",
            evidence_source="Seeded demo baseline",
            freshness="fresh",
            screening_level="medium",
            synced_at="2026-03-26 07:40",
            last_successful_sync_at="2026-03-26 07:40",
            observed_window="Seeded playback window for the Kazakhstan pilot assets.",
            current_ch4_ppb=1888.6,
            baseline_ch4_ppb=1817.9,
            delta_abs_ppb=70.7,
            delta_pct=3.89,
            confidence_note="Seeded comparison used for contest-safe playback until a live sync is requested.",
            caveat="This snapshot is demo data, not a live Earth Engine pull.",
            recommended_action="Use the seeded evidence block to explain the screening logic, then promote manually when you are ready to open an operational case.",
        )
        self._screening_snapshot = self._seeded_screening_snapshot.model_copy(deep=True)
        self._last_live_screening_snapshot: ScreeningEvidenceSnapshot | None = None
        self._screening_history: list[ScreeningEvidenceSnapshot] = [
            self._screening_snapshot.model_copy(deep=True)
        ]

    def dashboard(self) -> DashboardPayload:
        return DashboardPayload(
            kpis=deepcopy(self.kpis),
            anomalies=deepcopy(self.anomalies),
            incidents=[deepcopy(incident) for incident in self.incidents.values()],
            activity_feed=deepcopy(self.activity_feed),
        )

    def list_activity(self) -> list[ActivityEvent]:
        return deepcopy(self.activity_feed)

    def list_incident_activity(self, incident_id: str) -> list[ActivityEvent]:
        if incident_id not in self.incidents:
            raise KeyError(incident_id)
        return self._incident_activity(incident_id)

    def screening_snapshot(self) -> ScreeningEvidenceSnapshot:
        return self._screening_snapshot.model_copy(deep=True)

    def list_anomalies(self) -> list[Anomaly]:
        return deepcopy(self.anomalies)

    def list_incidents(self) -> list[Incident]:
        return [deepcopy(incident) for incident in self.incidents.values()]

    def get_incident(self, incident_id: str) -> Incident:
        incident = self.incidents.get(incident_id)
        if incident is None:
            raise KeyError(incident_id)
        return deepcopy(incident)

    def promote_anomaly(self, anomaly_id: str, payload: PromoteAnomalyRequest) -> Incident:
        anomaly = self._find_anomaly(anomaly_id)
        if anomaly.linked_incident_id:
            return self.get_incident(anomaly.linked_incident_id)

        incident_id = f"INC-{anomaly.id[3:]}"
        incident = Incident(
            id=incident_id,
            anomaly_id=anomaly.id,
            title=f"New verification case for {anomaly.asset_name}",
            status="triage",
            owner=payload.owner,
            priority="P1" if anomaly.severity == "high" else "P2",
            verification_window="Next 12 hours" if anomaly.severity == "high" else "Next 24 hours",
            narrative="This incident was promoted directly from the anomaly queue to prove the screening-to-action flow before live operator integrations are wired.",
            tasks=[
                IncidentTask(
                    id=f"{incident_id}-TASK-1",
                    title="Validate signal persistence against 12-week baseline",
                    owner="Remote sensing analyst",
                    eta_hours=2,
                    status="done",
                    notes="Baseline and current window exported for review.",
                ),
                IncidentTask(
                    id=f"{incident_id}-TASK-2",
                    title="Assign field verification owner",
                    owner="Area operations coordinator",
                    eta_hours=4,
                    status="open",
                    notes="Route can be merged with scheduled integrity patrol.",
                ),
            ],
        )
        anomaly.linked_incident_id = incident_id
        self.incidents[incident_id] = incident
        self._record_activity(
            stage="ingest",
            source="seeded",
            action="screening_loaded",
            title="Measurement evidence linked to incident",
            detail=(
                f"{anomaly.id} screening evidence for {anomaly.asset_name} "
                f"was attached to {incident_id} before escalation."
            ),
            actor="Demo pipeline",
            incident_id=incident_id,
            entity_type="anomaly",
            entity_id=anomaly.id,
            metadata={
                "signal_score": anomaly.signal_score,
                "co2e_tonnes": anomaly.co2e_tonnes,
                "severity": anomaly.severity,
            },
        )
        self._record_activity(
            stage="incident",
            source="workflow",
            action="anomaly_promoted",
            title="Incident created from screening signal",
            detail=(
                f"{anomaly.asset_name} was promoted into {incident_id} "
                f"with owner {payload.owner}."
            ),
            actor=payload.owner,
            incident_id=incident_id,
            entity_type="incident",
            entity_id=incident_id,
            metadata={
                "anomaly_id": anomaly.id,
                "owner": payload.owner,
                "priority": incident.priority,
            },
        )
        return deepcopy(incident)

    def create_task(self, incident_id: str, payload: CreateTaskRequest) -> Incident:
        incident = self.incidents.get(incident_id)
        if incident is None:
            raise KeyError(incident_id)

        task = IncidentTask(
            id=f"{incident_id}-TASK-{len(incident.tasks) + 1}",
            title=payload.title,
            owner=payload.owner,
            eta_hours=payload.eta_hours,
            status="open",
            notes=payload.notes,
        )
        incident.tasks.append(task)
        incident.report_sections = None
        self._record_activity(
            stage="verification",
            source="workflow",
            action="task_created",
            title="Verification task created",
            detail=f"{task.title} was assigned to {task.owner} for {incident_id}.",
            actor=task.owner,
            incident_id=incident_id,
            entity_type="task",
            entity_id=task.id,
            metadata={
                "task_id": task.id,
                "eta_hours": task.eta_hours,
            },
        )
        return deepcopy(incident)

    def complete_task(self, incident_id: str, task_id: str) -> Incident:
        incident = self.incidents.get(incident_id)
        if incident is None:
            raise KeyError(incident_id)

        for task in incident.tasks:
            if task.id == task_id:
                task.status = "done"
                break
        else:
            raise KeyError(task_id)

        if all(task.status == "done" for task in incident.tasks):
            incident.status = "mitigation"

        incident.report_sections = None
        self._record_activity(
            stage="verification",
            source="workflow",
            action="task_completed",
            title="Verification task completed",
            detail=f"{task_id} was marked done for {incident_id}.",
            actor=task.owner,
            incident_id=incident_id,
            entity_type="task",
            entity_id=task_id,
            metadata={
                "task_id": task_id,
                "status": "done",
            },
        )
        return deepcopy(incident)

    def generate_report(self, incident_id: str) -> GenerateReportResponse:
        incident = self.incidents.get(incident_id)
        if incident is None:
            raise KeyError(incident_id)

        anomaly = self._find_anomaly(incident.anomaly_id)
        incident.report_generated_at = "2026-03-27 09:00"
        report = self._build_report_sections(anomaly, incident)
        incident.report_sections = report
        self._record_activity(
            stage="report",
            source="workflow",
            action="report_generated",
            title="MRV report generated",
            detail=f"{incident_id} now has an updated MRV summary for stakeholder review.",
            actor=incident.owner,
            incident_id=incident_id,
            entity_type="report",
            entity_id=f"{incident_id}-report",
            metadata={
                "incident_id": incident_id,
                "task_completion": f"{self._completed_tasks(incident)}/{len(incident.tasks)}",
            },
        )
        return GenerateReportResponse(incident=deepcopy(incident), report=report)

    def export_report_html(self, incident_id: str, auto_print: bool = False) -> str:
        incident = self.incidents.get(incident_id)
        if incident is None:
            raise KeyError(incident_id)

        anomaly = self._find_anomaly(incident.anomaly_id)
        report_sections = incident.report_sections or self._build_report_sections(anomaly, incident)
        completed_tasks = self._completed_tasks(incident)
        audit_events = self._incident_activity(incident_id)

        task_lines = "".join(
            [
                (
                    "<li>"
                    f"<strong>{escape(task.title)}</strong> - {escape(task.owner)} - ETA {task.eta_hours}h"
                    f" - {'Done' if task.status == 'done' else 'Open'}"
                    "</li>"
                )
                for task in incident.tasks
            ]
        )
        section_lines = "".join(
            [
                (
                    "<section>"
                    f"<h2>{escape(section.title)}</h2>"
                    f"<p>{escape(section.body)}</p>"
                    "</section>"
                )
                for section in report_sections
            ]
        )
        audit_lines = "".join(
            [
                (
                    "<li>"
                    f"<strong>{escape(event.title)}</strong> - {escape(event.detail)}"
                    f" <span>({escape(event.occurred_at)})</span>"
                    f"<br /><small>Source: {escape(event.source)} | Actor: {escape(event.actor)} | "
                    f"Entity: {escape(event.entity_type)}"
                    f"{f' {escape(event.entity_id)}' if event.entity_id else ''}</small>"
                    "</li>"
                )
                for event in audit_events
            ]
        )
        auto_print_script = (
            "<script>"
            "window.addEventListener('load', () => { setTimeout(() => window.print(), 120); });"
            "</script>"
            if auto_print
            else ""
        )

        return (
            "<!doctype html>"
            "<html lang='en'>"
            "<head>"
            "<meta charset='utf-8' />"
            f"<title>{escape(incident.id)} MRV Report</title>"
            "<style>"
            "body{font-family:Segoe UI,Arial,sans-serif;margin:40px;color:#10212b;line-height:1.55;}"
            "h1{margin-bottom:8px;}h2{margin:24px 0 8px;}section{margin-top:20px;}"
            ".meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 20px;margin:24px 0;}"
            ".meta div{padding:12px 14px;border:1px solid #d3dde5;background:#f6fafc;}"
            ".label{display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5c6f7b;}"
            ".value{display:block;margin-top:6px;font-weight:600;}"
            ".toolbar{display:flex;gap:12px;align-items:center;justify-content:space-between;margin:20px 0 28px;}"
            ".toolbar button{padding:10px 14px;border:1px solid #b9c9d4;background:#ffffff;cursor:pointer;font:inherit;}"
            "ul{padding-left:20px;}"
            "li{margin-bottom:8px;}"
            "@media print{body{margin:22px;} .toolbar{display:none;} .meta{gap:8px 14px;}}"
            "</style>"
            "</head>"
            "<body>"
            f"<h1>MRV Incident Report: {escape(incident.id)}</h1>"
            "<p>Measurement, reporting, and verification note for the current methane and flaring case.</p>"
            "<div class='toolbar'>"
            "<span>Print-ready MRV note for stakeholder review.</span>"
            "<button onclick='window.print()'>Print / Save as PDF</button>"
            "</div>"
            "<div class='meta'>"
            f"<div><span class='label'>Generated</span><span class='value'>{escape(incident.report_generated_at or 'On-demand export')}</span></div>"
            f"<div><span class='label'>Asset</span><span class='value'>{escape(anomaly.asset_name)}</span></div>"
            f"<div><span class='label'>Region</span><span class='value'>{escape(anomaly.region)}</span></div>"
            f"<div><span class='label'>Coordinates</span><span class='value'>{escape(anomaly.coordinates)}</span></div>"
            f"<div><span class='label'>Priority</span><span class='value'>{escape(incident.priority)}</span></div>"
            f"<div><span class='label'>Verification window</span><span class='value'>{escape(incident.verification_window)}</span></div>"
            f"<div><span class='label'>Potential impact</span><span class='value'>{anomaly.co2e_tonnes} tCO2e</span></div>"
            f"<div><span class='label'>Task progress</span><span class='value'>{completed_tasks}/{len(incident.tasks)} completed</span></div>"
            "</div>"
            f"{section_lines}"
            "<section><h2>Verification Tasks</h2><ul>"
            f"{task_lines}"
            "</ul></section>"
            "<section><h2>Audit Timeline</h2><ul>"
            f"{audit_lines}"
            "</ul></section>"
            f"{auto_print_script}"
            "</body></html>"
        )

    def apply_fresh_screening_evidence(
        self,
        *,
        synced_at: str,
        project_id: str | None,
        observed_window: str | None,
        latest_observation_at: str | None,
        mean_ch4_ppb: float | None,
        baseline_ch4_ppb: float | None,
        delta_abs_ppb: float | None,
        delta_pct: float | None,
        screening_level: str,
        status_message: str,
    ) -> ScreeningEvidenceSnapshot:
        snapshot = ScreeningEvidenceSnapshot(
            area_label="Kazakhstan methane screening window",
            evidence_source="Google Earth Engine / Sentinel-5P",
            freshness="fresh",
            screening_level=screening_level,  # type: ignore[arg-type]
            synced_at=synced_at,
            last_successful_sync_at=synced_at,
            observed_window=observed_window or latest_observation_at,
            current_ch4_ppb=mean_ch4_ppb,
            baseline_ch4_ppb=baseline_ch4_ppb,
            delta_abs_ppb=delta_abs_ppb,
            delta_pct=delta_pct,
            confidence_note=(
                "Live Earth Engine screening refreshed successfully. This is a screening signal, not pinpoint source attribution."
            ),
            caveat=(
                f"Latest observation at {latest_observation_at}. Project: {project_id or 'not reported'}."
                if latest_observation_at
                else f"Project: {project_id or 'not reported'}."
            ),
            recommended_action=(
                "Review the refreshed satellite comparison, then promote manually if this area still deserves operational verification."
            ),
        )

        self._screening_snapshot = snapshot.model_copy(deep=True)
        self._last_live_screening_snapshot = snapshot.model_copy(deep=True)
        self._push_screening_history(snapshot)
        self._record_activity(
            stage="ingest",
            source="gee",
            action="gee_sync_verified",
            title="Google Earth Engine sync verified",
            detail=status_message,
            actor="Earth Engine adapter",
            entity_type="pipeline",
            entity_id="gee-screening",
            metadata={
                "project_id": project_id or "not reported",
                "latest_observation_at": latest_observation_at or "not available",
                "mean_ch4_ppb": mean_ch4_ppb if mean_ch4_ppb is not None else "not available",
                "baseline_ch4_ppb": baseline_ch4_ppb
                if baseline_ch4_ppb is not None
                else "not available",
                "delta_pct": delta_pct if delta_pct is not None else "not available",
            },
        )
        return self.screening_snapshot()

    def mark_screening_stale(self, *, synced_at: str, caveat: str) -> ScreeningEvidenceSnapshot:
        base_snapshot = (
            self._last_live_screening_snapshot.model_copy(deep=True)
            if self._last_live_screening_snapshot
            else self._build_live_placeholder_snapshot(
                synced_at=synced_at,
                freshness="stale",
                caveat=caveat,
                recommended_action="Retry live sync or use the seeded workflow as the operational fallback until a verified screening snapshot is available.",
            )
        )
        base_snapshot.freshness = "stale"
        base_snapshot.synced_at = synced_at
        base_snapshot.last_successful_sync_at = (
            self._last_live_screening_snapshot.synced_at
            if self._last_live_screening_snapshot
            else base_snapshot.last_successful_sync_at
        )
        base_snapshot.caveat = caveat
        base_snapshot.recommended_action = (
            "Use the last successful screening snapshot as context, then decide manually whether promotion still makes sense."
        )
        self._screening_snapshot = base_snapshot.model_copy(deep=True)
        self._push_screening_history(base_snapshot)
        return self.screening_snapshot()

    def mark_screening_unavailable(
        self, *, synced_at: str, caveat: str
    ) -> ScreeningEvidenceSnapshot:
        base_snapshot = (
            self._last_live_screening_snapshot.model_copy(deep=True)
            if self._last_live_screening_snapshot
            else self._build_live_placeholder_snapshot(
                synced_at=synced_at,
                freshness="unavailable",
                caveat=caveat,
                recommended_action="Keep the seeded operational workflow active and retry live sync before using Earth Engine evidence in a promotion decision.",
            )
        )
        base_snapshot.freshness = "unavailable"
        base_snapshot.synced_at = synced_at
        base_snapshot.last_successful_sync_at = (
            self._last_live_screening_snapshot.synced_at
            if self._last_live_screening_snapshot
            else None
        )
        if self._last_live_screening_snapshot:
            base_snapshot.caveat = caveat
            base_snapshot.recommended_action = (
                "Keep the seeded operational workflow active and treat the last available screening snapshot as context only."
            )
        self._screening_snapshot = base_snapshot.model_copy(deep=True)
        self._push_screening_history(base_snapshot)
        return self.screening_snapshot()

    def clear_live_evidence(self) -> None:
        self._screening_snapshot = self._seeded_screening_snapshot.model_copy(deep=True)
        self._last_live_screening_snapshot = None
        self._screening_history = [self._screening_snapshot.model_copy(deep=True)]
        self.activity_feed = [
            event
            for event in self.activity_feed
            if not (event.source == "gee" and event.action == "gee_sync_verified")
        ]
        self.incident_activity_feed = {
            incident_id: [
                event
                for event in events
                if not (event.source == "gee" and event.action == "gee_sync_verified")
            ]
            for incident_id, events in self.incident_activity_feed.items()
        }

    def _push_screening_history(self, snapshot: ScreeningEvidenceSnapshot) -> None:
        self._screening_history.insert(0, snapshot.model_copy(deep=True))
        self._screening_history = self._screening_history[:5]

    def _build_live_placeholder_snapshot(
        self,
        *,
        synced_at: str,
        freshness: Literal["stale", "unavailable"],
        caveat: str,
        recommended_action: str,
    ) -> ScreeningEvidenceSnapshot:
        return ScreeningEvidenceSnapshot(
            area_label="Kazakhstan pilot screening area",
            evidence_source="Google Earth Engine / Sentinel-5P",
            freshness=freshness,
            screening_level="low",
            synced_at=synced_at,
            last_successful_sync_at=None,
            observed_window=None,
            current_ch4_ppb=None,
            baseline_ch4_ppb=None,
            delta_abs_ppb=None,
            delta_pct=None,
            confidence_note="No verified live screening snapshot is stored yet. Keep the seeded MRV workflow as the operational fallback.",
            caveat=f"{caveat} No previous verified live screening snapshot is available yet.",
            recommended_action=recommended_action,
        )

    def _record_activity(
        self,
        *,
        stage: str,
        source: str,
        action: str,
        title: str,
        detail: str,
        actor: str,
        incident_id: str | None = None,
        entity_type: str,
        entity_id: str | None = None,
        metadata: dict[str, str | int | float | bool | None] | None = None,
    ) -> None:
        self._activity_index += 1
        event = ActivityEvent(
            id=f"ACT-{self._activity_index}",
            occurred_at=datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC"),
            stage=stage,
            source=source,
            action=action,
            title=title,
            detail=detail,
            actor=actor,
            incident_id=incident_id,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata=metadata or {},
        )
        self.activity_feed.insert(0, event)
        self.activity_feed = self.activity_feed[:8]
        if incident_id:
            self.incident_activity_feed.setdefault(incident_id, []).insert(
                0,
                event.model_copy(deep=True),
            )

    def _build_report_sections(
        self, anomaly: Anomaly, incident: Incident
    ) -> list[ReportSection]:
        return [
            ReportSection(
                title="Measurement",
                body=f"Satellite screening flagged {anomaly.asset_name} in {anomaly.region} with +{anomaly.methane_delta_pct}% methane uplift and {anomaly.flare_hours} flare-observed hours.",
            ),
            ReportSection(
                title="Reporting",
                body=f"Current potential impact is estimated at {anomaly.co2e_tonnes} tCO2e. {self._completed_tasks(incident)}/{len(incident.tasks)} verification tasks are complete.",
            ),
            ReportSection(
                title="Verification",
                body=f"{incident.owner} owns the case under {incident.priority} priority with a {incident.verification_window.lower()} window.",
            ),
        ]

    def _find_anomaly(self, anomaly_id: str) -> Anomaly:
        for anomaly in self.anomalies:
            if anomaly.id == anomaly_id:
                return anomaly
        raise KeyError(anomaly_id)

    def _completed_tasks(self, incident: Incident) -> int:
        return len([task for task in incident.tasks if task.status == "done"])

    def _strongest_anomaly(self) -> Anomaly:
        return max(self.anomalies, key=lambda anomaly: anomaly.signal_score)

    def _incident_activity(self, incident_id: str) -> list[ActivityEvent]:
        return deepcopy(self.incident_activity_feed.get(incident_id, []))

    def _trend(self, values: list[int]) -> list[TrendPoint]:
        return [
            TrendPoint(label=f"W{index + 1}", anomaly_index=value)
            for index, value in enumerate(values)
        ]
