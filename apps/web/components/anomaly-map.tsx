"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type Anomaly } from "../lib/dashboard-types";
import {
  copy,
  formatVerificationAreaLabel,
  type Locale,
  translateAdministrativeLabel,
  translateAssetName,
  translateFacility,
  translateRegion,
} from "../lib/site-content";

type MapTone = "live" | "fallback";

type AnomalyMapProps = {
  anomalies: Anomaly[];
  selectedAnomalyId: string;
  locale: Locale;
  tone: MapTone;
  liveReactionAnomalyId?: string;
  onSelectAnomaly: (anomalyId: string) => void;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
  primaryActionDisabled?: boolean;
};

type MapLibreModule = typeof import("maplibre-gl");
type MapInstance = import("maplibre-gl").Map;
type MarkerInstance = import("maplibre-gl").Marker;
type StyleSpecification = import("maplibre-gl").StyleSpecification;

const KAZAKHSTAN_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

const mapCopy = {
  en: {
    fallback: "Map unavailable. Showing the simplified live-screening backup view.",
    detailTitle: "Selected marker",
    coordinates: "Coordinates",
    facility: "Facility",
    verificationArea: "Verification area",
    nearestAddress: "Nearest address",
    nearestLandmark: "Nearest landmark",
    notAvailable: "Not available nearby",
    actionHint: "Screening marker only. Use manual promotion to open the operational incident.",
  },
  ru: {
    fallback: "Карта временно недоступна. Показан упрощённый запасной вид.",
    detailTitle: "Выбранный маркер",
    coordinates: "Координаты",
    facility: "Тип объекта",
    verificationArea: "Район проверки",
    nearestAddress: "Ближайший адрес",
    nearestLandmark: "Ближайший ориентир",
    notAvailable: "Рядом нет подходящего адреса или объекта",
    actionHint:
      "Это только маркер предварительной проверки. Чтобы открыть рабочий кейс, вручную переведите подозрительную зону в инцидент.",
  },
} as const;

const INITIAL_CENTER: [number, number] = [66.9, 48.2];
const INITIAL_ZOOM = 4.1;

export function AnomalyMap({
  anomalies,
  selectedAnomalyId,
  locale,
  tone,
  liveReactionAnomalyId,
  onSelectAnomaly,
  onPrimaryAction,
  primaryActionLabel,
  primaryActionDisabled = false,
}: AnomalyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const markersRef = useRef<MarkerInstance[]>([]);
  const [mapModule, setMapModule] = useState<MapLibreModule | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const t = copy[locale];
  const mapText = mapCopy[locale];
  const selectedAnomaly = useMemo(
    () => anomalies.find((anomaly) => anomaly.id === selectedAnomalyId) ?? anomalies[0] ?? null,
    [anomalies, selectedAnomalyId],
  );

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      if (!containerRef.current || mapRef.current || useFallback) return;

      try {
        const imported = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;

        setMapModule(imported);

        const map = new imported.Map({
          container: containerRef.current,
          style: KAZAKHSTAN_STYLE,
          center: INITIAL_CENTER,
          zoom: INITIAL_ZOOM,
          attributionControl: false,
        });

        map.addControl(new imported.NavigationControl({ showCompass: false }), "top-right");
        map.on("load", () => {
          if (cancelled) return;
          setMapReady(true);
          fitMapToAnomalies(map, anomalies);
        });
        map.on("error", () => {
          if (cancelled) return;
          setMapReady(false);
          setUseFallback(true);
        });

        mapRef.current = map;
      } catch {
        if (!cancelled) {
          setUseFallback(true);
        }
      }
    }

    void initializeMap();

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [useFallback]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    fitMapToAnomalies(mapRef.current, anomalies);
  }, [anomalies, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !mapModule) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    for (const anomaly of anomalies) {
      const element = document.createElement("button");
      element.type = "button";
      element.ariaLabel = translateAssetName(anomaly.assetName, locale);
      element.className = [
        "map-marker",
        anomaly.id === selectedAnomalyId ? "map-marker-active" : "",
        liveReactionAnomalyId && anomaly.id === liveReactionAnomalyId ? "map-marker-live" : "",
      ]
        .filter(Boolean)
        .join(" ");
      element.addEventListener("click", () => onSelectAnomaly(anomaly.id));

      const marker = new mapModule.Marker({
        element,
        anchor: "center",
      })
        .setLngLat([anomaly.longitude, anomaly.latitude])
        .addTo(mapRef.current);

      markersRef.current.push(marker);
    }
  }, [anomalies, liveReactionAnomalyId, locale, mapModule, mapReady, onSelectAnomaly, selectedAnomalyId]);

  return (
    <div className={`map-shell map-shell-${tone}`}>
      {useFallback ? (
        <div className="map-fallback-shell">
          <div className="map-fallback-banner">{mapText.fallback}</div>
          <div className="map-board">
            {anomalies.map((anomaly) => (
              <button
                key={anomaly.id}
                aria-label={translateAssetName(anomaly.assetName, locale)}
                className={`map-dot ${anomaly.id === selectedAnomalyId ? "map-dot-active" : ""} ${liveReactionAnomalyId && anomaly.id === liveReactionAnomalyId ? "map-dot-live" : ""}`}
                onClick={() => onSelectAnomaly(anomaly.id)}
                style={{ left: `${anomaly.sitePosition.x}%`, top: `${anomaly.sitePosition.y}%` }}
                type="button"
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="map-canvas" ref={containerRef} />
      )}

      {selectedAnomaly ? (
        <aside className="map-selection-card">
          <span className="map-selection-eyebrow">{mapText.detailTitle}</span>
          <strong>{translateAssetName(selectedAnomaly.assetName, locale)}</strong>
          <p>{translateRegion(selectedAnomaly.region, locale)}</p>
          <dl className="map-selection-meta">
            <div>
              <dt>{t.summary.facility}</dt>
              <dd>{translateFacility(selectedAnomaly.facilityType, locale)}</dd>
            </div>
            <div>
              <dt>{mapText.coordinates}</dt>
              <dd>{selectedAnomaly.coordinates}</dd>
            </div>
            <div>
              <dt>{mapText.verificationArea}</dt>
              <dd>
                {selectedAnomaly.verificationArea
                  ? formatVerificationAreaLabel(selectedAnomaly.verificationArea, selectedAnomaly.region, locale)
                  : mapText.notAvailable}
              </dd>
            </div>
            <div>
              <dt>{mapText.nearestAddress}</dt>
              <dd>
                {selectedAnomaly.nearestAddress
                  ? translateAdministrativeLabel(selectedAnomaly.nearestAddress, locale)
                  : mapText.notAvailable}
              </dd>
            </div>
            <div>
              <dt>{mapText.nearestLandmark}</dt>
              <dd>
                {selectedAnomaly.nearestLandmark
                  ? translateAdministrativeLabel(selectedAnomaly.nearestLandmark, locale)
                  : mapText.notAvailable}
              </dd>
            </div>
          </dl>
          <p className="map-selection-hint">{mapText.actionHint}</p>
          <button
            className="secondary-button map-selection-action"
            disabled={primaryActionDisabled}
            onClick={onPrimaryAction}
            type="button"
          >
            {primaryActionLabel}
          </button>
        </aside>
      ) : null}
    </div>
  );
}

function fitMapToAnomalies(map: MapInstance, anomalies: Anomaly[]) {
  if (anomalies.length === 0) return;

  if (anomalies.length === 1) {
    map.easeTo({
      center: [anomalies[0].longitude, anomalies[0].latitude],
      zoom: 6.1,
      duration: 0,
    });
    return;
  }

  const bounds = anomalies.reduce(
    (acc, anomaly) => {
      acc.minLon = Math.min(acc.minLon, anomaly.longitude);
      acc.maxLon = Math.max(acc.maxLon, anomaly.longitude);
      acc.minLat = Math.min(acc.minLat, anomaly.latitude);
      acc.maxLat = Math.max(acc.maxLat, anomaly.latitude);
      return acc;
    },
    {
      minLon: Number.POSITIVE_INFINITY,
      maxLon: Number.NEGATIVE_INFINITY,
      minLat: Number.POSITIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
    },
  );

  map.fitBounds(
    [
      [bounds.minLon, bounds.minLat],
      [bounds.maxLon, bounds.maxLat],
    ],
    {
      padding: 64,
      duration: 0,
      maxZoom: 6.4,
    },
  );
}
