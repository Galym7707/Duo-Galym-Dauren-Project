from __future__ import annotations

from copy import deepcopy
from html import escape

from app.models import (
    Anomaly,
    CreateTaskRequest,
    DashboardPayload,
    GenerateReportResponse,
    Incident,
    IncidentTask,
    KpiCard,
    PromoteAnomalyRequest,
    ReportSection,
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
        self._seeded_demo_posture = self.kpis[3].model_copy(deep=True)
        self._seeded_anomaly_context = {
            anomaly.id: {
                "summary": anomaly.summary,
                "recommended_action": anomaly.recommended_action,
                "confidence": anomaly.confidence,
            }
            for anomaly in self.anomalies
        }
        self._seeded_incident_narratives = {
            incident_id: incident.narrative for incident_id, incident in self.incidents.items()
        }

    def dashboard(self) -> DashboardPayload:
        return DashboardPayload(
            kpis=deepcopy(self.kpis),
            anomalies=deepcopy(self.anomalies),
            incidents=[deepcopy(incident) for incident in self.incidents.values()],
        )

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
        return deepcopy(incident)

    def generate_report(self, incident_id: str) -> GenerateReportResponse:
        incident = self.incidents.get(incident_id)
        if incident is None:
            raise KeyError(incident_id)

        anomaly = self._find_anomaly(incident.anomaly_id)
        incident.report_generated_at = "2026-03-27 09:00"
        report = self._build_report_sections(anomaly, incident)
        incident.report_sections = report
        return GenerateReportResponse(incident=deepcopy(incident), report=report)

    def export_report_html(self, incident_id: str, auto_print: bool = False) -> str:
        incident = self.incidents.get(incident_id)
        if incident is None:
            raise KeyError(incident_id)

        anomaly = self._find_anomaly(incident.anomaly_id)
        report_sections = incident.report_sections or self._build_report_sections(anomaly, incident)
        completed_tasks = self._completed_tasks(incident)

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
            f"{auto_print_script}"
            "</body></html>"
        )

    def apply_gee_evidence(
        self,
        *,
        project_id: str | None,
        latest_observation_at: str | None,
        mean_ch4_ppb: float | None,
        status_message: str,
    ) -> None:
        mean_fragment = (
            f"Mean CH4 over Kazakhstan: {mean_ch4_ppb} ppb."
            if mean_ch4_ppb is not None
            else "Mean CH4 summary is not available for this sync."
        )
        observation_fragment = (
            f"Latest observation: {latest_observation_at}."
            if latest_observation_at
            else "Latest observation timestamp is not available."
        )

        self.kpis[3] = KpiCard(
            label="Live ingest",
            value="GEE verified",
            detail=(
                f"{observation_fragment} Project: {project_id or 'not reported'}"
            ),
        )

        strongest_anomaly = self._strongest_anomaly()
        seeded_context = self._seeded_anomaly_context[strongest_anomaly.id]
        strongest_anomaly.summary = (
            f"{seeded_context['summary']} "
            f"Latest Earth Engine sync validated the Kazakhstan CH4 screening path. "
            f"{observation_fragment} {mean_fragment}"
        )
        strongest_anomaly.recommended_action = (
            "Use this signal as the screening priority for operator triage. "
            "Earth Engine now proves the CH4 ingest path, while asset-level attribution still "
            "depends on verification workflow."
        )
        strongest_anomaly.confidence = (
            f"{seeded_context['confidence']} / live GEE sync verified"
        )

        linked_incident_id = strongest_anomaly.linked_incident_id
        if linked_incident_id and linked_incident_id in self.incidents:
            seeded_narrative = self._seeded_incident_narratives.get(
                linked_incident_id, self.incidents[linked_incident_id].narrative
            )
            self.incidents[linked_incident_id].narrative = (
                f"{seeded_narrative} "
                f"Latest Earth Engine sync confirmed the screening layer is live for Kazakhstan. "
                f"{status_message}"
            )

    def clear_live_evidence(self) -> None:
        self.kpis[3] = self._seeded_demo_posture.model_copy(deep=True)

        for anomaly in self.anomalies:
            seeded_context = self._seeded_anomaly_context.get(anomaly.id)
            if seeded_context is None:
                continue

            anomaly.summary = seeded_context["summary"]
            anomaly.recommended_action = seeded_context["recommended_action"]
            anomaly.confidence = seeded_context["confidence"]

        for incident_id, narrative in self._seeded_incident_narratives.items():
            if incident_id in self.incidents:
                self.incidents[incident_id].narrative = narrative

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

    def _trend(self, values: list[int]) -> list[TrendPoint]:
        return [
            TrendPoint(label=f"W{index + 1}", anomaly_index=value)
            for index, value in enumerate(values)
        ]
