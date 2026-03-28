"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  completeTask as completeTaskRequest,
  type DashboardHydrationState,
  downloadReport,
  fallbackDashboardState,
  fallbackPipelineStatus,
  generateReport as generateReportRequest,
  hasApiBaseUrl,
  getReportViewUrl,
  loadDashboardState,
  loadPipelineStatus,
  promoteAnomaly as promoteAnomalyRequest,
  type ReportExportFormat,
  syncPipeline,
  type PipelineStatus,
  type ScreeningEvidenceSnapshot,
} from "../lib/api";
import { AnomalyMap } from "../components/anomaly-map";
import { type Anomaly, type Incident, type IncidentTask, type ReportSection } from "../lib/demo-data";
import {
  copy,
  formatHours,
  formatTaskProgress,
  formatTimestamp,
  incidentStatusLabel,
  type Locale,
  type NavTarget,
  severityLabel,
  severityTone,
  type StepId,
  stepOrder,
  translateAnomalySummary,
  translateAdministrativeLabel,
  translateAssetName,
  translateConfidence,
  translateFacility,
  formatVerificationAreaLabel,
  translateIncidentNarrative,
  translateOwner,
  translatePipelineStatusMessage,
  translateRecommendedAction,
  translateRegion,
  translateScreeningCaveat,
  translateScreeningConfidenceNote,
  translateScreeningEvidenceSource,
  translateScreeningObservedWindow,
  translateScreeningRecommendation,
  translateTaskTitle,
  translateWindow,
  type ThemeMode,
} from "../lib/site-content";

type MapCardTone = "seeded" | "live" | "fallback";
type MapPresetId =
  | "all-kazakhstan"
  | "atyrau"
  | "mangystau"
  | "aktobe"
  | "west-kazakhstan"
  | "kyzylorda"
  | "pavlodar";

type MapPreset = {
  id: MapPresetId;
  region: string | null;
  label: {
    en: string;
    ru: string;
  };
};

const MAP_PRESETS: MapPreset[] = [
  {
    id: "all-kazakhstan",
    region: null,
    label: { en: "All Kazakhstan", ru: "Весь Казахстан" },
  },
  {
    id: "atyrau",
    region: "Atyrau Region",
    label: { en: "Atyrau", ru: "Атырау" },
  },
  {
    id: "mangystau",
    region: "Mangystau Region",
    label: { en: "Mangystau", ru: "Мангистау" },
  },
  {
    id: "aktobe",
    region: "Aktobe Region",
    label: { en: "Aktobe", ru: "Актобе" },
  },
  {
    id: "west-kazakhstan",
    region: "West Kazakhstan Region",
    label: { en: "West Kazakhstan", ru: "Западный Казахстан" },
  },
  {
    id: "kyzylorda",
    region: "Kyzylorda Region",
    label: { en: "Kyzylorda", ru: "Кызылорда" },
  },
  {
    id: "pavlodar",
    region: "Pavlodar Region",
    label: { en: "Pavlodar", ru: "Павлодар" },
  },
] as const;

const mapSyncLabelCopy = {
  en: {
    verified: "Last verified",
    attempted: "Last attempt",
  },
  ru: {
    verified: "Последнее подтверждение",
    attempted: "Последняя попытка",
  },
} as const;

const mapCardCopy = {
  en: {
    contextSeeded: "Nationwide seeded view",
    contextLive: "Live screening view",
    contextFallback: "Fallback view",
    noteSeeded:
      "This map shows seeded screening markers across Kazakhstan. It is a navigation surface, not live plume geometry.",
    noteLive:
      "The map stays geographically stable. Screening evidence was refreshed for the selected Kazakhstan window.",
    noteDegraded:
      "The last verified screening snapshot is still shown while the live refresh is degraded.",
    noteUnavailable:
      "Live screening is unavailable, so use the visible national context and demo workflow for decisions.",
  },
  ru: {
    contextSeeded: "Демо-покрытие по стране",
    contextLive: "Обновлённый скрининг",
    contextFallback: "Живые данные недоступны",
    noteSeeded:
      "На карте показаны демонстрационные маркеры по Казахстану. Это навигационный слой, а не точная геометрия выброса в реальном времени.",
    noteLive:
      "География карты остаётся стабильной. Данные скрининга обновлены для выбранной зоны Казахстана.",
    noteDegraded:
      "Последний подтверждённый снимок скрининга всё ещё показан, пока новое обновление работает с ограничениями.",
    noteUnavailable:
      "Спутниковый скрининг сейчас недоступен, поэтому для решений используйте видимый контекст по стране и демонстрационный сценарий.",
  },
} as const;

const screeningCopy = {
  en: {
    title: "Latest methane screening",
    subtitle: "Use satellite evidence as a screening layer, then manually turn the suspected zone into an incident.",
    current: "Current CH4",
    baseline: "Baseline CH4",
    delta: "Delta vs baseline",
    level: "Priority level",
    synced: "Last sync",
    verified: "Last verified",
    attempted: "Last attempt",
    observed: "Observed window",
    source: "Evidence source",
    confidence: "Confidence note",
    caveat: "Caveat",
    recommendation: "Action plan",
    sync: "Sync latest evidence",
    syncing: "Syncing...",
    reset: "Return to seeded mode",
    resetting: "Resetting...",
    noApi: "Live sync needs the FastAPI backend to be available.",
    syncingGee: "Refreshing satellite screening evidence...",
    syncingSeeded: "Returning to seeded screening playback...",
    syncFailedGee: "Live sync failed. The seeded workflow remains available.",
    syncFailedSeeded: "Reset to seeded mode failed. The current workflow remains available.",
    notAvailable: "Not available",
    noCaveat: "No additional caveat.",
    freshness: {
      fresh: "Fresh evidence",
      stale: "Stale evidence",
      unavailable: "Unavailable",
    },
    levelLabel: {
      low: "Low",
      medium: "Medium",
      high: "High",
    },
    help: {
      current:
        "This is the latest methane reading for the current screening window. ppb means parts per billion, a concentration unit.",
      baseline:
        "This is the usual methane level for comparison. It helps show what is normal for this area and period.",
      delta:
        "This shows how far the latest reading is from the baseline. A higher positive difference means the current zone stands out more strongly.",
      level:
        "This is the simplified priority level for quick decisions. It combines the satellite comparison into a low, medium, or high screening priority.",
    },
  },
  ru: {
    title: "Последняя спутниковая проверка метана",
    subtitle: "Сначала посмотрите спутниковые данные, затем при необходимости вручную переведите подозрительную зону в инцидент.",
    current: "Текущий уровень CH4",
    baseline: "Базовый уровень CH4",
    delta: "Отклонение от базового уровня",
    level: "Уровень приоритета",
    synced: "Последняя синхронизация",
    verified: "Последнее подтверждение",
    attempted: "Последняя попытка",
    observed: "Окно наблюдения",
    source: "Источник",
    confidence: "Насколько данные надёжны",
    caveat: "Что важно учесть",
    recommendation: "План действий",
    sync: "Обновить данные",
    syncing: "Обновляем...",
    reset: "Вернуть демо-данные",
    resetting: "Возвращаем...",
    noApi: "Для обновления нужен доступный сервер FastAPI.",
    syncingGee: "Обновляем спутниковые данные по метану...",
    syncingSeeded: "Возвращаем демонстрационные данные...",
    syncFailedGee: "Не удалось обновить спутниковые данные. Демонстрационный сценарий остаётся доступным.",
    syncFailedSeeded: "Не удалось вернуть демонстрационные данные. Текущий сценарий остаётся доступным.",
    notAvailable: "Недоступно",
    noCaveat: "Дополнительных ограничений нет.",
    freshness: {
      fresh: "Данные актуальны",
      stale: "Последние доступные данные",
      unavailable: "Недоступно",
    },
    levelLabel: {
      low: "Низкий",
      medium: "Средний",
      high: "Высокий",
    },
    help: {
      current:
        "Это последнее значение метана для выбранной зоны проверки. ppb означает части метана на миллиард частей воздуха.",
      baseline:
        "Это обычный уровень метана для сравнения. Он тоже показан в ppb, то есть в частях метана на миллиард частей воздуха.",
      delta:
        "Это разница между текущим и базовым уровнем. Она показана в ppb и в процентах, чтобы было видно и абсолютное, и относительное отклонение.",
      level:
        "Это упрощённая оценка важности зоны для быстрого решения. Она показывает, насколько внимательно стоит отнестись к этому случаю.",
    },
  },
} as const;

const liveSignalCopy = {
  en: {
    methaneUplift: "Methane uplift",
    thermalContext: "Night thermal context (72h)",
    evidenceSource: "Evidence source",
    baselineWindow: "Baseline window",
    verificationArea: "Verification area",
    nearestAddress: "Nearest address",
    nearestLandmark: "Nearest landmark",
    noThermalContext: "No recent night-time detections",
    noImpact: "Not estimated in live screening",
    notAvailable: "Not available",
    notMappedNearby: "No mapped result nearby",
    detections: "night detections",
    hints: {
      methaneUplift:
        "This compares the current CH4 scene with the rolling baseline at the selected live candidate point.",
      thermalContext:
        "This counts night-time VIIRS thermal detections within 25 km over the last 72 hours. It is context, not proof of a flare source.",
      evidenceSource:
        "This shows which live data layers produced the current candidate on the page.",
      baselineWindow:
        "This shows the historical comparison window used to decide whether the current CH4 reading stands out.",
      verificationArea:
        "This narrows the live hotspot to the nearest mapped district or local area for field review.",
      nearestAddress:
        "This is the closest mapped address near the hotspot center. It is a route-planning hint, not proof of the exact source.",
      nearestLandmark:
        "This is the closest mapped landmark or place near the hotspot center. It is useful as a navigation anchor.",
    },
    statusNote: "Live Earth Engine candidates are active on the page.",
    statusHelp:
      "The interface is connected to the local backend and the current queue is built from live Earth Engine methane candidates.",
  },
  ru: {
    methaneUplift: "Рост метана",
    thermalContext: "Ночной термоконтекст (72 часа)",
    evidenceSource: "Источник данных",
    baselineWindow: "Базовое окно сравнения",
    verificationArea: "Район проверки",
    nearestAddress: "Ближайший адрес",
    nearestLandmark: "Ближайший ориентир",
    noThermalContext: "Свежих ночных срабатываний нет",
    noImpact: "В живом скрининге не оценивается",
    notAvailable: "Недоступно",
    notMappedNearby: "Рядом нет подходящего адреса или объекта",
    detections: "ночных срабатываний",
    hints: {
      methaneUplift:
        "Это сравнение текущей сцены CH4 с базовым уровнем для выбранной живой точки наблюдения.",
      thermalContext:
        "Это число ночных VIIRS-срабатываний в радиусе 25 км за последние 72 часа. Это контекст, а не доказательство точного источника.",
      evidenceSource:
        "Здесь видно, из каких живых слоёв данных собран текущий кандидат на странице.",
      baselineWindow:
        "Здесь видно, какое историческое окно сравнения использовалось для оценки отклонения текущего CH4.",
      verificationArea:
        "Это ближайший район или локальная зона вокруг центра hotspot, чтобы команде было проще планировать выезд.",
      nearestAddress:
        "Это ближайший адрес рядом с центром hotspot. Это навигационная подсказка, а не доказательство точного источника.",
      nearestLandmark:
        "Это ближайший ориентир или отмеченный на карте объект рядом с центром hotspot. Его удобно использовать как точку привязки.",
    },
    statusNote: "На странице активна живая очередь Earth Engine-кандидатов.",
    statusHelp:
      "Интерфейс подключён к локальному backend, а текущая очередь построена из живых methane-кандидатов Earth Engine.",
  },
} as const;

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
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>(
    fallbackPipelineStatus(fallback.anomalies.length),
  );
  const [selectedAnomalyId, setSelectedAnomalyId] = useState(fallback.anomalies[0]?.id ?? "");
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<null | string>(null);
  const [mapReactionToken, setMapReactionToken] = useState(0);
  const [mapReactionActive, setMapReactionActive] = useState(false);
  const [mapReactionDotId, setMapReactionDotId] = useState("");
  const [activeMapPresetId, setActiveMapPresetId] = useState<MapPresetId>("all-kazakhstan");

  const t = copy[locale];
  const screeningText = screeningCopy[locale];
  const mapCardText = mapCardCopy[locale];
  const liveSignalText = liveSignalCopy[locale];

  function applyDashboardHydration(
    state: DashboardHydrationState,
    nextPipelineStatus?: PipelineStatus,
  ) {
    startTransition(() => {
      setDashboardSource(state.source);
      setKpiCards(state.kpis);
      setAnomalies(state.anomalies);
      setIncidents(state.incidents);
      if (nextPipelineStatus) {
        setPipelineStatus(nextPipelineStatus);
      }
      setSelectedAnomalyId((current) => {
        const exists = state.anomalies.some((item) => item.id === current);
        return exists ? current : state.anomalies[0]?.id ?? "";
      });
      setLoadingDashboard(false);
    });
  }

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
    if (!mapReactionActive) return;

    const timer = window.setTimeout(() => {
      setMapReactionActive(false);
      setMapReactionDotId("");
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [mapReactionActive, mapReactionToken]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateDashboard() {
      const state = await loadDashboardState();
      const nextPipelineStatus = await loadPipelineStatus(state.anomalies.length);
      if (cancelled) return;
      applyDashboardHydration(state, nextPipelineStatus);
    }

    void hydrateDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableMapPresets = MAP_PRESETS.filter(
    (preset) => !preset.region || anomalies.some((anomaly) => anomaly.region === preset.region),
  );
  const activeMapPreset =
    availableMapPresets.find((preset) => preset.id === activeMapPresetId) ?? availableMapPresets[0] ?? MAP_PRESETS[0];
  const visibleAnomalies =
    activeMapPreset.region === null
      ? anomalies
      : anomalies.filter((anomaly) => anomaly.region === activeMapPreset.region);
  const scopedAnomalies = visibleAnomalies.length > 0 ? visibleAnomalies : anomalies;
  const strongestAnomaly =
    scopedAnomalies.length > 0
      ? scopedAnomalies.reduce((best, current) =>
          current.signalScore > best.signalScore ? current : best,
        )
      : null;

  const selectedAnomaly =
    scopedAnomalies.find((item) => item.id === selectedAnomalyId) ?? strongestAnomaly ?? null;

  const activeIncident =
    selectedAnomaly?.linkedIncidentId && incidents[selectedAnomaly.linkedIncidentId]
      ? incidents[selectedAnomaly.linkedIncidentId]
      : undefined;
  const liveSignalSelected = Boolean(
    selectedAnomaly?.evidenceSource && selectedAnomaly?.methaneDeltaPpb !== undefined,
  );
  const translatedVerificationArea =
    liveSignalSelected && selectedAnomaly?.verificationArea
      ? formatVerificationAreaLabel(selectedAnomaly.verificationArea, selectedAnomaly.region, locale)
      : liveSignalText.notMappedNearby;
  const translatedNearestAddress =
    liveSignalSelected && selectedAnomaly?.nearestAddress
      ? translateAdministrativeLabel(selectedAnomaly.nearestAddress, locale)
      : liveSignalText.notMappedNearby;
  const translatedNearestLandmark =
    liveSignalSelected && selectedAnomaly?.nearestLandmark
      ? translateAdministrativeLabel(selectedAnomaly.nearestLandmark, locale)
      : liveSignalText.notMappedNearby;

  const completedTasks = activeIncident
    ? activeIncident.tasks.filter((task) => task.status === "done").length
    : 0;

  const progressPercent = activeIncident
    ? Math.round((completedTasks / Math.max(activeIncident.tasks.length, 1)) * 100)
    : 0;

  const localizedReportSections =
    selectedAnomaly && activeIncident
      ? buildReportSectionsForUi(selectedAnomaly, activeIncident, completedTasks, locale)
      : [];
  const faqItems = t.faq.items.map((item) => {
    if (item.id === "impact" && pipelineStatus.source === "gee" && pipelineStatus.state === "ready") {
      return locale === "ru"
        ? {
            ...item,
            question: "Что теперь показывает второй ключевой показатель?",
            answer: [
              "В живом режиме экран больше не подставляет искусственный tCO2e для каждой подозрительной зоны.",
              "Вместо этого сайт показывает реальные метрики из текущего ingest: рост метана относительно базового уровня и ночной термоконтекст VIIRS рядом с точкой наблюдения.",
              "Так интерфейс остаётся честным: он показывает то, что реально измерено живым скринингом, а не расчёт, которого в текущем pipeline пока нет.",
            ],
          }
        : {
            ...item,
            question: "What does the second key metric show now?",
            answer: [
              "In live mode the page no longer inserts a synthetic tCO2e value for every suspected zone.",
              "Instead it shows real metrics from the current ingest: methane uplift versus baseline and the nearby VIIRS night-time thermal context.",
              "This keeps the interface honest: it shows what the live screening layer actually measures instead of a number the current pipeline does not calculate yet.",
            ],
          };
    }

    if (item.id === "demo" && pipelineStatus.source === "gee" && pipelineStatus.state === "ready") {
      return locale === "ru"
        ? {
            ...item,
            question: "Это уже живые данные или демо-режим?",
            answer: [
              "Если backend подключён и Earth Engine sync прошёл успешно, левая очередь строится из живых Earth Engine-кандидатов.",
              "При этом workflow по инцидентам, задачам и отчетам по-прежнему остаётся управляемым вручную, чтобы demo loop был стабильным.",
              "Если живое обновление недоступно, экран честно возвращается к демонстрационным данным.",
            ],
          }
        : {
            ...item,
            question: "Is this live data or demo mode?",
            answer: [
              "When the backend is connected and Earth Engine sync succeeds, the left queue is built from live Earth Engine candidates.",
              "The incident, task, and report workflow still stays manually controlled so the demo loop remains stable.",
              "If live sync is unavailable, the page honestly falls back to seeded demo content.",
            ],
          };
    }

    return item;
  });
  const screeningSnapshot = pipelineStatus.screeningSnapshot;
  const mapCardTone: MapCardTone =
    pipelineStatus.source === "seeded"
      ? "seeded"
      : pipelineStatus.state === "ready" && screeningSnapshot?.freshness === "fresh"
        ? "live"
        : "fallback";
  const mapContextLabel =
    mapCardTone === "live"
      ? mapCardText.contextLive
      : mapCardTone === "fallback"
        ? mapCardText.contextFallback
        : mapCardText.contextSeeded;
  const mapNote =
    mapCardTone === "live"
      ? mapCardText.noteLive
      : mapCardTone === "fallback"
        ? pipelineStatus.state === "error"
          ? mapCardText.noteUnavailable
          : mapCardText.noteDegraded
        : mapCardText.noteSeeded;
  const mapSyncLabel =
    mapCardTone === "fallback"
      ? screeningSnapshot?.lastSuccessfulSyncAt
        ? mapSyncLabelCopy[locale].verified
        : mapSyncLabelCopy[locale].attempted
      : screeningText.synced;
  const mapSyncValue =
    mapCardTone === "fallback"
      ? screeningSnapshot?.lastSuccessfulSyncAt ??
        screeningSnapshot?.syncedAt ??
        screeningText.notAvailable
      : screeningSnapshot?.syncedAt ?? screeningText.notAvailable;
  const statusHelpText =
    dashboardSource === "api" && pipelineStatus.source === "gee" && pipelineStatus.state === "ready"
      ? liveSignalText.statusHelp
      : t.help.demo;
  const statusNote =
    dashboardSource === "api"
      ? pipelineStatus.source === "gee" && pipelineStatus.state === "ready"
        ? liveSignalText.statusNote
        : t.status.apiNote
      : t.status.fallbackNote;

  useEffect(() => {
    if (scopedAnomalies.length === 0) return;
    if (scopedAnomalies.some((anomaly) => anomaly.id === selectedAnomalyId)) return;
    setSelectedAnomalyId(strongestAnomaly?.id ?? scopedAnomalies[0]?.id ?? "");
  }, [scopedAnomalies, selectedAnomalyId, strongestAnomaly]);

  const runPipelineSync = async (source: "gee" | "seeded") => {
    if (!hasApiBaseUrl) {
      setRequestError(screeningText.noApi);
      return;
    }

    const actionId = source === "gee" ? "sync-gee" : "sync-seeded";
    const previousPipelineStatus = pipelineStatus;
    setBusyAction(actionId);
    setRequestError(null);
    setPipelineStatus((current) => ({
      ...current,
      state: "syncing",
      statusMessage:
        source === "gee"
          ? screeningText.syncingGee
          : screeningText.syncingSeeded,
    }));

    try {
      const nextStatus = await syncPipeline(source);
      const refreshedState = await loadDashboardState();
      if (refreshedState.source === "api") {
        applyDashboardHydration(refreshedState, nextStatus);
      } else {
        startTransition(() => {
          setDashboardSource("api");
          setPipelineStatus(nextStatus);
        });
      }
      if (nextStatus.state !== "ready") {
        setMapReactionActive(false);
        setMapReactionDotId("");
        setRequestError(translatePipelineStatusMessage(nextStatus.statusMessage, locale));
      } else if (source === "gee" && nextStatus.screeningSnapshot?.freshness === "fresh") {
        setMapReactionDotId(selectedAnomaly?.id ?? strongestAnomaly?.id ?? "");
        setMapReactionToken((current) => current + 1);
        setMapReactionActive(true);
      } else {
        setMapReactionActive(false);
        setMapReactionDotId("");
      }
    } catch {
      setMapReactionActive(false);
      setMapReactionDotId("");
      setRequestError(
        source === "gee"
          ? screeningText.syncFailedGee
          : screeningText.syncFailedSeeded,
      );
      setPipelineStatus(previousPipelineStatus);
    } finally {
      setBusyAction(null);
    }
  };

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
      setRequestError(t.errors.promote);
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
      setRequestError(t.errors.task);
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
      setRequestError(t.errors.report);
    } finally {
      setBusyAction(null);
    }
  };

  const exportReportArtifact = async (format: ReportExportFormat) => {
    if (!activeIncident || !selectedAnomaly) return;

    const actionId = `export-${activeIncident.id}-${format}`;
    setBusyAction(actionId);
    setRequestError(null);

    try {
      if (dashboardSource !== "api" || !hasApiBaseUrl) {
        if (format !== "html") {
          throw new Error("Binary report export requires API mode");
        }

        const html = buildReportHtml(selectedAnomaly, activeIncident, localizedReportSections, locale);
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${activeIncident.id.toLowerCase()}-mrv-report.html`;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      const downloaded = await downloadReport(activeIncident.id, format, locale);
      const blob = downloaded.blob;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloaded.fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setRequestError(t.errors.export);
    } finally {
      setBusyAction(null);
    }
  };

  const openPrintView = () => {
    if (!activeIncident || !selectedAnomaly) return;
    if (dashboardSource === "api") {
      const reportViewUrl = getReportViewUrl(activeIncident.id, true, locale);
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

  const changeMapPreset = (presetId: MapPresetId) => {
    setActiveMapPresetId(presetId);
    setRequestError(null);
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
            reportSections: buildReportSectionsForUi(anomaly, existing, doneCount, locale),
          },
        };
      });
    });
  }

  if (!selectedAnomaly) {
    return (
      <main className="site-shell">
        <section className="empty-shell">
          <p>{t.errors.noSignal}</p>
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
            onClick={() => workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
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
              <div className="status-title">
                <strong>
                  {loadingDashboard
                    ? t.status.loading
                    : dashboardSource === "api"
                      ? t.status.api
                      : t.status.fallback}
                </strong>
                <HelpHint text={statusHelpText} />
              </div>
              <p>{statusNote}</p>
            </div>
          </section>
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
            {scopedAnomalies.map((anomaly) => {
              const incident = anomaly.linkedIncidentId ? incidents[anomaly.linkedIncidentId] : undefined;
              const severityHint =
                anomaly.severity === "high"
                  ? t.help.severityUrgent
                  : anomaly.severity === "medium"
                    ? t.help.severityCheck
                    : t.help.severityWatch;
              return (
                <div
                  aria-pressed={anomaly.id === selectedAnomaly.id}
                  className={`signal-card ${anomaly.id === selectedAnomaly.id ? "signal-card-active" : ""}`}
                  key={anomaly.id}
                  onClick={() => changeSelectedAnomaly(anomaly.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      changeSelectedAnomaly(anomaly.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="signal-card-top">
                    <div className="severity-badge-wrap">
                      <span className={`severity-badge ${severityTone[anomaly.severity]}`}>
                        {severityLabel[locale][anomaly.severity]}
                      </span>
                      <HelpHint text={severityHint} />
                    </div>
                    <span>{formatTimestamp(anomaly.detectedAt, locale)}</span>
                  </div>
                  <strong>{translateAssetName(anomaly.assetName, locale)}</strong>
                  <p>{translateRegion(anomaly.region, locale)}</p>
                  <div className="signal-card-bottom">
                    <span>
                      {t.summary.score} {anomaly.signalScore}
                    </span>
                    <span>
                      {incident ? incidentStatusLabel[locale][incident.status] : t.summary.screening}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rail-footer">
            <span>{t.queue.top}</span>
            <strong>
              {translateAssetName(strongestAnomaly?.assetName ?? selectedAnomaly.assetName, locale)}
            </strong>
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
                <MetricCard
                  hint={t.help.score}
                  label={t.summary.score}
                  value={`${selectedAnomaly.signalScore} / 100`}
                />
                <MetricCard
                  hint={liveSignalSelected ? liveSignalText.hints.thermalContext : t.help.impact}
                  label={liveSignalSelected ? liveSignalText.thermalContext : t.stats.impact}
                  value={
                    liveSignalSelected
                      ? formatThermalContext(selectedAnomaly, locale, liveSignalText)
                      : formatPotentialImpact(selectedAnomaly, locale, liveSignalText.noImpact)
                  }
                />
                <MetricCard
                  hint={t.help.detected}
                  label={t.summary.detected}
                  value={formatTimestamp(selectedAnomaly.detectedAt, locale)}
                />
                <MetricCard
                  hint={t.help.confidence}
                  label={t.summary.confidence}
                  value={translateConfidence(selectedAnomaly.confidence, locale)}
                />
              </section>

              {screeningSnapshot ? (
                <section className="evidence-detail-card">
                  <div className="section-head">
                    <FieldLabel label={screeningText.title} />
                    <div className="evidence-badge-row">
                      <span
                        className={`evidence-badge evidence-badge-${screeningSnapshot.freshness}`}
                      >
                        {screeningText.freshness[screeningSnapshot.freshness]}
                      </span>
                      <span className="evidence-badge evidence-badge-level">
                        {screeningText.levelLabel[screeningSnapshot.screeningLevel]}
                      </span>
                    </div>
                  </div>

                  <p className="evidence-summary-note">{screeningText.subtitle}</p>

                  <section className="metric-grid evidence-inner-grid">
                    <MetricCard
                      label={screeningText.current}
                      hint={screeningText.help.current}
                      value={formatPpb(screeningSnapshot.currentCh4Ppb, screeningText.notAvailable, locale)}
                    />
                    <MetricCard
                      label={screeningText.baseline}
                      hint={screeningText.help.baseline}
                      value={formatPpb(screeningSnapshot.baselineCh4Ppb, screeningText.notAvailable, locale)}
                    />
                    <MetricCard
                      label={screeningText.delta}
                      hint={screeningText.help.delta}
                      value={formatDelta(screeningSnapshot, screeningText.notAvailable, locale)}
                    />
                    <MetricCard
                      label={screeningText.level}
                      hint={screeningText.help.level}
                      value={screeningText.levelLabel[screeningSnapshot.screeningLevel]}
                    />
                  </section>

                  <section className="signal-focus evidence-detail-grid">
                    <InfoRow
                      label={screeningText.source}
                      value={translateScreeningEvidenceSource(screeningSnapshot.evidenceSource, locale)}
                    />
                    <InfoRow
                      label={screeningText.synced}
                      value={screeningSnapshot.syncedAt ?? screeningText.notAvailable}
                    />
                    <InfoRow
                      label={screeningText.observed}
                      value={
                        screeningSnapshot.observedWindow
                          ? translateScreeningObservedWindow(screeningSnapshot.observedWindow, locale)
                          : screeningText.notAvailable
                      }
                    />
                    <InfoRow
                      className="info-row-wide"
                      label={screeningText.recommendation}
                      value={translateScreeningRecommendation(screeningSnapshot.recommendedAction, locale)}
                    />
                  </section>
                </section>
              ) : null}

              <section className="signal-focus">
                <InfoRow label={t.summary.region} value={translateRegion(selectedAnomaly.region, locale)} />
                <InfoRow
                  hint={t.help.coordinates}
                  label={t.summary.coordinates}
                  value={selectedAnomaly.coordinates}
                />
                {liveSignalSelected ? (
                  <InfoRow
                    hint={t.help.verificationArea}
                    label={t.summary.verificationArea}
                    value={translatedVerificationArea}
                  />
                ) : null}
                {liveSignalSelected ? (
                  <InfoRow
                    hint={t.help.nearestAddress}
                    label={t.summary.nearestAddress}
                    value={translatedNearestAddress}
                  />
                ) : null}
                {liveSignalSelected ? (
                  <InfoRow
                    hint={t.help.nearestLandmark}
                    label={t.summary.nearestLandmark}
                    value={translatedNearestLandmark}
                  />
                ) : null}
                <InfoRow label={t.panels.assets} value={translateAssetName(selectedAnomaly.assetName, locale)} />
                {!liveSignalSelected ? (
                  <InfoRow label={t.summary.facility} value={translateFacility(selectedAnomaly.facilityType, locale)} />
                ) : null}
                {!liveSignalSelected ? (
                  <InfoRow label="CO2e" value={formatPotentialImpact(selectedAnomaly, locale, liveSignalText.noImpact)} />
                ) : null}
              </section>

              <section className="map-card">
                <div className="section-head">
                  <div>
                    <FieldLabel hint={t.help.map} label={t.panels.map} />
                    <strong>{activeMapPreset.label[locale]}</strong>
                  </div>
                  <span className={`map-context-badge map-context-badge-${mapCardTone}`}>
                    {mapContextLabel}
                  </span>
                </div>
                <div className="map-preset-strip" role="tablist" aria-label="Map region presets">
                  {availableMapPresets.map((preset) => (
                    <button
                      key={preset.id}
                      className={`map-preset-button ${preset.id === activeMapPreset.id ? "map-preset-button-active" : ""}`}
                      onClick={() => changeMapPreset(preset.id)}
                      type="button"
                    >
                      {preset.label[locale]}
                    </button>
                  ))}
                </div>
                <div className={`map-evidence-strip map-evidence-strip-${mapCardTone}`}>
                  <article>
                    <span>{screeningText.current}</span>
                    <strong>{formatPpb(screeningSnapshot?.currentCh4Ppb, screeningText.notAvailable, locale)}</strong>
                  </article>
                  <article>
                    <span>{screeningText.baseline}</span>
                    <strong>{formatPpb(screeningSnapshot?.baselineCh4Ppb, screeningText.notAvailable, locale)}</strong>
                  </article>
                  <article>
                    <span>{screeningText.delta}</span>
                    <strong>
                      {screeningSnapshot
                        ? formatDelta(screeningSnapshot, screeningText.notAvailable, locale)
                        : screeningText.notAvailable}
                    </strong>
                  </article>
                  <article>
                    <span>{mapSyncLabel}</span>
                    <strong>{mapSyncValue}</strong>
                  </article>
                </div>
                <p className="map-note">{mapNote}</p>
                <AnomalyMap
                  anomalies={scopedAnomalies}
                  liveReactionAnomalyId={mapReactionActive ? mapReactionDotId : undefined}
                  locale={locale}
                  onPrimaryAction={() => void promoteToIncident()}
                  onSelectAnomaly={changeSelectedAnomaly}
                  primaryActionDisabled={busyAction === "promote"}
                  primaryActionLabel={
                    selectedAnomaly.linkedIncidentId
                      ? t.actions.openIncident
                      : busyAction === "promote"
                        ? t.actions.promoting
                        : t.actions.promote
                  }
                  selectedAnomalyId={selectedAnomaly.id}
                  tone={mapCardTone}
                />
              </section>

              <div className="panel-actions panel-actions-wrap">
                <div className="action-with-hint">
                  <HelpHint text={t.help.syncEvidence} />
                  <button
                    className="secondary-button"
                    disabled={busyAction === "sync-gee" || !hasApiBaseUrl}
                    onClick={() => void runPipelineSync("gee")}
                    type="button"
                  >
                    {busyAction === "sync-gee" ? screeningText.syncing : screeningText.sync}
                  </button>
                </div>
                <div className="action-with-hint">
                  <HelpHint text={t.help.resetSeeded} />
                  <button
                    className="secondary-button"
                    disabled={busyAction === "sync-seeded" || !hasApiBaseUrl}
                    onClick={() => void runPipelineSync("seeded")}
                    type="button"
                  >
                    {busyAction === "sync-seeded" ? screeningText.resetting : screeningText.reset}
                  </button>
                </div>
                <div className="action-with-hint">
                  <HelpHint
                    text={
                      selectedAnomaly.linkedIncidentId
                        ? t.help.openIncidentAction
                        : t.help.createIncidentAction
                    }
                  />
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
            </div>
          ) : null}

          {activeStep === "incident" ? (
            activeIncident ? (
              <div className="panel-body">
                <section className="metric-grid">
                  <MetricCard label={t.summary.owner} value={translateOwner(activeIncident.owner, locale)} />
                  <MetricCard label={t.summary.priority} value={activeIncident.priority} />
                  <MetricCard
                    label={t.summary.window}
                    value={translateWindow(activeIncident.verificationWindow, locale)}
                  />
                  <MetricCard
                    label={t.summary.progress}
                    value={formatTaskProgress(completedTasks, activeIncident.tasks.length, locale)}
                  />
                </section>

                <section className="incident-hero">
                  <div className="incident-copy">
                    <FieldLabel label={t.panels.incidentNarrative} />
                    <strong>{translateAnomalySummary(selectedAnomaly.summary, locale)}</strong>
                    <p>{translateIncidentNarrative(activeIncident.narrative, locale)}</p>
                  </div>
                </section>

                <section className="signal-focus">
                  <InfoRow label={t.panels.assets} value={translateAssetName(selectedAnomaly.assetName, locale)} />
                  <InfoRow label={t.summary.region} value={translateRegion(selectedAnomaly.region, locale)} />
                  <InfoRow
                    hint={t.help.coordinates}
                    label={t.summary.coordinates}
                    value={selectedAnomaly.coordinates}
                  />
                  {liveSignalSelected ? (
                    <InfoRow
                      hint={t.help.verificationArea}
                      label={t.summary.verificationArea}
                      value={translatedVerificationArea}
                    />
                  ) : null}
                  {liveSignalSelected ? (
                    <InfoRow
                      hint={t.help.nearestAddress}
                      label={t.summary.nearestAddress}
                      value={translatedNearestAddress}
                    />
                  ) : null}
                  {liveSignalSelected ? (
                    <InfoRow
                      hint={t.help.nearestLandmark}
                      label={t.summary.nearestLandmark}
                      value={translatedNearestLandmark}
                    />
                  ) : null}
                  <InfoRow
                    label={t.summary.recommendation}
                    value={translateRecommendedAction(selectedAnomaly.recommendedAction, locale)}
                  />
                </section>

                <div className="panel-actions panel-actions-wrap">
                  <button className="primary-button" onClick={() => setActiveStep("verification")} type="button">
                    {t.actions.openVerification}
                  </button>
                  <button className="secondary-button" onClick={() => setActiveStep("signal")} type="button">
                    {t.actions.backToSignal}
                  </button>
                </div>
              </div>
            ) : (
              <EmptyStage title={t.panels.noIncident} subtitle={t.panels.noIncidentHint} />
            )
          ) : null}

          {activeStep === "verification" ? (
            activeIncident ? (
              <div className="panel-body">
                <section className="progress-card">
                  <div className="progress-head">
                    <div>
                      <FieldLabel label={t.summary.tasks} />
                      <strong>{formatTaskProgress(completedTasks, activeIncident.tasks.length, locale)}</strong>
                    </div>
                    <b>{incidentStatusLabel[locale][activeIncident.status]}</b>
                  </div>
                  <div className="progress-track">
                    <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
                  </div>
                </section>

                <section className="task-list">
                  {activeIncident.tasks.map((task) => (
                    <TaskRow
                      busy={busyAction === task.id}
                      key={task.id}
                      locale={locale}
                      onComplete={() => void markTaskDone(task.id)}
                      task={task}
                    />
                  ))}
                </section>

                <section className="signal-focus">
                  <InfoRow label={t.summary.owner} value={translateOwner(activeIncident.owner, locale)} />
                  <InfoRow
                    label={t.summary.window}
                    value={translateWindow(activeIncident.verificationWindow, locale)}
                  />
                  <InfoRow
                    label={t.summary.confidence}
                    value={translateConfidence(selectedAnomaly.confidence, locale)}
                  />
                  <InfoRow
                    label={t.summary.recommendation}
                    value={translateRecommendedAction(selectedAnomaly.recommendedAction, locale)}
                  />
                </section>

                <div className="panel-actions panel-actions-wrap">
                  <button
                    className="primary-button"
                    disabled={busyAction === `report-${activeIncident.id}`}
                    onClick={() => void generateReport()}
                    type="button"
                  >
                    {busyAction === `report-${activeIncident.id}` ? t.actions.generating : t.actions.generateReport}
                  </button>
                  <button className="secondary-button" onClick={() => setActiveStep("incident")} type="button">
                    {t.actions.openIncident}
                  </button>
                </div>
              </div>
            ) : (
              <EmptyStage title={t.panels.noIncident} subtitle={t.panels.noIncidentHint} />
            )
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
                  <MetricCard
                    label={t.summary.reportSections}
                    value={String(localizedReportSections.length || 0)}
                  />
                  <MetricCard label={t.summary.owner} value={translateOwner(activeIncident.owner, locale)} />
                  <MetricCard
                    label={t.summary.progress}
                    value={formatTaskProgress(completedTasks, activeIncident.tasks.length, locale)}
                  />
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
                  {dashboardSource === "api" ? (
                    <>
                      <button
                        className="secondary-button"
                        disabled={busyAction === `export-${activeIncident.id}-pdf`}
                        onClick={() => void exportReportArtifact("pdf")}
                        type="button"
                      >
                        {busyAction === `export-${activeIncident.id}-pdf` ? t.actions.exporting : t.actions.downloadPdf}
                      </button>
                      <button
                        className="secondary-button"
                        disabled={busyAction === `export-${activeIncident.id}-docx`}
                        onClick={() => void exportReportArtifact("docx")}
                        type="button"
                      >
                        {busyAction === `export-${activeIncident.id}-docx` ? t.actions.exporting : t.actions.downloadWord}
                      </button>
                    </>
                  ) : (
                    <button
                      className="secondary-button"
                      disabled={busyAction === `export-${activeIncident.id}-html`}
                      onClick={() => void exportReportArtifact("html")}
                      type="button"
                    >
                      {busyAction === `export-${activeIncident.id}-html` ? t.actions.exporting : t.actions.downloadHtml}
                    </button>
                  )}
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
          {faqItems.map((item) => (
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

function buildReportSectionsForUi(
  anomaly: Anomaly,
  incident: Incident,
  completedTasks: number,
  locale: Locale,
): ReportSection[] {
  const liveSignal = anomaly.co2eTonnes === undefined;
  const deltaPpb = anomaly.methaneDeltaPpb ?? 0;
  const thermalHits = anomaly.nightThermalHits72h ?? anomaly.thermalHits72h ?? 0;

  if (locale === "ru") {
    return [
      {
        title: "Что увидели",
        body: liveSignal
          ? thermalHits > 0
            ? `Живой спутниковый скрининг отметил зону ${translateAssetName(anomaly.assetName, locale)} в регионе ${translateRegion(anomaly.region, locale)} с ростом метана на ${deltaPpb.toFixed(2)} ppb (${anomaly.methaneDeltaPct.toFixed(2)}%) и ${thermalHits} ночными VIIRS-срабатываниями в радиусе 25 км.`
            : `Живой спутниковый скрининг отметил зону ${translateAssetName(anomaly.assetName, locale)} в регионе ${translateRegion(anomaly.region, locale)} с ростом метана на ${deltaPpb.toFixed(2)} ppb (${anomaly.methaneDeltaPct.toFixed(2)}%) без недавних ночных VIIRS-срабатываний в радиусе 25 км.`
          : `Спутниковый разбор отметил объект ${translateAssetName(anomaly.assetName, locale)} в регионе ${translateRegion(anomaly.region, locale)} с ростом метана на ${anomaly.methaneDeltaPct}% и ${anomaly.flareHours ?? 0} часами факельной активности.`,
      },
      {
        title: "Кто отвечает",
        body: `${translateOwner(incident.owner, locale)} ведёт этот кейс с приоритетом ${incident.priority} и сроком реакции ${translateWindow(incident.verificationWindow, locale).toLowerCase()}.`,
      },
      {
        title: "Как продвигается проверка",
        body: liveSignal
          ? `Выполнено ${completedTasks} из ${incident.tasks.length} задач. Живая очередь пока не переводит эту подозрительную зону в tCO2e: она честно ранжирует кейсы по росту метана и тепловому контексту рядом с точкой наблюдения.`
          : `Выполнено ${completedTasks} из ${incident.tasks.length} задач. Текущая оценка возможного эффекта составляет ${anomaly.co2eTonnes ?? 0} tCO2e.`,
      },
    ];
  }

  return [
    {
      title: "What was observed",
      body: liveSignal
        ? thermalHits > 0
          ? `Live satellite screening flagged ${translateAssetName(anomaly.assetName, locale)} in ${translateRegion(anomaly.region, locale)} with ${deltaPpb.toFixed(2)} ppb (${anomaly.methaneDeltaPct.toFixed(2)}%) methane uplift and ${thermalHits} night-time VIIRS detections inside the 25 km context window.`
          : `Live satellite screening flagged ${translateAssetName(anomaly.assetName, locale)} in ${translateRegion(anomaly.region, locale)} with ${deltaPpb.toFixed(2)} ppb (${anomaly.methaneDeltaPct.toFixed(2)}%) methane uplift and no recent night-time VIIRS detections inside the 25 km context window.`
        : `Satellite review flagged ${translateAssetName(anomaly.assetName, locale)} in ${translateRegion(anomaly.region, locale)} with ${anomaly.methaneDeltaPct}% methane uplift and ${anomaly.flareHours ?? 0} hours of flare activity.`,
    },
    {
      title: "Who owns the case",
      body: `${translateOwner(incident.owner, locale)} owns this case under ${incident.priority} priority with a ${translateWindow(incident.verificationWindow, locale).toLowerCase()} response window.`,
    },
    {
      title: "How verification is progressing",
      body: liveSignal
        ? `${completedTasks} of ${incident.tasks.length} tasks are complete. This live queue does not estimate tCO2e yet; it ranks the case by methane uplift and nearby thermal context.`
        : `${completedTasks} of ${incident.tasks.length} tasks are complete. The current estimated impact is ${anomaly.co2eTonnes ?? 0} tCO2e.`,
    },
  ];
}

function formatPotentialImpact(anomaly: Anomaly, locale: Locale, emptyLabel: string) {
  if (anomaly.co2eTonnes === undefined) {
    return emptyLabel;
  }

  return `${formatMetricNumber(anomaly.co2eTonnes, locale)} tCO2e`;
}

function formatMethaneUplift(anomaly: Anomaly, locale: Locale, emptyLabel: string) {
  if (anomaly.methaneDeltaPpb === undefined) {
    return emptyLabel;
  }

  return `${formatMetricNumber(anomaly.methaneDeltaPpb, locale)} ppb / ${formatMetricNumber(anomaly.methaneDeltaPct, locale)}%`;
}

function formatThermalContext(
  anomaly: Anomaly,
  locale: Locale,
  labels: (typeof liveSignalCopy)[Locale],
) {
  const hits = anomaly.nightThermalHits72h ?? anomaly.thermalHits72h;
  if (hits === undefined) {
    return labels.notAvailable;
  }
  if (hits === 0) {
    return labels.noThermalContext;
  }
  return `${hits} ${labels.detections}`;
}

function formatPpb(value: number | undefined, emptyLabel: string, locale: Locale) {
  if (value === undefined) {
    return emptyLabel;
  }

  return `${formatMetricNumber(value, locale)} ppb`;
}

function formatDelta(snapshot: ScreeningEvidenceSnapshot, emptyLabel: string, locale: Locale) {
  if (snapshot.deltaAbsPpb === undefined && snapshot.deltaPct === undefined) {
    return emptyLabel;
  }

  const unit = "ppb";
  const absPart =
    snapshot.deltaAbsPpb === undefined ? "" : `${formatMetricNumber(snapshot.deltaAbsPpb, locale)} ${unit}`;
  const pctPart = snapshot.deltaPct === undefined ? "" : `${formatMetricNumber(snapshot.deltaPct, locale)}%`;

  if (absPart && pctPart) {
    return `${absPart} / ${pctPart}`;
  }

  return absPart || pctPart;
}

function formatMetricNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="metric-card">
      <FieldLabel hint={hint} label={label} />
      <strong>{value}</strong>
    </article>
  );
}

function InfoRow({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <article className={className ? `info-row ${className}` : "info-row"}>
      <FieldLabel hint={hint} label={label} />
      <strong>{value}</strong>
    </article>
  );
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="label-line">
      <span>{label}</span>
      {hint ? <HelpHint text={hint} /> : null}
    </span>
  );
}

function HelpHint({ text }: { text: string }) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [popoverLayout, setPopoverLayout] = useState({
    left: 12,
    top: 0,
    width: 280,
    placement: "bottom" as "top" | "bottom",
  });

  const isOpen = isHovered || isFocused || isPinned;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !buttonRef.current || typeof window === "undefined") return;

    const updatePosition = () => {
      if (!buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const width = Math.min(280, Math.max(window.innerWidth - 24, 180));
      const left = Math.min(
        Math.max(rect.left + rect.width / 2 - width / 2, 12),
        window.innerWidth - width - 12,
      );
      const placeAbove = rect.bottom + 170 > window.innerHeight && rect.top > 150;

      setPopoverLayout({
        left,
        top: placeAbove ? rect.top : rect.bottom,
        width,
        placement: placeAbove ? "top" : "bottom",
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  return (
    <>
      <button
        aria-expanded={isOpen}
        aria-label={text}
        className="help-hint"
        onBlur={() => {
          setIsFocused(false);
          setIsPinned(false);
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsPinned((current) => !current);
        }}
        onFocus={() => setIsFocused(true)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") {
            setIsPinned(false);
            setIsFocused(false);
            buttonRef.current?.blur();
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        ref={buttonRef}
        type="button"
      >
        <QuestionIcon />
      </button>
      {isMounted && isOpen
        ? createPortal(
            <span
              className={`help-popover help-popover-${popoverLayout.placement}`}
              role="tooltip"
              style={{
                left: `${popoverLayout.left}px`,
                top: `${popoverLayout.top}px`,
                width: `${popoverLayout.width}px`,
              }}
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </>
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
        <small>{formatHours(task.etaHours, locale)}</small>
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
        `<li><strong>${escapeHtml(translateTaskTitle(task.title, locale))}</strong> - ${escapeHtml(translateOwner(task.owner, locale))} - ${escapeHtml(formatHours(task.etaHours, locale))}</li>`,
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

  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(labels.title)}</title><style>:root{color-scheme:light;}body{margin:0;padding:40px;font-family:Aptos,"Segoe UI",sans-serif;color:#1f2933;background:#f6f1e8;}main{max-width:860px;margin:0 auto;padding:36px;border:1px solid #d7d0c4;background:#fffdfa;}h1,h2,h3{margin:0;}h1{font-family:"Iowan Old Style",Georgia,serif;font-size:2.1rem;letter-spacing:-0.04em;}.meta{margin:24px 0;display:grid;gap:8px;color:#5a6671;}section{margin-top:22px;padding-top:18px;border-top:1px solid #e6dfd4;}p,li{color:#4b5762;line-height:1.7;}ul{padding-left:20px;}</style>${printScript}</head><body><main><h1>${escapeHtml(labels.title)}</h1><div class="meta"><span>${escapeHtml(labels.incident)}: ${escapeHtml(incident.id)}</span><span>${escapeHtml(labels.asset)}: ${escapeHtml(translateAssetName(anomaly.assetName, locale))}</span><span>${escapeHtml(labels.region)}: ${escapeHtml(translateRegion(anomaly.region, locale))}</span><span>${escapeHtml(labels.owner)}: ${escapeHtml(translateOwner(incident.owner, locale))}</span></div>${sectionMarkup}<section><h2>${escapeHtml(labels.tasks)}</h2><ul>${taskItems}</ul></section></main></body></html>`;
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

function QuestionIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M12 3.25a8.75 8.75 0 1 0 0 17.5a8.75 8.75 0 0 0 0-17.5Zm0 14.2a1.05 1.05 0 1 1 0 2.1a1.05 1.05 0 0 1 0-2.1Zm1.52-4.9-.5.34c-.72.49-.97.84-.97 1.61v.33h-1.6v-.43c0-1.25.43-1.93 1.46-2.64l.58-.39c.57-.39.83-.77.83-1.3c0-.87-.67-1.43-1.66-1.43c-1.05 0-1.72.6-1.8 1.63H8.22c.1-1.96 1.6-3.08 3.46-3.08c2 0 3.35 1.15 3.35 2.87c0 1.02-.47 1.82-1.51 2.54Z"
        fill="currentColor"
      />
    </svg>
  );
}
