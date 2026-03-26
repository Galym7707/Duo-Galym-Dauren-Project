from fastapi import APIRouter, HTTPException, status

from app.models import (
    Anomaly,
    CreateTaskRequest,
    DashboardPayload,
    GenerateReportResponse,
    Incident,
    PromoteAnomalyRequest,
)
from app.services.demo_store import DemoStore

router = APIRouter(prefix="/api/v1", tags=["mrv"])
store = DemoStore()


@router.get("/dashboard", response_model=DashboardPayload)
async def get_dashboard() -> DashboardPayload:
    return store.dashboard()


@router.get("/anomalies", response_model=list[Anomaly])
async def list_anomalies() -> list[Anomaly]:
    return store.list_anomalies()


@router.post(
    "/anomalies/{anomaly_id}/promote",
    response_model=Incident,
    status_code=status.HTTP_201_CREATED,
)
async def promote_anomaly(anomaly_id: str, payload: PromoteAnomalyRequest) -> Incident:
    try:
        return store.promote_anomaly(anomaly_id, payload)
    except KeyError as error:
        raise HTTPException(status_code=404, detail=f"Unknown anomaly {anomaly_id}") from error


@router.get("/incidents", response_model=list[Incident])
async def list_incidents() -> list[Incident]:
    return store.list_incidents()


@router.get("/incidents/{incident_id}", response_model=Incident)
async def get_incident(incident_id: str) -> Incident:
    try:
        return store.get_incident(incident_id)
    except KeyError as error:
        raise HTTPException(status_code=404, detail=f"Unknown incident {incident_id}") from error


@router.post("/incidents/{incident_id}/tasks", response_model=Incident)
async def create_task(incident_id: str, payload: CreateTaskRequest) -> Incident:
    try:
        return store.create_task(incident_id, payload)
    except KeyError as error:
        raise HTTPException(status_code=404, detail=f"Unknown incident {incident_id}") from error


@router.post("/incidents/{incident_id}/tasks/{task_id}/complete", response_model=Incident)
async def complete_task(incident_id: str, task_id: str) -> Incident:
    try:
        return store.complete_task(incident_id, task_id)
    except KeyError as error:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown incident or task: {incident_id} / {task_id}",
        ) from error


@router.post("/incidents/{incident_id}/report", response_model=GenerateReportResponse)
async def generate_report(incident_id: str) -> GenerateReportResponse:
    try:
        return store.generate_report(incident_id)
    except KeyError as error:
        raise HTTPException(status_code=404, detail=f"Unknown incident {incident_id}") from error
