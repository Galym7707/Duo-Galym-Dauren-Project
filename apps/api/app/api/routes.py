from fastapi import APIRouter, HTTPException, Response, status
from fastapi.concurrency import run_in_threadpool

from app.models import (
    Anomaly,
    CreateTaskRequest,
    DashboardPayload,
    GenerateReportResponse,
    Incident,
    PipelineStatus,
    PipelineSyncRequest,
    PipelineSyncResponse,
    PromoteAnomalyRequest,
)
from app.services.demo_store import DemoStore
from app.services.pipeline_service import PipelineService

router = APIRouter(prefix="/api/v1", tags=["mrv"])
store = DemoStore()
pipeline_service = PipelineService(store)


@router.get("/dashboard", response_model=DashboardPayload)
async def get_dashboard() -> DashboardPayload:
    return store.dashboard()


@router.get("/pipeline/status", response_model=PipelineStatus)
async def get_pipeline_status() -> PipelineStatus:
    return pipeline_service.get_status()


@router.post("/pipeline/sync", response_model=PipelineSyncResponse)
async def sync_pipeline(payload: PipelineSyncRequest) -> PipelineSyncResponse:
    status_model = await run_in_threadpool(
        pipeline_service.sync_gee if payload.source == "gee" else pipeline_service.sync_seeded
    )
    return PipelineSyncResponse(status=status_model)


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


@router.get("/incidents/{incident_id}/report/export")
async def export_report(incident_id: str) -> Response:
    try:
        report_html = store.export_report_html(incident_id)
    except KeyError as error:
        raise HTTPException(status_code=404, detail=f"Unknown incident {incident_id}") from error

    return Response(
        content=report_html,
        media_type="text/html; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{incident_id.lower()}-mrv-report.html"',
        },
    )


@router.get("/incidents/{incident_id}/report/view")
async def view_report(incident_id: str, auto_print: bool = False) -> Response:
    try:
        report_html = store.export_report_html(incident_id, auto_print=auto_print)
    except KeyError as error:
        raise HTTPException(status_code=404, detail=f"Unknown incident {incident_id}") from error

    return Response(
        content=report_html,
        media_type="text/html; charset=utf-8",
    )
