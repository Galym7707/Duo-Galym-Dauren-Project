from __future__ import annotations

from datetime import UTC, datetime

from app.models import PipelineStage, PipelineStatus, ScreeningEvidenceSnapshot
from app.providers.gee import GeeProvider
from app.services.demo_store import DemoStore


class PipelineService:
    def __init__(self, store: DemoStore) -> None:
        self.store = store
        self.provider = GeeProvider()
        self._status = self._initial_status()

    def get_status(self) -> PipelineStatus:
        return self._status.model_copy(deep=True)

    def sync_gee(self) -> PipelineStatus:
        now = self._now()
        summary = self.provider.sync_summary()

        if summary.status == "ready":
            snapshot = self.store.apply_fresh_screening_evidence(
                synced_at=now,
                project_id=summary.project_id,
                observed_window=summary.observed_window,
                latest_observation_at=summary.latest_observation_at,
                mean_ch4_ppb=summary.mean_ch4_ppb,
                baseline_ch4_ppb=summary.baseline_ch4_ppb,
                delta_abs_ppb=summary.delta_abs_ppb,
                delta_pct=summary.delta_pct,
                screening_level=self._screening_level(summary.delta_pct),
                status_message=summary.message,
            )
            self.store.apply_live_candidates(
                candidates=summary.candidates,
                latest_observation_at=summary.latest_observation_at,
            )
            mean_fragment = (
                f"Current CH4 {summary.mean_ch4_ppb} ppb vs baseline {summary.baseline_ch4_ppb} ppb."
                if summary.mean_ch4_ppb is not None and summary.baseline_ch4_ppb is not None
                else "Latest CH4 scene fetched successfully."
            )
            self._status = PipelineStatus(
                source="gee",
                state="ready",
                provider_label="Google Earth Engine",
                project_id=summary.project_id,
                last_sync_at=now,
                latest_observation_at=summary.latest_observation_at,
                anomaly_count=len(self.store.anomalies),
                status_message=summary.message,
                stages=[
                    PipelineStage(
                        label="Ingest layer",
                        value="Earth Engine connected",
                        detail=summary.latest_observation_at
                        and f"Latest CH4 scene timestamp: {summary.latest_observation_at}."
                        or "Latest CH4 scene fetched successfully.",
                    ),
                    PipelineStage(
                        label="Normalization layer",
                        value="Live candidates refreshed",
                        detail=f"{mean_fragment} {len(summary.candidates)} live candidates were pushed into the operational queue.",
                    ),
                    PipelineStage(
                        label="Verification layer",
                        value="Promotion remains manual",
                        detail="Live screening candidates now feed the queue, while incident, task, and MRV workflow remain manually promoted and auditable.",
                    ),
                ],
                screening_snapshot=snapshot,
            )
            return self.get_status()

        degraded_state = "degraded" if summary.status == "degraded" else "error"
        snapshot = (
            self.store.mark_screening_stale(synced_at=now, caveat=summary.message)
            if summary.status == "degraded"
            else self.store.mark_screening_unavailable(synced_at=now, caveat=summary.message)
        )
        normalization_detail = (
            "The last verified live screening snapshot remains visible while the next live refresh is unavailable."
            if snapshot.last_successful_sync_at
            else "No verified live screening snapshot is stored yet, so the queue stays empty until a live sync succeeds."
        )
        self._status = PipelineStatus(
            source="gee",
            state=degraded_state,
            provider_label="Google Earth Engine",
            project_id=summary.project_id,
            last_sync_at=now,
            latest_observation_at=summary.latest_observation_at,
            anomaly_count=len(self.store.anomalies),
            status_message=summary.message,
            stages=[
                    PipelineStage(
                        label="Ingest layer",
                        value="Earth Engine not fully verified",
                        detail=summary.message,
                    ),
                    PipelineStage(
                        label="Normalization layer",
                        value="Waiting for verified live evidence",
                        detail=normalization_detail,
                    ),
                    PipelineStage(
                        label="Verification layer",
                        value="Workflow preserved",
                        detail="Existing incidents and reports remain accessible even if a new live sync fails.",
                    ),
                ],
                screening_snapshot=snapshot,
            )
        return self.get_status()

    def _initial_status(self) -> PipelineStatus:
        initial_snapshot = self.store.screening_snapshot()
        return PipelineStatus(
            source="gee",
            state="degraded",
            provider_label="Google Earth Engine",
            project_id=self.provider.project_id,
            last_sync_at=None,
            latest_observation_at=None,
            anomaly_count=len(self.store.anomalies),
            status_message="Run live sync to load the first Earth Engine screening snapshot.",
            stages=[
                PipelineStage(
                    label="Ingest layer",
                    value="Waiting for first sync",
                    detail="No live CH4 scene has been loaded into the project yet.",
                ),
                PipelineStage(
                    label="Normalization layer",
                    value="No live queue yet",
                    detail="Candidate ranking begins only after a successful Earth Engine refresh.",
                ),
                PipelineStage(
                    label="Verification layer",
                    value="Workflow ready",
                    detail="Incidents, tasks, and MRV reports become actionable once a live candidate is promoted.",
                ),
            ],
            screening_snapshot=initial_snapshot,
        )

    def _now(self) -> str:
        return datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")

    def _screening_level(self, delta_pct: float | None) -> str:
        if delta_pct is None:
            return "medium"
        if delta_pct >= 10:
            return "high"
        if delta_pct >= 3:
            return "medium"
        return "low"
