from __future__ import annotations

from datetime import UTC, datetime

from app.models import PipelineStage, PipelineStatus
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
        )
        return self.get_status()

    def sync_gee(self) -> PipelineStatus:
        now = self._now()
        summary = self.provider.sync_summary()

        if summary.status == "ready":
            mean_fragment = (
                f"Latest mean CH4 column over Kazakhstan: {summary.mean_ch4_ppb} ppb."
                if summary.mean_ch4_ppb is not None
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
                        value="Live summary validated",
                        detail=mean_fragment,
                    ),
                    PipelineStage(
                        label="Verification layer",
                        value="Workflow still demo-safe",
                        detail="Live CH4 connection is verified while anomaly-to-action flow remains stable.",
                    ),
                ],
            )
            return self.get_status()

        degraded_state = "degraded" if summary.status == "degraded" else "error"
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
                    value="Earth Engine not verified",
                    detail=summary.message,
                ),
                PipelineStage(
                    label="Normalization layer",
                    value="Seeded fallback remains active",
                    detail="Screening logic in the UI stays available while live ingest is being stabilized.",
                ),
                PipelineStage(
                    label="Verification layer",
                    value="Workflow preserved",
                    detail="Incident, task, and MRV reporting remain usable even if live sync fails.",
                ),
            ],
        )
        return self.get_status()

    def _seeded_status(self) -> PipelineStatus:
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
        )

    def _now(self) -> str:
        return datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")
