"use client";

import { type ReactNode, startTransition, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  completeTask as completeTaskRequest,
  createInitialPipelineHistory,
  createInitialPipelineStatus,
  createUnavailableDashboardState,
  type DashboardHydrationState,
  downloadReport,
  generateReport as generateReportRequest,
  hasApiBaseUrl,
  getReportViewUrl,
  loadDashboardState,
  loadPipelineHistory,
  loadPipelineStatus,
  type PipelineHistoryPayload,
  promoteAnomaly as promoteAnomalyRequest,
  type ReportExportFormat,
  syncPipeline,
  type PipelineStatus,
  type ScreeningEvidenceSnapshot,
} from "../lib/api";
import { AnomalyMap } from "../components/anomaly-map";
import { PipelineHistoryPanel } from "../components/pipeline-history-panel";
import {
  type Anomaly,
  type Incident,
  type IncidentTask,
  type ReportSection,
} from "../lib/dashboard-types";
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

type MapCardTone = "live" | "fallback";
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
    contextLive: "Updated screening view",
    contextFallback: "Data refresh required",
    noteLive:
      "The map stays geographically stable. Screening evidence was refreshed for the selected Kazakhstan window.",
    noteDegraded:
      "The last verified screening snapshot is still shown while the current refresh is degraded.",
    noteUnavailable:
      "Real-time screening is unavailable. Refresh Earth Engine data before using this page for decisions.",
  },
  ru: {
    contextLive: "Обновлённый скрининг",
    contextFallback: "Нужно обновление данных",
    noteLive:
      "География карты остаётся стабильной. Данные скрининга обновлены для выбранной зоны Казахстана.",
    noteDegraded:
      "Последний подтверждённый снимок скрининга всё ещё показан, пока новое обновление работает с ограничениями.",
    noteUnavailable:
      "Спутниковый скрининг сейчас недоступен. Перед принятием решений обновите данные Earth Engine.",
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
    noApi: "Data refresh needs the FastAPI backend to be available.",
    syncingGee: "Refreshing satellite screening evidence...",
    syncFailedGee:
      "Data refresh failed. If a verified screening snapshot already exists, the page keeps the last successful version.",
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
      source:
        "This shows which external data source produced the current methane comparison on the page.",
      synced:
        "This is the time when the backend last refreshed this satellite comparison and saved the newest result.",
      observed:
        "This shows which satellite scene was used for the current comparison and against what historical baseline it was checked.",
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
    noApi: "Для обновления нужен доступный сервер FastAPI.",
    syncingGee: "Обновляем спутниковые данные по метану...",
    syncFailedGee:
      "Не удалось обновить спутниковые данные. Если подтверждённый снимок уже был, на странице останется последняя успешная версия.",
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
      source:
        "Здесь видно, из какого внешнего источника пришло текущее спутниковое сравнение метана на странице.",
      synced:
        "Это время последнего обновления, когда backend заново получил спутниковые данные и сохранил текущий результат.",
      observed:
        "Здесь видно, какая спутниковая сцена взята для текущего сравнения и с каким историческим базовым окном она сопоставлялась.",
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
    noImpact: "Not estimated in current screening",
    notAvailable: "Not available",
    notMappedNearby: "No mapped result nearby",
    detections: "night detections",
    hints: {
      methaneUplift:
        "This compares the current CH4 scene with the rolling baseline at the selected candidate point.",
      thermalContext:
        "This counts night-time VIIRS thermal detections within 25 km over the last 72 hours.",
      evidenceSource:
        "This shows which data layers produced the current candidate on the page.",
      baselineWindow:
        "This shows the historical comparison window used to decide whether the current CH4 reading stands out.",
      verificationArea:
        "This narrows the hotspot to the nearest mapped district or local area for field review.",
      nearestAddress:
        "This is the closest mapped address near the hotspot center. It is a route-planning hint, not proof of the exact source.",
      nearestLandmark:
        "This is the closest mapped landmark or place near the hotspot center. It is useful as a navigation anchor.",
    },
    statusNote: "Earth Engine candidates are active on the page.",
    statusHelp:
      "The interface is connected to the local backend and the current queue is built from Earth Engine methane candidates.",
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
    noImpact: "В текущем скрининге не оценивается",
    notAvailable: "Недоступно",
    notMappedNearby: "Рядом нет подходящего адреса или объекта",
    detections: "ночных срабатываний",
    hints: {
      methaneUplift:
        "Это сравнение текущей сцены CH4 с базовым уровнем для выбранной точки наблюдения.",
      thermalContext:
        "Это число ночных VIIRS-срабатываний в радиусе 25 км за последние 72 часа.",
      evidenceSource:
        "Здесь видно, из каких слоёв данных собран текущий кандидат на странице.",
      baselineWindow:
        "Здесь видно, какое историческое окно сравнения использовалось для оценки отклонения текущего CH4.",
      verificationArea:
        "Это ближайший район или локальная зона вокруг центра предполагаемой зоны, чтобы команде было проще планировать выезд.",
      nearestAddress:
        "Это ближайший адрес рядом с центром предполагаемой зоны. Это навигационная подсказка для выездной проверки.",
      nearestLandmark:
        "Это ближайший ориентир или отмеченный на карте объект рядом с центром предполагаемой зоны. Его удобно использовать как точку привязки.",
    },
    statusNote: "На странице активна очередь Earth Engine-кандидатов.",
    statusHelp:
      "Интерфейс подключён к локальному backend, а текущая очередь построена из methane-кандидатов Earth Engine.",
  },
} as const;

const coordinateActionCopy = {
  en: {
    title: "Open location in",
    googleMaps: "Open in Google Maps",
    twoGis: "Open in 2GIS",
  },
  ru: {
    title: "Открыть местоположение в",
    googleMaps: "Открыть в Google Maps",
    twoGis: "Открыть в 2GIS",
  },
} as const;

const valuePanelCopy = {
  en: {
    eyebrow: "Operational value",
    queueLabel: "Review queue",
    openCases: "Open cases",
    strongestUplift: "Strongest CH4 uplift",
    lastSync: "Last refresh",
    defaultScope: "Kazakhstan",
    scopeLabel: "Screening scope",
    bodyWithQueue:
      "Instead of scanning nationwide methane data manually, the team starts from a short queue ranked for field review and case creation.",
    bodyWithoutQueue:
      "The latest refresh did not create a review queue. The team can inspect sync history and refresh the screening window without guessing from an empty map.",
  },
  ru: {
    eyebrow: "Практическая ценность",
    queueLabel: "Очередь на разбор",
    openCases: "Открытые кейсы",
    strongestUplift: "Макс. рост CH4",
    lastSync: "Последнее обновление",
    defaultScope: "Казахстан",
    scopeLabel: "Охват скрининга",
    bodyWithQueue:
      "Вместо ручного просмотра всей страны команда сразу получает короткую очередь, с которой можно начать выездную проверку и открыть рабочий кейс.",
    bodyWithoutQueue:
      "Последнее обновление не сформировало очередь на разбор. Команда всё равно видит историю синхронизаций и может безопасно перезапустить скрининг, не гадая по пустой карте.",
  },
} as const;

const emptyQueueCopy = {
  en: {
    eyebrow: "Review queue",
    title: "No suspected zones were added after the latest refresh",
    body:
      "This is a valid empty result, not a broken screen. Refresh the screening window or wait for the next scheduled run before opening a case.",
    latestRun: "Latest refresh",
    nextRun: "Next scheduled sync",
    serverState: "Backend state",
  },
  ru: {
    eyebrow: "Очередь на разбор",
    title: "После последнего обновления новые подозрительные зоны не появились",
    body:
      "Это нормальный пустой результат, а не поломка интерфейса. Обновите окно скрининга или дождитесь следующей плановой синхронизации, прежде чем открывать кейс.",
    latestRun: "Последнее обновление",
    nextRun: "Следующая плановая синхронизация",
    serverState: "Состояние backend",
  },
} as const;

const pipelineStateCopy = {
  en: {
    ready: "Ready",
    syncing: "Syncing",
    degraded: "Degraded",
    error: "Error",
  },
  ru: {
    ready: "Готово",
    syncing: "Идёт обновление",
    degraded: "С ограничениями",
    error: "Ошибка",
  },
} as const;

const juryUiCopy = {
  en: {
    navSignal: "Zone",
    heroTitle: "Turn methane screening into field cases and MRV reports.",
    heroSubtitle: "Start from a suspected zone, open the case, verify it in the field, and export the result.",
    queueEyebrow: "Suspected zones",
    queueTitle: "Choose a zone for review",
    queueTop: "Top review zone",
    scoreLabel: "Zone priority",
    signalStepTitle: "Selected suspected zone",
    signalStepSubtitle: "Start with the satellite evidence, then confirm the practical field context.",
    readyStatusNote: "The page is showing a current queue of suspected zones for field review.",
    readyStatusHelp:
      "The interface is connected to the backend and the current queue is built from Earth Engine screening results for operational review.",
  },
  ru: {
    navSignal: "Зона",
    heroTitle: "Из спутникового скрининга метана — в полевой кейс и MRV-отчёт.",
    heroSubtitle: "Начните с подозрительной зоны, откройте инцидент, проведите выездную проверку и выгрузите результат.",
    queueEyebrow: "Подозрительные зоны",
    queueTitle: "Выберите зону для разбора",
    queueTop: "Главная зона на разбор",
    scoreLabel: "Приоритет зоны",
    signalStepTitle: "Выбранная подозрительная зона",
    signalStepSubtitle: "Сначала проверьте спутниковые признаки, затем посмотрите географический и операционный контекст.",
    readyStatusNote: "На странице активна текущая очередь подозрительных зон для выездной проверки.",
    readyStatusHelp:
      "Интерфейс подключён к backend, а текущая очередь построена из результатов Earth Engine для операционного разбора.",
  },
} as const;

export default function Page() {
  const initialDashboard = createUnavailableDashboardState();
  const faqRef = useRef<HTMLElement | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("day");
  const [locale, setLocale] = useState<Locale>("en");
  const [activeStep, setActiveStep] = useState<StepId>("signal");
  const [dashboardSource, setDashboardSource] =
    useState<DashboardHydrationState["source"]>(initialDashboard.source);
  const [kpiCards, setKpiCards] = useState(initialDashboard.kpis);
  const [anomalies, setAnomalies] = useState(initialDashboard.anomalies);
  const [incidents, setIncidents] = useState(initialDashboard.incidents);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>(
    createInitialPipelineStatus(initialDashboard.anomalies.length),
  );
  const [pipelineHistory, setPipelineHistory] = useState<PipelineHistoryPayload>(
    createInitialPipelineHistory(),
  );
  const [selectedAnomalyId, setSelectedAnomalyId] = useState(initialDashboard.anomalies[0]?.id ?? "");
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
  const coordinateActionText = coordinateActionCopy[locale];
  const valuePanelText = valuePanelCopy[locale];
  const emptyQueueText = emptyQueueCopy[locale];
  const juryText = juryUiCopy[locale];

  function applyDashboardHydration(
    state: DashboardHydrationState,
    nextPipelineStatus?: PipelineStatus,
    nextPipelineHistory?: PipelineHistoryPayload,
  ) {
    startTransition(() => {
      setDashboardSource(state.source);
      setKpiCards(state.kpis);
      setAnomalies(state.anomalies);
      setIncidents(state.incidents);
      if (nextPipelineStatus) {
        setPipelineStatus(nextPipelineStatus);
      }
      if (nextPipelineHistory) {
        setPipelineHistory(nextPipelineHistory);
      }
      setSelectedAnomalyId((current) => {
        const exists = state.anomalies.some((item) => item.id === current);
        return exists ? current : state.anomalies[0]?.id ?? "";
      });
      setLoadingDashboard(false);
    });
  }

  async function loadWorkspaceSnapshot(forceSyncWhenEmpty = false) {
    let [state, nextPipelineStatus, nextPipelineHistory] = await Promise.all([
      loadDashboardState(),
      loadPipelineStatus(anomalies.length),
      loadPipelineHistory(12),
    ]);

    if (
      hasApiBaseUrl &&
      forceSyncWhenEmpty &&
      state.source === "api" &&
      state.anomalies.length === 0 &&
      nextPipelineStatus.state !== "syncing"
    ) {
      try {
        nextPipelineStatus = await syncPipeline("gee");
        [state, nextPipelineHistory] = await Promise.all([
          loadDashboardState(),
          loadPipelineHistory(12),
        ]);
      } catch {
        [nextPipelineStatus, nextPipelineHistory] = await Promise.all([
          loadPipelineStatus(state.anomalies.length),
          loadPipelineHistory(12),
        ]);
      }
    }

    return { state, nextPipelineStatus, nextPipelineHistory };
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
      const dashboardPromise = loadDashboardState();
      const pipelineStatusPromise = loadPipelineStatus(anomalies.length);
      const pipelineHistoryPromise = loadPipelineHistory(12);

      let state = await dashboardPromise;
      if (cancelled) return;
      applyDashboardHydration(state);

      let nextPipelineStatus = await pipelineStatusPromise;
      let nextPipelineHistory = await pipelineHistoryPromise;
      if (cancelled) return;
      applyDashboardHydration(state, nextPipelineStatus, nextPipelineHistory);

      if (
        hasApiBaseUrl &&
        state.source === "api" &&
        state.anomalies.length === 0 &&
        nextPipelineStatus.state !== "syncing"
      ) {
        try {
          nextPipelineStatus = await syncPipeline("gee");
          [state, nextPipelineHistory] = await Promise.all([
            loadDashboardState(),
            loadPipelineHistory(12),
          ]);
          if (cancelled) return;
          applyDashboardHydration(state, nextPipelineStatus, nextPipelineHistory);
        } catch {
          if (cancelled) return;
          applyDashboardHydration(state, nextPipelineStatus, nextPipelineHistory);
        }
      }
    }

    void hydrateDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasApiBaseUrl) {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.hidden || busyAction) {
        return;
      }

      void loadWorkspaceSnapshot(false).then(({ state, nextPipelineStatus, nextPipelineHistory }) => {
        applyDashboardHydration(state, nextPipelineStatus, nextPipelineHistory);
      });
    }, 120000);

    return () => window.clearInterval(timer);
  }, [busyAction, anomalies.length]);

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
  const translatedAssetName = selectedAnomaly ? translateAssetName(selectedAnomaly.assetName, locale) : "";
  const translatedRegion = selectedAnomaly ? translateRegion(selectedAnomaly.region, locale) : "";
  const normalizedAssetName = normalizeInfoValue(translatedAssetName);
  const normalizedRegion = normalizeInfoValue(translatedRegion);
  const normalizedVerificationArea = normalizeInfoValue(translatedVerificationArea);
  const normalizedNearestLandmark = normalizeInfoValue(translatedNearestLandmark);
  const showVerificationArea =
    liveSignalSelected &&
    normalizedVerificationArea.length > 0 &&
    normalizedVerificationArea !== normalizeInfoValue(liveSignalText.notMappedNearby) &&
    normalizedVerificationArea !== normalizedAssetName &&
    normalizedVerificationArea !== normalizedRegion;
  const showNearestLandmark =
    liveSignalSelected &&
    normalizedNearestLandmark.length > 0 &&
    normalizedNearestLandmark !== normalizeInfoValue(liveSignalText.notMappedNearby) &&
    normalizedNearestLandmark !== normalizedAssetName &&
    normalizedNearestLandmark !== normalizedVerificationArea &&
    normalizedNearestLandmark !== normalizedRegion;
  const selectedAnomalyCoordinateLinks = selectedAnomaly ? buildCoordinateLinks(selectedAnomaly) : null;

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
  const faqItems: Array<{ id: string; question: string; answer: string[] }> = t.faq.items
    .filter((item) => item.id !== "demo")
    .map((item) => {
    if (item.id === "goal") {
      return locale === "ru"
        ? {
            ...item,
            answer: [
              "Сайт помогает быстро выбрать подозрительную зону, открыть кейс, провести проверку и выгрузить отчёт.",
              "Для команды это способ сразу понять, куда ехать в первую очередь и какой случай брать в работу.",
              "Главная польза сайта — не карта сама по себе, а понятный порядок действий после спутниковой проверки.",
            ],
          }
        : {
            ...item,
            answer: [
              "The site helps the team choose a suspected zone, open a case, run verification, and export the report.",
              "For the team it is a practical way to see where to go first and which case should be handled before the others.",
              "The main value is not the map itself, but the clear next steps after the satellite check.",
            ],
          };
    }

    if (item.id === "use") {
      return locale === "ru"
        ? {
            ...item,
            answer: [
              "Сначала выберите подозрительную зону из очереди на разбор и посмотрите спутниковые признаки, координаты и район проверки.",
              "Если зона действительно выглядит важной, откройте инцидент, чтобы у кейса появился ответственный и срок реакции.",
              "Дальше закройте задачи проверки и выгрузите MRV-отчёт для внутреннего разбора, ESG или тех, кто отвечает за соблюдение требований.",
            ],
          }
        : {
            ...item,
            answer: [
              "Start with the review queue of suspected zones and review the satellite evidence, coordinates, and verification area.",
              "If the zone still looks material, open an incident so the case gets an owner and a response window.",
              "Then complete the verification tasks and export the MRV report for internal review, ESG, or compliance teams.",
            ],
          };
    }

    if (item.id === "map") {
      return locale === "ru"
        ? {
            ...item,
            answer: [
              "Точки — это маркеры объектов на карте Казахстана.",
              "Они помогают понять, где находится выбранный случай и какие зоны есть в других регионах.",
            ],
          }
        : {
            ...item,
            answer: [
              "The dots are asset markers placed on the Kazakhstan map.",
              "They help the user see where the selected case is located and compare it with zones in other regions.",
            ],
          };
    }

    if (item.id === "location") {
      return locale === "ru"
        ? {
            ...item,
            answer: [
              "Эти поля помогают команде доехать до предполагаемой зоны и не создают ложного впечатления, что система уже знает точную точку выброса.",
              "Район проверки показывает ближайший район или локальную зону вокруг центра спутниковой аномалии.",
              "Ближайший адрес и ближайший ориентир получаются через reverse geocoding (обратное геокодирование) рядом с этим центром. Это навигационные подсказки для выездной проверки.",
            ],
          }
        : {
            ...item,
            answer: [
              "These fields help the team reach the suspected zone without pretending that the system already knows the exact source point.",
              "Verification area shows the nearest mapped district or local area around the center of the satellite hotspot.",
              "Nearest address and nearest landmark come from reverse geocoding (address lookup by coordinates) near that center point. They are route-planning hints for field review.",
            ],
          };
    }

    if (item.id === "score") {
      return locale === "ru"
        ? {
            ...item,
            question: "Что означает приоритет зоны?",
            answer: [
              "Приоритет зоны — это операционная оценка по шкале от 0 до 100, которая помогает быстро отсортировать очередь на разбор.",
              "Чем выше значение, тем сильнее текущая зона выделяется по доступным признакам и тем раньше её стоит разбирать.",
              "Это инструмент приоритизации для полевой проверки, а не окончательное доказательство источника.",
            ],
          }
        : {
            ...item,
            question: "What does zone priority mean?",
            answer: [
              "Zone priority is an operational score from 0 to 100 used to rank the review queue.",
              "A higher number means the current zone stands out more strongly in the available evidence and should be reviewed earlier.",
              "It is a field prioritization aid, not final source proof.",
            ],
          };
    }

    if (item.id === "impact" && pipelineStatus.source === "gee" && pipelineStatus.state === "ready") {
      return locale === "ru"
        ? {
            ...item,
            question: "Что теперь показывает второй ключевой показатель?",
            answer: [
              "В текущем режиме экран больше не подставляет искусственный tCO2e для каждой подозрительной зоны.",
              "Вместо этого сайт показывает реальные метрики из текущего ingest: рост метана относительно базового уровня и ночной термоконтекст VIIRS рядом с точкой наблюдения.",
              "Так интерфейс остаётся честным: он показывает то, что реально измерено текущим скринингом, а не расчёт, которого в текущем pipeline пока нет.",
            ],
          }
        : {
            ...item,
            question: "What does the second key metric show now?",
            answer: [
              "In the current mode the page no longer inserts a synthetic tCO2e value for every suspected zone.",
              "Instead it shows real metrics from the current ingest: methane uplift versus baseline and the nearby VIIRS night-time thermal context.",
              "This keeps the interface honest: it shows what the current screening layer actually measures instead of a number the current pipeline does not calculate yet.",
            ],
          };
    }

    if (item.id === "report") {
      return locale === "ru"
        ? {
            ...item,
            answer: [
              "Отчёт собирает ключевые факты по подозрительной зоне, ответственного по кейсу, статус задач и итог проверки.",
              "Он нужен, чтобы сразу было видно, что нашли, кто проверял и чем всё закончилось.",
              "Этот формат полезен для внутреннего разбора, ESG-отчётности и общения с теми, кто отвечает за соблюдение требований.",
            ],
          }
        : {
            ...item,
            answer: [
              "The report collects the core facts about the suspected zone, the case owner, the task status, and the current verification result.",
              "Its job is to show what was found, who checked it, and what the result was.",
              "This makes it useful for internal operations review, ESG reporting, and compliance communication.",
            ],
          };
    }

    return { id: item.id, question: item.question, answer: [...item.answer] };
  });
  const mrvFaqItem =
    locale === "ru"
      ? {
          id: "mrv",
          question: "Что означает MRV?",
          answer: [
            "MRV расшифровывается как Measurement, Reporting, Verification.",
            "По-русски это измерение, отчётность и проверка.",
            "На этом сайте MRV означает понятную последовательность: найти зону, открыть кейс, провести проверку и зафиксировать результат в отчёте.",
          ],
        }
      : {
          id: "mrv",
          question: "What does MRV mean?",
          answer: [
            "MRV stands for Measurement, Reporting, and Verification.",
            "On this site it means one clear sequence: review the zone, open the case, verify it, and record the result in the report.",
            "It is the working path from satellite screening to documented action.",
          ],
        };
  faqItems.splice(2, 0, mrvFaqItem);
  const screeningSnapshot = pipelineStatus.screeningSnapshot;
  const mapCardTone: MapCardTone =
    pipelineStatus.state === "ready" && screeningSnapshot?.freshness === "fresh"
      ? "live"
      : "fallback";
  const mapContextLabel =
    mapCardTone === "live"
      ? mapCardText.contextLive
      : mapCardText.contextFallback;
  const mapNote =
    mapCardTone === "live"
      ? mapCardText.noteLive
      : pipelineStatus.state === "error"
        ? mapCardText.noteUnavailable
        : mapCardText.noteDegraded;
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
  const liveQueueCount =
    loadingDashboard || dashboardSource !== "api" ? pipelineStatus.anomalyCount : anomalies.length;
  const openIncidentCount = Object.keys(incidents).length;
  const strongestMethaneUplift = anomalies.reduce<number | null>((best, anomaly) => {
    if (anomaly.methaneDeltaPpb === undefined) {
      return best;
    }

    return best === null || anomaly.methaneDeltaPpb > best ? anomaly.methaneDeltaPpb : best;
  }, null);
  const strongestMethaneUpliftLabel =
    strongestMethaneUplift === null
      ? screeningText.notAvailable
      : `${formatMetricNumber(strongestMethaneUplift, locale)} ppb`;
  const latestLiveSyncValue = mapSyncValue === screeningText.notAvailable ? screeningText.notAvailable : formatTimestamp(mapSyncValue, locale);
  const nextScheduledSyncValue = pipelineHistory.schedule.nextRunAt
    ? formatTimestamp(pipelineHistory.schedule.nextRunAt, locale)
    : screeningText.notAvailable;
  const businessValueTitle = formatBusinessValueTitle(liveQueueCount, locale);
  const businessValueBody = liveQueueCount > 0 ? valuePanelText.bodyWithQueue : valuePanelText.bodyWithoutQueue;
  const pipelineStateLabel = pipelineStateCopy[locale][pipelineStatus.state];
  const statusHelpText =
    loadingDashboard
      ? locale === "ru"
        ? "Страница загружает состояние backend и очередь на разбор. Первые ответы API могут занять несколько секунд."
        : "The page is loading backend state and the review queue. The first API responses can take a few seconds."
      : dashboardSource === "api" && pipelineStatus.source === "gee" && pipelineStatus.state === "ready"
      ? juryText.readyStatusHelp
      : locale === "ru"
        ? "Страница подключена к backend, но без успешного обновления очередь подозрительных зон не будет заполнена."
        : "The page is connected to the backend, but the suspected-zone queue stays empty until a refresh succeeds.";
  const statusNote =
    loadingDashboard
      ? locale === "ru"
        ? "Подключаемся к backend и загружаем очередь на разбор."
        : "Connecting to the backend and loading the review queue."
      : dashboardSource === "api"
      ? pipelineStatus.source === "gee" && pipelineStatus.state === "ready"
        ? juryText.readyStatusNote
        : locale === "ru"
          ? "Локальный сервер доступен. Запустите обновление данных, чтобы получить новые подозрительные зоны."
          : "The local server is available. Run a data refresh to load fresh suspected zones."
      : locale === "ru"
        ? "Сервер недоступен. Без backend сайт не покажет подозрительные зоны и не выполнит workflow."
        : "The backend is unavailable. Without it the site cannot load suspected zones or run the workflow.";

  useEffect(() => {
    if (scopedAnomalies.length === 0) return;
    if (scopedAnomalies.some((anomaly) => anomaly.id === selectedAnomalyId)) return;
    setSelectedAnomalyId(strongestAnomaly?.id ?? scopedAnomalies[0]?.id ?? "");
  }, [scopedAnomalies, selectedAnomalyId, strongestAnomaly]);

  const runPipelineSync = async () => {
    if (!hasApiBaseUrl) {
      setRequestError(screeningText.noApi);
      return;
    }

    const previousPipelineStatus = pipelineStatus;
    setBusyAction("sync-gee");
    setRequestError(null);
    setPipelineStatus((current) => ({
      ...current,
      state: "syncing",
      statusMessage: screeningText.syncingGee,
    }));

    try {
      const nextStatus = await syncPipeline("gee");
      const [refreshedState, refreshedHistory] = await Promise.all([
        loadDashboardState(),
        loadPipelineHistory(12),
      ]);
      if (refreshedState.source === "api") {
        applyDashboardHydration(refreshedState, nextStatus, refreshedHistory);
      } else {
        startTransition(() => {
          setDashboardSource(refreshedState.source);
          setPipelineStatus(nextStatus);
          setPipelineHistory(refreshedHistory);
        });
      }
      if (nextStatus.state !== "ready") {
        setMapReactionActive(false);
        setMapReactionDotId("");
        setRequestError(translatePipelineStatusMessage(nextStatus.statusMessage, locale));
      } else if (nextStatus.screeningSnapshot?.freshness === "fresh") {
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
      setRequestError(screeningText.syncFailedGee);
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

    if (dashboardSource !== "api") {
      setBusyAction(null);
      setRequestError(
        locale === "ru"
          ? "Сначала нужен доступный backend и обновление данных. Без этого инцидент создать нельзя."
          : "A working backend and data refresh are required before an incident can be created.",
      );
      return;
    }

    try {
      const incident = await promoteAnomalyRequest(selectedAnomaly.id);
      applyIncidentUpdate(incident, selectedAnomaly.id);
      setActiveStep("incident");
    } catch {
      setRequestError(
        locale === "ru"
          ? "Не удалось создать инцидент через backend. Проверьте состояние сервера и повторите попытку."
          : "Incident creation failed in the backend. Check the server state and try again.",
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

    if (dashboardSource !== "api") {
      setBusyAction(null);
      setRequestError(
        locale === "ru"
          ? "Обновление задач требует доступного backend."
          : "Task updates require the backend to be available.",
      );
      return;
    }

    try {
      const incident = await completeTaskRequest(activeIncident.id, taskId);
      applyIncidentUpdate(incident, incident.anomalyId);
    } catch {
      setRequestError(
        locale === "ru"
          ? "Не удалось обновить задачу через backend. Проверьте сервер и повторите попытку."
          : "Task update failed in the backend. Check the server and try again.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const generateReport = async () => {
    if (!activeIncident || !selectedAnomaly) return;

    setBusyAction(`report-${activeIncident.id}`);
    setRequestError(null);

    if (dashboardSource !== "api") {
      setBusyAction(null);
      setRequestError(
        locale === "ru"
          ? "Формирование отчёта требует доступного backend."
          : "Report generation requires the backend to be available.",
      );
      return;
    }

    try {
      const incident = await generateReportRequest(activeIncident.id);
      applyIncidentUpdate(incident, incident.anomalyId);
      setActiveStep("report");
    } catch {
      setRequestError(
        locale === "ru"
          ? "Не удалось сформировать отчёт через backend. Проверьте сервер и повторите попытку."
          : "Report generation failed in the backend. Check the server and try again.",
      );
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
        throw new Error("API mode is required for export");
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

    if (dashboardSource !== "api") {
      setRequestError(
        locale === "ru"
          ? "Версия для печати доступна только через backend."
          : "The print view is available only through the backend.",
      );
      return;
    }

    const reportViewUrl = getReportViewUrl(activeIncident.id, true, locale);
    if (reportViewUrl) {
      window.open(reportViewUrl, "_blank", "noopener,noreferrer");
    }
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

  const pageHeader = (
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
              {step === "signal" ? juryText.navSignal : t.nav[step]}
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
  );

  const heroSection = (
    <section className="hero-shell">
      <div className="hero-copy">
        <p className="eyebrow">{t.brand}</p>
        <h1>{juryText.heroTitle}</h1>
        <p className="hero-subtitle">{juryText.heroSubtitle}</p>
      </div>

      <div className="hero-side">
        <section className="value-card">
          <p className="eyebrow">{valuePanelText.eyebrow}</p>
          <strong className="value-card-title">{businessValueTitle}</strong>
          <p className="value-card-copy">{businessValueBody}</p>

          <div className="value-card-grid">
            <article className="value-card-stat">
              <span>{valuePanelText.scopeLabel}</span>
              <strong>{valuePanelText.defaultScope}</strong>
            </article>
            <article className="value-card-stat">
              <span>{valuePanelText.strongestUplift}</span>
              <strong>{strongestMethaneUpliftLabel}</strong>
            </article>
            <article className="value-card-stat">
              <span>{valuePanelText.openCases}</span>
              <strong>{openIncidentCount}</strong>
            </article>
            <article className="value-card-stat">
              <span>{valuePanelText.lastSync}</span>
              <strong>{latestLiveSyncValue}</strong>
            </article>
          </div>
        </section>

        <section className="status-pill">
          <span className={`status-dot ${dashboardSource === "api" ? "status-dot-live" : ""}`} />
          <div>
            <div className="status-title">
              <strong>
                {loadingDashboard
                  ? t.status.loading
                  : dashboardSource === "api"
                    ? t.status.api
                    : locale === "ru"
                      ? "Сервер недоступен"
                      : "Server unavailable"}
              </strong>
              <HelpHint text={statusHelpText} />
            </div>
            <p>{statusNote}</p>
          </div>
        </section>
      </div>
    </section>
  );

  if (!selectedAnomaly) {
    if (loadingDashboard) {
      return (
        <main className="site-shell">
          {pageHeader}
          {heroSection}
          {requestError ? <section className="error-banner">{requestError}</section> : null}
          <section className="empty-shell empty-live-shell">
            <div className="empty-live-copy">
              <p className="eyebrow">{locale === "ru" ? "Загрузка" : "Loading"}</p>
              <strong>
                {locale === "ru"
                  ? "Подключаемся к backend и загружаем данные"
                  : "Connecting to the backend and loading data"}
              </strong>
              <p>
                {locale === "ru"
                  ? "Первый ответ от API может занять несколько секунд. После загрузки появится очередь подозрительных зон и рабочий workflow."
                  : "The first API response can take a few seconds. After that the suspected-zone queue and workflow will appear."}
              </p>
            </div>
          </section>
        </main>
      );
    }

    return (
      <main className="site-shell">
        {pageHeader}
        {heroSection}
        {requestError ? <section className="error-banner">{requestError}</section> : null}
        <section className="empty-shell empty-live-shell">
          <div className="empty-live-copy">
            <p className="eyebrow">{emptyQueueText.eyebrow}</p>
            <strong>{emptyQueueText.title}</strong>
            <p>{emptyQueueText.body}</p>
            <button
              className="primary-button"
              disabled={busyAction === "sync-gee" || !hasApiBaseUrl}
              onClick={() => void runPipelineSync()}
              type="button"
            >
              {busyAction === "sync-gee" ? screeningText.syncing : screeningText.sync}
            </button>
          </div>

          <div className="empty-live-grid">
            <article className="empty-live-cell">
              <span>{emptyQueueText.latestRun}</span>
              <strong>{latestLiveSyncValue}</strong>
            </article>
            <article className="empty-live-cell">
              <span>{emptyQueueText.nextRun}</span>
              <strong>{nextScheduledSyncValue}</strong>
            </article>
            <article className="empty-live-cell">
              <span>{emptyQueueText.serverState}</span>
              <strong>{pipelineStateLabel}</strong>
            </article>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="site-shell">
      {pageHeader}
      {heroSection}

      {requestError ? <section className="error-banner">{requestError}</section> : null}

      <section className="workspace-shell" ref={workspaceRef}>
        <aside className="signal-rail">
          <div className="rail-head">
            <p className="eyebrow">{juryText.queueEyebrow}</p>
            <h2>{juryText.queueTitle}</h2>
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
                      {juryText.scoreLabel} {anomaly.signalScore}
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
            <span>{juryText.queueTop}</span>
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
              <h2>{activeStep === "signal" ? juryText.signalStepTitle : t.steps[activeStep].title}</h2>
              <p>{activeStep === "signal" ? juryText.signalStepSubtitle : t.steps[activeStep].subtitle}</p>
            </div>
          </div>

          {activeStep === "signal" ? (
            <div className="panel-body">
              <section className="metric-grid">
                <MetricCard
                  hint={t.help.score}
                  label={juryText.scoreLabel}
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
                      hint={screeningText.help.source}
                      value={translateScreeningEvidenceSource(screeningSnapshot.evidenceSource, locale)}
                    />
                    <InfoRow
                      label={screeningText.synced}
                      hint={screeningText.help.synced}
                      value={screeningSnapshot.syncedAt ?? screeningText.notAvailable}
                    />
                    <InfoRow
                      label={screeningText.observed}
                      hint={screeningText.help.observed}
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

                  <PipelineHistoryPanel history={pipelineHistory} locale={locale} />
                </section>
              ) : null}

              <section className="signal-focus">
                <InfoRow label={t.summary.region} value={translatedRegion} />
                <InfoRow
                  actions={
                    selectedAnomalyCoordinateLinks ? (
                      <CoordinateActionLinks labels={coordinateActionText} links={selectedAnomalyCoordinateLinks} />
                    ) : undefined
                  }
                  hint={t.help.coordinates}
                  label={t.summary.coordinates}
                  value={selectedAnomaly.coordinates}
                />
                {showVerificationArea ? (
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
                {showNearestLandmark ? (
                  <InfoRow
                    hint={t.help.nearestLandmark}
                    label={t.summary.nearestLandmark}
                    value={translatedNearestLandmark}
                  />
                ) : null}
                <InfoRow label={t.panels.assets} value={translatedAssetName} />
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
                      onClick={() => void runPipelineSync()}
                      type="button"
                    >
                      {busyAction === "sync-gee" ? screeningText.syncing : screeningText.sync}
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
                  <InfoRow label={t.panels.assets} value={translatedAssetName} />
                  <InfoRow label={t.summary.region} value={translatedRegion} />
                  <InfoRow
                    actions={
                      selectedAnomalyCoordinateLinks ? (
                        <CoordinateActionLinks labels={coordinateActionText} links={selectedAnomalyCoordinateLinks} />
                      ) : undefined
                    }
                    hint={t.help.coordinates}
                    label={t.summary.coordinates}
                    value={selectedAnomaly.coordinates}
                  />
                  {showVerificationArea ? (
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
                  {showNearestLandmark ? (
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
                      disabled
                      type="button"
                    >
                      {t.actions.downloadPdf}
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
            ? `Спутниковый скрининг в реальном времени отметил зону ${translateAssetName(anomaly.assetName, locale)} в регионе ${translateRegion(anomaly.region, locale)} с ростом метана на ${deltaPpb.toFixed(2)} ppb (${anomaly.methaneDeltaPct.toFixed(2)}%) и ${thermalHits} ночными VIIRS-срабатываниями в радиусе 25 км.`
            : `Спутниковый скрининг в реальном времени отметил зону ${translateAssetName(anomaly.assetName, locale)} в регионе ${translateRegion(anomaly.region, locale)} с ростом метана на ${deltaPpb.toFixed(2)} ppb (${anomaly.methaneDeltaPct.toFixed(2)}%) без недавних ночных VIIRS-срабатываний в радиусе 25 км.`
          : `Спутниковый разбор отметил объект ${translateAssetName(anomaly.assetName, locale)} в регионе ${translateRegion(anomaly.region, locale)} с ростом метана на ${anomaly.methaneDeltaPct}% и ${anomaly.flareHours ?? 0} часами факельной активности.`,
      },
      {
        title: "Кто отвечает",
        body: `${translateOwner(incident.owner, locale)} ведёт этот кейс с приоритетом ${incident.priority} и сроком реакции ${translateWindow(incident.verificationWindow, locale).toLowerCase()}.`,
      },
      {
        title: "Как продвигается проверка",
        body: liveSignal
          ? `Выполнено ${completedTasks} из ${incident.tasks.length} задач. Очередь на разбор пока не переводит эту подозрительную зону в tCO2e: она честно ранжирует кейсы по росту метана и тепловому контексту рядом с точкой наблюдения.`
          : `Выполнено ${completedTasks} из ${incident.tasks.length} задач. Текущая оценка возможного эффекта составляет ${anomaly.co2eTonnes ?? 0} tCO2e.`,
      },
    ];
  }

  return [
    {
      title: "What was observed",
      body: liveSignal
        ? thermalHits > 0
          ? `Real-time satellite screening flagged ${translateAssetName(anomaly.assetName, locale)} in ${translateRegion(anomaly.region, locale)} with ${deltaPpb.toFixed(2)} ppb (${anomaly.methaneDeltaPct.toFixed(2)}%) methane uplift and ${thermalHits} night-time VIIRS detections inside the 25 km context window.`
          : `Real-time satellite screening flagged ${translateAssetName(anomaly.assetName, locale)} in ${translateRegion(anomaly.region, locale)} with ${deltaPpb.toFixed(2)} ppb (${anomaly.methaneDeltaPct.toFixed(2)}%) methane uplift and no recent night-time VIIRS detections inside the 25 km context window.`
        : `Satellite review flagged ${translateAssetName(anomaly.assetName, locale)} in ${translateRegion(anomaly.region, locale)} with ${anomaly.methaneDeltaPct}% methane uplift and ${anomaly.flareHours ?? 0} hours of flare activity.`,
    },
    {
      title: "Who owns the case",
      body: `${translateOwner(incident.owner, locale)} owns this case under ${incident.priority} priority with a ${translateWindow(incident.verificationWindow, locale).toLowerCase()} response window.`,
    },
    {
      title: "How verification is progressing",
      body: liveSignal
        ? `${completedTasks} of ${incident.tasks.length} tasks are complete. This review queue does not estimate tCO2e yet; it ranks the case by methane uplift and nearby thermal context.`
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

type CoordinateLinks = {
  googleMaps: string;
  twoGis: string;
};

function formatBusinessValueTitle(queueCount: number, locale: Locale) {
  if (locale === "ru") {
    if (queueCount <= 0) return "Очередь на выездной разбор пока пуста";
    if (queueCount === 1) return "1 подозрительная зона готова к выездной проверке";
    return `${queueCount} подозрительных зон готовы к выездной проверке`;
  }

  if (queueCount <= 0) return "The review queue is empty for now";
  if (queueCount === 1) return "1 suspected zone is ready for field review";
  return `${queueCount} suspected zones are ready for field review`;
}

function buildCoordinateLinks(anomaly: Anomaly): CoordinateLinks | null {
  const latitude = Number(anomaly.latitude);
  const longitude = Number(anomaly.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const lat = latitude.toFixed(6);
  const lng = longitude.toFixed(6);

  return {
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    twoGis: `https://2gis.kz/search/${lat},${lng}?m=${lng},${lat}/16`,
  };
}

function formatMetricNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeInfoValue(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
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
  actions,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <article className={className ? `info-row ${className}` : "info-row"}>
      <FieldLabel hint={hint} label={label} />
      <strong>{value}</strong>
      {actions ? <div className="info-row-actions">{actions}</div> : null}
    </article>
  );
}

function CoordinateActionLinks({
  links,
  labels,
}: {
  links: CoordinateLinks;
  labels: {
    title: string;
    googleMaps: string;
    twoGis: string;
  };
}) {
  return (
    <div className="map-app-links">
      <span className="map-app-links-title">{labels.title}</span>
      <div className="map-app-links-row">
        <MapAppLink href={links.googleMaps} label={labels.googleMaps}>
          <img
            alt=""
            className="map-app-image"
            decoding="async"
            height="28"
            loading="lazy"
            src="/icons/google-maps-official.png"
            width="28"
          />
        </MapAppLink>
        <MapAppLink href={links.twoGis} label={labels.twoGis}>
          <img
            alt=""
            className="map-app-image"
            decoding="async"
            height="28"
            loading="lazy"
            src="/icons/2gis-official.png"
            width="28"
          />
        </MapAppLink>
      </div>
    </div>
  );
}

function MapAppLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      aria-label={label}
      className="info-row-link map-app-link"
      href={href}
      rel="noreferrer"
      target="_blank"
      title={label}
    >
      <span aria-hidden="true" className="map-app-icon">
        {children}
      </span>
      <span className="sr-only">{label}</span>
    </a>
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
