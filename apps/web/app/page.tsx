"use client";

import { startTransition, useState } from "react";
import {
  anomalyFeed,
  demoScript,
  kpis,
  seededIncidents,
  type Anomaly,
  type Incident,
  type IncidentTask,
} from "../lib/demo-data";

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
  const [anomalies, setAnomalies] = useState(anomalyFeed);
  const [incidents, setIncidents] = useState(seededIncidents);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState(anomalyFeed[0].id);

  const selectedAnomaly =
    anomalies.find((item) => item.id === selectedAnomalyId) ?? anomalies[0];

  const activeIncident = selectedAnomaly.linkedIncidentId
    ? incidents[selectedAnomaly.linkedIncidentId]
    : undefined;

  const completedTasks = activeIncident
    ? activeIncident.tasks.filter((task) => task.status === "done").length
    : 0;

  const reportSections = buildReportSections(selectedAnomaly, activeIncident);

  const promoteToIncident = () => {
    if (selectedAnomaly.linkedIncidentId) {
      return;
    }

    const incidentId = `INC-${selectedAnomaly.id.slice(3)}`;
    const newIncident: Incident = {
      id: incidentId,
      anomalyId: selectedAnomaly.id,
      title: `New verification case for ${selectedAnomaly.assetName}`,
      status: "triage",
      owner: "MRV response lead",
      priority: selectedAnomaly.severity === "high" ? "P1" : "P2",
      verificationWindow: selectedAnomaly.severity === "high" ? "Next 12 hours" : "Next 24 hours",
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

    startTransition(() => {
      setIncidents((current) => ({
        ...current,
        [incidentId]: newIncident,
      }));
      setAnomalies((current) =>
        current.map((item) =>
          item.id === selectedAnomaly.id
            ? {
                ...item,
                linkedIncidentId: incidentId,
              }
            : item,
        ),
      );
    });
  };

  const toggleTask = (taskId: string) => {
    if (!activeIncident) {
      return;
    }

    startTransition(() => {
      setIncidents((current) => ({
        ...current,
        [activeIncident.id]: {
          ...activeIncident,
          tasks: activeIncident.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status: task.status === "done" ? "open" : "done",
                }
              : task,
          ),
        },
      }));
    });
  };

  const generateReport = () => {
    if (!activeIncident) {
      return;
    }

    startTransition(() => {
      setIncidents((current) => ({
        ...current,
        [activeIncident.id]: {
          ...activeIncident,
          reportGeneratedAt: "2026-03-27 09:00",
          status: completedTasks + 1 >= activeIncident.tasks.length ? "mitigation" : activeIncident.status,
        },
      }));
    });
  };

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
        {kpis.map((kpi) => (
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
            {anomalies.map((anomaly) => {
              const isSelected = anomaly.id === selectedAnomaly.id;

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
              <h2>{selectedAnomaly.assetName}</h2>
            </div>
            <div className="badge-stack">
              <span className={`severity ${severityTone[selectedAnomaly.severity]}`}>
                {severityLabel[selectedAnomaly.severity]}
              </span>
              <span className="soft-badge">{selectedAnomaly.region}</span>
            </div>
          </div>

          <div className="map-frame">
            <div className="map-grid" />
            {anomalies.map((anomaly) => (
              <button
                key={anomaly.id}
                aria-label={anomaly.assetName}
                className={`site-dot ${anomaly.id === selectedAnomaly.id ? "site-dot-active" : ""}`}
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
          </div>

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
                  <button className="ghost-button" onClick={generateReport} type="button">
                    Generate MRV report
                  </button>
                </div>

                {activeIncident.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id)} />
                ))}
              </section>

              <section className="report-panel">
                <div className="mini-head">
                  <h3>MRV report preview</h3>
                  <span>{activeIncident.reportGeneratedAt ?? "Not generated yet"}</span>
                </div>

                <div className="report-sections">
                  {reportSections.map((section) => (
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
              <button className="primary-button" onClick={promoteToIncident} type="button">
                Promote to incident
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
            <li>`POST /api/v1/incidents/{'{id}'}/report` for MRV export preview</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

function TaskRow({
  task,
  onToggle,
}: {
  task: IncidentTask;
  onToggle: () => void;
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
        <button className="ghost-button" onClick={onToggle} type="button">
          {task.status === "done" ? "Mark open" : "Mark done"}
        </button>
      </div>
    </article>
  );
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
