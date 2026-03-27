from __future__ import annotations

from datetime import UTC, datetime

from app.models import PipelineStage, PipelineStatus, ScreeningEvidenceSnapshot
from app.providers.gee import GeeProvider
from app.services.demo_store import DemoStore


class PipelineService:
    def __init__(self, store: DemoStore) -> None:
        self.store = store
        self.provider = GeeProvider()
        self._status = self._seeded_status()

    def get_status(self) -> PipelineStatus:
        return self._status.model_copy(deep=True)

    def sync_seeded(self) -> PipelineStatus:
        now = self._now()
        self.store.clear_live_evidence()
        seeded_snapshot = self.store.screening_snapshot()
        self._status = PipelineStatus(
            source="seeded",
            state="ready",
            provider_label="Seeded demo pipeline",
            project_id=None,
            last_sync_at=now,
            latest_observation_at=now,
            anomaly_count=len(self.store.anomalies),
            status_message="Seeded anomaly set reloaded for demo-safe playback.",
            stages=[
                PipelineStage(
                    label="Ingest layer",
                    value="Seeded dataset active",
                    detail="Open-data adapters are bypassed and the contest demo dataset is loaded.",
                ),
                PipelineStage(
                    label="Normalization layer",
                    value="Demo baseline applied",
                    detail="Anomaly score, CO2e framing, and workflow transitions are available for playback.",
                ),
                PipelineStage(
                    label="Verification layer",
                    value="Workflow ready",
                    detail="Incident, task, and MRV reporting remain fully interactive.",
                ),
            ],
            screening_snapshot=seeded_snapshot,
        )
        return self.get_status()

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
                        value="Screening evidence refreshed",
                        detail=mean_fragment,
                    ),
                    PipelineStage(
                        label="Verification layer",
                        value="Promotion remains manual",
                        detail="The evidence layer is live, while incident, task, and MRV workflow stay demo-safe.",
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
                        value="Previous evidence retained",
                        detail="The last available screening snapshot remains visible while seeded operational flow stays intact.",
                    ),
                    PipelineStage(
                        label="Verification layer",
                        value="Workflow preserved",
                        detail="Incident, task, and MRV reporting remain usable even if live sync fails.",
                    ),
                ],
                screening_snapshot=snapshot,
            )
        return self.get_status()

    def _seeded_status(self) -> PipelineStatus:
        seeded_snapshot = self.store.screening_snapshot()
        return PipelineStatus(
            source="seeded",
            state="ready",
            provider_label="Seeded demo pipeline",
            project_id=None,
            last_sync_at=None,
            latest_observation_at=None,
            anomaly_count=len(self.store.anomalies),
            status_message="Seeded demo pipeline is active until a live sync is requested.",
            stages=[
                PipelineStage(
                    label="Ingest layer",
                    value="Seeded dataset active",
                    detail="Open-data provider calls are not required for the current playback state.",
                ),
                PipelineStage(
                    label="Normalization layer",
                    value="Demo scoring loaded",
                    detail="Baseline comparison and CO2e framing are already attached to the current anomaly feed.",
                ),
                PipelineStage(
                    label="Verification layer",
                    value="Workflow ready",
                    detail="Incident, task, and MRV reporting are ready for the contest demo.",
                ),
            ],
            screening_snapshot=seeded_snapshot,
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
