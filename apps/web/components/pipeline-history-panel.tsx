"use client";

import type {
  PipelineHistoryPayload,
  PipelineHistoryRun,
  PipelineHistoryTrigger,
} from "../lib/api";
import { formatTimestamp, type Locale } from "../lib/site-content";

const historyCopy = {
  en: {
    title: "Live sync rhythm",
    subtitle: "Recent Earth Engine refreshes stored in PostgreSQL history.",
    cadence: "Auto-sync cadence",
    nextRun: "Next auto-sync",
    totalRuns: "Stored sync runs",
    lastReady: "Last successful sync",
    deltaChart: "CH4 delta vs baseline",
    candidateChart: "Live candidates per sync",
    noHistory:
      "No completed syncs are stored yet. Run one live refresh to start the MRV history and let scheduled sync keep extending it.",
    manualOnly: "Manual only",
    notScheduled: "Not scheduled",
    legendManual: "Manual sync",
    legendScheduled: "Scheduled sync",
    takeaway:
      "This chart turns one-off screening into an operational cycle: every stored refresh stays visible for audit, cadence, and comparison.",
  },
  ru: {
    title: "Ритм живых синхронизаций",
    subtitle: "Последние обновления Earth Engine, сохранённые в истории PostgreSQL.",
    cadence: "Интервал автообновления",
    nextRun: "Следующая автосинхронизация",
    totalRuns: "Сохранённые синхронизации",
    lastReady: "Последняя успешная синхронизация",
    deltaChart: "Отклонение CH4 от базового уровня",
    candidateChart: "Живые кандидаты за синхронизацию",
    noHistory:
      "История живых синхронизаций ещё не накоплена. Запустите одно обновление вручную, а дальше автообновление будет постепенно строить MRV-историю.",
    manualOnly: "Только вручную",
    notScheduled: "Не запланировано",
    legendManual: "Ручная синхронизация",
    legendScheduled: "Автосинхронизация",
    takeaway:
      "Этот блок превращает разовый скрининг в рабочий цикл: каждое обновление сохраняется для аудита, ритма обновлений и сравнения между запусками.",
  },
} as const;

type HistoryMetricPoint = {
  id: number;
  label: string;
  value: number;
  trigger: PipelineHistoryTrigger;
  title: string;
};

export function PipelineHistoryPanel({
  history,
  locale,
}: {
  history: PipelineHistoryPayload;
  locale: Locale;
}) {
  const copy = historyCopy[locale];
  const recentRuns = [...history.runs].slice(0, 8).reverse();
  const lastReadyRun = history.runs.find((run) => run.status.state === "ready");

  const deltaPoints = recentRuns
    .filter((run) => run.status.screeningSnapshot?.deltaPct !== undefined)
    .map((run) =>
      toMetricPoint(
        run,
        run.status.screeningSnapshot?.deltaPct ?? 0,
        locale === "ru"
          ? `${formatTimestamp(run.createdAt, locale)} • ${formatNumber(run.status.screeningSnapshot?.deltaPct ?? 0, locale)}%`
          : `${formatTimestamp(run.createdAt, locale)} • ${formatNumber(run.status.screeningSnapshot?.deltaPct ?? 0, locale)}%`,
      ),
    );
  const candidatePoints = recentRuns.map((run) =>
    toMetricPoint(
      run,
      run.status.anomalyCount,
      locale === "ru"
        ? `${formatTimestamp(run.createdAt, locale)} • ${run.status.anomalyCount} кандидатов`
        : `${formatTimestamp(run.createdAt, locale)} • ${run.status.anomalyCount} candidates`,
    ),
  );

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
          <div className="history-chart-grid">
            <HistoryMetricChart
              title={copy.deltaChart}
              points={deltaPoints}
              locale={locale}
              valueSuffix="%"
            />
            <HistoryMetricChart
              title={copy.candidateChart}
              points={candidatePoints}
              locale={locale}
            />
          </div>

          <div className="history-legend">
            <span>
              <i className="legend-dot legend-dot-manual" />
              {copy.legendManual}
            </span>
            <span>
              <i className="legend-dot legend-dot-scheduled" />
              {copy.legendScheduled}
            </span>
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

function HistoryMetricChart({
  title,
  points,
  locale,
  valueSuffix,
}: {
  title: string;
  points: HistoryMetricPoint[];
  locale: Locale;
  valueSuffix?: string;
}) {
  const chartPoints = buildChartPoints(points);

  return (
    <article className="history-chart-card">
      <div className="history-chart-head">
        <span>{title}</span>
        <strong>
          {points.length > 0
            ? `${formatNumber(points[points.length - 1].value, locale)}${valueSuffix ? ` ${valueSuffix}` : ""}`
            : locale === "ru"
              ? "Нет данных"
              : "No data"}
        </strong>
      </div>

      {chartPoints.length > 0 ? (
        <svg
          aria-label={title}
          className="history-chart-svg"
          role="img"
          viewBox="0 0 320 140"
        >
          <path className="history-chart-gridline" d="M20 112 H300" />
          <path className="history-chart-gridline" d="M20 72 H300" />
          <path className="history-chart-gridline" d="M20 32 H300" />
          <path className="history-chart-line" d={buildPath(chartPoints)} />
          {chartPoints.map((point) => (
            <g key={point.id}>
              <circle
                className={`history-point history-point-${point.trigger}`}
                cx={point.x}
                cy={point.y}
                r="5"
              >
                <title>{point.title}</title>
              </circle>
            </g>
          ))}
        </svg>
      ) : (
        <div className="history-chart-empty">{locale === "ru" ? "Пока только одна точка или нет данных." : "Only one point or no data yet."}</div>
      )}

      {points.length > 0 ? (
        <div className="history-axis">
          <span>{points[0].label}</span>
          <span>{points[points.length - 1].label}</span>
        </div>
      ) : null}
    </article>
  );
}

function buildChartPoints(points: HistoryMetricPoint[]) {
  if (points.length === 0) {
    return [];
  }

  const width = 280;
  const height = 100;
  const leftPad = 20;
  const topPad = 16;
  const rightPad = 20;
  const bottomPad = 12;
  const minValue = Math.min(...points.map((point) => point.value));
  const maxValue = Math.max(...points.map((point) => point.value));
  const range = maxValue - minValue;

  return points.map((point, index) => {
    const progress = points.length === 1 ? 0.5 : index / (points.length - 1);
    const x = leftPad + progress * (width - leftPad - rightPad);
    const normalized = range === 0 ? 0.5 : (point.value - minValue) / range;
    const y = height - bottomPad - normalized * (height - topPad - bottomPad);
    return { ...point, x, y };
  });
}

function buildPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y} L ${point.x + 0.01} ${point.y}`;
  }

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
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

function toMetricPoint(run: PipelineHistoryRun, value: number, title: string): HistoryMetricPoint {
  return {
    id: run.id,
    label: run.createdAt.slice(11, 16),
    value,
    trigger: run.trigger,
    title,
  };
}
