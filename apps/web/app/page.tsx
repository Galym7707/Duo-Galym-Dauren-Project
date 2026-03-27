"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import {
  completeTask as completeTaskRequest,
  type DashboardHydrationState,
  downloadReport,
  fallbackDashboardState,
  generateReport as generateReportRequest,
  getReportViewUrl,
  loadDashboardState,
  promoteAnomaly as promoteAnomalyRequest,
} from "../lib/api";
import { type Anomaly, type Incident, type IncidentTask, type ReportSection } from "../lib/demo-data";
import {
  buildLocalizedReportSections,
  copy,
  formatTaskProgress,
  formatTimestamp,
  incidentStatusLabel,
  type Locale,
  type NavTarget,
  severityLabel,
  severityTone,
  type StepId,
  stepOrder,
  translateFacility,
  translateOwner,
  translateRegion,
  translateTaskTitle,
  translateWindow,
  type ThemeMode,
} from "../lib/site-content";

export default function Page() {
  const fallback = fallbackDashboardState();
  const faqRef = useRef<HTMLElement | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("day");
  const [locale, setLocale] = useState<Locale>("en");
  const [activeStep, setActiveStep] = useState<StepId>("signal");
  const [dashboardSource, setDashboardSource] =
    useState<DashboardHydrationState["source"]>(fallback.source);
  const [kpiCards, setKpiCards] = useState(fallback.kpis);
  const [anomalies, setAnomalies] = useState(fallback.anomalies);
  const [incidents, setIncidents] = useState(fallback.incidents);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState(fallback.anomalies[0]?.id ?? "");
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<null | string>(null);

  const t = copy[locale];

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("saryna-theme");
    const storedLocale = window.localStorage.getItem("saryna-locale");
    if (storedTheme === "day" || storedTheme === "night") setTheme(storedTheme);
    if (storedLocale === "en" || storedLocale === "ru") setLocale(storedLocale);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("saryna-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem("saryna-locale", locale);
  }, [locale]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateDashboard() {
      const state = await loadDashboardState();
      if (cancelled) return;

      startTransition(() => {
        setDashboardSource(state.source);
        setKpiCards(state.kpis);
        setAnomalies(state.anomalies);
        setIncidents(state.incidents);
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

  const localizedReportSections =
    selectedAnomaly && activeIncident
      ? buildLocalizedReportSections(selectedAnomaly, activeIncident, completedTasks, locale)
      : [];

  const heroStats = selectedAnomaly
    ? [
        {
          label: t.stats.signal,
          value: `${selectedAnomaly.signalScore} / 100`,
          detail: selectedAnomaly.assetName,
        },
        {
          label: t.stats.impact,
          value: `${selectedAnomaly.co2eTonnes} tCO2e`,
          detail: translateRegion(selectedAnomaly.region, locale),
        },
        {
          label: t.stats.workflow,
          value: activeIncident
            ? incidentStatusLabel[locale][activeIncident.status]
            : t.summary.screening,
          detail: activeIncident
            ? formatTaskProgress(completedTasks, activeIncident.tasks.length, locale)
            : t.panels.noIncident,
        },
      ]
    : kpiCards.slice(0, 3).map((kpi) => ({
        label: kpi.label,
        value: kpi.value,
        detail: kpi.detail,
      }));

  const promoteToIncident = async () => {
    if (!selectedAnomaly) return;
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
      if (dashboardSource === "api") setDashboardSource("fallback");
      applyIncidentUpdate(createFallbackIncident(selectedAnomaly), selectedAnomaly.id);
      setActiveStep("incident");
      setRequestError(
        locale === "en"
          ? "Promotion failed. The screen stayed on local demo data."
          : "Не удалось создать инцидент. Экран остался на локальных демо-данных.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const markTaskDone = async (taskId: string) => {
    if (!activeIncident) return;
    const currentTask = activeIncident.tasks.find((task) => task.id === taskId);
    if (!currentTask || currentTask.status === "done") return;

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
      if (dashboardSource === "api") setDashboardSource("fallback");
      applyTaskCompletionFallback(activeIncident, taskId);
      setRequestError(
        locale === "en"
          ? "Task update failed. The screen switched to local demo data."
          : "Не удалось обновить задачу. Экран перешёл на локальные демо-данные.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const generateReport = async () => {
    if (!activeIncident || !selectedAnomaly) return;

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
      if (dashboardSource === "api") setDashboardSource("fallback");
      applyReportFallback(activeIncident, selectedAnomaly);
      setActiveStep("report");
      setRequestError(
        locale === "en"
          ? "Report generation failed. The local report preview stayed active."
          : "Не удалось сформировать отчёт. Локальный предпросмотр остался активным.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const exportReportArtifact = async () => {
    if (!activeIncident || !selectedAnomaly) return;

    const actionId = `export-${activeIncident.id}`;
    setBusyAction(actionId);
    setRequestError(null);

    try {
      let fileName = `${activeIncident.id.toLowerCase()}-mrv-report.html`;
      let content = buildReportHtml(selectedAnomaly, activeIncident, localizedReportSections, locale);
      let contentType = "text/html;charset=utf-8";

      if (dashboardSource === "api" && locale === "en") {
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
      setRequestError(
        locale === "en"
          ? "Report export failed. The preview is still available."
          : "Не удалось экспортировать отчёт. Предпросмотр всё ещё доступен.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const openPrintView = () => {
    if (!activeIncident || !selectedAnomaly) return;
    if (dashboardSource === "api" && locale === "en") {
      const reportViewUrl = getReportViewUrl(activeIncident.id, true);
      if (reportViewUrl) {
        window.open(reportViewUrl, "_blank", "noopener,noreferrer");
        return;
      }
    }

    const html = buildReportHtml(
      selectedAnomaly,
      activeIncident,
      localizedReportSections,
      locale,
      true,
    );
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const changeSelectedAnomaly = (anomalyId: string) => {
    setSelectedAnomalyId(anomalyId);
    setActiveStep("signal");
    setRequestError(null);
    workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleNavSelect = (target: NavTarget) => {
    if (target === "faq") {
      faqRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (target !== "signal" && !activeIncident) return;

    setActiveStep(target);
    workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  function applyIncidentUpdate(incident: Incident, anomalyId: string) {
    startTransition(() => {
      setIncidents((current) => ({ ...current, [incident.id]: incident }));
      setAnomalies((current) =>
        current.map((item) =>
          item.id === anomalyId ? { ...item, linkedIncidentId: incident.id } : item,
        ),
      );
    });
  }

  function applyTaskCompletionFallback(incident: Incident, taskId: string) {
    startTransition(() => {
      setIncidents((current) => {
        const existing = current[incident.id] ?? incident;
        const tasks: IncidentTask[] = existing.tasks.map((task) =>
          task.id === taskId ? { ...task, status: "done" } : task,
        );
        const doneCount = tasks.filter((task) => task.status === "done").length;

        return {
          ...current,
          [incident.id]: {
            ...existing,
            tasks,
            status: doneCount === tasks.length ? "mitigation" : "verification",
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
        return {
          ...current,
          [incident.id]: {
            ...existing,
            reportGeneratedAt: "2026-03-27 09:00",
            status: doneCount === existing.tasks.length ? "mitigation" : "verification",
            reportSections: buildLocalizedReportSections(anomaly, existing, doneCount, locale),
          },
        };
      });
    });
  }

  if (!selectedAnomaly) {
    return (
      <main className="site-shell">
        <section className="empty-shell">
          <p>{locale === "en" ? "No signal is available." : "Сигнал недоступен."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="site-shell">
      <header className="site-header">
        <div className="header-bar">
          <button
            className="brand-button"
            onClick={() => workspaceRef.current?.scrollIntoView({ behavior: "smooth" })}
            type="button"
          >
            <span className="brand-mark" />
            <span className="brand-copy">
              <strong>{t.brand}</strong>
              <small>{t.tagline}</small>
            </span>
          </button>

          <nav aria-label="Main navigation" className="header-nav">
            {stepOrder.map((step) => (
              <button
                key={step}
                className={`nav-button ${activeStep === step ? "nav-button-active" : ""}`}
                disabled={step !== "signal" && !activeIncident}
                onClick={() => handleNavSelect(step)}
                type="button"
              >
                {t.nav[step]}
              </button>
            ))}
            <button className="nav-button" onClick={() => handleNavSelect("faq")} type="button">
              {t.nav.faq}
            </button>
          </nav>

          <div className="header-controls">
            <button
              aria-label={t.controls.language}
              className="language-toggle"
              onClick={() => setLocale((current) => (current === "en" ? "ru" : "en"))}
              type="button"
            >
              <GlobeIcon />
              <span>{locale.toUpperCase()}</span>
            </button>

            <button
              aria-label={t.controls.theme}
              className={`theme-toggle theme-toggle-${theme}`}
              onClick={() => setTheme((current) => (current === "day" ? "night" : "day"))}
              type="button"
            >
              {theme === "day" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      <section className="hero-shell">
        <div className="hero-copy">
          <p className="eyebrow">{t.brand}</p>
          <h1>{t.hero.title}</h1>
          <p className="hero-subtitle">{t.hero.subtitle}</p>
        </div>

        <div className="hero-side">
          <section className="status-pill">
            <span className={`status-dot ${dashboardSource === "api" ? "status-dot-live" : ""}`} />
            <div>
              <strong>
                {loadingDashboard
                  ? t.status.loading
                  : dashboardSource === "api"
                    ? t.status.api
                    : t.status.fallback}
              </strong>
              <p>{dashboardSource === "api" ? t.status.apiNote : t.status.fallbackNote}</p>
            </div>
          </section>

          <div className="hero-stats">
            {heroStats.map((stat) => (
              <article key={stat.label} className="hero-stat">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <p>{stat.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {requestError ? <section className="error-banner">{requestError}</section> : null}

      <section className="workspace-shell" ref={workspaceRef}>
        <aside className="signal-rail">
          <div className="rail-head">
            <p className="eyebrow">{t.queue.eyebrow}</p>
            <h2>{t.queue.title}</h2>
            <p>{t.queue.subtitle}</p>
          </div>

          <div className="signal-list">
            {anomalies.map((anomaly) => {
              const incident = anomaly.linkedIncidentId ? incidents[anomaly.linkedIncidentId] : undefined;
              return (
                <button
                  key={anomaly.id}
                  className={`signal-card ${anomaly.id === selectedAnomaly.id ? "signal-card-active" : ""}`}
                  onClick={() => changeSelectedAnomaly(anomaly.id)}
                  type="button"
                >
                  <div className="signal-card-top">
                    <span className={`severity-badge ${severityTone[anomaly.severity]}`}>
                      {severityLabel[locale][anomaly.severity]}
                    </span>
                    <span>{formatTimestamp(anomaly.detectedAt, locale)}</span>
                  </div>
                  <strong>{anomaly.assetName}</strong>
                  <p>{translateRegion(anomaly.region, locale)}</p>
                  <div className="signal-card-bottom">
                    <span>
                      {t.summary.score} {anomaly.signalScore}
                    </span>
                    <span>
                      {incident ? incidentStatusLabel[locale][incident.status] : t.summary.screening}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rail-footer">
            <span>{t.queue.top}</span>
            <strong>{strongestAnomaly?.assetName ?? selectedAnomaly.assetName}</strong>
            <small>{strongestAnomaly?.signalScore ?? selectedAnomaly.signalScore} / 100</small>
          </div>
        </aside>

        <section className="workspace-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{t.steps[activeStep].eyebrow}</p>
              <h2>{t.steps[activeStep].title}</h2>
              <p>{t.steps[activeStep].subtitle}</p>
            </div>
          </div>
          {activeStep === "signal" ? (
            <div className="panel-body">
              <section className="metric-grid">
                <MetricCard label={t.summary.score} value={`${selectedAnomaly.signalScore} / 100`} />
                <MetricCard label={t.stats.impact} value={`${selectedAnomaly.co2eTonnes} tCO2e`} />
                <MetricCard label={t.summary.detected} value={formatTimestamp(selectedAnomaly.detectedAt, locale)} />
                <MetricCard label={t.summary.confidence} value={selectedAnomaly.confidence} />
              </section>

              <section className="signal-focus">
                <InfoRow label={t.summary.region} value={translateRegion(selectedAnomaly.region, locale)} />
                <InfoRow label={t.summary.facility} value={translateFacility(selectedAnomaly.facilityType, locale)} />
                <InfoRow label={t.panels.assets} value={selectedAnomaly.assetName} />
                <InfoRow label="CO2e" value={`${selectedAnomaly.co2eTonnes} tCO2e`} />
              </section>

              <section className="map-card">
                <div className="section-head">
                  <span>{t.panels.map}</span>
                  <strong>{translateRegion(selectedAnomaly.region, locale)}</strong>
                </div>
                <div className="map-board">
                  {anomalies.map((anomaly) => (
                    <button
                      key={anomaly.id}
                      aria-label={anomaly.assetName}
                      className={`map-dot ${anomaly.id === selectedAnomaly.id ? "map-dot-active" : ""}`}
                      onClick={() => changeSelectedAnomaly(anomaly.id)}
                      style={{ left: `${anomaly.sitePosition.x}%`, top: `${anomaly.sitePosition.y}%` }}
                      type="button"
                    />
                  ))}
                </div>
              </section>

              <div className="panel-actions">
                <button
                  className="primary-button"
                  disabled={busyAction === "promote"}
                  onClick={() => void promoteToIncident()}
                  type="button"
                >
                  {selectedAnomaly.linkedIncidentId
                    ? t.actions.openIncident
                    : busyAction === "promote"
                      ? t.actions.promoting
                      : t.actions.promote}
                </button>
              </div>
            </div>
          ) : null}
          {activeStep === "report" ? (
            activeIncident ? (
              <div className="panel-body">
                <section className="metric-grid">
                  <MetricCard
                    label={t.summary.generated}
                    value={
                      activeIncident.reportGeneratedAt
                        ? formatTimestamp(activeIncident.reportGeneratedAt, locale)
                        : t.summary.noReport
                    }
                  />
                  <MetricCard label={t.summary.reportSections} value={String(localizedReportSections.length || 0)} />
                  <MetricCard label={t.summary.owner} value={translateOwner(activeIncident.owner, locale)} />
                  <MetricCard label={t.summary.progress} value={formatTaskProgress(completedTasks, activeIncident.tasks.length, locale)} />
                </section>

                {activeIncident.reportGeneratedAt ? (
                  <section className="report-stack">
                    {localizedReportSections.map((section) => (
                      <article key={section.title} className="report-card">
                        <span>{section.title}</span>
                        <p>{section.body}</p>
                      </article>
                    ))}
                  </section>
                ) : (
                  <EmptyStage title={t.summary.noReport} subtitle={t.panels.noReportHint} />
                )}

                <div className="panel-actions panel-actions-wrap">
                  <button
                    className="primary-button"
                    disabled={busyAction === `report-${activeIncident.id}`}
                    onClick={() => void generateReport()}
                    type="button"
                  >
                    {busyAction === `report-${activeIncident.id}` ? t.actions.generating : t.actions.generateReport}
                  </button>
                  <button
                    className="secondary-button"
                    disabled={busyAction === `export-${activeIncident.id}`}
                    onClick={() => void exportReportArtifact()}
                    type="button"
                  >
                    {busyAction === `export-${activeIncident.id}` ? t.actions.exporting : t.actions.downloadHtml}
                  </button>
                  <button className="secondary-button" onClick={openPrintView} type="button">
                    {t.actions.printView}
                  </button>
                  <button className="secondary-button" onClick={() => setActiveStep("signal")} type="button">
                    {t.actions.reviewAnother}
                  </button>
                </div>
              </div>
            ) : (
              <EmptyStage title={t.panels.noIncident} subtitle={t.panels.noIncidentHint} />
            )
          ) : null}
        </section>
      </section>

      <section className="faq-shell" ref={faqRef}>
        <div className="faq-head">
          <p className="eyebrow">{t.faq.title}</p>
          <h2>{t.faq.title}</h2>
          <p>{t.faq.intro}</p>
        </div>

        <div className="faq-list">
          {t.faq.items.map((item) => (
            <details key={item.id} className="faq-item">
              <summary>
                <span>{item.question}</span>
                <ChevronIcon />
              </summary>
              <div className="faq-answer">
                {item.answer.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <p className="footer-note">{t.footer.note}</p>
      </footer>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <article className="info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function TaskRow({
  task,
  locale,
  busy,
  onComplete,
}: {
  task: IncidentTask;
  locale: Locale;
  busy: boolean;
  onComplete: () => void;
}) {
  const t = copy[locale];

  return (
    <article className={`task-row ${task.status === "done" ? "task-row-done" : ""}`}>
      <div>
        <span>{translateOwner(task.owner, locale)}</span>
        <strong>{translateTaskTitle(task.title, locale)}</strong>
      </div>
      <div className="task-row-side">
        <small>{task.etaHours}h</small>
        <button
          className="secondary-button"
          disabled={task.status === "done" || busy}
          onClick={onComplete}
          type="button"
        >
          {task.status === "done"
            ? t.actions.completed
            : busy
              ? t.actions.saving
              : t.actions.markDone}
        </button>
      </div>
    </article>
  );
}

function EmptyStage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="empty-stage">
      <strong>{title}</strong>
      <p>{subtitle}</p>
    </div>
  );
}

function createFallbackIncident(anomaly: Anomaly): Incident {
  const incidentId = `INC-${anomaly.id.replace("AN-", "")}`;

  return {
    id: incidentId,
    anomalyId: anomaly.id,
    title: `${anomaly.assetName} escalation`,
    status: "triage",
    owner: "Response lead",
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
        owner: "Response lead",
        etaHours: 1,
        status: "open",
        notes: "Confirm the first verification owner.",
      },
      {
        id: `${incidentId}-TASK-2`,
        title: "Cross-check recent maintenance activity",
        owner: "Reliability engineer",
        etaHours: 4,
        status: "open",
        notes: "Look for compressor, flare, or shutdown activity.",
      },
      {
        id: `${incidentId}-TASK-3`,
        title: "Prepare ESG evidence note",
        owner: "Compliance lead",
        etaHours: 6,
        status: "open",
        notes: "Document what is measured and what still needs proof.",
      },
    ],
  };
}

function buildReportHtml(
  anomaly: Anomaly,
  incident: Incident,
  sections: ReportSection[],
  locale: Locale,
  autoPrint = false,
) {
  const labels =
    locale === "ru"
      ? {
          title: "Предпросмотр отчёта Saryna MRV",
          incident: "Инцидент",
          asset: "Объект",
          region: "Регион",
          owner: "Ответственный",
          tasks: "Задачи проверки",
        }
      : {
          title: "Saryna MRV Report Preview",
          incident: "Incident",
          asset: "Asset",
          region: "Region",
          owner: "Owner",
          tasks: "Verification tasks",
        };

  const taskItems = incident.tasks
    .map(
      (task) =>
        `<li><strong>${escapeHtml(translateTaskTitle(task.title, locale))}</strong> - ${escapeHtml(translateOwner(task.owner, locale))} - ${task.etaHours}h</li>`,
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

  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(labels.title)}</title><style>:root{color-scheme:light;}body{margin:0;padding:40px;font-family:Aptos,"Segoe UI",sans-serif;color:#1f2933;background:#f6f1e8;}main{max-width:860px;margin:0 auto;padding:36px;border:1px solid #d7d0c4;background:#fffdfa;}h1,h2,h3{margin:0;}h1{font-family:"Iowan Old Style",Georgia,serif;font-size:2.1rem;letter-spacing:-0.04em;}.meta{margin:24px 0;display:grid;gap:8px;color:#5a6671;}section{margin-top:22px;padding-top:18px;border-top:1px solid #e6dfd4;}p,li{color:#4b5762;line-height:1.7;}ul{padding-left:20px;}</style>${printScript}</head><body><main><h1>${escapeHtml(labels.title)}</h1><div class="meta"><span>${escapeHtml(labels.incident)}: ${escapeHtml(incident.id)}</span><span>${escapeHtml(labels.asset)}: ${escapeHtml(anomaly.assetName)}</span><span>${escapeHtml(labels.region)}: ${escapeHtml(translateRegion(anomaly.region, locale))}</span><span>${escapeHtml(labels.owner)}: ${escapeHtml(translateOwner(incident.owner, locale))}</span></div>${sectionMarkup}<section><h2>${escapeHtml(labels.tasks)}</h2><ul>${taskItems}</ul></section></main></body></html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function GlobeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18Zm6.75 8h-3.03a14.1 14.1 0 0 0-1.17-4.13A7.04 7.04 0 0 1 18.75 11ZM12 5.2c.83 1.03 1.53 2.81 1.78 5.8h-3.56C10.47 8.01 11.17 6.23 12 5.2ZM9.45 6.87A14.1 14.1 0 0 0 8.28 11H5.25a7.04 7.04 0 0 1 4.2-4.13ZM5.25 13h3.03c.16 1.53.56 2.92 1.17 4.13A7.04 7.04 0 0 1 5.25 13ZM12 18.8c-.83-1.03-1.53-2.81-1.78-5.8h3.56c-.25 2.99-.95 4.77-1.78 5.8Zm2.55-1.67c.61-1.21 1.01-2.6 1.17-4.13h3.03a7.04 7.04 0 0 1-4.2 4.13Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M12 6.5a5.5 5.5 0 1 0 0 11a5.5 5.5 0 0 0 0-11Zm0-4a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 12 2.5Zm0 16a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Zm9.5-6.5a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75Zm-16 0a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M14.82 2.74a.75.75 0 0 1 .81.96A8.5 8.5 0 1 0 20.3 14.36a.75.75 0 0 1 .96.81A10 10 0 1 1 14.82 2.74Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M6.7 9.7a.75.75 0 0 1 1.06 0L12 13.94l4.24-4.24a.75.75 0 1 1 1.06 1.06l-4.77 4.77a.75.75 0 0 1-1.06 0L6.7 10.76a.75.75 0 0 1 0-1.06Z"
        fill="currentColor"
      />
    </svg>
  );
}
