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
  co2eTonnes: number;
  flareHours: number;
  signalScore: number;
  confidence: string;
  coordinates: string;
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
};

export type Kpi = {
  label: string;
  value: string;
  detail: string;
};

export const kpis: Kpi[] = [
  {
    label: "Open anomalies",
    value: "3",
    detail: "2 methane clusters, 1 flare persistence signal",
  },
  {
    label: "Potential CO2e",
    value: "428 tCO2e",
    detail: "Current week across seeded Kazakhstan pilot assets",
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
    summary:
      "Elevated methane column overlaps recurring Nightfire activity close to a compression corridor.",
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
    summary:
      "Nightfire signal is strong, methane spread remains low. Good candidate for trend monitoring rather than emergency dispatch.",
    recommendedAction:
      "Keep visible in weekly MRV review and compare against operator maintenance schedule.",
    sitePosition: {
      x: 25,
      y: 72,
    },
    trend: weeklyTrend([16, 17, 19, 23, 29, 34]),
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

export const demoScript = [
  "Select the strongest anomaly and explain why it matters in Kazakhstan right now.",
  "Promote the anomaly into an incident so the story moves from visibility to action.",
  "Show task ownership and verification steps to prove this is not a passive dashboard.",
  "Generate the MRV report preview to close the loop for ESG and compliance teams.",
];
