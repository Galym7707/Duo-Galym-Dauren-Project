from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
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
from app.providers.gee import GeeCandidate
from app.services.report_exports import (
    Locale,
    PreparedReport,
    prepare_report,
    render_docx,
    render_html,
    render_pdf,
)


class DemoStore:
    # [temporary MVP shortcut]
    # We keep state in memory first so the team can stabilize the
    # contest demo loop before wiring real ingestion, PostGIS, and jobs.
    def __init__(self) -> None:
        self.kpis = [
            KpiCard(
                label="Open anomalies",
                value="7",
                detail="4 methane signals, 3 lower-priority markers across 6 Kazakhstan regions",
            ),
            KpiCard(
                label="Potential CO2e",
                value="627 tCO2e",
                detail="Current week across seeded Kazakhstan screening coverage",
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
                summary="Elevated methane column overlaps recurring night-burning context close to a compression corridor.",
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
                summary="Night-burning context is strong, methane spread remains low. Good candidate for trend monitoring rather than emergency dispatch.",
                recommended_action="Keep visible in weekly MRV review and compare against operator maintenance schedule.",
                site_position=SitePosition(x=25, y=72),
                trend=self._trend([16, 17, 19, 23, 29, 34]),
            ),
            Anomaly(
                id="AN-133",
                asset_name="Aktobe compressor ring",
                region="Aktobe Region",
                facility_type="Gathering and compression",
                severity="high",
                detected_at="2026-03-25 21:35",
                methane_delta_pct=26,
                co2e_tonnes=134,
                flare_hours=8,
                signal_score=84,
                confidence="High confidence / persistent over 8 days",
                coordinates="49.029 N, 57.428 E",
                latitude=49.029,
                longitude=57.428,
                summary="Methane uplift remains elevated around a compressor corridor with repeated nighttime combustion context.",
                recommended_action="Escalate for operator review and validate whether compressor routing or purge activity changed this week.",
                site_position=SitePosition(x=37, y=29),
                trend=self._trend([34, 36, 41, 55, 63, 71]),
            ),
            Anomaly(
                id="AN-141",
                asset_name="Karachaganak gas train",
                region="West Kazakhstan Region",
                facility_type="Processing and storage",
                severity="medium",
                detected_at="2026-03-25 19:10",
                methane_delta_pct=17,
                co2e_tonnes=88,
                flare_hours=5,
                signal_score=67,
                confidence="Medium confidence / single-week deviation",
                coordinates="51.318 N, 53.266 E",
                latitude=51.318,
                longitude=53.266,
                summary="The signal sits above the rolling baseline, but persistence is still below the strongest western Kazakhstan cluster.",
                recommended_action="Keep the site in the daily screening queue and confirm whether another pass repeats the uplift.",
                site_position=SitePosition(x=24, y=18),
                trend=self._trend([22, 24, 26, 33, 38, 49]),
            ),
            Anomaly(
                id="AN-149",
                asset_name="Kumkol gathering node",
                region="Kyzylorda Region",
                facility_type="Gathering and compression",
                severity="watch",
                detected_at="2026-03-25 16:45",
                methane_delta_pct=13,
                co2e_tonnes=57,
                flare_hours=4,
                signal_score=52,
                confidence="Medium confidence / single-week deviation",
                coordinates="45.950 N, 65.480 E",
                latitude=45.950,
                longitude=65.480,
                summary="A modest methane uplift is visible over the production corridor, but the trend remains weaker than the western hotspot set.",
                recommended_action="Keep visible for the regional MRV call and compare with the next screening refresh before escalation.",
                site_position=SitePosition(x=58, y=67),
                trend=self._trend([14, 16, 18, 21, 27, 31]),
            ),
            Anomaly(
                id="AN-156",
                asset_name="Pavlodar refinery corridor",
                region="Pavlodar Region",
                facility_type="Processing and storage",
                severity="watch",
                detected_at="2026-03-25 14:05",
                methane_delta_pct=7,
                co2e_tonnes=29,
                flare_hours=2,
                signal_score=36,
                confidence="Watchlist / flare-led signal",
                coordinates="52.287 N, 76.973 E",
                latitude=52.287,
                longitude=76.973,
                summary="The northern refinery corridor stays visible on the national map, but methane deviation remains limited versus the stronger western signals.",
                recommended_action="Use as a low-priority national anchor in screening review and keep focus on the higher-urgency western regions.",
                site_position=SitePosition(x=81, y=21),
                trend=self._trend([10, 11, 12, 14, 16, 19]),
            ),
        ]
        self._seeded_kpis = deepcopy(self.kpis)
        self._seeded_anomalies = deepcopy(self.anomalies)

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
                detail="Kazakhstan-wide seeded anomaly set was loaded for contest-safe playback.",
                actor="Demo pipeline",
                incident_id="INC-204",
                entity_type="pipeline",
                entity_id="seeded-screening",
                metadata={
                    "provider": "Seeded contest dataset",
                    "scope": "Kazakhstan screening coverage",
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
            area_label="Kazakhstan screening coverage",
            evidence_source="Seeded demo baseline",
            freshness="fresh",
            screening_level="medium",
            synced_at="2026-03-26 07:40",
            last_successful_sync_at="2026-03-26 07:40",
            observed_window="Seeded playback window across multiple Kazakhstan oil and gas regions.",
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

        incident_suffix = anomaly.id
        if incident_suffix.startswith("AN-"):
            incident_suffix = incident_suffix[3:]
        elif incident_suffix.startswith("GEE-"):
            incident_suffix = incident_suffix[4:]
        incident_id = f"INC-{incident_suffix}"
        incident = Incident(
            id=incident_id,
            anomaly_id=anomaly.id,
            title=f"New verification case for {anomaly.asset_name}",
            status="triage",
            owner=payload.owner,
            priority="P1" if anomaly.severity == "high" else "P2",
            verification_window="Next 12 hours" if anomaly.severity == "high" else "Next 24 hours",
            narrative=(
                "This incident was promoted from the live screening queue. The signal is operationally ranked, "
                "but it still requires field verification before source attribution."
                if anomaly.evidence_source
                else "This incident was promoted directly from the anomaly queue to prove the screening-to-action flow before live operator integrations are wired."
            ),
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
                "co2e_tonnes": anomaly.co2e_tonnes if anomaly.co2e_tonnes is not None else "not estimated",
                "night_thermal_hits_72h": anomaly.night_thermal_hits_72h
                if anomaly.night_thermal_hits_72h is not None
                else "not available",
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

    def export_report_html(
        self,
        incident_id: str,
        locale: Locale = "en",
        auto_print: bool = False,
    ) -> str:
        prepared = self._prepare_report_export(incident_id, locale)
        return render_html(prepared, auto_print=auto_print)

    def export_report_pdf(self, incident_id: str, locale: Locale = "en") -> bytes:
        prepared = self._prepare_report_export(incident_id, locale)
        return render_pdf(prepared)

    def export_report_docx(self, incident_id: str, locale: Locale = "en") -> bytes:
        prepared = self._prepare_report_export(incident_id, locale)
        return render_docx(prepared)

    def _prepare_report_export(self, incident_id: str, locale: Locale) -> PreparedReport:
        incident = self.incidents.get(incident_id)
        if incident is None:
            raise KeyError(incident_id)

        anomaly = self._find_anomaly(incident.anomaly_id)
        audit_events = self._incident_activity(incident_id)
        return prepare_report(
            anomaly=anomaly,
            incident=incident,
            audit_events=audit_events,
            locale=locale,
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

    def apply_live_candidates(
        self,
        *,
        candidates: list[GeeCandidate],
        latest_observation_at: str | None,
    ) -> None:
        self.anomalies = [self._candidate_to_anomaly(candidate) for candidate in candidates]
        self.kpis = self._build_live_kpis(candidates, latest_observation_at)

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
        self.kpis = deepcopy(self._seeded_kpis)
        self.anomalies = deepcopy(self._seeded_anomalies)
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
            area_label="Kazakhstan screening coverage",
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
        measurement_body = (
            self._live_measurement_summary(anomaly)
            if anomaly.co2e_tonnes is None
            else (
                f"Satellite screening flagged {anomaly.asset_name} in {anomaly.region} with "
                f"+{anomaly.methane_delta_pct}% methane uplift and {anomaly.flare_hours} flare-observed hours."
            )
        )
        reporting_body = (
            self._live_progress_summary(anomaly, incident)
            if anomaly.co2e_tonnes is None
            else (
                f"Current potential impact is estimated at {anomaly.co2e_tonnes} tCO2e. "
                f"{self._completed_tasks(incident)}/{len(incident.tasks)} verification tasks are complete."
            )
        )
        return [
            ReportSection(
                title="Measurement",
                body=measurement_body,
            ),
            ReportSection(
                title="Reporting",
                body=reporting_body,
            ),
            ReportSection(
                title="Verification",
                body=f"{incident.owner} owns the case under {incident.priority} priority with a {incident.verification_window.lower()} window.",
            ),
        ]

    def _build_live_kpis(
        self,
        candidates: list[GeeCandidate],
        latest_observation_at: str | None,
    ) -> list[KpiCard]:
        if not candidates:
            return [
                KpiCard(
                    label="Live candidates",
                    value="0",
                    detail="No live CH4 hotspot candidate passed the current threshold.",
                ),
                KpiCard(
                    label="Strongest uplift",
                    value="Not available",
                    detail="Run another sync when a valid scene is available.",
                ),
                KpiCard(
                    label="Night thermal context",
                    value="0 detections",
                    detail="No recent VIIRS night detections were linked to the current live queue.",
                ),
                KpiCard(
                    label="Latest scene",
                    value=latest_observation_at or "Not available",
                    detail="Most recent valid TROPOMI observation used in the live queue.",
                ),
            ]

        strongest = max(candidates, key=lambda candidate: candidate.signal_score)
        unique_regions = sorted({candidate.region for candidate in candidates})
        total_night_hits = sum(candidate.night_thermal_hits_72h for candidate in candidates)
        return [
            KpiCard(
                label="Live candidates",
                value=str(len(candidates)),
                detail=f"{len(unique_regions)} Kazakhstan regions in the current live screening queue",
            ),
            KpiCard(
                label="Strongest uplift",
                value=f"{strongest.methane_delta_ppb:.2f} ppb / {strongest.methane_delta_pct:.2f}%",
                detail=f"Top live hotspot: {strongest.asset_name}",
            ),
            KpiCard(
                label="Night thermal context",
                value=f"{total_night_hits} detections",
                detail="VIIRS night-time thermal detections inside 25 km candidate buffers over the last 72 hours",
            ),
            KpiCard(
                label="Latest scene",
                value=latest_observation_at or "Not available",
                detail="Most recent valid TROPOMI observation used in the live queue",
            ),
        ]

    def _candidate_to_anomaly(self, candidate: GeeCandidate) -> Anomaly:
        return Anomaly(
            id=candidate.id,
            asset_name=candidate.asset_name,
            region=candidate.region,
            facility_type=candidate.facility_type,
            severity=candidate.severity,
            detected_at=candidate.detected_at,
            methane_delta_pct=round(candidate.methane_delta_pct, 2),
            methane_delta_ppb=round(candidate.methane_delta_ppb, 2),
            co2e_tonnes=None,
            flare_hours=None,
            thermal_hits_72h=candidate.thermal_hits_72h,
            night_thermal_hits_72h=candidate.night_thermal_hits_72h,
            current_ch4_ppb=round(candidate.current_ch4_ppb, 2),
            baseline_ch4_ppb=round(candidate.baseline_ch4_ppb, 2),
            evidence_source=candidate.evidence_source,
            baseline_window=candidate.baseline_window,
            signal_score=candidate.signal_score,
            confidence=candidate.confidence,
            coordinates=candidate.coordinates,
            latitude=candidate.latitude,
            longitude=candidate.longitude,
            verification_area=candidate.verification_area,
            nearest_address=candidate.nearest_address,
            nearest_landmark=candidate.nearest_landmark,
            summary=candidate.summary,
            recommended_action=candidate.recommended_action,
            site_position=self._candidate_site_position(candidate.latitude, candidate.longitude),
            trend=[],
        )

    def _candidate_site_position(self, latitude: float, longitude: float) -> SitePosition:
        west, south, east, north = 46.0, 40.0, 87.0, 56.0
        normalized_x = round(((longitude - west) / (east - west)) * 100)
        normalized_y = round((1 - ((latitude - south) / (north - south))) * 100)
        return SitePosition(
            x=max(0, min(100, normalized_x)),
            y=max(0, min(100, normalized_y)),
        )

    def _live_measurement_summary(self, anomaly: Anomaly) -> str:
        thermal_note = (
            f"{anomaly.night_thermal_hits_72h} night-time VIIRS detections"
            if anomaly.night_thermal_hits_72h
            else "no night-time VIIRS detections"
        )
        location_tail = ""
        if anomaly.verification_area:
            location_tail = f" Verification area: {anomaly.verification_area}."
        if anomaly.nearest_landmark:
            location_tail += f" Nearest landmark: {anomaly.nearest_landmark}."
        return (
            f"Live screening flagged {anomaly.asset_name} in {anomaly.region} with "
            f"+{anomaly.methane_delta_ppb:.2f} ppb ({anomaly.methane_delta_pct:.2f}%) methane uplift "
            f"versus the rolling baseline and {thermal_note} inside the 25 km context window."
            f"{location_tail}"
        )

    def _live_progress_summary(self, anomaly: Anomaly, incident: Incident) -> str:
        return (
            f"{self._completed_tasks(incident)}/{len(incident.tasks)} verification tasks are complete. "
            f"This live screening queue does not estimate tCO2e yet; it keeps the candidate operationally ranked by "
            f"methane uplift and nearby thermal context."
        )

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
