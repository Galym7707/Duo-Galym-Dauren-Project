from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Severity = Literal["high", "medium", "watch"]
IncidentStatus = Literal["triage", "verification", "mitigation"]
TaskStatus = Literal["open", "done"]
PipelineSource = Literal["seeded", "gee"]
PipelineState = Literal["ready", "degraded", "error", "syncing"]


class SitePosition(BaseModel):
    x: int = Field(ge=0, le=100)
    y: int = Field(ge=0, le=100)


class TrendPoint(BaseModel):
    label: str
    anomaly_index: int = Field(ge=0, le=100)


class KpiCard(BaseModel):
    label: str
    value: str
    detail: str


class IncidentTask(BaseModel):
    id: str
    title: str
    owner: str
    eta_hours: int = Field(gt=0)
    status: TaskStatus
    notes: str


class Anomaly(BaseModel):
    id: str
    asset_name: str
    region: str
    facility_type: str
    severity: Severity
    detected_at: str
    methane_delta_pct: int
    co2e_tonnes: int
    flare_hours: int
    signal_score: int = Field(ge=0, le=100)
    confidence: str
    coordinates: str
    summary: str
    recommended_action: str
    site_position: SitePosition
    trend: list[TrendPoint]
    linked_incident_id: str | None = None


class Incident(BaseModel):
    id: str
    anomaly_id: str
    title: str
    status: IncidentStatus
    owner: str
    priority: str
    verification_window: str
    report_generated_at: str | None = None
    narrative: str
    tasks: list[IncidentTask]
    report_sections: list["ReportSection"] | None = None


class ReportSection(BaseModel):
    title: str
    body: str


class DashboardPayload(BaseModel):
    kpis: list[KpiCard]
    anomalies: list[Anomaly]
    incidents: list[Incident]


class PromoteAnomalyRequest(BaseModel):
    owner: str = "MRV response lead"


class CreateTaskRequest(BaseModel):
    title: str
    owner: str
    eta_hours: int = 4
    notes: str = ""


class GenerateReportResponse(BaseModel):
    incident: Incident
    report: list[ReportSection]


class PipelineStage(BaseModel):
    label: str
    value: str
    detail: str


class PipelineStatus(BaseModel):
    source: PipelineSource
    state: PipelineState
    provider_label: str
    project_id: str | None = None
    last_sync_at: str | None = None
    latest_observation_at: str | None = None
    anomaly_count: int
    status_message: str
    stages: list[PipelineStage]


class PipelineSyncRequest(BaseModel):
    source: PipelineSource = "gee"


class PipelineSyncResponse(BaseModel):
    status: PipelineStatus
