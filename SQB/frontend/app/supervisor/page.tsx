'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Phone, Clock, CheckCircle2, Shield, RefreshCw, Activity,
  Users, AlertTriangle, TrendingUp, TrendingDown, Lightbulb,
  Sparkles, Target, Award, Flame, Zap, ChevronRight, Map as MapIcon,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { FilterType, RegionStat } from '@/components/UzbekistanMap';

const UzbekistanMap = dynamic(
  () => import('@/components/UzbekistanMap').then(m => m.UzbekistanMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
        Xarita yuklanmoqda...
      </div>
    ),
  }
);

// ─── Static analytics data (Excel-derived) ────────────────────────────────────
const intentData = [
  { name: 'Karta masalasi',  count: 12 },
  { name: 'Foiz stavkasi',   count: 12 },
  { name: 'Depozit ochish',  count: 11 },
  { name: "O'tkazma",        count: 9  },
  { name: "Kredit so'rash",  count: 6  },
];
const kycData = [
  { name: 'KYC Pasport',   pct: 66, key: 'pasport' },
  { name: 'KYC PINFL',     pct: 42, key: 'pinfl' },
  { name: 'AML Maqsad',    pct: 52, key: 'aml_maqsad' },
  { name: 'AML Manba',     pct: 44, key: 'aml_manba' },
  { name: 'PEP Tekshiruv', pct: 34, key: 'pep' },
];
const branchData = [
  { branch: 'F-002', calls: 8 }, { branch: 'F-009', calls: 8 },
  { branch: 'F-010', calls: 7 }, { branch: 'F-008', calls: 6 },
  { branch: 'F-006', calls: 6 }, { branch: 'F-003', calls: 6 },
  { branch: 'F-005', calls: 4 }, { branch: 'F-007', calls: 3 },
];
const segmentData = [
  { name: 'Mass',    value: 20, color: '#64748b' },
  { name: 'Premium', value: 17, color: '#6366f1' },
  { name: 'VIP',     value: 13, color: '#f59e0b' },
];
const funnelData = [
  { stage: "Qo'ng'iroqlar",     value: 50, color: '#6366f1' },
  { stage: "KYC o'tdi",         value: 38, color: '#8b5cf6' },
  { stage: 'Mahsulot taklif',   value: 22, color: '#ec4899' },
  { stage: 'Yakunlangan',       value: 14, color: '#10b981' },
];

// Sparklines (last 7 days) — mock trends
const sparklines = {
  calls:      [38, 42, 45, 41, 47, 49, 51],
  duration:   [320, 335, 350, 340, 345, 338, 340],
  completion: [22, 24, 25, 23, 26, 27, 28],
  compliance: [52, 50, 49, 48, 47, 46, 46],
};

// Sentiment trend (last 24 hours)
const sentimentTrend = Array.from({ length: 24 }, (_, h) => ({
  hour: `${String(h).padStart(2, '0')}:00`,
  score: Math.max(0, Math.min(100, 50 + Math.sin(h / 3) * 22 + (h > 14 ? -8 : 5) + (Math.random() * 6 - 3))),
}));

// Hourly call volume (today)
const hourlyVolume = Array.from({ length: 24 }, (_, h) => {
  const base = h < 9 ? 0 : h < 12 ? 4 + h - 9 : h < 14 ? 8 : h < 18 ? 6 - (h - 14) * 0.5 : h < 20 ? 3 : 0;
  return { hour: h, count: Math.max(0, Math.round(base + Math.random() * 2)) };
});

// Radar — top 3 operators on 5 axes
const radarData = [
  { axis: 'Sentiment',  OP017: 82, OP018: 70, OP021: 75 },
  { axis: 'Compliance', OP017: 78, OP018: 72, OP021: 58 },
  { axis: 'Conversion', OP017: 55, OP018: 38, OP021: 60 },
  { axis: 'Volume',     OP017: 65, OP018: 65, OP021: 50 },
  { axis: 'Tezlik',     OP017: 65, OP018: 80, OP021: 72 },
];

const coachingInsights = [
  {
    severity: 'critical' as const,
    icon: Flame,
    operator: 'OP007',
    observation: "Yuqori volume (5 ta), past compliance (47%)",
    action: 'PEP scenario coaching · 2 soat',
  },
  {
    severity: 'warning' as const,
    icon: Target,
    operator: 'OP024',
    observation: "0 ta yakunlangan — conversion past",
    action: 'Sales pitch training tavsiya',
  },
  {
    severity: 'info' as const,
    icon: TrendingDown,
    operator: 'F-007',
    observation: 'Eng past filial faolligi (3 ta)',
    action: 'Outreach kampaniya rejasi',
  },
  {
    severity: 'success' as const,
    icon: Sparkles,
    operator: 'OP017',
    observation: '78% compliance — model operator',
    action: 'Boshqalarga mentorlik beradi',
  },
];

// ─── Region statistics (per viloyat — must match geojson `name` field) ───────
const REGION_STATS: Record<string, RegionStat> = {
  'Toshkent shahar':              { calls: 22, alerts: 7, sentiment: 68, vip: 11, complianceLow: 38, topIntent: 'Karta masalasi',  topAlert: 'PEP aniqlandi' },
  'Toshkent viloyati':            { calls: 14, alerts: 4, sentiment: 72, vip: 6,  complianceLow: 32, topIntent: 'Depozit ochish',  topAlert: 'KYC tugagan' },
  'Samarqand viloyati':           { calls: 12, alerts: 3, sentiment: 75, vip: 5,  complianceLow: 28, topIntent: 'Foiz stavkasi' },
  'Andijon viloyati':             { calls: 11, alerts: 5, sentiment: 60, vip: 3,  complianceLow: 45, topIntent: "O'tkazma",        topAlert: 'AML xavfi' },
  "Farg'ona viloyati":            { calls: 13, alerts: 4, sentiment: 65, vip: 4,  complianceLow: 40, topIntent: "Kredit so'rash" },
  'Namangan viloyati':            { calls: 10, alerts: 3, sentiment: 70, vip: 3,  complianceLow: 35, topIntent: 'Karta masalasi' },
  'Buxoro viloyati':              { calls: 8,  alerts: 2, sentiment: 78, vip: 4,  complianceLow: 25, topIntent: 'Depozit ochish' },
  'Qashqadaryo viloyati':         { calls: 9,  alerts: 4, sentiment: 58, vip: 2,  complianceLow: 48, topIntent: 'Foiz stavkasi',   topAlert: 'KYC PINFL yo\'q' },
  'Surxondaryo viloyati':         { calls: 6,  alerts: 2, sentiment: 62, vip: 2,  complianceLow: 42, topIntent: "Kredit so'rash" },
  'Xorazm viloyati':              { calls: 7,  alerts: 2, sentiment: 72, vip: 2,  complianceLow: 30, topIntent: "O'tkazma" },
  'Navoiy viloyati':              { calls: 5,  alerts: 1, sentiment: 80, vip: 3,  complianceLow: 22, topIntent: 'Depozit ochish' },
  'Jizzax viloyati':              { calls: 5,  alerts: 2, sentiment: 64, vip: 1,  complianceLow: 38, topIntent: 'Karta masalasi' },
  'Sirdaryo viloyati':            { calls: 4,  alerts: 1, sentiment: 70, vip: 1,  complianceLow: 32, topIntent: 'Foiz stavkasi' },
  "Qoraqolpog'iston Respublikasi": { calls: 6, alerts: 3, sentiment: 55, vip: 2,  complianceLow: 52, topIntent: "Kredit so'rash", topAlert: 'AML manba' },
};

const REGION_NAMES = Object.keys(REGION_STATS);

const filterChips: { key: FilterType; label: string; icon: typeof Phone; color: string }[] = [
  { key: 'calls',      label: "Qo'ng'iroqlar",  icon: Phone,         color: '#6366f1' },
  { key: 'alerts',     label: 'Muammolar',      icon: AlertTriangle, color: '#ef4444' },
  { key: 'sentiment',  label: 'Sentiment',      icon: Activity,      color: '#10b981' },
  { key: 'vip',        label: 'VIP mijozlar',   icon: Award,         color: '#f59e0b' },
  { key: 'compliance', label: 'Compliance past', icon: Shield,       color: '#dc2626' },
];

// ─── Live monitoring mock ─────────────────────────────────────────────────────
const OPERATORS = ['Karimova Malika', 'Yusupov Jasur', 'Toshmatova Nozima', 'Rahimov Sherzod', 'Mirzaeva Dildora'];
const CUSTOMERS = ['Azimov Bobur', 'Sobirov Ulugbek', 'Nazarova Feruza', 'Qodirov Mansur', 'Holmatova Zilola'];
type SentimentType = 'positive' | 'neutral' | 'negative';

interface ActiveCall {
  id: number; operator: string; customer: string;
  duration: number; sentiment: SentimentType; sentimentScore: number; alerts: number;
}
interface ComplianceAlert {
  id: number; severity: 'critical' | 'high' | 'medium' | 'low';
  operator: string; description: string; time: string;
}
interface OperatorRanking {
  rank: number; name: string; score: number; calls: number; conversion: number; trend: number;
}

function generateActiveCalls(): ActiveCall[] {
  const sentiments: SentimentType[] = ['positive', 'neutral', 'negative'];
  return Array.from({ length: Math.floor(Math.random() * 4) + 2 }, (_, i) => {
    const s = sentiments[Math.floor(Math.random() * 3)];
    return {
      id: i + 1,
      operator: OPERATORS[i % OPERATORS.length],
      customer: CUSTOMERS[i % CUSTOMERS.length],
      duration: Math.floor(Math.random() * 600) + 30,
      sentiment: s,
      sentimentScore: s === 'positive' ? 70 + Math.random() * 25 : s === 'negative' ? 15 + Math.random() * 25 : 40 + Math.random() * 20,
      alerts: Math.floor(Math.random() * 3),
    };
  });
}

function generateAlerts(): ComplianceAlert[] {
  const items = [
    { severity: 'critical' as const, desc: 'Ommaviy shaxs (PEP) aniqlandi — majburiy eskalatsiya' },
    { severity: 'high' as const, desc: "Foiz stavkasi noto'g'ri taqdim etildi" },
    { severity: 'medium' as const, desc: "KYC tekshiruvi to'liq o'tkazilmadi" },
    { severity: 'high' as const, desc: "AML xavf darajasi yangilandi: O'rta" },
  ];
  return items.slice(0, Math.floor(Math.random() * 3) + 2).map((item, i) => ({
    id: i + 1, severity: item.severity, operator: OPERATORS[i % OPERATORS.length],
    description: item.desc,
    time: `${Math.floor(Math.random() * 30) + 1} daq oldin`,
  }));
}

function generateRankings(): OperatorRanking[] {
  return OPERATORS.map((name, i) => ({
    rank: i + 1, name,
    score: Math.floor(95 - i * 6 + Math.random() * 5),
    calls: Math.floor(Math.random() * 20) + 5,
    conversion: Math.floor(Math.random() * 40) + 40,
    trend: Math.floor(Math.random() * 14) - 5,
  })).sort((a, b) => b.score - a.score).map((o, i) => ({ ...o, rank: i + 1 }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sentimentBarColor(s: SentimentType) {
  return s === 'positive' ? 'bg-emerald-500' : s === 'negative' ? 'bg-red-500' : 'bg-amber-500';
}
function severityClass(s: string) {
  return s === 'critical'
    ? 'bg-red-500/15 text-red-300 border-red-500/40'
    : s === 'high'
    ? 'bg-red-700/20 text-red-300 border-red-700/40'
    : s === 'medium'
    ? 'bg-amber-700/20 text-amber-300 border-amber-700/40'
    : 'bg-slate-800 text-slate-300 border-slate-700';
}
function formatDuration(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}
function ringColor(pct: number) {
  return pct >= 60 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
}
function ringTextColor(pct: number) {
  return pct >= 60 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400';
}

const tooltipStyle = {
  contentStyle: { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', color: '#f8fafc', fontSize: '12px', padding: '8px 12px' },
  itemStyle: { color: '#cbd5e1' }, labelStyle: { color: '#94a3b8' },
};

// ─── Reusable visual components ───────────────────────────────────────────────

function CountUp({ end, duration = 900, decimals = 0, suffix = '' }: { end: number; duration?: number; decimals?: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(end * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);
  return <>{val.toFixed(decimals)}{suffix}</>;
}

function Sparkline({ data, color, width = 80, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  const areaPts = `0,${height} ${pts} ${width},${height}`;
  const id = `sg-${color.replace('#', '')}`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Ring({ pct, size = 90, label, sublabel }: { pct: number; size?: number; label?: string; sublabel?: string }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color = ringColor(pct);
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="#1e293b" strokeWidth="6" fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={color} strokeWidth="6" fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease-out', filter: `drop-shadow(0 0 6px ${color}66)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-black text-lg ${ringTextColor(pct)}`}>
            <CountUp end={pct} suffix="%" />
          </span>
        </div>
      </div>
      {label && <p className="text-slate-300 text-xs font-medium mt-2 text-center">{label}</p>}
      {sublabel && <p className="text-slate-500 text-[10px] text-center">{sublabel}</p>}
    </div>
  );
}

function HealthGauge({ score }: { score: number }) {
  const r = 90, cx = 110, cy = 110;
  const startAngle = 180, endAngle = 0;
  const angle = startAngle - (score / 100) * (startAngle - endAngle);
  const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
  const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
  const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
  const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);
  const xa = cx + r * Math.cos((angle * Math.PI) / 180);
  const ya = cy + r * Math.sin((angle * Math.PI) / 180);
  const color = ringColor(score);
  return (
    <div className="relative flex flex-col items-center">
      <svg width="220" height="140" viewBox="0 0 220 140">
        <defs>
          <linearGradient id="gauge-bg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`} stroke="#1e293b" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path
          d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${xa} ${ya}`}
          stroke="url(#gauge-bg)" strokeWidth="14" fill="none" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}88)` }}
        />
        <text x="110" y="100" textAnchor="middle" className="fill-white font-black" style={{ fontSize: '40px' }}>
          {Math.round(score)}
        </text>
        <text x="110" y="125" textAnchor="middle" className="fill-slate-500" style={{ fontSize: '10px', letterSpacing: '1.5px' }}>
          / 100
        </text>
      </svg>
    </div>
  );
}

function Funnel({ data }: { data: typeof funnelData }) {
  const maxVal = data[0].value;
  return (
    <div className="space-y-1.5">
      {data.map((d, i) => {
        const widthPct = (d.value / maxVal) * 100;
        const dropOff = i > 0 ? Math.round(((data[i - 1].value - d.value) / data[i - 1].value) * 100) : 0;
        return (
          <div key={d.stage}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">{d.stage}</span>
              <div className="flex items-center gap-2">
                {i > 0 && (
                  <span className="text-red-400 text-[10px]">▼ {dropOff}%</span>
                )}
                <span className="text-white font-bold">{d.value}</span>
              </div>
            </div>
            <div className="h-7 bg-slate-800/50 rounded-md overflow-hidden">
              <div
                className="h-full rounded-md flex items-center justify-end pr-2 text-[10px] font-bold text-white transition-all duration-700"
                style={{ width: `${widthPct}%`, background: `linear-gradient(to right, ${d.color}88, ${d.color})` }}
              >
                {Math.round((d.value / maxVal) * 100)}%
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Heatmap({ data }: { data: typeof hourlyVolume }) {
  const max = Math.max(...data.map(d => d.count));
  return (
    <div>
      <div className="grid grid-cols-24 gap-1" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
        {data.map(d => {
          const intensity = max > 0 ? d.count / max : 0;
          const opacity = 0.1 + intensity * 0.9;
          const isPeak = d.count === max && max > 0;
          return (
            <div key={d.hour} className="relative group">
              <div
                className={`h-12 rounded-md transition-all hover:scale-110 ${isPeak ? 'ring-2 ring-amber-400/60' : ''}`}
                style={{ background: d.count > 0 ? `rgba(99, 102, 241, ${opacity})` : '#1e293b' }}
              />
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                {String(d.hour).padStart(2, '0')}:00 — {d.count} ta
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid gap-1 mt-1.5" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
        {data.map(d => (
          <div key={d.hour} className="text-center text-[9px] text-slate-600 font-mono">
            {d.hour % 3 === 0 ? String(d.hour).padStart(2, '0') : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function RegionDetailPanel({ name, stat, onClose }: { name: string; stat: RegionStat; onClose: () => void }) {
  const sentimentColor = stat.sentiment >= 70 ? 'text-emerald-400' : stat.sentiment >= 50 ? 'text-amber-400' : 'text-red-400';
  const complianceColor = stat.complianceLow >= 45 ? 'text-red-400' : stat.complianceLow >= 30 ? 'text-amber-400' : 'text-emerald-400';
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-800 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">Tanlangan</p>
          <h3 className="text-white font-bold text-sm leading-tight truncate">{name}</h3>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Headline number */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-2.5">
            <p className="text-[10px] uppercase text-slate-500 mb-0.5">Qo&apos;ng&apos;iroq</p>
            <p className="text-white text-2xl font-black leading-none">{stat.calls}</p>
          </div>
          <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-2.5">
            <p className="text-[10px] uppercase text-red-300 mb-0.5">Alert</p>
            <p className="text-red-400 text-2xl font-black leading-none">{stat.alerts}</p>
          </div>
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-2.5">
            <p className="text-[10px] uppercase text-amber-300 mb-0.5">VIP mijoz</p>
            <p className="text-amber-400 text-2xl font-black leading-none">{stat.vip}</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-2.5">
            <p className="text-[10px] uppercase text-slate-500 mb-0.5">Sentiment</p>
            <p className={`text-2xl font-black leading-none ${sentimentColor}`}>{stat.sentiment}%</p>
          </div>
        </div>

        {/* Top intent */}
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
          <p className="text-[10px] uppercase text-indigo-300 font-bold mb-1">Asosiy mavzu</p>
          <p className="text-white text-sm font-semibold">{stat.topIntent}</p>
        </div>

        {/* Top alert */}
        {stat.topAlert && (
          <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-3">
            <p className="text-[10px] uppercase text-red-300 font-bold mb-1 flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" /> Eng kritik
            </p>
            <p className="text-white text-xs font-medium">{stat.topAlert}</p>
          </div>
        )}

        {/* Compliance bar */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase text-slate-500 font-bold">Compliance past</p>
            <p className={`text-xs font-bold ${complianceColor}`}>{stat.complianceLow}%</p>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${stat.complianceLow}%`, background: stat.complianceLow >= 45 ? '#ef4444' : stat.complianceLow >= 30 ? '#f59e0b' : '#10b981' }}
            />
          </div>
        </div>

        <div className="text-center pt-2">
          <p className="text-[10px] text-slate-500">Tumanlar uchun xaritada bosing</p>
        </div>
      </div>
    </div>
  );
}

function CountrySummaryPanel({ filter }: { filter: FilterType }) {
  const totalCalls = Object.values(REGION_STATS).reduce((s, r) => s + r.calls, 0);
  const totalAlerts = Object.values(REGION_STATS).reduce((s, r) => s + r.alerts, 0);
  const totalVip = Object.values(REGION_STATS).reduce((s, r) => s + r.vip, 0);
  const avgSentiment = Math.round(Object.values(REGION_STATS).reduce((s, r) => s + r.sentiment, 0) / REGION_NAMES.length);
  const top3 = [...REGION_NAMES].sort((a, b) => {
    const sa = REGION_STATS[a], sb = REGION_STATS[b];
    if (filter === 'alerts') return sb.alerts - sa.alerts;
    if (filter === 'vip') return sb.vip - sa.vip;
    if (filter === 'compliance') return sb.complianceLow - sa.complianceLow;
    if (filter === 'sentiment') return sa.sentiment - sb.sentiment; // lowest sentiment = needs attention
    return sb.calls - sa.calls;
  }).slice(0, 5);

  const topLabel = filter === 'alerts' ? 'Eng ko\'p alert' : filter === 'vip' ? 'Eng ko\'p VIP' : filter === 'compliance' ? 'Eng past compliance' : filter === 'sentiment' ? 'Eng past sentiment' : 'Eng faol';
  const valueLabel = (n: string) => {
    const s = REGION_STATS[n];
    if (filter === 'alerts') return `${s.alerts} alert`;
    if (filter === 'vip') return `${s.vip} VIP`;
    if (filter === 'compliance') return `${s.complianceLow}% past`;
    if (filter === 'sentiment') return `${s.sentiment}%`;
    return `${s.calls} ta`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-800">
        <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">Umumiy</p>
        <h3 className="text-white font-bold text-sm">O&apos;zbekiston bo&apos;ylab</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Mini stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-2.5">
            <p className="text-[10px] uppercase text-slate-500">Qo&apos;ng&apos;iroqlar</p>
            <p className="text-white text-xl font-black">{totalCalls}</p>
          </div>
          <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-2.5">
            <p className="text-[10px] uppercase text-red-300">Alertlar</p>
            <p className="text-red-400 text-xl font-black">{totalAlerts}</p>
          </div>
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-2.5">
            <p className="text-[10px] uppercase text-amber-300">VIP mijoz</p>
            <p className="text-amber-400 text-xl font-black">{totalVip}</p>
          </div>
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-2.5">
            <p className="text-[10px] uppercase text-emerald-300">O&apos;rt. sentiment</p>
            <p className="text-emerald-400 text-xl font-black">{avgSentiment}%</p>
          </div>
        </div>

        {/* Top 5 by current filter */}
        <div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">{topLabel}</p>
          <div className="space-y-1.5">
            {top3.map((n, i) => (
              <div key={n} className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/50 rounded-lg p-2">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-[10px] font-bold text-indigo-300 flex-shrink-0">{i + 1}</span>
                <span className="text-white text-xs font-medium flex-1 min-w-0 truncate">{n}</span>
                <span className="text-[10px] font-bold text-slate-300 flex-shrink-0">{valueLabel(n)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center pt-2 border-t border-slate-800/60">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Viloyatga bosib tafsilot oling.<br />Tumanlar uchun yana bosing.
          </p>
        </div>
      </div>
    </div>
  );
}

function MedalBadge({ rank }: { rank: number }) {
  if (rank === 1) return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center text-white text-xs font-black shadow-[0_0_12px_rgba(251,191,36,0.5)]">🥇</div>;
  if (rank === 2) return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-white text-xs font-black">🥈</div>;
  if (rank === 3) return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center text-white text-xs font-black">🥉</div>;
  return <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold">{rank}</div>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<'live' | 'analytics'>('live');
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [rankings, setRankings] = useState<OperatorRanking[]>([]);
  const [lastRefresh, setLastRefresh] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mapFilter, setMapFilter] = useState<FilterType>('alerts');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [pingRegion, setPingRegion] = useState<string | null>(null);

  // Live ping rotation — random region every 4-6s when filter is alerts/calls
  useEffect(() => {
    if (mapFilter !== 'alerts' && mapFilter !== 'calls') {
      const t = setTimeout(() => setPingRegion(null), 0);
      return () => clearTimeout(t);
    }
    const tick = () => {
      const candidates = mapFilter === 'alerts'
        ? REGION_NAMES.filter(n => REGION_STATS[n].alerts >= 3)
        : REGION_NAMES;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      setPingRegion(pick);
    };
    const t = setTimeout(tick, 0);
    const id = setInterval(tick, 4500);
    return () => { clearTimeout(t); clearInterval(id); };
  }, [mapFilter]);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setActiveCalls(generateActiveCalls());
      setAlerts(generateAlerts());
      setRankings(generateRankings());
      setLastRefresh(new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setIsRefreshing(false);
    }, 600);
  }, []);

  useEffect(() => {
    const t = setTimeout(refresh, 0);
    const id = setInterval(refresh, 5000);
    return () => { clearTimeout(t); clearInterval(id); };
  }, [refresh]);

  // Composite KYC health score
  const complianceHealth = useMemo(
    () => Math.round(kycData.reduce((s, k) => s + k.pct, 0) / kycData.length),
    []
  );

  // Live avg sentiment of active calls
  const liveSentimentAvg = useMemo(() => {
    if (!activeCalls.length) return 50;
    return Math.round(activeCalls.reduce((s, c) => s + c.sentimentScore, 0) / activeCalls.length);
  }, [activeCalls]);

  // KPI definitions
  const kpis = [
    { icon: Phone,        label: "Jami qo'ng'iroqlar", end: 51, suffix: '', sub: `${activeCalls.length} faol hozir`, delta: '+8%', deltaUp: true,  color: '#6366f1', sparkColor: '#818cf8', spark: sparklines.calls },
    { icon: Clock,        label: "O'rt. davomiylik",   end: 5.4, decimals: 1, suffix: ' daq', sub: '340 sek',            delta: '-2%', deltaUp: true,  color: '#a855f7', sparkColor: '#c084fc', spark: sparklines.duration },
    { icon: CheckCircle2, label: 'Yakunlash darajasi', end: 28, suffix: '%', sub: '14 / 50',                              delta: '+3%', deltaUp: true,  color: '#10b981', sparkColor: '#34d399', spark: sparklines.completion },
    { icon: Shield,       label: 'KYC Compliance',     end: 46, suffix: '%', sub: 'Past — diqqat kerak',                  delta: '-4%', deltaUp: false, color: '#ef4444', sparkColor: '#f87171', spark: sparklines.compliance },
  ];

  // Action Center derivation
  const topAlert = alerts.find(a => a.severity === 'critical') ?? alerts[0];
  const lowestKyc = kycData.reduce((a, b) => (a.pct < b.pct ? a : b));

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-950 relative">
      {/* Subtle bg glow */}
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse at 20% 0%, rgba(99,102,241,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(236,72,153,0.04) 0%, transparent 50%)' }} />

      {/* ── KPI cards ── */}
      <div className="relative z-10 flex-shrink-0 px-5 pt-4 pb-0 space-y-3">
        <div className="grid grid-cols-4 gap-3">
          {kpis.map(({ icon: Icon, label, end, decimals, suffix, sub, delta, deltaUp, color, sparkColor, spark }) => (
            <div
              key={label}
              className="group relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800/60 p-4 transition-all hover:border-indigo-500/30 hover:scale-[1.01]"
              style={{ boxShadow: `0 0 30px ${color}10` }}
            >
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-20 group-hover:opacity-30 transition-opacity"
                style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }} />
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}33`, border: `1px solid ${color}55` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">{label}</p>
                  </div>
                  <p className="text-white text-3xl font-black leading-tight tabular-nums">
                    <CountUp end={end} decimals={decimals ?? 0} suffix={suffix} />
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`flex items-center gap-0.5 text-[10px] font-bold ${deltaUp ? 'text-emerald-400' : 'text-red-400'}`}>
                      {deltaUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      {delta}
                    </span>
                    <span className="text-slate-500 text-[10px]">{sub}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 mt-1">
                  <Sparkline data={spark} color={sparkColor} width={70} height={28} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + refresh */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-slate-900/60 border border-slate-800/60 p-1 rounded-xl backdrop-blur">
            {([['live', 'Jonli Monitoring'], ['analytics', 'Tahlil']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  tab === key
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-[0_0_16px_rgba(99,102,241,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {key === 'live' && tab === key && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />}
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800/60 px-2.5 py-1 rounded-lg">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span className="font-mono text-slate-400">{lastRefresh}</span>
            </div>
            <button
              onClick={refresh}
              className={`p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="relative z-10 flex-1 overflow-y-auto min-h-0 p-5 pt-4">

        {/* ══ JONLI MONITORING ══ */}
        {tab === 'live' && (
          <div className="space-y-5">

            {/* ══ GEO MAP BLOCK ══ */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800/60 overflow-hidden">
              <div className="grid grid-cols-[1fr_280px]">

                {/* Map column */}
                <div className="flex flex-col" style={{ height: '440px' }}>
                  {/* Header w/ filter chips */}
                  <div className="flex-shrink-0 px-4 py-3 border-b border-slate-800 flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <MapIcon className="w-4 h-4 text-indigo-400" />
                      <span className="text-white font-semibold text-sm">Geografik Monitoring</span>
                      <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                        LIVE
                      </span>
                    </div>
                    <div className="ml-auto flex items-center gap-1 bg-slate-800/40 border border-slate-700/50 p-1 rounded-lg overflow-x-auto">
                      {filterChips.map(({ key, label, icon: Icon, color }) => (
                        <button
                          key={key}
                          onClick={() => { setMapFilter(key); setSelectedRegion(null); }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
                            mapFilter === key
                              ? 'text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                          }`}
                          style={mapFilter === key ? { background: `${color}28`, border: `1px solid ${color}55` } : undefined}
                        >
                          <Icon className="w-3 h-3" style={mapFilter === key ? { color } : undefined} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Map */}
                  <div className="flex-1 min-h-0">
                    <UzbekistanMap
                      filter={mapFilter}
                      regionStats={REGION_STATS}
                      onRegionSelect={setSelectedRegion}
                      pingRegion={pingRegion}
                    />
                  </div>
                </div>

                {/* Side panel */}
                <div className="border-l border-slate-800/60 flex flex-col" style={{ height: '440px' }}>
                  {selectedRegion && REGION_STATS[selectedRegion] ? (
                    <RegionDetailPanel name={selectedRegion} stat={REGION_STATS[selectedRegion]} onClose={() => setSelectedRegion(null)} />
                  ) : (
                    <CountrySummaryPanel filter={mapFilter} />
                  )}
                </div>
              </div>
            </div>

            {/* Action Center */}
            <div className="grid grid-cols-3 gap-3">
              {/* KRITIK */}
              <div className="relative overflow-hidden bg-gradient-to-br from-red-950/50 to-slate-950 border border-red-500/30 rounded-2xl p-4 group">
                <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full m-3 animate-pulse" />
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <p className="text-[10px] uppercase tracking-[1.5px] font-bold text-red-300">Kritik · darhol</p>
                </div>
                <p className="text-sm text-white font-semibold leading-snug mb-1 line-clamp-2">
                  {topAlert ? topAlert.description : 'Hozir kritik alert yo\'q'}
                </p>
                <p className="text-[10px] text-slate-400 mb-3">
                  {topAlert ? `${topAlert.operator} · ${topAlert.time}` : '—'}
                </p>
                <button className="w-full text-xs bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-medium py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors">
                  Ko&apos;rish <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* DIQQAT */}
              <div className="relative overflow-hidden bg-gradient-to-br from-amber-950/40 to-slate-950 border border-amber-500/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center">
                    <Target className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <p className="text-[10px] uppercase tracking-[1.5px] font-bold text-amber-300">Diqqat · coaching</p>
                </div>
                <p className="text-sm text-white font-semibold leading-snug mb-1">
                  {lowestKyc.name} faqat {lowestKyc.pct}%
                </p>
                <p className="text-[10px] text-slate-400 mb-3">Operatorlarni qayta o&apos;qitish kerak</p>
                <button className="w-full text-xs bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-medium py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors">
                  Tafsilot <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* IMKONIYAT */}
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950/40 to-slate-950 border border-emerald-500/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <p className="text-[10px] uppercase tracking-[1.5px] font-bold text-emerald-300">Imkoniyat · sales</p>
                </div>
                <p className="text-sm text-white font-semibold leading-snug mb-1">
                  VIP segment · 87% accept rate
                </p>
                <p className="text-[10px] text-slate-400 mb-3">13 mijoz · kross-sotuv kampaniya</p>
                <button className="w-full text-xs bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-medium py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors">
                  Reja qil <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Active calls + sidebar */}
            <div className="grid grid-cols-3 gap-5">
              <div className="col-span-2 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800/60 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span className="text-white font-medium text-sm">Faol Qo&apos;ng&apos;iroqlar</span>
                  <span className="ml-2 px-2 py-0.5 bg-indigo-500/15 text-indigo-300 text-xs rounded-full border border-indigo-500/40 font-bold">
                    {activeCalls.length} ta
                  </span>
                  <div className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    Real-time
                  </div>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800/60">
                      {['Operator', 'Mijoz', 'Davomiylik', 'Hissiyot', 'Holat', 'Alert'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-slate-500 text-[10px] font-bold uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {activeCalls.map(call => (
                      <tr key={call.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
                              {call.operator[0]}
                            </div>
                            <span className="text-white text-xs font-medium">{call.operator}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs">{call.customer}</td>
                        <td className="px-4 py-3 text-slate-300 font-mono text-xs">{formatDuration(call.duration)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 w-28">
                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${sentimentBarColor(call.sentiment)} transition-all duration-700`}
                                style={{ width: `${call.sentimentScore}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-bold ${call.sentiment === 'positive' ? 'text-emerald-400' : call.sentiment === 'negative' ? 'text-red-400' : 'text-amber-400'}`}>
                              {Math.round(call.sentimentScore)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-900/30 text-emerald-300 text-[10px] rounded-full border border-emerald-700/40 font-bold">
                            <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                            JONLI
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {call.alerts > 0 ? (
                            <span className="flex items-center gap-1 text-red-400 text-xs font-bold">
                              <AlertTriangle className="w-3 h-3" /> {call.alerts}
                            </span>
                          ) : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                    {activeCalls.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500 text-sm">Faol qo&apos;ng&apos;iroqlar yo&apos;q</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Live sentiment pulse */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800/60 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] uppercase tracking-[1.5px] font-bold text-slate-400">Jonli sentiment</span>
                  </div>
                  <div className="flex items-center justify-center my-1">
                    <Ring pct={liveSentimentAvg} size={100} />
                  </div>
                  <p className="text-center text-[10px] text-slate-500">
                    {activeCalls.length} ta faol qo&apos;ng&apos;iroq o&apos;rtachasi
                  </p>
                </div>

                {/* Alerts */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800/60 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-white text-xs font-semibold">Ogohlantirishlar</span>
                    <span className="ml-auto text-[10px] bg-red-500/15 text-red-300 border border-red-500/40 px-1.5 py-0.5 rounded-full font-bold">
                      {alerts.length}
                    </span>
                  </div>
                  <div className="p-2.5 space-y-1.5 max-h-44 overflow-y-auto">
                    {alerts.map(a => (
                      <div
                        key={a.id}
                        className={`rounded-lg p-2.5 border transition-all ${
                          a.severity === 'critical'
                            ? 'bg-red-950/40 border-red-500/30 shadow-[0_0_16px_rgba(239,68,68,0.15)]'
                            : 'bg-slate-800/40 border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${severityClass(a.severity)}`}>
                            {a.severity.toUpperCase()}
                          </span>
                          <span className="text-slate-500 text-[10px]">{a.time}</span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-snug">{a.description}</p>
                        <p className="text-slate-500 text-[10px] mt-1">{a.operator}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top 3 medals */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800/60 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-white text-xs font-semibold">Top Operatorlar</span>
                  </div>
                  <div className="p-2.5 space-y-1.5">
                    {rankings.slice(0, 5).map(r => (
                      <div key={r.rank} className="flex items-center gap-2.5 p-2 bg-slate-800/40 rounded-lg hover:bg-slate-800/60 transition-colors">
                        <MedalBadge rank={r.rank} />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{r.name}</p>
                          <p className="text-slate-500 text-[10px]">{r.calls} ta · {r.conversion}% konv.</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-black ${r.score >= 80 ? 'text-emerald-400' : r.score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{r.score}</p>
                          <p className={`text-[10px] flex items-center justify-end gap-0.5 ${r.trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {r.trend >= 0 ? <TrendingUp className="w-2 h-2" /> : <TrendingDown className="w-2 h-2" />}
                            {Math.abs(r.trend)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAHLIL ══ */}
        {tab === 'analytics' && (
          <div className="space-y-5">

            {/* Row 1: Health Gauge + Sentiment Trend */}
            <div className="grid grid-cols-[320px_1fr] gap-5">
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800/60 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <h3 className="text-white font-semibold text-sm">Compliance Health</h3>
                </div>
                <p className="text-slate-500 text-[11px] mb-2">5 ta KYC/AML metric o&apos;rtachasi</p>
                <HealthGauge score={complianceHealth} />
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className={`flex items-center gap-1 text-xs font-bold ${complianceHealth >= 60 ? 'text-emerald-400' : complianceHealth >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                    {complianceHealth >= 60 ? '✓ Yaxshi' : complianceHealth >= 40 ? '⚠ O\'rta' : '✗ Past'}
                  </span>
                  <span className="text-slate-500 text-[11px]">·</span>
                  <span className="text-red-400 text-xs font-bold flex items-center gap-0.5">
                    <TrendingDown className="w-3 h-3" /> -4% (hafta)
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800/60 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <h3 className="text-white font-semibold text-sm">Mijoz hissiyoti — bugun</h3>
                </div>
                <p className="text-slate-500 text-[11px] mb-3">24 soatlik o&apos;rtacha sentiment trayektoriyasi</p>
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={sentimentTrend}>
                    <defs>
                      <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
                        <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 10 }} interval={2} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip {...tooltipStyle} formatter={(v) => [`${Math.round(Number(v))}%`, 'Sentiment']} />
                    <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} fill="url(#sentGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row 2: KYC ring grid */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <h3 className="text-white font-semibold text-sm">KYC / AML Compliance</h3>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">Har bir tekshiruv necha foiz qo&apos;ng&apos;iroqda bajarilgan</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">O&apos;rtacha</p>
                  <p className={`text-2xl font-black ${ringTextColor(complianceHealth)}`}>{complianceHealth}%</p>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {kycData.map(d => <Ring key={d.key} pct={d.pct} size={110} label={d.name} />)}
              </div>
              <div className="mt-4 flex items-start gap-2 bg-amber-950/30 border border-amber-500/30 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-200 text-xs leading-relaxed">
                  <strong>PEP tekshiruvi 34%</strong>, <strong>KYC PINFL 42%</strong> — operatorlarni qayta o&apos;qitish tavsiya etiladi.
                  Eng past metric uchun coaching modulini ishga tushirish kerak.
                </p>
              </div>
            </div>

            {/* Row 3: Intent + Funnel */}
            <div className="grid grid-cols-[1fr_320px] gap-5">
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800/60 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <h3 className="text-white font-semibold text-sm">Murojaat Sabablari</h3>
                </div>
                <p className="text-slate-500 text-[11px] mb-3">Qo&apos;ng&apos;iroqdagi asosiy mavzu</p>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={intentData} layout="vertical">
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 14]} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={115} />
                    <Tooltip {...tooltipStyle} formatter={(v) => [`${v} ta`, 'Soni']} />
                    <Bar dataKey="count" fill="url(#barGrad)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800/60 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-3.5 h-3.5 text-pink-400" />
                  <h3 className="text-white font-semibold text-sm">Konversiya Voronkasi</h3>
                </div>
                <p className="text-slate-500 text-[11px] mb-3">Qo&apos;ng&apos;iroqdan sotuvgacha</p>
                <Funnel data={funnelData} />
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Umumiy konversiya</span>
                  <span className="text-emerald-400 font-black text-base">28%</span>
                </div>
              </div>
            </div>

            {/* Row 4: Operator Radar + Coaching */}
            <div className="grid grid-cols-[1fr_320px] gap-5">
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800/60 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <h3 className="text-white font-semibold text-sm">Top Operator Profillari</h3>
                </div>
                <p className="text-slate-500 text-[11px] mb-3">5 ta o&apos;lchov bo&apos;yicha taqqoslash</p>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#1e293b" />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} />
                    <Radar name="OP017" dataKey="OP017" stroke="#10b981" fill="#10b981" fillOpacity={0.25} strokeWidth={2} />
                    <Radar name="OP018" dataKey="OP018" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                    <Radar name="OP021" dataKey="OP021" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
                    <Tooltip {...tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-slate-300">OP017</span></span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" /><span className="text-slate-300">OP018</span></span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-slate-300">OP021</span></span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800/60 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  <h3 className="text-white font-semibold text-sm">Coaching Tavsiyalari</h3>
                </div>
                <p className="text-slate-500 text-[11px] mb-3">AI tahlilidan kelib chiqib</p>
                <div className="space-y-2">
                  {coachingInsights.map((ins, i) => {
                    const Icon = ins.icon;
                    const palette = ins.severity === 'critical' ? { bg: 'from-red-950/40', border: 'border-red-500/30', icon: 'text-red-400', iconBg: 'bg-red-500/20 border-red-500/40' }
                      : ins.severity === 'warning' ? { bg: 'from-amber-950/30', border: 'border-amber-500/30', icon: 'text-amber-400', iconBg: 'bg-amber-500/20 border-amber-500/40' }
                      : ins.severity === 'success' ? { bg: 'from-emerald-950/30', border: 'border-emerald-500/30', icon: 'text-emerald-400', iconBg: 'bg-emerald-500/20 border-emerald-500/40' }
                      : { bg: 'from-indigo-950/30', border: 'border-indigo-500/30', icon: 'text-indigo-400', iconBg: 'bg-indigo-500/20 border-indigo-500/40' };
                    return (
                      <div key={i} className={`bg-gradient-to-br ${palette.bg} to-slate-900/40 border ${palette.border} rounded-xl p-3`}>
                        <div className="flex items-start gap-2">
                          <div className={`w-7 h-7 rounded-lg border ${palette.iconBg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-3.5 h-3.5 ${palette.icon}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-bold mb-0.5">{ins.operator}</p>
                            <p className="text-slate-300 text-[11px] leading-snug mb-1.5">{ins.observation}</p>
                            <p className={`text-[10px] font-medium ${palette.icon}`}>→ {ins.action}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Row 5: Branch leaderboard + Segments */}
            <div className="grid grid-cols-[1fr_280px] gap-5">
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800/60 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <h3 className="text-white font-semibold text-sm">Filial Faolligi</h3>
                </div>
                <p className="text-slate-500 text-[11px] mb-3">Eng faol filiallar reytingi</p>
                <div className="space-y-2">
                  {branchData.map((b, i) => {
                    const max = branchData[0].calls;
                    const widthPct = (b.calls / max) * 100;
                    return (
                      <div key={b.branch} className="flex items-center gap-3">
                        <MedalBadge rank={i + 1} />
                        <span className="text-slate-300 font-mono text-xs w-14 flex-shrink-0">{b.branch}</span>
                        <div className="flex-1 h-6 bg-slate-800/50 rounded-md overflow-hidden">
                          <div
                            className="h-full rounded-md flex items-center justify-end pr-2 text-[10px] font-bold text-white transition-all duration-700"
                            style={{ width: `${widthPct}%`, background: i === 0 ? 'linear-gradient(to right, #f59e0b88, #f59e0b)' : 'linear-gradient(to right, #6366f188, #6366f1)' }}
                          >
                            {b.calls} ta
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800/60 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <h3 className="text-white font-semibold text-sm">Mijoz Segmentlari</h3>
                </div>
                <p className="text-slate-500 text-[11px] mb-1">50 ta mijoz · CRM</p>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={segmentData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                      {segmentData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v} ta`, String(n)]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5">
                  {segmentData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                        <span className="text-slate-300">{d.name}</span>
                      </div>
                      <span className="text-white font-bold">{d.value} ta</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 6: Hourly Heatmap */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800/60 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <h3 className="text-white font-semibold text-sm">Soatlik Yuklanish</h3>
              </div>
              <p className="text-slate-500 text-[11px] mb-4">Bugun · har soatda nechta qo&apos;ng&apos;iroq · ⓘ peak vaqtga ⭐ amber halqa</p>
              <Heatmap data={hourlyVolume} />
              <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500">
                <span>00:00</span>
                <div className="flex items-center gap-1.5">
                  <span>Past</span>
                  {[0.15, 0.3, 0.5, 0.7, 1].map((o, i) => (
                    <div key={i} className="w-4 h-3 rounded-sm" style={{ background: `rgba(99, 102, 241, ${o})` }} />
                  ))}
                  <span>Yuqori</span>
                </div>
                <span>23:00</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
