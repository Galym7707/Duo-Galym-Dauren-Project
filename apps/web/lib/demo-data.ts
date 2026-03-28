export type Severity = "high" | "medium" | "watch";
export type TaskStatus = "open" | "done";

export type SitePosition = {
  x: number;
  y: number;
};

export type TrendPoint = {
  label: string;
  anomalyIndex: number;
};

export type Anomaly = {
  id: string;
  assetName: string;
  region: string;
  facilityType: string;
  severity: Severity;
  detectedAt: string;
  methaneDeltaPct: number;
  methaneDeltaPpb?: number;
  co2eTonnes?: number;
  flareHours?: number;
  thermalHits72h?: number;
  nightThermalHits72h?: number;
  currentCh4Ppb?: number;
  baselineCh4Ppb?: number;
  evidenceSource?: string;
  baselineWindow?: string;
  signalScore: number;
  confidence: string;
  coordinates: string;
  latitude: number;
  longitude: number;
  verificationArea?: string;
  nearestAddress?: string;
  nearestLandmark?: string;
  summary: string;
  recommendedAction: string;
  sitePosition: SitePosition;
  trend: TrendPoint[];
  linkedIncidentId?: string;
};

export type IncidentTask = {
  id: string;
  title: string;
  owner: string;
  etaHours: number;
  status: TaskStatus;
  notes: string;
};

export type Incident = {
  id: string;
  anomalyId: string;
  title: string;
  status: "triage" | "verification" | "mitigation";
  owner: string;
  priority: string;
  verificationWindow: string;
  reportGeneratedAt?: string;
  narrative: string;
  tasks: IncidentTask[];
  reportSections?: ReportSection[];
};

export type Kpi = {
  label: string;
  value: string;
  detail: string;
};

export type ReportSection = {
  title: string;
  body: string;
};

export type ActivityEvent = {
  id: string;
  occurredAt: string;
  stage: "ingest" | "incident" | "verification" | "report";
  source: "seeded" | "gee" | "workflow";
  action:
    | "screening_loaded"
    | "anomaly_promoted"
    | "task_created"
    | "task_completed"
    | "report_generated"
    | "gee_sync_verified";
  title: string;
  detail: string;
  actor: string;
  incidentId?: string;
  entityType: "pipeline" | "anomaly" | "incident" | "task" | "report";
  entityId?: string;
  metadata: Record<string, string | number | boolean | null>;
};

export type DashboardState = {
  kpis: Kpi[];
  anomalies: Anomaly[];
  incidents: Record<string, Incident>;
  activityFeed: ActivityEvent[];
};

export const kpis: Kpi[] = [
  {
    label: "Open anomalies",
    value: "7",
    detail: "4 methane signals, 3 lower-priority markers across 6 Kazakhstan regions",
  },
  {
    label: "Potential CO2e",
    value: "627 tCO2e",
    detail: "Current week across seeded Kazakhstan screening coverage",
  },
  {
    label: "Time to triage",
    value: "< 6 h",
    detail: "From satellite signal to incident owner assignment",
  },
  {
    label: "Demo posture",
    value: "Pilot-safe",
    detail: "Open data in, workflow out, no operator lock-in required",
  },
];

const weeklyTrend = (values: number[]): TrendPoint[] =>
  values.map((value, index) => ({
    label: `W${index + 1}`,
    anomalyIndex: value,
  }));

export const anomalyFeed: Anomaly[] = [
  {
    id: "AN-104",
    assetName: "Tengiz satellite cluster",
    region: "Atyrau Region",
    facilityType: "Gathering and compression",
    severity: "high",
    detectedAt: "2026-03-26 08:20",
    methaneDeltaPct: 34,
    co2eTonnes: 182,
    flareHours: 11,
    signalScore: 91,
    confidence: "High confidence / persistent over 8 days",
    coordinates: "46.094 N, 53.452 E",
    latitude: 46.094,
    longitude: 53.452,
    summary:
      "Elevated methane column overlaps recurring night-burning context close to a compression corridor.",
    recommendedAction:
      "Escalate to field integrity desk and request same-day verification route.",
    sitePosition: {
      x: 62,
      y: 44,
    },
    trend: weeklyTrend([39, 42, 44, 57, 61, 79]),
    linkedIncidentId: "INC-204",
  },
  {
    id: "AN-117",
    assetName: "Karabatan processing block",
    region: "Atyrau Region",
    facilityType: "Processing and storage",
    severity: "medium",
    detectedAt: "2026-03-26 05:50",
    methaneDeltaPct: 19,
    co2eTonnes: 96,
    flareHours: 6,
    signalScore: 73,
    confidence: "Medium confidence / single-week deviation",
    coordinates: "46.190 N, 51.858 E",
    latitude: 46.19,
    longitude: 51.858,
    summary:
      "Methane anomaly is above 12-week median, but flare persistence is less stable than the leading incident.",
    recommendedAction:
      "Create watchlist incident only if another pass confirms persistence in the next 24 hours.",
    sitePosition: {
      x: 48,
      y: 63,
    },
    trend: weeklyTrend([28, 31, 29, 41, 44, 58]),
  },
  {
    id: "AN-121",
    assetName: "Mangystau export hub",
    region: "Mangystau Region",
    facilityType: "Terminal and flare line",
    severity: "watch",
    detectedAt: "2026-03-25 23:10",
    methaneDeltaPct: 11,
    co2eTonnes: 41,
    flareHours: 14,
    signalScore: 58,
    confidence: "Watchlist / flare-led signal",
    coordinates: "43.690 N, 51.167 E",
    latitude: 43.69,
    longitude: 51.167,
    summary:
      "Night-burning context is strong, methane spread remains low. Good candidate for trend monitoring rather than emergency dispatch.",
    recommendedAction:
      "Keep visible in weekly MRV review and compare against operator maintenance schedule.",
    sitePosition: {
      x: 25,
      y: 72,
    },
    trend: weeklyTrend([16, 17, 19, 23, 29, 34]),
  },
  {
    id: "AN-133",
    assetName: "Aktobe compressor ring",
    region: "Aktobe Region",
    facilityType: "Gathering and compression",
    severity: "high",
    detectedAt: "2026-03-25 21:35",
    methaneDeltaPct: 26,
    co2eTonnes: 134,
    flareHours: 8,
    signalScore: 84,
    confidence: "High confidence / persistent over 8 days",
    coordinates: "49.029 N, 57.428 E",
    latitude: 49.029,
    longitude: 57.428,
    summary:
      "Methane uplift remains elevated around a compressor corridor with repeated nighttime combustion context.",
    recommendedAction:
      "Escalate for operator review and validate whether compressor routing or purge activity changed this week.",
    sitePosition: {
      x: 37,
      y: 29,
    },
    trend: weeklyTrend([34, 36, 41, 55, 63, 71]),
  },
  {
    id: "AN-141",
    assetName: "Karachaganak gas train",
    region: "West Kazakhstan Region",
    facilityType: "Processing and storage",
    severity: "medium",
    detectedAt: "2026-03-25 19:10",
    methaneDeltaPct: 17,
    co2eTonnes: 88,
    flareHours: 5,
    signalScore: 67,
    confidence: "Medium confidence / single-week deviation",
    coordinates: "51.318 N, 53.266 E",
    latitude: 51.318,
    longitude: 53.266,
    summary:
      "The signal sits above the rolling baseline, but persistence is still below the strongest western Kazakhstan cluster.",
    recommendedAction:
      "Keep the site in the daily screening queue and confirm whether another pass repeats the uplift.",
    sitePosition: {
      x: 24,
      y: 18,
    },
    trend: weeklyTrend([22, 24, 26, 33, 38, 49]),
  },
  {
    id: "AN-149",
    assetName: "Kumkol gathering node",
    region: "Kyzylorda Region",
    facilityType: "Gathering and compression",
    severity: "watch",
    detectedAt: "2026-03-25 16:45",
    methaneDeltaPct: 13,
    co2eTonnes: 57,
    flareHours: 4,
    signalScore: 52,
    confidence: "Medium confidence / single-week deviation",
    coordinates: "45.950 N, 65.480 E",
    latitude: 45.95,
    longitude: 65.48,
    summary:
      "A modest methane uplift is visible over the production corridor, but the trend remains weaker than the western hotspot set.",
    recommendedAction:
      "Keep visible for the regional MRV call and compare with the next screening refresh before escalation.",
    sitePosition: {
      x: 58,
      y: 67,
    },
    trend: weeklyTrend([14, 16, 18, 21, 27, 31]),
  },
  {
    id: "AN-156",
    assetName: "Pavlodar refinery corridor",
    region: "Pavlodar Region",
    facilityType: "Processing and storage",
    severity: "watch",
    detectedAt: "2026-03-25 14:05",
    methaneDeltaPct: 7,
    co2eTonnes: 29,
    flareHours: 2,
    signalScore: 36,
    confidence: "Watchlist / flare-led signal",
    coordinates: "52.287 N, 76.973 E",
    latitude: 52.287,
    longitude: 76.973,
    summary:
      "The northern refinery corridor stays visible on the national map, but methane deviation remains limited versus the stronger western signals.",
    recommendedAction:
      "Use as a low-priority national anchor in screening review and keep focus on the higher-urgency western regions.",
    sitePosition: {
      x: 81,
      y: 21,
    },
    trend: weeklyTrend([10, 11, 12, 14, 16, 19]),
  },
];

export const seededIncidents: Record<string, Incident> = {
  "INC-204": {
    id: "INC-204",
    anomalyId: "AN-104",
    title: "Persistent methane uplift near compression corridor",
    status: "verification",
    owner: "Field integrity desk",
    priority: "P1",
    verificationWindow: "Next 12 hours",
    narrative:
      "Current workflow assumes a screening layer: we are not claiming pinpoint source identification, only a clear operational priority for field verification.",
    reportGeneratedAt: "2026-03-26 12:10",
    tasks: [
      {
        id: "TASK-1",
        title: "Dispatch LDAR walkdown request",
        owner: "Ops coordinator",
        etaHours: 2,
        status: "done",
        notes: "Route aligned with maintenance shift in Atyrau.",
      },
      {
        id: "TASK-2",
        title: "Cross-check flare line maintenance history",
        owner: "Reliability engineer",
        etaHours: 6,
        status: "open",
        notes: "Look for compressor upset or flare purge event.",
      },
      {
        id: "TASK-3",
        title: "Draft regulator-facing MRV note",
        owner: "ESG lead",
        etaHours: 8,
        status: "open",
        notes: "Prepare incident context and verification plan.",
      },
    ],
  },
};

export const seededActivityFeed: ActivityEvent[] = [
  {
    id: "ACT-1001",
    occurredAt: "2026-03-26 07:40",
    stage: "ingest",
    source: "seeded",
    action: "screening_loaded",
    title: "Seeded CH4 screening loaded",
    detail: "Kazakhstan-wide seeded anomaly set was loaded for contest-safe playback.",
    actor: "Demo pipeline",
    incidentId: "INC-204",
    entityType: "pipeline",
    entityId: "seeded-screening",
    metadata: {
      provider: "Seeded contest dataset",
      scope: "Kazakhstan screening coverage",
    },
  },
  {
    id: "ACT-1002",
    occurredAt: "2026-03-26 08:20",
    stage: "incident",
    source: "workflow",
    action: "anomaly_promoted",
    title: "Tengiz anomaly promoted",
    detail: "AN-104 was escalated into incident INC-204 for verification ownership.",
    actor: "MRV response lead",
    incidentId: "INC-204",
    entityType: "incident",
    entityId: "INC-204",
    metadata: {
      anomaly_id: "AN-104",
      owner: "MRV response lead",
    },
  },
  {
    id: "ACT-1003",
    occurredAt: "2026-03-26 10:10",
    stage: "verification",
    source: "workflow",
    action: "task_completed",
    title: "LDAR walkdown dispatched",
    detail: "Field verification route was aligned with the Atyrau maintenance shift.",
    actor: "Ops coordinator",
    incidentId: "INC-204",
    entityType: "task",
    entityId: "TASK-1",
    metadata: {
      task_id: "TASK-1",
      status: "done",
    },
  },
  {
    id: "ACT-1004",
    occurredAt: "2026-03-26 12:10",
    stage: "report",
    source: "workflow",
    action: "report_generated",
    title: "MRV preview generated",
    detail: "Incident INC-204 now has a seeded MRV report preview for stakeholder review.",
    actor: "ESG lead",
    incidentId: "INC-204",
    entityType: "report",
    entityId: "INC-204-report",
    metadata: {
      incident_id: "INC-204",
      artifact: "seeded-preview",
    },
  },
];

export function createDemoDashboardState(): DashboardState {
  return {
    kpis: kpis.map((kpi) => ({ ...kpi })),
    anomalies: anomalyFeed.map((anomaly) => ({
      ...anomaly,
      sitePosition: { ...anomaly.sitePosition },
      trend: anomaly.trend.map((point) => ({ ...point })),
    })),
    incidents: Object.fromEntries(
      Object.entries(seededIncidents).map(([incidentId, incident]) => [
        incidentId,
        {
          ...incident,
          tasks: incident.tasks.map((task) => ({ ...task })),
          reportSections: incident.reportSections?.map((section) => ({ ...section })),
        },
      ]),
    ),
    activityFeed: seededActivityFeed.map((event) => ({ ...event })),
  };
}
