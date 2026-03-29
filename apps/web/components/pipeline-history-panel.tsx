"use client";

import type {
  PipelineHistoryPayload,
  PipelineHistoryRun,
  PipelineHistoryTrigger,
} from "../lib/api";
import { formatTimestamp, type Locale } from "../lib/site-content";

const historyCopy = {
  en: {
    title: "Refresh history",
    subtitle: "Recent Earth Engine updates.",
    cadence: "Refresh interval",
    nextRun: "Next refresh",
    totalRuns: "Saved updates",
    lastReady: "Last successful refresh",
    recentRuns: "Latest updates",
    refreshedAt: "Updated at",
    trigger: "Type",
    delta: "CH4 vs baseline",
    queueCount: "Zones in queue",
    state: "Status",
    noHistory:
      "No completed refreshes are stored yet. Run a manual refresh to start building the screening history.",
    manualOnly: "Manual only",
    notScheduled: "Not scheduled",
    takeaway:
      "This block shows when the data was refreshed, whether it was manual or scheduled, and how many zones were added to the queue after each update.",
    noDelta: "No CH4 difference yet",
  },
  ru: {
    title: "История обновлений",
    subtitle: "Последние обновления Earth Engine.",
    cadence: "Интервал обновления",
    nextRun: "Следующее обновление",
    totalRuns: "Сохранённые обновления",
    lastReady: "Последнее успешное обновление",
    recentRuns: "Последние обновления",
    refreshedAt: "Обновлено",
    trigger: "Тип запуска",
    delta: "CH4 к базовому уровню",
    queueCount: "Зон в очереди",
    state: "Состояние",
    noHistory:
      "История обновлений пока пустая. Запустите обновление вручную, чтобы начать накопление истории.",
    manualOnly: "Только вручную",
    notScheduled: "Не запланировано",
    takeaway:
      "Этот блок показывает, когда обновлялись данные, был ли запуск ручным или плановым, и сколько зон после этого попало в очередь на разбор.",
    noDelta: "Разница CH4 пока не рассчитана",
  },
} as const;

export function PipelineHistoryPanel({
  history,
  locale,
}: {
  history: PipelineHistoryPayload;
  locale: Locale;
}) {
  const copy = historyCopy[locale];
  const recentRuns = dedupeVisibleRuns(history.runs).slice(0, 6);
  const lastReadyRun = history.runs.find((run) => run.status.state === "ready");

  return (
    <section className="history-surface">
      <div className="history-head">
        <div>
          <span className="history-eyebrow">{copy.title}</span>
          <p className="history-subtitle">{copy.subtitle}</p>
        </div>
        <div className="history-badge-row">
          <span className={`history-badge ${history.schedule.enabled ? "history-badge-live" : ""}`}>
            {formatCadence(history, locale)}
          </span>
          <span className="history-badge">
            {history.schedule.nextRunAt
              ? `${copy.nextRun}: ${formatTimestamp(history.schedule.nextRunAt, locale)}`
              : copy.notScheduled}
          </span>
        </div>
      </div>

      <div className="history-summary-grid">
        <HistorySummaryCell label={copy.cadence} value={formatCadence(history, locale)} />
        <HistorySummaryCell
          label={copy.nextRun}
          value={
            history.schedule.nextRunAt
              ? formatTimestamp(history.schedule.nextRunAt, locale)
              : copy.notScheduled
          }
        />
        <HistorySummaryCell label={copy.totalRuns} value={String(history.runs.length)} />
        <HistorySummaryCell
          label={copy.lastReady}
          value={lastReadyRun ? formatTimestamp(lastReadyRun.createdAt, locale) : copy.notScheduled}
        />
      </div>

      {history.runs.length > 0 ? (
        <>
          <div className="history-run-list" role="list" aria-label={copy.recentRuns}>
            {recentRuns.map((run) => (
              <article className="history-run-row" key={run.id} role="listitem">
                <div className="history-run-cell">
                  <span>{copy.refreshedAt}</span>
                  <strong>{formatTimestamp(run.createdAt, locale)}</strong>
                </div>
                <div className="history-run-cell">
                  <span>{copy.trigger}</span>
                  <strong>{formatTrigger(run.trigger, locale)}</strong>
                </div>
                <div className="history-run-cell">
                  <span>{copy.delta}</span>
                  <strong>{formatDelta(run.status.screeningSnapshot?.deltaPct, locale, copy.noDelta)}</strong>
                </div>
                <div className="history-run-cell">
                  <span>{copy.queueCount}</span>
                  <strong>{run.status.anomalyCount}</strong>
                </div>
                <div className="history-run-cell">
                  <span>{copy.state}</span>
                  <strong>{formatState(run.status.state, locale)}</strong>
                </div>
              </article>
            ))}
          </div>

          <p className="history-takeaway">{copy.takeaway}</p>
        </>
      ) : (
        <p className="history-empty">{copy.noHistory}</p>
      )}
    </section>
  );
}

function HistorySummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <article className="history-summary-cell">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function formatCadence(history: PipelineHistoryPayload, locale: Locale) {
  const copy = historyCopy[locale];
  const minutes = history.schedule.intervalMinutes;
  if (!history.schedule.enabled || !minutes) {
    return copy.manualOnly;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return locale === "ru" ? `Каждые ${hours} ч` : `Every ${hours}h`;
  }
  return locale === "ru" ? `Каждые ${minutes} мин` : `Every ${minutes}m`;
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatTrigger(trigger: PipelineHistoryTrigger, locale: Locale) {
  if (trigger === "scheduled") {
    return locale === "ru" ? "Автоматически" : "Scheduled";
  }
  return locale === "ru" ? "Вручную" : "Manual";
}

function formatState(
  state: PipelineHistoryRun["status"]["state"],
  locale: Locale,
) {
  const labels =
    locale === "ru"
      ? {
          ready: "Готово",
          syncing: "Идёт обновление",
          degraded: "С ограничениями",
          error: "Ошибка",
        }
      : {
          ready: "Ready",
          syncing: "Syncing",
          degraded: "Degraded",
          error: "Error",
        };

  return labels[state];
}

function formatDelta(value: number | undefined, locale: Locale, emptyLabel: string) {
  if (value === undefined) {
    return emptyLabel;
  }

  return `${formatNumber(value, locale)}%`;
}

function dedupeVisibleRuns(runs: PipelineHistoryRun[]) {
  const fingerprints = new Set<string>();
  const uniqueRuns: PipelineHistoryRun[] = [];

  for (const run of runs) {
    const fingerprint = [
      run.trigger,
      run.status.state,
      run.status.anomalyCount,
      run.status.screeningSnapshot?.deltaPct ?? "no-delta",
    ].join("|");

    if (fingerprints.has(fingerprint)) {
      continue;
    }

    fingerprints.add(fingerprint);
    uniqueRuns.push(run);
  }

  return uniqueRuns;
}
