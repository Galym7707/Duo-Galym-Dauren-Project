"use client";

import { startTransition, useEffect, useState } from "react";
import {
  demoScript,
  type Anomaly,
  type Incident,
  type IncidentTask,
} from "../lib/demo-data";
import {
  completeTask,
  createTask,
  type DashboardHydrationState,
  fallbackDashboardState,
  generateReport as generateReportRequest,
  loadDashboardState,
  promoteAnomaly as promoteAnomalyRequest,
} from "../lib/api";

const severityTone: Record<Anomaly["severity"], string> = {
  high: "severity-high",
  medium: "severity-medium",
  watch: "severity-watch",
};

const severityLabel: Record<Anomaly["severity"], string> = {
  high: "Escalate",
  medium: "Verify",
  watch: "Watch",
};

export default function Page() {
  const fallback = fallbackDashboardState();
  const [dashboardSource, setDashboardSource] =
    useState<DashboardHydrationState["source"]>(fallback.source);
  const [kpiCards, setKpiCards] = useState(fallback.kpis);
  const [anomalies, setAnomalies] = useState(fallback.anomalies);
  const [incidents, setIncidents] = useState(fallback.incidents);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState(fallback.anomalies[0].id);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<null | string>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrateDashboard() {
      const state = await loadDashboardState();
      if (cancelled) {
        return;
      }

      startTransition(() => {
        setDashboardSource(state.source);
        setKpiCards(state.kpis);
        setAnomalies(state.anomalies);
        setIncidents(state.incidents);
        setSelectedAnomalyId((current) => {
          const exists = state.anomalies.some((item) => item.id === current);
          return exists ? current : state.anomalies[0]?.id ?? current;
        });
        setLoadingDashboard(false);
      });
    }

    void hydrateDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedAnomaly =
    anomalies.find((item) => item.id === selectedAnomalyId) ?? anomalies[0] ?? null;
  const hasAnomalies = Boolean(selectedAnomaly);

  const activeIncident = selectedAnomaly?.linkedIncidentId
    ? incidents[selectedAnomaly.linkedIncidentId]
    : undefined;

  const completedTasks = activeIncident
    ? activeIncident.tasks.filter((task) => task.status === "done").length
    : 0;

  const reportSections =
    selectedAnomaly &&
    (activeIncident?.reportSections ?? buildReportSections(selectedAnomaly, activeIncident));

  const promoteToIncident = async () => {
    if (!selectedAnomaly || selectedAnomaly.linkedIncidentId) {
      return;
    }

    setBusyAction("promote");
    setRequestError(null);

    try {
      if (dashboardSource === "api") {
        const incident = await promoteAnomalyRequest(selectedAnomaly.id);
        applyIncidentUpdate(incident, selectedAnomaly.id);
      } else {
        applyIncidentUpdate(createFallbackIncident(selectedAnomaly), selectedAnomaly.id);
      }
    } catch {
      if (dashboardSource === "api") {
        setDashboardSource("fallback");
      }
      applyIncidentUpdate(createFallbackIncident(selectedAnomaly), selectedAnomaly.id);
      setRequestError("Incident promotion failed. The fallback demo state is still available.");
    } finally {
      setBusyAction(null);
    }
  };

  const markTaskDone = async (taskId: string) => {
    if (!activeIncident) {
      return;
    }

    const currentTask = activeIncident.tasks.find((task) => task.id === taskId);
    if (!currentTask || currentTask.status === "done") {
      return;
    }

    setBusyAction(taskId);
    setRequestError(null);

    try {
      if (dashboardSource === "api") {
        const incident = await completeTask(activeIncident.id, taskId);
        applyIncidentUpdate(incident, incident.anomalyId);
      } else {
        applyTaskCompletionFallback(activeIncident, taskId);
      }
    } catch {
      if (dashboardSource === "api") {
        setDashboardSource("fallback");
      }
      applyTaskCompletionFallback(activeIncident, taskId);
      setRequestError("Task update failed. Keep the seeded state for the recording fallback.");
    } finally {
      setBusyAction(null);
    }
  };

  const generateReport = async () => {
    if (!activeIncident) {
      return;
    }

    setBusyAction(`report-${activeIncident.id}`);
    setRequestError(null);

    try {
      if (dashboardSource === "api") {
        const incident = await generateReportRequest(activeIncident.id);
        applyIncidentUpdate(incident, incident.anomalyId);
      } else {
        applyReportFallback(activeIncident, selectedAnomaly);
      }
    } catch {
      if (dashboardSource === "api") {
        setDashboardSource("fallback");
      }
      applyReportFallback(activeIncident, selectedAnomaly);
      setRequestError("MRV report generation failed. Keep the seeded preview for the demo.");
    } finally {
      setBusyAction(null);
    }
  };

  const createVerificationTask = async () => {
    if (!activeIncident) {
      return;
    }

    const actionId = `create-task-${activeIncident.id}`;
    setBusyAction(actionId);
    setRequestError(null);

    try {
      const payload = buildVerificationTaskPayload(selectedAnomaly, activeIncident.tasks.length + 1);

      if (dashboardSource === "api") {
        const incident = await createTask(activeIncident.id, payload);
        applyIncidentUpdate(incident, incident.anomalyId);
      } else {
        startTransition(() => {
          setIncidents((current) => ({
            ...current,
            [activeIncident.id]: {
              ...activeIncident,
              tasks: [
                ...activeIncident.tasks,
                {
                  id: `${activeIncident.id}-TASK-${activeIncident.tasks.length + 1}`,
                  title: payload.title,
                  owner: payload.owner,
                  etaHours: payload.eta_hours,
                  status: "open",
                  notes: payload.notes,
                },
              ],
            },
          }));
        });
      }
    } catch {
      if (dashboardSource === "api") {
        setDashboardSource("fallback");
      }
      setRequestError("Task creation failed. The incident still remains usable for the demo.");
    } finally {
      setBusyAction(null);
    }
  };

  function applyIncidentUpdate(incident: Incident, anomalyId: string) {
    startTransition(() => {
      setIncidents((current) => ({
        ...current,
        [incident.id]: incident,
      }));
      setAnomalies((current) =>
        current.map((item) =>
          item.id === anomalyId
            ? {
                ...item,
                linkedIncidentId: incident.id,
              }
            : item,
        ),
      );
    });
  }

  function applyTaskCompletionFallback(incident: Incident, taskId: string) {
    startTransition(() => {
      setIncidents((current) => ({
        ...current,
        [incident.id]: {
          ...incident,
          status: incident.tasks.every((task) => task.id === taskId || task.status === "done")
            ? "mitigation"
            : incident.status,
          tasks: incident.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status: "done",
                }
              : task,
          ),
        },
      }));
    });
  }

  function applyReportFallback(incident: Incident, anomaly: Anomaly) {
    startTransition(() => {
      setIncidents((current) => ({
        ...current,
        [incident.id]: {
          ...incident,
          reportGeneratedAt: "2026-03-27 09:00",
          status: incident.tasks.every((task) => task.status === "done")
            ? "mitigation"
            : incident.status,
          reportSections: buildReportSections(anomaly, {
            ...incident,
            reportGeneratedAt: "2026-03-27 09:00",
          }),
        },
      }));
    });
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Kazakhstan Startup Challenge 2026 / Submission build</p>
          <h1>Saryna MRV turns methane visibility into operator action.</h1>
          <p className="hero-text">
            Screen methane and flare anomalies, escalate the right signal, assign verification,
            and export a regulator-ready story without pretending satellites can replace LDAR.
          </p>

          <div className="hero-strip">
            <div>
              <span>Nearest goal</span>
              <strong>Submission-ready MVP by April 3</strong>
            </div>
            <div>
              <span>Main risk</span>
              <strong>Pretty dashboard without workflow proof</strong>
            </div>
            <div>
              <span>Positioning</span>
              <strong>MRV bridge for ESG, compliance, and operations</strong>
            </div>
          </div>

          <div className="status-row">
            <span className={`status-pill ${dashboardSource === "api" ? "status-live" : "status-fallback"}`}>
              {dashboardSource === "api" ? "Live API connected" : "Fallback demo state"}
            </span>
            <span className="status-copy">
              {loadingDashboard
                ? "Checking FastAPI backend..."
                : dashboardSource === "api"
                  ? "Frontend is reading and mutating the FastAPI contract."
                  : "FastAPI is unavailable, so the UI stays demo-safe with seeded state."}
            </span>
          </div>

          {requestError ? <p className="inline-error">{requestError}</p> : null}
        </div>

        <div className="hero-aside">
          <p className="aside-label">Demo loop</p>
          <ol className="demo-loop">
            <li>Detect anomaly</li>
            <li>Promote incident</li>
            <li>Assign verification task</li>
            <li>Export MRV report</li>
          </ol>
        </div>
      </section>

      <section className="kpi-row">
        {kpiCards.map((kpi) => (
          <article key={kpi.label} className="kpi-block">
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
            <p>{kpi.detail}</p>
          </article>
        ))}
      </section>

      <section className="workspace">
        <aside className="rail">
          <div className="section-head">
            <div>
              <p className="eyebrow">Anomaly queue</p>
              <h2>Screen before you mobilize</h2>
            </div>
            <span className="rail-count">{anomalies.length} signals</span>
          </div>

          <div className="queue">
            {!hasAnomalies ? (
              <section className="empty-state queue-empty-state">
                <p>No anomalies are currently above the screening threshold for this window.</p>
              </section>
            ) : null}
            {anomalies.map((anomaly) => {
              const isSelected = anomaly.id === selectedAnomaly?.id;

              return (
                <button
                  key={anomaly.id}
                  className={`queue-item ${isSelected ? "queue-item-active" : ""}`}
                  onClick={() => setSelectedAnomalyId(anomaly.id)}
                  type="button"
                >
                  <div className="queue-meta">
                    <span className={`severity ${severityTone[anomaly.severity]}`}>
                      {severityLabel[anomaly.severity]}
                    </span>
                    <span>{anomaly.detectedAt}</span>
                  </div>

                  <strong>{anomaly.assetName}</strong>
                  <p>{anomaly.summary}</p>

                  <dl className="queue-stats">
                    <div>
                      <dt>CH4 uplift</dt>
                      <dd>+{anomaly.methaneDeltaPct}%</dd>
                    </div>
                    <div>
                      <dt>Potential CO2e</dt>
                      <dd>{anomaly.co2eTonnes} t</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{anomaly.linkedIncidentId ? "Incident open" : "Awaiting triage"}</dd>
                    </div>
                  </dl>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="canvas">
          <div className="section-head">
            <div>
              <p className="eyebrow">Operations canvas</p>
              <h2>{selectedAnomaly?.assetName ?? "No active anomaly"}</h2>
            </div>
            {selectedAnomaly ? (
              <div className="badge-stack">
                <span className={`severity ${severityTone[selectedAnomaly.severity]}`}>
                  {severityLabel[selectedAnomaly.severity]}
                </span>
                <span className="soft-badge">{selectedAnomaly.region}</span>
              </div>
            ) : null}
          </div>

          <div className="map-frame">
            <div className="map-grid" />
            {anomalies.map((anomaly) => (
              <button
                key={anomaly.id}
                aria-label={anomaly.assetName}
                className={`site-dot ${anomaly.id === selectedAnomaly?.id ? "site-dot-active" : ""}`}
                onClick={() => setSelectedAnomalyId(anomaly.id)}
                style={{
                  left: `${anomaly.sitePosition.x}%`,
                  top: `${anomaly.sitePosition.y}%`,
                }}
                type="button"
              >
                <span />
              </button>
            ))}

            {selectedAnomaly ? (
              <div className="map-overlay">
                <div>
                  <span>Coordinates</span>
                  <strong>{selectedAnomaly.coordinates}</strong>
                </div>
                <div>
                  <span>Signal score</span>
                  <strong>{selectedAnomaly.signalScore} / 100</strong>
                </div>
                <div>
                  <span>Confidence</span>
                  <strong>{selectedAnomaly.confidence}</strong>
                </div>
              </div>
            ) : null}
          </div>

          {selectedAnomaly ? (
            <div className="detail-grid">
              <article className="detail-panel">
                <p className="eyebrow">Signal rationale</p>
                <h3>Why this case deserves attention</h3>
                <p>{selectedAnomaly.summary}</p>
                <ul className="compact-list">
                  <li>Facility type: {selectedAnomaly.facilityType}</li>
                  <li>Flare persistence: {selectedAnomaly.flareHours} observed hours</li>
                  <li>Recommended action: {selectedAnomaly.recommendedAction}</li>
                </ul>
              </article>

              <article className="detail-panel">
                <p className="eyebrow">Anomaly trend</p>
                <h3>Current week vs prior baseline</h3>
                <div className="trend">
                  {selectedAnomaly.trend.map((point) => (
                    <div key={point.label} className="trend-bar-wrap">
                      <div className="trend-bar" style={{ height: `${point.anomalyIndex}%` }} />
                      <span>{point.label}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          ) : (
            <section className="empty-state">
              <p>
                No anomaly crossed the threshold in this window. That is a valid screening outcome,
                and the product should stay stable when it happens.
              </p>
            </section>
          )}
        </section>

        <aside className="rail">
          <div className="section-head">
            <div>
              <p className="eyebrow">Incident workspace</p>
              <h2>{activeIncident ? activeIncident.id : "No incident yet"}</h2>
            </div>

            {activeIncident ? (
              <span className="rail-count">
                {completedTasks}/{activeIncident.tasks.length} tasks done
              </span>
            ) : null}
          </div>

          {activeIncident ? (
            <>
              <section className="incident-summary">
                <div className="incident-line">
                  <span>Owner</span>
                  <strong>{activeIncident.owner}</strong>
                </div>
                <div className="incident-line">
                  <span>Priority</span>
                  <strong>{activeIncident.priority}</strong>
                </div>
                <div className="incident-line">
                  <span>Verification window</span>
                  <strong>{activeIncident.verificationWindow}</strong>
                </div>
                <p>{activeIncident.narrative}</p>
              </section>

              <section className="task-stack">
                <div className="mini-head">
                  <h3>Verification tasks</h3>
                  <div className="action-row">
                    <button
                      className="ghost-button"
                      disabled={busyAction === `create-task-${activeIncident.id}`}
                      onClick={() => {
                        void createVerificationTask();
                      }}
                      type="button"
                    >
                      {busyAction === `create-task-${activeIncident.id}`
                        ? "Creating..."
                        : "Create verification task"}
                    </button>
                    <button
                      className="ghost-button"
                      disabled={busyAction === `report-${activeIncident.id}`}
                      onClick={() => {
                        void generateReport();
                      }}
                      type="button"
                    >
                      {busyAction === `report-${activeIncident.id}` ? "Generating..." : "Generate MRV report"}
                    </button>
                  </div>
                </div>

                {activeIncident.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    busy={busyAction === task.id}
                    onComplete={() => markTaskDone(task.id)}
                  />
                ))}
              </section>

              <section className="report-panel">
                <div className="mini-head">
                  <h3>MRV report preview</h3>
                  <span>{activeIncident.reportGeneratedAt ?? "Not generated yet"}</span>
                </div>

                <div className="report-sections">
                  {reportSections?.map((section) => (
                    <article key={section.title}>
                      <span>{section.title}</span>
                      <p>{section.body}</p>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <section className="empty-state">
              <p>
                This signal is still in screening mode. Promote it only if it strengthens the
                story from visibility to action.
              </p>
              <button
                className="primary-button"
                disabled={busyAction === "promote"}
                onClick={() => {
                  void promoteToIncident();
                }}
                type="button"
              >
                {busyAction === "promote" ? "Promoting..." : "Promote to incident"}
              </button>
            </section>
          )}
        </aside>
      </section>

      <section className="footer-band">
        <div>
          <p className="eyebrow">90-second script</p>
          <ul className="compact-list">
            {demoScript.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>

        <div>
          <p className="eyebrow">Backend contract</p>
          <ul className="compact-list">
            <li>`GET /api/v1/dashboard` for seeded state</li>
            <li>`POST /api/v1/anomalies/{'{id}'}/promote` for incident creation</li>
            <li>`POST /api/v1/incidents/{'{id}'}/tasks` for verification task creation</li>
            <li>`POST /api/v1/incidents/{'{id}'}/report` for MRV export preview</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

function TaskRow({
  task,
  busy,
  onComplete,
}: {
  task: IncidentTask;
  busy: boolean;
  onComplete: () => void;
}) {
  return (
    <article className="task-row">
      <div>
        <span className="task-owner">{task.owner}</span>
        <h4>{task.title}</h4>
        <p>{task.notes}</p>
      </div>

      <div className="task-actions">
        <span>{task.etaHours}h</span>
        <button
          className="ghost-button"
          disabled={task.status === "done" || busy}
          onClick={onComplete}
          type="button"
        >
          {task.status === "done" ? "Completed" : busy ? "Saving..." : "Mark done"}
        </button>
      </div>
    </article>
  );
}

function createFallbackIncident(anomaly: Anomaly): Incident {
  const incidentId = `INC-${anomaly.id.slice(3)}`;

  return {
    id: incidentId,
    anomalyId: anomaly.id,
    title: `New verification case for ${anomaly.assetName}`,
    status: "triage",
    owner: "MRV response lead",
    priority: anomaly.severity === "high" ? "P1" : "P2",
    verificationWindow: anomaly.severity === "high" ? "Next 12 hours" : "Next 24 hours",
    narrative:
      "This incident was promoted directly from the anomaly queue to prove the screening-to-action flow before we connect live operator systems.",
    tasks: [
      {
        id: `${incidentId}-TASK-1`,
        title: "Validate signal persistence against 12-week baseline",
        owner: "Remote sensing analyst",
        etaHours: 2,
        status: "done",
        notes: "Baseline and current window exported for review.",
      },
      {
        id: `${incidentId}-TASK-2`,
        title: "Assign field verification owner",
        owner: "Area operations coordinator",
        etaHours: 4,
        status: "open",
        notes: "Route can be merged with scheduled integrity patrol.",
      },
    ],
  };
}

function buildVerificationTaskPayload(anomaly: Anomaly, sequence: number) {
  const templates = [
    {
      title: `Schedule field verification for ${anomaly.assetName}`,
      owner: "Ops coordinator",
      eta_hours: 4,
      notes: "Bundle this stop with the next integrity patrol to keep the pilot low-friction.",
    },
    {
      title: `Review maintenance context around ${anomaly.assetName}`,
      owner: "Reliability engineer",
      eta_hours: 6,
      notes: "Check compressor upset history, flare line interventions, and recent shutdown events.",
    },
    {
      title: `Prepare regulator-facing MRV note for ${anomaly.assetName}`,
      owner: "ESG lead",
      eta_hours: 8,
      notes: "Summarize anomaly evidence, planned verification, and likely operational explanation.",
    },
  ];

  return templates[(sequence - 1) % templates.length];
}

function buildReportSections(anomaly: Anomaly, incident?: Incident) {
  const tasks = incident?.tasks ?? [];
  const completed = tasks.filter((task) => task.status === "done").length;

  return [
    {
      title: "Measurement",
      body: `Satellite screening flagged ${anomaly.assetName} in ${anomaly.region} with +${anomaly.methaneDeltaPct}% methane uplift and ${anomaly.flareHours} flare-observed hours.`,
    },
    {
      title: "Reporting",
      body: `Current potential impact is estimated at ${anomaly.co2eTonnes} tCO2e. ${completed}/${tasks.length || 2} verification tasks are complete.`,
    },
    {
      title: "Verification",
      body: incident
        ? `${incident.owner} owns the case under ${incident.priority} priority with a ${incident.verificationWindow.toLowerCase()} window.`
        : "Incident not yet promoted. Keep this signal in screening mode until persistence justifies field action.",
    },
  ];
}
