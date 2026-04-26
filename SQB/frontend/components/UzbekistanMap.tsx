'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, CircleMarker, Tooltip as LTooltip } from 'react-leaflet';
import L, { type Layer, type PathOptions } from 'leaflet';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { ChevronLeft, MapPin } from 'lucide-react';

export type FilterType = 'calls' | 'alerts' | 'sentiment' | 'vip' | 'compliance';

export interface RegionStat {
  calls: number;
  alerts: number;
  sentiment: number;
  vip: number;
  complianceLow: number;
  topIntent: string;
  topAlert?: string;
}

interface Props {
  filter: FilterType;
  regionStats: Record<string, RegionStat>;
  onRegionSelect?: (name: string | null) => void;
  pingRegion?: string | null;
}

interface FeatureProps {
  name: string;
  name_en?: string;
  name_uz?: string;
  viloyat?: string;
}
type GeoCollection = FeatureCollection<Geometry, FeatureProps>;
type Feat = Feature<Geometry, FeatureProps>;

const filterConfig: Record<FilterType, { label: string; color: string; getValue: (s: RegionStat) => number; format: (v: number) => string; max: number }> = {
  calls:      { label: "Qo'ng'iroqlar",  color: '#6366f1', getValue: s => s.calls,          format: v => `${v} ta`,  max: 25 },
  alerts:     { label: 'Muammolar',      color: '#ef4444', getValue: s => s.alerts,         format: v => `${v} ta`,  max: 8 },
  sentiment:  { label: 'Sentiment',      color: '#10b981', getValue: s => s.sentiment,      format: v => `${v}%`,    max: 100 },
  vip:        { label: 'VIP mijozlar',   color: '#f59e0b', getValue: s => s.vip,            format: v => `${v} ta`,  max: 12 },
  compliance: { label: 'Compliance past', color: '#dc2626', getValue: s => s.complianceLow, format: v => `${v}%`,    max: 60 },
};

function intensityColor(value: number, max: number, baseColor: string, isSentiment: boolean): string {
  if (isSentiment) {
    if (value >= 70) return '#10b981';
    if (value >= 50) return '#f59e0b';
    if (value >= 30) return '#fb923c';
    return '#ef4444';
  }
  const t = Math.min(1, value / Math.max(1, max));
  if (t === 0) return '#334155';
  return baseColor;
}
function intensityOpacity(value: number, max: number, isSentiment: boolean): number {
  if (isSentiment) return 0.55;
  const t = Math.min(1, value / Math.max(1, max));
  return 0.25 + t * 0.55;
}

const TUMAN_STYLE: PathOptions = {
  fillColor: '#6366f1',
  fillOpacity: 0.25,
  color: '#94a3b8',
  weight: 1,
  dashArray: '4 3',
  opacity: 0.7,
};

// Helper: refit map to a GeoJSON layer
function FitToData({ data, dep }: { data: GeoCollection | null; dep: string }) {
  const map = useMap();
  useEffect(() => {
    if (!data || !data.features.length) return;
    const layer = L.geoJSON(data);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 9 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);
  return null;
}

// Invalidate map size when container resizes (fixes blank tile issue)
function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => { clearTimeout(t); ro.disconnect(); };
  }, [map]);
  return null;
}

export function UzbekistanMap({ filter, regionStats, onRegionSelect, pingRegion }: Props) {
  const [viloyatGeo, setViloyatGeo] = useState<GeoCollection | null>(null);
  const [tumanGeo, setTumanGeo] = useState<GeoCollection | null>(null);
  const [selectedViloyat, setSelectedViloyat] = useState<string | null>(null);
  const [tumanLoading, setTumanLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load viloyats
  useEffect(() => {
    let cancelled = false;
    fetch('/geo/uz-viloyatlar.geojson')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: GeoCollection) => { if (!cancelled) setViloyatGeo(d); })
      .catch(e => { if (!cancelled) setLoadError(String(e.message || e)); console.error(e); });
    return () => { cancelled = true; };
  }, []);

  const ensureTumanLoaded = useCallback(async () => {
    if (tumanGeo) return tumanGeo;
    setTumanLoading(true);
    try {
      const r = await fetch('/geo/uz-tumanlar.geojson');
      const d: GeoCollection = await r.json();
      setTumanGeo(d);
      return d;
    } finally {
      setTumanLoading(false);
    }
  }, [tumanGeo]);

  const filteredTuman = useMemo<GeoCollection | null>(() => {
    if (!selectedViloyat || !tumanGeo) return null;
    return {
      type: 'FeatureCollection',
      features: tumanGeo.features.filter(f => f.properties.viloyat === selectedViloyat),
    };
  }, [tumanGeo, selectedViloyat]);

  const cfg = filterConfig[filter];

  // Style for viloyat features (filter-aware)
  const viloyatStyle = useCallback((feature?: Feat): PathOptions => {
    if (!feature) return {};
    const stat = regionStats[feature.properties.name];
    const value = stat ? cfg.getValue(stat) : 0;
    return {
      fillColor: intensityColor(value, cfg.max, cfg.color, filter === 'sentiment'),
      fillOpacity: stat ? intensityOpacity(value, cfg.max, filter === 'sentiment') : 0.1,
      color: '#0f172a',
      weight: 1.5,
      opacity: 0.85,
    };
  }, [regionStats, cfg, filter]);


  // Per-feature behavior — viloyat
  const onEachViloyat = useCallback((feature: Feat, layer: Layer) => {
    const name = feature.properties.name;
    const stat = regionStats[name];
    const value = stat ? cfg.getValue(stat) : 0;
    const tooltip = `<div style="font-family:ui-sans-serif,system-ui">
      <div style="color:#fff;font-weight:700;font-size:12px;margin-bottom:2px">${name}</div>
      <div style="color:${cfg.color};font-weight:700;font-size:11px">${cfg.format(value)} · ${cfg.label}</div>
      ${stat ? `<div style="color:#94a3b8;font-size:10px;margin-top:2px">${stat.calls} qo'ng'iroq · ${stat.alerts} alert</div>
      <div style="color:#94a3b8;font-size:10px">Asosiy: ${stat.topIntent}</div>` : ''}
      <div style="color:#818cf8;font-size:10px;margin-top:4px;font-weight:600">Tumanlar uchun bosing →</div>
    </div>`;
    layer.bindTooltip(tooltip, { direction: 'top', offset: L.point(0, -8), sticky: true, className: 'uz-map-tooltip' });

    layer.on({
      mouseover: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ weight: 3, color: cfg.color, fillOpacity: Math.min(0.85, intensityOpacity(value, cfg.max, filter === 'sentiment') + 0.15) });
        l.bringToFront();
      },
      mouseout: (e) => {
        const l = e.target as L.Path;
        l.setStyle(viloyatStyle(feature));
      },
      click: async () => {
        await ensureTumanLoaded();
        setSelectedViloyat(name);
        onRegionSelect?.(name);
      },
    });
  }, [regionStats, cfg, filter, viloyatStyle, ensureTumanLoaded, onRegionSelect]);

  const onEachTuman = useCallback((feature: Feat, layer: Layer) => {
    const name = feature.properties.name_uz || feature.properties.name;
    layer.bindTooltip(
      `<div style="font-family:ui-sans-serif,system-ui;color:#fff;font-weight:700;font-size:12px">${name}</div><div style="color:#94a3b8;font-size:10px">Tuman</div>`,
      { direction: 'top', offset: L.point(0, -8), sticky: true, className: 'uz-map-tooltip' }
    );
    layer.on({
      mouseover: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ weight: 2.5, fillOpacity: 0.55, color: '#a5b4fc' });
      },
      mouseout: (e) => {
        const l = e.target as L.Path;
        l.setStyle(TUMAN_STYLE);
      },
    });
  }, []);

  const handleBack = useCallback(() => {
    setSelectedViloyat(null);
    onRegionSelect?.(null);
  }, [onRegionSelect]);

  // Centroid of ping region for live pulse marker
  const pingLatLng = useMemo<[number, number] | null>(() => {
    if (!viloyatGeo || !pingRegion || selectedViloyat) return null;
    const f = viloyatGeo.features.find(ft => ft.properties.name === pingRegion);
    if (!f) return null;
    const layer = L.geoJSON(f);
    const c = layer.getBounds().getCenter();
    return [c.lat, c.lng];
  }, [viloyatGeo, pingRegion, selectedViloyat]);

  return (
    <div className="relative h-full flex flex-col">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 border-b border-slate-800/60 bg-slate-900/40 z-[401] relative">
        {selectedViloyat ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-xs bg-slate-800/60 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Viloyatlarga qaytish
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5" />
            14 viloyat
          </div>
        )}
        <span className="text-white text-sm font-semibold">
          {selectedViloyat ?? "O'zbekiston Respublikasi"}
        </span>
        <span className="text-slate-500 text-xs">·</span>
        <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>

        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-500">
          <span>Past</span>
          <div className="flex">
            {filter === 'sentiment'
              ? ['#ef4444', '#fb923c', '#f59e0b', '#10b981'].map(c => <div key={c} className="w-4 h-2.5" style={{ background: c }} />)
              : [0.25, 0.45, 0.6, 0.75, 0.9].map(o => {
                  const r = parseInt(cfg.color.slice(1, 3), 16);
                  const g = parseInt(cfg.color.slice(3, 5), 16);
                  const b = parseInt(cfg.color.slice(5, 7), 16);
                  return <div key={o} className="w-4 h-2.5" style={{ background: `rgba(${r},${g},${b},${o})` }} />;
                })}
          </div>
          <span>Yuqori</span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-0">
        {loadError && (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center text-red-400 text-sm gap-1 bg-slate-950/80">
            <span>Xarita yuklanmadi: {loadError}</span>
          </div>
        )}
        {!viloyatGeo && !loadError && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center text-slate-500 text-sm bg-slate-950/60">
            Xarita yuklanmoqda...
          </div>
        )}
        {tumanLoading && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center text-slate-300 text-sm bg-slate-950/70 backdrop-blur-sm">
            Tumanlar yuklanmoqda...
          </div>
        )}

        <MapContainer
          center={[41.5, 64.5]}
          zoom={6}
          minZoom={5}
          maxZoom={11}
          maxBounds={[[37.0, 55.9], [45.6, 73.2]]}
          style={{ height: '100%', width: '100%', background: '#020617' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <InvalidateOnResize />

          {viloyatGeo && !selectedViloyat && (
            <>
              <GeoJSON
                key={`v-${filter}`}
                data={viloyatGeo}
                style={viloyatStyle as L.StyleFunction}
                onEachFeature={onEachViloyat}
              />
              <FitToData data={viloyatGeo} dep="viloyat" />
            </>
          )}

          {filteredTuman && selectedViloyat && (
            <>
              <GeoJSON
                key={`t-${selectedViloyat}`}
                data={filteredTuman}
                style={() => TUMAN_STYLE}
                onEachFeature={onEachTuman}
              />
              <FitToData data={filteredTuman} dep={`t-${selectedViloyat}`} />
            </>
          )}

          {/* Live ping pulse */}
          {pingLatLng && (
            <CircleMarker
              center={pingLatLng}
              radius={6}
              pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2 }}
            >
              <LTooltip permanent direction="top" offset={[0, -8]}>
                <span style={{ color: '#fca5a5', fontWeight: 700, fontSize: 11 }}>⚡ Yangi alert</span>
              </LTooltip>
            </CircleMarker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
