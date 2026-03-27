from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
import os


@dataclass
class GeeSyncSummary:
    project_id: str | None
    status: str
    message: str
    latest_observation_at: str | None = None
    observed_window: str | None = None
    mean_ch4_ppb: float | None = None
    baseline_ch4_ppb: float | None = None
    delta_abs_ppb: float | None = None
    delta_pct: float | None = None
    scene_count: int | None = None


class GeeProvider:
    DATASET_ID = "COPERNICUS/S5P/OFFL/L3_CH4"
    BAND_NAME = "CH4_column_volume_mixing_ratio_dry_air"

    def __init__(self) -> None:
        self.project_id = os.getenv("EARTH_ENGINE_PROJECT", "gen-lang-client-0372752376")

    def sync_summary(self) -> GeeSyncSummary:
        try:
            import ee  # type: ignore
        except ImportError:
            return GeeSyncSummary(
                project_id=self.project_id,
                status="error",
                message="earthengine-api is not installed in the backend runtime.",
            )

        try:
            ee.Initialize(project=self.project_id)
        except Exception as error:  # pragma: no cover - runtime/environment dependent
            return GeeSyncSummary(
                project_id=self.project_id,
                status="error",
                message=f"Earth Engine initialization failed: {error}",
            )

        # [temporary MVP shortcut]
        # We validate live Earth Engine access and fetch a broad CH4 summary over Kazakhstan.
        # Asset-level anomaly generation still stays in the demo store until the full ingest layer lands.
        kazakhstan_bounds = ee.Geometry.Rectangle([46.0, 40.0, 87.0, 56.0], geodesic=False)
        try:
            collection = (
                ee.ImageCollection(self.DATASET_ID)
                .filterBounds(kazakhstan_bounds)
                .select(self.BAND_NAME)
            )
            scene_count = int(collection.size().getInfo())

            if scene_count == 0:
                return GeeSyncSummary(
                    project_id=self.project_id,
                    status="degraded",
                    message="Earth Engine connected, but no Kazakhstan CH4 scenes were returned for the configured collection.",
                )

            latest = collection.sort("system:time_start", False).first()
            latest_timestamp = latest.get("system:time_start")
            latest_millis = int(latest_timestamp.getInfo())
            latest_observation_at = datetime.fromtimestamp(latest_millis / 1000, UTC).strftime(
                "%Y-%m-%d %H:%M UTC"
            )

            current_value = (
                latest.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=kazakhstan_bounds,
                    scale=20000,
                    bestEffort=True,
                    maxPixels=10_000_000,
                )
                .get(self.BAND_NAME)
                .getInfo()
            )

            historical_collection = collection.filter(
                ee.Filter.lt("system:time_start", latest_timestamp)
            )
            historical_count = int(historical_collection.size().getInfo())
            baseline_image = historical_collection.mean() if historical_count > 0 else collection.mean()
            baseline_value = (
                baseline_image.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=kazakhstan_bounds,
                    scale=20000,
                    bestEffort=True,
                    maxPixels=10_000_000,
                )
                .get(self.BAND_NAME)
                .getInfo()
            )
        except Exception as error:  # pragma: no cover - runtime/environment dependent
            return GeeSyncSummary(
                project_id=self.project_id,
                status="error",
                message=f"Earth Engine CH4 query failed: {error}",
            )

        normalized_current = round(float(current_value), 2) if current_value is not None else None
        normalized_baseline = round(float(baseline_value), 2) if baseline_value is not None else None
        delta_abs = None
        delta_pct = None
        if normalized_current is not None and normalized_baseline is not None:
            delta_abs = round(normalized_current - normalized_baseline, 2)
            if normalized_baseline != 0:
                delta_pct = round((delta_abs / normalized_baseline) * 100, 2)

        return GeeSyncSummary(
            project_id=self.project_id,
            status="ready",
            message="Earth Engine CH4 screening summary fetched successfully.",
            latest_observation_at=latest_observation_at,
            observed_window=(
                "Latest TROPOMI scene compared with Kazakhstan historical mean."
                if historical_count > 0
                else "Latest TROPOMI scene only; historical comparison is limited."
            ),
            mean_ch4_ppb=normalized_current,
            baseline_ch4_ppb=normalized_baseline,
            delta_abs_ppb=delta_abs,
            delta_pct=delta_pct,
            scene_count=scene_count,
        )
