import {
  type ActivityEvent,
  type Anomaly,
  createEmptyDashboardState,
  type DashboardState,
  type Incident,
  type IncidentTask,
  type Kpi,
  type ReportSection,
  type Severity,
  type TaskStatus,
  type TrendPoint,
} from "./dashboard-types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
export const hasApiBaseUrl = Boolean(apiBaseUrl);

export type DashboardSource = "api" | "unavailable";
export type DashboardHydrationState = DashboardState & { source: DashboardSource };
export type PipelineSource = "gee";
export type PipelineState = "ready" | "degraded" | "error" | "syncing";
export type PipelineHistoryTrigger = "manual" | "scheduled";
export type EvidenceFreshness = "fresh" | "stale" | "unavailable";
export type ScreeningLevel = "low" | "medium" | "high";
export type ReportExportFormat = "html" | "pdf" | "docx";
export type PipelineStageCard = {
  label: string;
  value: string;
  detail: string;
};
export type ScreeningEvidenceSnapshot = {
  areaLabel: string;
  evidenceSource: string;
  freshness: EvidenceFreshness;
  screeningLevel: ScreeningLevel;
  syncedAt?: string;
  lastSuccessfulSyncAt?: string;
  observedWindow?: string;
  currentCh4Ppb?: number;
  baselineCh4Ppb?: number;
  deltaAbsPpb?: number;
  deltaPct?: number;
  confidenceNote: string;
  caveat?: string;
  recommendedAction: string;
};
export type PipelineStatus = {
  source: PipelineSource;
  state: PipelineState;
  providerLabel: string;
  projectId?: string;
  lastSyncAt?: string;
  latestObservationAt?: string;
  anomalyCount: number;
  statusMessage: string;
  stages: PipelineStageCard[];
  screeningSnapshot?: ScreeningEvidenceSnapshot;
};
export type PipelineScheduleStatus = {
  enabled: boolean;
  intervalMinutes?: number;
  nextRunAt?: string;
  runOnStartup: boolean;
};
export type PipelineHistoryRun = {
  id: number;
  createdAt: string;
  trigger: PipelineHistoryTrigger;
  status: PipelineStatus;
};
export type PipelineHistoryPayload = {
  runs: PipelineHistoryRun[];
  schedule: PipelineScheduleStatus;
};

type ApiDashboardPayload = {
  kpis: ApiKpi[];
  anomalies: ApiAnomaly[];
  incidents: ApiIncident[];
  activity_feed: ApiActivityEvent[];
};

type ApiKpi = {
  label: string;
  value: string;
  detail: string;
};

type ApiTrendPoint = {
  label: string;
  anomaly_index: number;
};

type ApiAnomaly = {
  id: string;
  asset_name: string;
  region: string;
  facility_type: string;
  severity: Severity;
  detected_at: string;
  methane_delta_pct: number;
  methane_delta_ppb?: number | null;
  co2e_tonnes?: number | null;
  flare_hours?: number | null;
  thermal_hits_72h?: number | null;
  night_thermal_hits_72h?: number | null;
  current_ch4_ppb?: number | null;
  baseline_ch4_ppb?: number | null;
  evidence_source?: string | null;
  baseline_window?: string | null;
  signal_score: number;
  confidence: string;
  coordinates: string;
  latitude: number;
  longitude: number;
  verification_area?: string | null;
  nearest_address?: string | null;
  nearest_landmark?: string | null;
  summary: string;
  recommended_action: string;
  site_position: {
    x: number;
    y: number;
  };
  trend: ApiTrendPoint[];
  linked_incident_id?: string | null;
};

type ApiIncidentTask = {
  id: string;
  title: string;
  owner: string;
  eta_hours: number;
  status: TaskStatus;
  notes: string;
};

type ApiIncident = {
  id: string;
  anomaly_id: string;
  title: string;
  status: Incident["status"];
  owner: string;
  priority: string;
  verification_window: string;
  report_generated_at?: string | null;
  narrative: string;
  tasks: ApiIncidentTask[];
  report_sections?: ApiReportSection[] | null;
};

type ApiReportSection = {
  title: string;
  body: string;
};

type ApiActivityEvent = {
  id: string;
  occurred_at: string;
  stage: ActivityEvent["stage"];
  source: ActivityEvent["source"];
  action: ActivityEvent["action"];
  title: string;
  detail: string;
  actor: string;
  incident_id?: string | null;
  entity_type: ActivityEvent["entityType"];
  entity_id?: string | null;
  metadata?: Record<string, string | number | boolean | null> | null;
};

type ApiGenerateReportResponse = {
  incident: ApiIncident;
  report: ApiReportSection[];
};

type ApiActivityFeedPayload = {
  events: ApiActivityEvent[];
};

type ApiPipelineStage = {
  label: string;
  value: string;
  detail: string;
};

type ApiPipelineStatus = {
  source: PipelineSource;
  state: PipelineState;
  provider_label: string;
  project_id?: string | null;
  last_sync_at?: string | null;
  latest_observation_at?: string | null;
  anomaly_count: number;
  status_message: string;
  stages: ApiPipelineStage[];
  screening_snapshot?: ApiScreeningEvidenceSnapshot | null;
};

type ApiPipelineSyncResponse = {
  status: ApiPipelineStatus;
};
type ApiPipelineScheduleStatus = {
  enabled: boolean;
  interval_minutes?: number | null;
  next_run_at?: string | null;
  run_on_startup: boolean;
};
type ApiPipelineHistoryEntry = {
  id: number;
  created_at: string;
  trigger: PipelineHistoryTrigger;
  status: ApiPipelineStatus;
};
type ApiPipelineHistoryPayload = {
  runs: ApiPipelineHistoryEntry[];
  schedule: ApiPipelineScheduleStatus;
};

type ApiScreeningEvidenceSnapshot = {
  area_label: string;
  evidence_source: string;
  freshness: EvidenceFreshness;
  screening_level: ScreeningLevel;
  synced_at?: string | null;
  last_successful_sync_at?: string | null;
  observed_window?: string | null;
  current_ch4_ppb?: number | null;
  baseline_ch4_ppb?: number | null;
  delta_abs_ppb?: number | null;
  delta_pct?: number | null;
  confidence_note: string;
  caveat?: string | null;
  recommended_action: string;
};

type CreateTaskPayload = {
  title: string;
  owner: string;
  eta_hours: number;
  notes: string;
};

export type DownloadedReport = {
  blob: Blob;
  fileName: string;
  contentType: string;
};

export function createUnavailableDashboardState(): DashboardHydrationState {
  return {
    ...createEmptyDashboardState(),
    source: "unavailable",
  };
}

export function createInitialPipelineStatus(anomalyCount: number): PipelineStatus {
  return {
    source: "gee",
    state: "degraded",
    providerLabel: "Google Earth Engine",
    anomalyCount,
    statusMessage: "Run live sync to load the first Earth Engine screening snapshot.",
    stages: [
      {
        label: "Ingest layer",
        value: "Waiting for first sync",
        detail: "The backend is ready, but no live Earth Engine screening snapshot is loaded yet.",
      },
      {
        label: "Normalization layer",
        value: "No live queue yet",
        detail: "Candidate ranking starts only after the first successful methane screening refresh.",
      },
      {
        label: "Verification layer",
        value: "Workflow ready",
        detail: "Incident, task, and MRV reporting are available as soon as a live candidate is promoted.",
      },
    ],
  };
}

export function createInitialPipelineHistory(): PipelineHistoryPayload {
  return {
    runs: [],
    schedule: {
      enabled: false,
      runOnStartup: false,
    },
  };
}

export async function loadDashboardState(): Promise<DashboardHydrationState> {
  if (!apiBaseUrl) {
    return createUnavailableDashboardState();
  }

  try {
    const payload = await requestJson<ApiDashboardPayload>("/api/v1/dashboard");
    return {
      ...normalizeDashboard(payload),
      source: "api",
    };
  } catch {
    return createUnavailableDashboardState();
  }
}

export async function loadActivityFeed(
  fallbackEvents: ActivityEvent[] = [],
): Promise<ActivityEvent[]> {
  if (!apiBaseUrl) {
    return fallbackEvents;
  }

  try {
    const payload = await requestJson<ApiActivityFeedPayload>("/api/v1/activity");
    return payload.events.map(normalizeActivityEvent);
  } catch {
    return fallbackEvents;
  }
}

export async function loadIncidentActivity(
  incidentId: string,
  fallbackEvents: ActivityEvent[],
): Promise<ActivityEvent[]> {
  const filteredFallback = fallbackEvents.filter(
    (event) => event.incidentId === incidentId || event.stage === "ingest",
  );

  if (!apiBaseUrl) {
    return filteredFallback;
  }

  try {
    const payload = await requestJson<ApiActivityFeedPayload>(
      `/api/v1/incidents/${incidentId}/audit`,
    );
    return payload.events.map(normalizeActivityEvent);
  } catch {
    return filteredFallback;
  }
}

export async function promoteAnomaly(anomalyId: string): Promise<Incident> {
  const payload = await requestJson<ApiIncident>(`/api/v1/anomalies/${anomalyId}/promote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      owner: "MRV response lead",
    }),
  });
  return normalizeIncident(payload);
}

export async function completeTask(incidentId: string, taskId: string): Promise<Incident> {
  const payload = await requestJson<ApiIncident>(
    `/api/v1/incidents/${incidentId}/tasks/${taskId}/complete`,
    {
      method: "POST",
    },
  );
  return normalizeIncident(payload);
}

export async function createTask(
  incidentId: string,
  payload: CreateTaskPayload,
): Promise<Incident> {
  const response = await requestJson<ApiIncident>(`/api/v1/incidents/${incidentId}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return normalizeIncident(response);
}

export async function generateReport(incidentId: string): Promise<Incident> {
  const payload = await requestJson<ApiGenerateReportResponse>(
    `/api/v1/incidents/${incidentId}/report`,
    {
      method: "POST",
    },
  );

  return {
    ...normalizeIncident(payload.incident),
    reportSections: payload.report.map(normalizeReportSection),
  };
}

export async function downloadReport(
  incidentId: string,
  format: ReportExportFormat = "html",
  locale: "en" | "ru" = "en",
): Promise<DownloadedReport> {
  if (!apiBaseUrl) {
    throw new Error("API base URL is not configured");
  }

  const params = new URLSearchParams({ format, locale });
  const response = await fetch(
    `${apiBaseUrl}/api/v1/incidents/${incidentId}/report/export?${params.toString()}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const disposition = response.headers.get("content-disposition");
  const match = disposition?.match(/filename="([^"]+)"/);

  return {
    blob: await response.blob(),
    fileName: match?.[1] ?? `${incidentId.toLowerCase()}-mrv-report.${format}`,
    contentType: response.headers.get("content-type") ?? "text/html;charset=utf-8",
  };
}

export function getReportViewUrl(
  incidentId: string,
  autoPrint = false,
  locale: "en" | "ru" = "en",
): string | null {
  if (!apiBaseUrl) {
    return null;
  }

  const params = new URLSearchParams({ locale });
  if (autoPrint) {
    params.set("auto_print", "true");
  }
  return `${apiBaseUrl}/api/v1/incidents/${incidentId}/report/view?${params.toString()}`;
}

export async function loadPipelineStatus(anomalyCount: number): Promise<PipelineStatus> {
  if (!apiBaseUrl) {
    return createInitialPipelineStatus(anomalyCount);
  }

  try {
    const payload = await requestJson<ApiPipelineStatus>("/api/v1/pipeline/status");
    return normalizePipelineStatus(payload);
  } catch {
    return createInitialPipelineStatus(anomalyCount);
  }
}

export async function syncPipeline(source: PipelineSource = "gee"): Promise<PipelineStatus> {
  if (!apiBaseUrl) {
    throw new Error("API base URL is not configured");
  }

  const payload = await requestJson<ApiPipelineSyncResponse>("/api/v1/pipeline/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source }),
  });
  return normalizePipelineStatus(payload.status);
}

export async function loadPipelineHistory(limit = 10): Promise<PipelineHistoryPayload> {
  if (!apiBaseUrl) {
    return createInitialPipelineHistory();
  }

  try {
    const payload = await requestJson<ApiPipelineHistoryPayload>(`/api/v1/pipeline/history?limit=${limit}`);
    return normalizePipelineHistory(payload);
  } catch {
    return createInitialPipelineHistory();
  }
}

function normalizeDashboard(payload: ApiDashboardPayload): DashboardState {
  const anomalies = payload.anomalies.map(normalizeAnomaly);
  const incidents = Object.fromEntries(
    payload.incidents.map((incident) => {
      const normalizedIncident = normalizeIncident(incident);
      return [normalizedIncident.id, normalizedIncident];
    }),
  );

  return {
    kpis: payload.kpis.map(normalizeKpi),
    anomalies,
    incidents,
    activityFeed: payload.activity_feed.map(normalizeActivityEvent),
  };
}

function normalizeKpi(kpi: ApiKpi): Kpi {
  return {
    label: kpi.label,
    value: kpi.value,
    detail: kpi.detail,
  };
}

function normalizeTrendPoint(point: ApiTrendPoint): TrendPoint {
  return {
    label: point.label,
    anomalyIndex: point.anomaly_index,
  };
}

function normalizeAnomaly(anomaly: ApiAnomaly): Anomaly {
  return {
    id: anomaly.id,
    assetName: anomaly.asset_name,
    region: anomaly.region,
    facilityType: anomaly.facility_type,
    severity: anomaly.severity,
    detectedAt: anomaly.detected_at,
    methaneDeltaPct: anomaly.methane_delta_pct,
    methaneDeltaPpb: anomaly.methane_delta_ppb ?? undefined,
    co2eTonnes: anomaly.co2e_tonnes ?? undefined,
    flareHours: anomaly.flare_hours ?? undefined,
    thermalHits72h: anomaly.thermal_hits_72h ?? undefined,
    nightThermalHits72h: anomaly.night_thermal_hits_72h ?? undefined,
    currentCh4Ppb: anomaly.current_ch4_ppb ?? undefined,
    baselineCh4Ppb: anomaly.baseline_ch4_ppb ?? undefined,
    evidenceSource: anomaly.evidence_source ?? undefined,
    baselineWindow: anomaly.baseline_window ?? undefined,
    signalScore: anomaly.signal_score,
    confidence: anomaly.confidence,
    coordinates: anomaly.coordinates,
    latitude: anomaly.latitude,
    longitude: anomaly.longitude,
    verificationArea: anomaly.verification_area ?? undefined,
    nearestAddress: anomaly.nearest_address ?? undefined,
    nearestLandmark: anomaly.nearest_landmark ?? undefined,
    summary: anomaly.summary,
    recommendedAction: anomaly.recommended_action,
    sitePosition: {
      x: anomaly.site_position.x,
      y: anomaly.site_position.y,
    },
    trend: anomaly.trend.map(normalizeTrendPoint),
    linkedIncidentId: anomaly.linked_incident_id ?? undefined,
  };
}

function normalizeTask(task: ApiIncidentTask): IncidentTask {
  return {
    id: task.id,
    title: task.title,
    owner: task.owner,
    etaHours: task.eta_hours,
    status: task.status,
    notes: task.notes,
  };
}

function normalizeIncident(incident: ApiIncident): Incident {
  return {
    id: incident.id,
    anomalyId: incident.anomaly_id,
    title: incident.title,
    status: incident.status,
    owner: incident.owner,
    priority: incident.priority,
    verificationWindow: incident.verification_window,
    reportGeneratedAt: incident.report_generated_at ?? undefined,
    narrative: incident.narrative,
    tasks: incident.tasks.map(normalizeTask),
    reportSections: incident.report_sections?.map(normalizeReportSection),
  };
}

function normalizeReportSection(section: ApiReportSection): ReportSection {
  return {
    title: section.title,
    body: section.body,
  };
}

function normalizeActivityEvent(event: ApiActivityEvent): ActivityEvent {
  return {
    id: event.id,
    occurredAt: event.occurred_at,
    stage: event.stage,
    source: event.source,
    action: event.action,
    title: event.title,
    detail: event.detail,
    actor: event.actor,
    incidentId: event.incident_id ?? undefined,
    entityType: event.entity_type,
    entityId: event.entity_id ?? undefined,
    metadata: event.metadata ?? {},
  };
}

function normalizePipelineStatus(status: ApiPipelineStatus): PipelineStatus {
  return {
    source: status.source,
    state: status.state,
    providerLabel: status.provider_label,
    projectId: status.project_id ?? undefined,
    lastSyncAt: status.last_sync_at ?? undefined,
    latestObservationAt: status.latest_observation_at ?? undefined,
    anomalyCount: status.anomaly_count,
    statusMessage: status.status_message,
    stages: status.stages.map((stage) => ({
      label: stage.label,
      value: stage.value,
      detail: stage.detail,
    })),
    screeningSnapshot: status.screening_snapshot
      ? normalizeScreeningEvidenceSnapshot(status.screening_snapshot)
      : undefined,
  };
}

function normalizePipelineHistory(payload: ApiPipelineHistoryPayload): PipelineHistoryPayload {
  return {
    runs: payload.runs.map((entry) => ({
      id: entry.id,
      createdAt: entry.created_at,
      trigger: entry.trigger,
      status: normalizePipelineStatus(entry.status),
    })),
    schedule: {
      enabled: payload.schedule.enabled,
      intervalMinutes: payload.schedule.interval_minutes ?? undefined,
      nextRunAt: payload.schedule.next_run_at ?? undefined,
      runOnStartup: payload.schedule.run_on_startup,
    },
  };
}

function normalizeScreeningEvidenceSnapshot(
  snapshot: ApiScreeningEvidenceSnapshot,
): ScreeningEvidenceSnapshot {
  return {
    areaLabel: snapshot.area_label,
    evidenceSource: snapshot.evidence_source,
    freshness: snapshot.freshness,
    screeningLevel: snapshot.screening_level,
    syncedAt: snapshot.synced_at ?? undefined,
    lastSuccessfulSyncAt: snapshot.last_successful_sync_at ?? undefined,
    observedWindow: snapshot.observed_window ?? undefined,
    currentCh4Ppb: snapshot.current_ch4_ppb ?? undefined,
    baselineCh4Ppb: snapshot.baseline_ch4_ppb ?? undefined,
    deltaAbsPpb: snapshot.delta_abs_ppb ?? undefined,
    deltaPct: snapshot.delta_pct ?? undefined,
    confidenceNote: snapshot.confidence_note,
    caveat: snapshot.caveat ?? undefined,
    recommendedAction: snapshot.recommended_action,
  };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}
