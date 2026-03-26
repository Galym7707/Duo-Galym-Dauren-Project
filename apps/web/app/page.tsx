"use client";

import { startTransition, useEffect, useState } from "react";
import {
  completeTask as completeTaskRequest,
  createTask as createTaskRequest,
  type DashboardHydrationState,
  type DashboardSource,
  downloadReport,
  fallbackDashboardState,
  fallbackPipelineStatus,
  generateReport as generateReportRequest,
  hasApiBaseUrl,
  getReportViewUrl,
  loadDashboardState,
  loadPipelineStatus,
  type PipelineStatus,
  promoteAnomaly as promoteAnomalyRequest,
  syncPipeline,
} from "../lib/api";
import {
  type Anomaly,
  type Incident,
  type IncidentTask,
  type ReportSection,
} from "../lib/demo-data";

type StepId = "signal" | "incident" | "verification" | "report";
type ThemeMode = "day" | "night";

const stepOrder: StepId[] = ["signal", "incident", "verification", "report"];

const stepMeta: Record<StepId, { label: string; note: string }> = {
  signal: {
    label: "Signal",
    note: "Pick one anomaly worth escalating.",
  },
  incident: {
    label: "Incident",
    note: "Turn screening into an owned case.",
  },
  verification: {
    label: "Verification",
    note: "Show tasks, owners, and progress.",
  },
  report: {
    label: "Report",
    note: "Close the loop for MRV review.",
  },
};

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

const incidentStatusLabel: Record<Incident["status"], string> = {
  triage: "Triage",
  verification: "Verification",
  mitigation: "Mitigation",
};

export default function Page() {
  const fallback = fallbackDashboardState();
  const [theme, setTheme] = useState<ThemeMode>("night");
  const [activeStep, setActiveStep] = useState<StepId>("signal");
  const [dashboardSource, setDashboardSource] =
    useState<DashboardHydrationState["source"]>(fallback.source);
  const [kpiCards, setKpiCards] = useState(fallback.kpis);
  const [anomalies, setAnomalies] = useState(fallback.anomalies);
  const [incidents, setIncidents] = useState(fallback.incidents);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState(fallback.anomalies[0]?.id ?? "");
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>(
    fallbackPipelineStatus(fallback.anomalies.length),
  );
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<null | string>(null);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("saryna-theme");
    if (storedTheme === "day" || storedTheme === "night") {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("saryna-theme", theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateDashboard() {
      const state = await loadDashboardState();
      const nextPipelineStatus = await loadPipelineStatus(state.anomalies.length);
      if (cancelled) {
        return;
      }

      startTransition(() => {
        setDashboardSource(state.source);
        setKpiCards(state.kpis);
        setAnomalies(state.anomalies);
        setIncidents(state.incidents);
        setPipelineStatus(nextPipelineStatus);
        setSelectedAnomalyId((current) => {
          const exists = state.anomalies.some((item) => item.id === current);
          return exists ? current : state.anomalies[0]?.id ?? "";
        });
        setLoadingDashboard(false);
      });
    }

    void hydrateDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const strongestAnomaly =
    anomalies.length > 0
      ? anomalies.reduce((best, current) =>
          current.signalScore > best.signalScore ? current : best,
        )
      : null;

  const selectedAnomaly =
    anomalies.find((item) => item.id === selectedAnomalyId) ?? strongestAnomaly ?? null;

  const activeIncident =
    selectedAnomaly?.linkedIncidentId && incidents[selectedAnomaly.linkedIncidentId]
      ? incidents[selectedAnomaly.linkedIncidentId]
      : undefined;

  const completedTasks = activeIncident
    ? activeIncident.tasks.filter((task) => task.status === "done").length
    : 0;
  const taskProgressPct =
    activeIncident && activeIncident.tasks.length > 0
      ? (completedTasks / activeIncident.tasks.length) * 100
      : 0;

  const currentStepIndex = stepOrder.indexOf(activeStep);
  const previousStep = currentStepIndex > 0 ? stepOrder[currentStepIndex - 1] : undefined;
  const nextStep =
    currentStepIndex < stepOrder.length - 1 ? stepOrder[currentStepIndex + 1] : undefined;
  const pipelineToneClass =
    pipelineStatus.state === "ready"
      ? "status-live"
      : pipelineStatus.state === "degraded"
        ? "status-fallback"
        : "status-problem";

  const topStats = selectedAnomaly
    ? [
        {
          label: "Focus signal",
          value: `${selectedAnomaly.signalScore} / 100`,
          detail: selectedAnomaly.assetName,
        },
        {
          label: "Potential impact",
          value: `${selectedAnomaly.co2eTonnes} tCO2e`,
          detail: selectedAnomaly.region,
        },
        {
          label: "Workflow state",
          value: activeIncident ? incidentStatusLabel[activeIncident.status] : "Screening",
          detail: activeIncident
            ? `${completedTasks}/${activeIncident.tasks.length} tasks complete`
            : "Promote only when evidence is strong enough",
        },
      ]
    : [];

  const runPipelineSync = async () => {
    if (!hasApiBaseUrl) {
      setRequestError("Live pipeline sync needs the FastAPI backend to be available.");
      return;
    }

    const actionId = "pipeline-sync";
    setBusyAction(actionId);
    setRequestError(null);

    try {
      const nextStatus = await syncPipeline("gee");
      const refreshedDashboard = await loadDashboardState();

      setPipelineStatus(nextStatus);
      applyDashboardHydration(refreshedDashboard, refreshedDashboard.source);

      if (nextStatus.state !== "ready") {
        setRequestError(nextStatus.statusMessage);
      }
    } catch {
      setRequestError("Pipeline sync failed. The seeded workflow remains available for the demo.");
    } finally {
      setBusyAction(null);
    }
  };

  const promoteToIncident = async () => {
    if (!selectedAnomaly) {
      return;
    }

    if (selectedAnomaly.linkedIncidentId) {
      setActiveStep("incident");
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

      setActiveStep("incident");
    } catch {
      if (dashboardSource === "api") {
        setDashboardSource("fallback");
      }
      applyIncidentUpdate(createFallbackIncident(selectedAnomaly), selectedAnomaly.id);
      setActiveStep("incident");
      setRequestError("Promotion request failed, so the UI stayed on the local demo state.");
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
        const incident = await completeTaskRequest(activeIncident.id, taskId);
        applyIncidentUpdate(incident, incident.anomalyId);
      } else {
        applyTaskCompletionFallback(activeIncident, taskId);
      }
    } catch {
      if (dashboardSource === "api") {
        setDashboardSource("fallback");
      }
      applyTaskCompletionFallback(activeIncident, taskId);
      setRequestError("Task completion failed, so the UI switched back to local demo state.");
    } finally {
      setBusyAction(null);
    }
  };

  const createVerificationTask = async () => {
    if (!activeIncident || !selectedAnomaly) {
      return;
    }

    const actionId = `create-task-${activeIncident.id}`;
    setBusyAction(actionId);
    setRequestError(null);
    const payload = buildVerificationTaskPayload(selectedAnomaly, activeIncident.tasks.length + 1);

    try {
      if (dashboardSource === "api") {
        const incident = await createTaskRequest(activeIncident.id, payload);
        applyIncidentUpdate(incident, incident.anomalyId);
      } else {
        applyTaskCreationFallback(activeIncident, payload);
      }
    } catch {
      if (dashboardSource === "api") {
        setDashboardSource("fallback");
      }
      applyTaskCreationFallback(activeIncident, payload);
      setRequestError("Task creation failed. The incident still remains usable for the demo.");
    } finally {
      setBusyAction(null);
    }
  };

  const generateReport = async () => {
    if (!activeIncident || !selectedAnomaly) {
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

      setActiveStep("report");
    } catch {
      if (dashboardSource === "api") {
        setDashboardSource("fallback");
      }
      applyReportFallback(activeIncident, selectedAnomaly);
      setActiveStep("report");
      setRequestError("Report generation failed, so the fallback MRV preview was kept active.");
    } finally {
      setBusyAction(null);
    }
  };

  const jumpToStep = (step: StepId) => {
    if (step !== "signal" && !activeIncident) {
      return;
    }

    setActiveStep(step);
  };

  const changeSelectedAnomaly = (anomalyId: string) => {
    setSelectedAnomalyId(anomalyId);
    setActiveStep("signal");
    setRequestError(null);
  };

  const reportSections: ReportSection[] =
    selectedAnomaly && activeIncident
      ? activeIncident.reportSections ??
        buildReportSections(selectedAnomaly, activeIncident, completedTasks)
      : selectedAnomaly
        ? buildReportSections(selectedAnomaly, undefined, 0)
        : [];

  const exportReportArtifact = async () => {
    if (!activeIncident || !selectedAnomaly) {
      return;
    }

    const actionId = `export-${activeIncident.id}`;
    setBusyAction(actionId);
    setRequestError(null);

    try {
      let fileName = `${activeIncident.id.toLowerCase()}-mrv-report.html`;
      let content = buildReportHtml(selectedAnomaly, activeIncident, reportSections);
      let contentType = "text/html;charset=utf-8";

      if (dashboardSource === "api") {
        const downloaded = await downloadReport(activeIncident.id);
        fileName = downloaded.fileName;
        content = downloaded.content;
        contentType = downloaded.contentType;
      }

      const blob = new Blob([content], { type: contentType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setRequestError("Report export failed. The in-app preview is still available.");
    } finally {
      setBusyAction(null);
    }
  };

  const openPrintView = () => {
    if (!activeIncident || !selectedAnomaly) {
      return;
    }

    if (dashboardSource === "api") {
      const reportViewUrl = getReportViewUrl(activeIncident.id, true);
      if (reportViewUrl) {
        window.open(reportViewUrl, "_blank", "noopener,noreferrer");
        return;
      }
    }

    const html = buildReportHtml(selectedAnomaly, activeIncident, reportSections, true);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
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

  function applyDashboardHydration(state: DashboardHydrationState, source: DashboardSource) {
    startTransition(() => {
      setDashboardSource(source);
      setKpiCards(state.kpis);
      setAnomalies(state.anomalies);
      setIncidents(state.incidents);
      setSelectedAnomalyId((current) => {
        const exists = state.anomalies.some((item) => item.id === current);
        return exists ? current : state.anomalies[0]?.id ?? current;
      });
    });
  }

  function applyTaskCompletionFallback(incident: Incident, taskId: string) {
    startTransition(() => {
      setIncidents((current) => {
        const existing = current[incident.id] ?? incident;
        const tasks: IncidentTask[] = existing.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: "done",
              }
            : task,
        );
        const doneCount = tasks.filter((task) => task.status === "done").length;

        return {
          ...current,
          [incident.id]: {
            ...existing,
            tasks,
            reportSections: undefined,
            status: doneCount === tasks.length ? "mitigation" : "verification",
          },
        };
      });
    });
  }

  function applyTaskCreationFallback(
    incident: Incident,
    payload: { title: string; owner: string; eta_hours: number; notes: string },
  ) {
    startTransition(() => {
      setIncidents((current) => {
        const existing = current[incident.id] ?? incident;
        return {
          ...current,
          [incident.id]: {
            ...existing,
            reportSections: undefined,
            tasks: [
              ...existing.tasks,
              {
                id: `${incident.id}-TASK-${existing.tasks.length + 1}`,
                title: payload.title,
                owner: payload.owner,
                etaHours: payload.eta_hours,
                status: "open",
                notes: payload.notes,
              },
            ],
          },
        };
      });
    });
  }

  function applyReportFallback(incident: Incident, anomaly: Anomaly) {
    startTransition(() => {
      setIncidents((current) => {
        const existing = current[incident.id] ?? incident;
        const doneCount = existing.tasks.filter((task) => task.status === "done").length;
        const nextIncident: Incident = {
          ...existing,
          reportGeneratedAt: "2026-03-27 09:00",
          status: doneCount === existing.tasks.length ? "mitigation" : "verification",
          reportSections: buildReportSections(anomaly, existing, doneCount),
        };

        return {
          ...current,
          [incident.id]: nextIncident,
        };
      });
    });
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="header-copy">
          <p className="eyebrow">Saryna MRV / Kazakhstan submission build</p>
          <h1>Move one anomaly through a clear response flow.</h1>
          <p className="header-text">
            This frontend is the redesigned step-based workspace. The backend stays current from
            the repository, while the screen hierarchy stays minimal and focused.
          </p>
        </div>

        <div className="header-tools">
          <div className="summary-grid">
            {topStats.map((stat) => (
              <article key={stat.label} className="summary-item">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <p>{stat.detail}</p>
              </article>
            ))}
          </div>

          <section className="status-card">
            <div className="status-line">
              <div className="status-badge-row">
                <span
                  className={`status-badge ${
                    dashboardSource === "api" ? "status-live" : "status-fallback"
                  }`}
                >
                  {loadingDashboard
                    ? "Checking backend"
                    : dashboardSource === "api"
                      ? "Backend connected"
                      : "Fallback state"}
                </span>
                <span className={`status-badge ${pipelineToneClass}`}>
                  {pipelineStatus.providerLabel}
                </span>
              </div>
              <span className="status-copy">
                {loadingDashboard
                  ? "Loading dashboard state..."
                  : dashboardSource === "api"
                    ? "Frontend is reading and mutating the FastAPI contract."
                    : "API is unavailable, so the demo uses the local seeded state."}
              </span>
            </div>

            <div className="pipeline-meta">
              <span>{pipelineStatus.statusMessage}</span>
              {pipelineStatus.projectId ? <span>Project: {pipelineStatus.projectId}</span> : null}
              {pipelineStatus.lastSyncAt ? <span>Last sync: {pipelineStatus.lastSyncAt}</span> : null}
              {pipelineStatus.latestObservationAt ? (
                <span>Observation: {pipelineStatus.latestObservationAt}</span>
              ) : null}
            </div>

            <div className="pipeline-grid">
              {pipelineStatus.stages.map((stage) => (
                <article key={stage.label} className="pipeline-item">
                  <span>{stage.label}</span>
                  <strong>{stage.value}</strong>
                  <p>{stage.detail}</p>
                </article>
              ))}
            </div>

            <div className="pipeline-actions">
              <p>Use manual sync to prove the CH4 ingest path without risking the demo workflow.</p>
              <button
                className="secondary-button"
                disabled={busyAction === "pipeline-sync" || !hasApiBaseUrl}
                onClick={() => {
                  void runPipelineSync();
                }}
                type="button"
              >
                {busyAction === "pipeline-sync" ? "Syncing..." : "Run GEE sync"}
              </button>
            </div>

            {requestError ? <p className="status-error">{requestError}</p> : null}
          </section>

          <button
            className="theme-toggle"
            onClick={() => setTheme((current) => (current === "night" ? "day" : "night"))}
            type="button"
          >
            <span>{theme === "night" ? "Switch to day mode" : "Switch to night mode"}</span>
            <strong>{theme === "night" ? "Night" : "Day"}</strong>
          </button>
        </div>
      </header>

      <nav aria-label="Workflow steps" className="flow-nav">
        {stepOrder.map((step, index) => {
          const isLocked = step !== "signal" && !activeIncident;
          const isActive = step === activeStep;

          return (
            <button
              key={step}
              className={`flow-step ${isActive ? "flow-step-active" : ""} ${
                isLocked ? "flow-step-locked" : ""
              }`}
              disabled={isLocked}
              onClick={() => jumpToStep(step)}
              type="button"
            >
              <span className="step-index">0{index + 1}</span>
              <div className="step-copy">
                <strong>{stepMeta[step].label}</strong>
                <small>{stepMeta[step].note}</small>
              </div>
            </button>
          );
        })}
      </nav>

      <section className="app-workspace">
        <aside className="signal-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Signal queue</p>
              <h2>Keep the queue short and defensible</h2>
            </div>
            <span className="panel-count">{anomalies.length} live</span>
          </div>

          <div className="signal-list">
            {anomalies.map((anomaly) => {
              const isSelected = anomaly.id === selectedAnomaly?.id;
              const incident = anomaly.linkedIncidentId
                ? incidents[anomaly.linkedIncidentId]
                : undefined;

              return (
                <button
                  key={anomaly.id}
                  className={`signal-item ${isSelected ? "signal-item-active" : ""}`}
                  onClick={() => changeSelectedAnomaly(anomaly.id)}
                  type="button"
                >
                  <div className="signal-top">
                    <span className={`severity ${severityTone[anomaly.severity]}`}>
                      {severityLabel[anomaly.severity]}
                    </span>
                    <span>{anomaly.detectedAt}</span>
                  </div>

                  <strong>{anomaly.assetName}</strong>
                  <p>
                    {anomaly.region} / {anomaly.facilityType}
                  </p>

                  <div className="signal-metrics">
                    <span>Score {anomaly.signalScore}</span>
                    <span>{anomaly.co2eTonnes} tCO2e</span>
                    <span>{incident ? incidentStatusLabel[incident.status] : "Screening"}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <section className="pilot-note">
            <p className="eyebrow">Strongest anomaly</p>
            <h3>{strongestAnomaly?.assetName ?? "No anomaly above threshold"}</h3>
            <p>
              {strongestAnomaly
                ? "This remains the strongest seeded case because it combines the highest signal score, the largest estimated impact, and persistent flare activity in Atyrau."
                : "A zero-anomaly window is still a valid screening outcome. Keep the pipeline visible and use manual sync to prove the ingest path."}
            </p>
          </section>
        </aside>

        <section className="focus-stage">
          <div
            className="stage-frame stage-enter"
            key={`${activeStep}-${selectedAnomaly?.id ?? "none"}-${activeIncident?.id ?? "none"}-${theme}`}
          >
            {!selectedAnomaly ? (
              <EmptyStage
                body="No anomaly is currently above the screening threshold for this window. The ingest and workflow status remain visible, and you can run another sync without leaving the page."
                cta="Stay on screening"
                onAction={() => setActiveStep("signal")}
              />
            ) : (
              <>
            <div className="stage-header">
              <div>
                <p className="eyebrow">
                  Step {currentStepIndex + 1} / {stepMeta[activeStep].label}
                </p>
                <h2>{getStageTitle(activeStep, selectedAnomaly, activeIncident)}</h2>
                <p className="stage-text">
                  {getStageDescription(activeStep, selectedAnomaly, activeIncident)}
                </p>
              </div>

              <div className="stage-nav">
                <button
                  className="secondary-button"
                  disabled={!previousStep}
                  onClick={() => previousStep && jumpToStep(previousStep)}
                  type="button"
                >
                  Back
                </button>
                <button
                  className="secondary-button"
                  disabled={!nextStep || (activeStep === "signal" && !activeIncident)}
                  onClick={() => nextStep && jumpToStep(nextStep)}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>

            {activeStep === "signal" ? (
              <div className="stage-layout">
                <section className="main-surface">
                  <div className="data-strip">
                    <article className="data-point">
                      <span>Signal score</span>
                      <strong>{selectedAnomaly.signalScore} / 100</strong>
                    </article>
                    <article className="data-point">
                      <span>Methane uplift</span>
                      <strong>+{selectedAnomaly.methaneDeltaPct}%</strong>
                    </article>
                    <article className="data-point">
                      <span>Flare persistence</span>
                      <strong>{selectedAnomaly.flareHours} h</strong>
                    </article>
                    <article className="data-point">
                      <span>Coordinates</span>
                      <strong>{selectedAnomaly.coordinates}</strong>
                    </article>
                  </div>

                  <section className="focus-block">
                    <h3>Why this matters in Kazakhstan right now</h3>
                    <p>{buildWhyNow(selectedAnomaly)}</p>
                  </section>

                  <section className="map-surface">
                    <div className="map-head">
                      <div>
                        <span>Kazakhstan pilot view</span>
                        <strong>{selectedAnomaly.region}</strong>
                      </div>
                      <span>{selectedAnomaly.confidence}</span>
                    </div>

                    <div className="map-plane">
                      {anomalies.map((anomaly) => (
                        <button
                          key={anomaly.id}
                          aria-label={anomaly.assetName}
                          className={`map-dot ${anomaly.id === selectedAnomaly.id ? "map-dot-active" : ""}`}
                          onClick={() => changeSelectedAnomaly(anomaly.id)}
                          style={{
                            left: `${anomaly.sitePosition.x}%`,
                            top: `${anomaly.sitePosition.y}%`,
                          }}
                          type="button"
                        />
                      ))}
                    </div>
                  </section>
                </section>

                <aside className="side-surface">
                  <section className="note-block">
                    <span>Facility</span>
                    <strong>{selectedAnomaly.facilityType}</strong>
                    <p>{selectedAnomaly.summary}</p>
                  </section>

                  <section className="note-block">
                    <span>Recommended next move</span>
                    <strong>{selectedAnomaly.recommendedAction}</strong>
                    <p>
                      Keep the front page focused on one defendable signal instead of a wall of
                      competing metrics.
                    </p>
                  </section>

                  <div className="action-row">
                    <button
                      className="primary-button"
                      disabled={busyAction === "promote"}
                      onClick={() => {
                        void promoteToIncident();
                      }}
                      type="button"
                    >
                      {selectedAnomaly.linkedIncidentId
                        ? "Open incident"
                        : busyAction === "promote"
                          ? "Promoting..."
                          : "Promote to incident"}
                    </button>
                  </div>
                </aside>
              </div>
            ) : null}

            {activeStep === "incident" ? (
              activeIncident ? (
                <div className="stage-layout">
                  <section className="main-surface">
                    <section className="focus-block">
                      <h3>{activeIncident.title}</h3>
                      <p>{activeIncident.narrative}</p>
                    </section>

                    <div className="detail-grid">
                      <article className="detail-item">
                        <span>Owner</span>
                        <strong>{activeIncident.owner}</strong>
                      </article>
                      <article className="detail-item">
                        <span>Priority</span>
                        <strong>{activeIncident.priority}</strong>
                      </article>
                      <article className="detail-item">
                        <span>Window</span>
                        <strong>{activeIncident.verificationWindow}</strong>
                      </article>
                      <article className="detail-item">
                        <span>Status</span>
                        <strong>{incidentStatusLabel[activeIncident.status]}</strong>
                      </article>
                    </div>
                  </section>

                  <aside className="side-surface">
                    <section className="note-block">
                      <span>Why the incident exists</span>
                      <strong>Visibility becomes action only with ownership.</strong>
                      <p>
                        The anomaly is now attached to a named owner, a priority, and a response
                        clock. That is the point where the product stops looking like a passive
                        dashboard.
                      </p>
                    </section>

                    <div className="action-row">
                      <button
                        className="primary-button"
                        onClick={() => setActiveStep("verification")}
                        type="button"
                      >
                        Go to verification
                      </button>
                    </div>
                  </aside>
                </div>
              ) : (
                <EmptyStage
                  body="This anomaly is still in screening mode. Promote it first if you want the workflow to move into owned operational action."
                  cta="Promote to incident"
                  onAction={promoteToIncident}
                />
              )
            ) : null}

            {activeStep === "verification" ? (
              activeIncident ? (
                <div className="stage-layout">
                  <section className="main-surface">
                    <div className="progress-head">
                      <div>
                        <span>Verification progress</span>
                        <strong>
                          {completedTasks}/{activeIncident.tasks.length} tasks complete
                        </strong>
                      </div>
                      <span>{activeIncident.owner}</span>
                    </div>

                    <div className="progress-track" aria-hidden="true">
                      <div
                        className="progress-bar"
                        style={{
                          width: `${taskProgressPct}%`,
                        }}
                      />
                    </div>

                    <div className="task-list">
                      {activeIncident.tasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          busy={busyAction === task.id}
                          task={task}
                          onComplete={() => {
                            void markTaskDone(task.id);
                          }}
                        />
                      ))}
                    </div>
                  </section>

                  <aside className="side-surface">
                    <section className="note-block">
                      <span>Verification principle</span>
                      <strong>Each task needs a human owner and a short ETA.</strong>
                      <p>
                        That keeps the interface legible for operations teams and gives ESG or
                        compliance reviewers something concrete to trust.
                      </p>
                    </section>

                    <div className="action-row">
                      <button
                        className="secondary-button"
                        disabled={busyAction === `create-task-${activeIncident.id}`}
                        onClick={() => {
                          void createVerificationTask();
                        }}
                        type="button"
                      >
                        {busyAction === `create-task-${activeIncident.id}`
                          ? "Creating..."
                          : "Create task"}
                      </button>
                      <button
                        className="primary-button"
                        disabled={busyAction === `report-${activeIncident.id}`}
                        onClick={() => {
                          void generateReport();
                        }}
                        type="button"
                      >
                        {busyAction === `report-${activeIncident.id}`
                          ? "Generating..."
                          : "Generate MRV preview"}
                      </button>
                    </div>
                  </aside>
                </div>
              ) : (
                <EmptyStage
                  body="There is no verification workspace until the signal becomes an incident."
                  cta="Return to signal review"
                  onAction={() => setActiveStep("signal")}
                />
              )
            ) : null}

            {activeStep === "report" ? (
              activeIncident ? (
                <div className="stage-layout">
                  <section className="main-surface">
                    <div className="report-head">
                      <div>
                        <span>MRV report preview</span>
                        <strong>
                          {activeIncident.reportGeneratedAt ?? "Generate when the team is ready"}
                        </strong>
                      </div>
                      {!activeIncident.reportGeneratedAt ? (
                        <button
                          className="secondary-button"
                          disabled={busyAction === `report-${activeIncident.id}`}
                          onClick={() => {
                            void generateReport();
                          }}
                          type="button"
                        >
                          {busyAction === `report-${activeIncident.id}` ? "Generating..." : "Generate now"}
                        </button>
                      ) : null}
                    </div>

                    <div className="report-list">
                      {reportSections.map((section) => (
                        <article key={section.title} className="report-item">
                          <span>{section.title}</span>
                          <p>{section.body}</p>
                        </article>
                      ))}
                    </div>
                  </section>

                  <aside className="side-surface">
                    <section className="note-block">
                      <span>Close the loop</span>
                      <strong>Measurement, action, verification, report.</strong>
                      <p>
                        The final screen is intentionally plain. It should read like a clean
                        operational summary, not another dashboard.
                      </p>
                    </section>

                    <div className="report-actions">
                      <button
                        className="secondary-button"
                        disabled={busyAction === `export-${activeIncident.id}`}
                        onClick={() => {
                          void exportReportArtifact();
                        }}
                        type="button"
                      >
                        {busyAction === `export-${activeIncident.id}`
                          ? "Exporting..."
                          : "Download HTML"}
                      </button>
                      <button className="secondary-button" onClick={openPrintView} type="button">
                        Open print view
                      </button>
                      <button
                        className="primary-button"
                        onClick={() => setActiveStep("signal")}
                        type="button"
                      >
                        Review another signal
                      </button>
                    </div>
                  </aside>
                </div>
              ) : (
                <EmptyStage
                  body="The report screen becomes available after an incident is active."
                  cta="Return to signal review"
                  onAction={() => setActiveStep("signal")}
                />
              )
            ) : null}
              </>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function TaskCard({
  task,
  busy,
  onComplete,
}: {
  task: IncidentTask;
  busy: boolean;
  onComplete: () => void;
}) {
  return (
    <article className={`task-card ${task.status === "done" ? "task-card-done" : ""}`}>
      <div className="task-copy">
        <span>{task.owner}</span>
        <h3>{task.title}</h3>
        <p>{task.notes}</p>
      </div>

      <div className="task-side">
        <strong>{task.etaHours} h</strong>
        <button
          className="secondary-button"
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

function EmptyStage({
  body,
  cta,
  onAction,
}: {
  body: string;
  cta: string;
  onAction: () => void;
}) {
  return (
    <div className="empty-stage">
      <p>{body}</p>
      <button className="primary-button" onClick={onAction} type="button">
        {cta}
      </button>
    </div>
  );
}

function getStageTitle(step: StepId, anomaly: Anomaly, incident?: Incident) {
  switch (step) {
    case "signal":
      return `Review ${anomaly.assetName}`;
    case "incident":
      return incident ? incident.id : "Create an incident";
    case "verification":
      return incident ? "Verification workspace" : "Verification not started";
    case "report":
      return incident ? "MRV report preview" : "Report not available";
    default:
      return "Workflow";
  }
}

function getStageDescription(step: StepId, anomaly: Anomaly, incident?: Incident) {
  switch (step) {
    case "signal":
      return `Select the anomaly that best justifies operational attention. ${anomaly.assetName} is currently in focus.`;
    case "incident":
      return incident
        ? "The case now has an owner, a priority, and a verification window."
        : "Promote the signal before you move deeper into the workflow.";
    case "verification":
      return incident
        ? "Keep verification narrow, assigned, and measurable."
        : "Verification stays locked until the signal becomes an incident.";
    case "report":
      return incident
        ? "Export a short MRV-ready summary after the workflow is documented."
        : "No report exists until there is an incident to summarize.";
    default:
      return "";
  }
}

function buildWhyNow(anomaly: Anomaly) {
  return `${anomaly.assetName} matters now because it shows +${anomaly.methaneDeltaPct}% methane uplift, ${anomaly.flareHours} observed flare hours, and an estimated ${anomaly.co2eTonnes} tCO2e impact in ${anomaly.region}. For Kazakhstan operators facing growing pressure around methane visibility, export readiness, and defensible ESG narratives, this is the kind of signal that can justify quick verification without overclaiming what satellite data can do.`;
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

function buildReportSections(
  anomaly: Anomaly,
  incident: Incident | undefined,
  completedTasks: number,
): ReportSection[] {
  return [
    {
      title: "Measurement",
      body: `Seeded satellite screening flagged ${anomaly.assetName} in ${anomaly.region} with +${anomaly.methaneDeltaPct}% methane uplift and ${anomaly.flareHours} observed flare hours.`,
    },
    {
      title: "Operational response",
      body: incident
        ? `${incident.owner} owns the case under ${incident.priority} priority with a ${incident.verificationWindow.toLowerCase()} window.`
        : "The signal is still in screening mode and has not been promoted into an owned case.",
    },
    {
      title: "Verification status",
      body: incident
        ? `${completedTasks}/${incident.tasks.length} verification tasks are complete and the current estimated impact is ${anomaly.co2eTonnes} tCO2e.`
        : `Current seeded estimate is ${anomaly.co2eTonnes} tCO2e, pending escalation and verification ownership.`,
    },
  ];
}

function createFallbackIncident(anomaly: Anomaly): Incident {
  const incidentId = `INC-${anomaly.id.replace("AN-", "")}`;

  return {
    id: incidentId,
    anomalyId: anomaly.id,
    title: `${anomaly.assetName} escalation`,
    status: "triage",
    owner: "MRV response lead",
    priority: anomaly.severity === "high" ? "P1" : anomaly.severity === "medium" ? "P2" : "P3",
    verificationWindow:
      anomaly.severity === "high"
        ? "Next 12 hours"
        : anomaly.severity === "medium"
          ? "Next 24 hours"
          : "Next 48 hours",
    narrative:
      "Fallback incident created in the frontend so the flow remains usable when the API is unavailable.",
    tasks: [
      {
        id: `${incidentId}-TASK-1`,
        title: "Assign field review owner",
        owner: "MRV response lead",
        etaHours: 1,
        status: "open",
        notes: "Confirm who owns first verification contact and response window.",
      },
      {
        id: `${incidentId}-TASK-2`,
        title: "Cross-check recent maintenance activity",
        owner: "Reliability engineer",
        etaHours: 4,
        status: "open",
        notes: "Look for compressor, flare, or shutdown activity that could explain the signal.",
      },
      {
        id: `${incidentId}-TASK-3`,
        title: "Prepare ESG evidence note",
        owner: "Compliance lead",
        etaHours: 6,
        status: "open",
        notes: "Document what is measured, what is assumed, and what still requires verification.",
      },
    ],
  };
}

function buildReportHtml(
  anomaly: Anomaly,
  incident: Incident,
  sections: ReportSection[],
  autoPrint = false,
) {
  const taskItems = incident.tasks
    .map(
      (task) =>
        `<li><strong>${escapeHtml(task.title)}</strong> - ${escapeHtml(task.owner)} - ${task.etaHours}h - ${escapeHtml(task.status)}</li>`,
    )
    .join("");

  const sectionMarkup = sections
    .map(
      (section) =>
        `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.body)}</p></section>`,
    )
    .join("");

  const printScript = autoPrint
    ? `<script>window.addEventListener("load",()=>{window.print();});</script>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(incident.id)} MRV Preview</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        padding: 40px;
        font-family: Aptos, "Segoe UI", sans-serif;
        color: #1f2933;
        background: #f7f4ee;
      }
      main {
        max-width: 860px;
        margin: 0 auto;
        padding: 36px;
        border: 1px solid #d8d2c7;
        background: #fffdf8;
      }
      h1, h2, h3 { margin: 0; }
      h1 {
        font-family: "Iowan Old Style", Georgia, serif;
        font-size: 2.2rem;
        letter-spacing: -0.04em;
      }
      .meta, .intro, ul, section p {
        color: #495662;
        line-height: 1.7;
      }
      .meta {
        margin: 18px 0 28px;
        display: grid;
        gap: 8px;
      }
      .summary {
        padding: 20px;
        margin-bottom: 24px;
        border: 1px solid #d8d2c7;
        background: #f5f1e9;
      }
      section {
        margin-top: 22px;
        padding-top: 18px;
        border-top: 1px solid #e5dfd2;
      }
      ul {
        padding-left: 20px;
      }
    </style>
    ${printScript}
  </head>
  <body>
    <main>
      <h1>Saryna MRV Report Preview</h1>
      <div class="meta">
        <span>Incident: ${escapeHtml(incident.id)}</span>
        <span>Asset: ${escapeHtml(anomaly.assetName)}</span>
        <span>Region: ${escapeHtml(anomaly.region)}</span>
        <span>Owner: ${escapeHtml(incident.owner)}</span>
      </div>
      <div class="summary">
        <h3>Why this anomaly matters</h3>
        <p class="intro">${escapeHtml(buildWhyNow(anomaly))}</p>
      </div>
      ${sectionMarkup}
      <section>
        <h2>Verification tasks</h2>
        <ul>${taskItems}</ul>
      </section>
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
