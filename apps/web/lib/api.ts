import {
  type Anomaly,
  createDemoDashboardState,
  type DashboardState,
  type Incident,
  type IncidentTask,
  type Kpi,
  type ReportSection,
  type Severity,
  type TaskStatus,
  type TrendPoint,
} from "./demo-data";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export type DashboardSource = "api" | "fallback";
export type DashboardHydrationState = DashboardState & { source: DashboardSource };

type ApiDashboardPayload = {
  kpis: ApiKpi[];
  anomalies: ApiAnomaly[];
  incidents: ApiIncident[];
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
  co2e_tonnes: number;
  flare_hours: number;
  signal_score: number;
  confidence: string;
  coordinates: string;
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

type ApiGenerateReportResponse = {
  incident: ApiIncident;
  report: ApiReportSection[];
};

type CreateTaskPayload = {
  title: string;
  owner: string;
  eta_hours: number;
  notes: string;
};

export function fallbackDashboardState(): DashboardHydrationState {
  return {
    ...createDemoDashboardState(),
    source: "fallback",
  };
}

export async function loadDashboardState(): Promise<DashboardHydrationState> {
  if (!apiBaseUrl) {
    return fallbackDashboardState();
  }

  try {
    const payload = await requestJson<ApiDashboardPayload>("/api/v1/dashboard");
    return {
      ...normalizeDashboard(payload),
      source: "api",
    };
  } catch {
    return fallbackDashboardState();
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
    co2eTonnes: anomaly.co2e_tonnes,
    flareHours: anomaly.flare_hours,
    signalScore: anomaly.signal_score,
    confidence: anomaly.confidence,
    coordinates: anomaly.coordinates,
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
