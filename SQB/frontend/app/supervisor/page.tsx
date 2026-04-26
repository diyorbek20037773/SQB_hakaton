'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Phone, TrendingUp, Shield, AlertTriangle,
  RefreshCw, Activity, CheckCircle2, Clock,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ─── Analytics real data (keyes12_call_center_data.xlsx) ─────────────────────
const intentData = [
  { name: 'Karta masalasi',  count: 12 },
  { name: 'Foiz stavkasi',   count: 12 },
  { name: 'Depozit ochish',  count: 11 },
  { name: "O'tkazma",        count: 9  },
  { name: "Kredit so'rash",  count: 6  },
];
const saleResultData = [
  { name: 'Yakunlangan', value: 14, color: '#10b981' },
  { name: 'Kutilmoqda',  value: 19, color: '#f59e0b' },
  { name: 'Rad etilgan', value: 17, color: '#ef4444' },
];
const kycData = [
  { name: 'KYC Pasport',   pct: 66 },
  { name: 'KYC PINFL',     pct: 42 },
  { name: 'AML Maqsad',    pct: 52 },
  { name: 'AML Manba',     pct: 44 },
  { name: 'PEP Tekshiruv', pct: 34 },
];
const branchData = [
  { branch: 'F-002', calls: 8 }, { branch: 'F-009', calls: 8 },
  { branch: 'F-010', calls: 7 }, { branch: 'F-008', calls: 6 },
  { branch: 'F-006', calls: 6 }, { branch: 'F-003', calls: 6 },
  { branch: 'F-005', calls: 4 }, { branch: 'F-007', calls: 3 },
];
const operatorAnalyticsData = [
  { id: 'OP007', calls: 5, compliance: 47, completed: 2 },
  { id: 'OP017', calls: 4, compliance: 54, completed: 2 },
  { id: 'OP018', calls: 4, compliance: 46, completed: 1 },
  { id: 'OP025', calls: 4, compliance: 46, completed: 1 },
  { id: 'OP021', calls: 3, compliance: 50, completed: 2 },
  { id: 'OP024', calls: 3, compliance: 55, completed: 0 },
];
const segmentData = [
  { name: 'Mass',    value: 20, color: '#64748b' },
  { name: 'Premium', value: 17, color: '#6366f1' },
  { name: 'VIP',     value: 13, color: '#f59e0b' },
];

// ─── Live monitoring mock ─────────────────────────────────────────────────────
const OPERATORS = ['Karimova Malika', 'Yusupov Jasur', 'Toshmatova Nozima', 'Rahimov Sherzod', 'Mirzaeva Dildora'];
const CUSTOMERS = ['Azimov Bobur', 'Sobirov Ulugbek', 'Nazarova Feruza', 'Qodirov Mansur', 'Holmatova Zilola'];
type SentimentType = 'positive' | 'neutral' | 'negative';

interface ActiveCall {
  id: number; operator: string; customer: string;
  duration: number; sentiment: SentimentType; alerts: number;
}
interface ComplianceAlert {
  id: number; severity: 'critical' | 'high' | 'medium' | 'low';
  operator: string; description: string; time: string;
}
interface OperatorRanking {
  rank: number; name: string; score: number; calls: number; conversion: number;
}

function generateActiveCalls(): ActiveCall[] {
  const sentiments: SentimentType[] = ['positive', 'neutral', 'negative'];
  return Array.from({ length: Math.floor(Math.random() * 4) + 2 }, (_, i) => ({
    id: i + 1,
    operator: OPERATORS[i % OPERATORS.length],
    customer: CUSTOMERS[i % CUSTOMERS.length],
    duration: Math.floor(Math.random() * 600) + 30,
    sentiment: sentiments[Math.floor(Math.random() * 3)],
    alerts: Math.floor(Math.random() * 3),
  }));
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
    time: `${Math.floor(Math.random() * 30) + 1} daqiqa oldin`,
  }));
}

function generateRankings(): OperatorRanking[] {
  return OPERATORS.map((name, i) => ({
    rank: i + 1, name,
    score: Math.floor(95 - i * 6 + Math.random() * 5),
    calls: Math.floor(Math.random() * 20) + 5,
    conversion: Math.floor(Math.random() * 40) + 40,
  })).sort((a, b) => b.score - a.score).map((o, i) => ({ ...o, rank: i + 1 }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sentimentDot(s: SentimentType) {
  return s === 'positive' ? 'bg-emerald-400' : s === 'negative' ? 'bg-red-400' : 'bg-amber-400';
}
function sentimentLabel(s: SentimentType) {
  return s === 'positive' ? 'Ijobiy' : s === 'negative' ? 'Salbiy' : 'Neytral';
}
function sentimentTextColor(s: SentimentType) {
  return s === 'positive' ? 'text-emerald-400' : s === 'negative' ? 'text-red-400' : 'text-amber-400';
}
function severityColor(s: string) {
  return s === 'critical' ? 'bg-red-600 text-white' : s === 'high' ? 'bg-red-800/70 text-red-300' : s === 'medium' ? 'bg-amber-700/60 text-amber-300' : 'bg-slate-700 text-slate-300';
}
function formatDuration(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

const tooltipStyle = {
  contentStyle: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' },
  itemStyle: { color: '#cbd5e1' }, labelStyle: { color: '#94a3b8' },
};

function ComplianceRow({ name, pct }: { name: string; pct: number }) {
  const color = pct >= 60 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = pct >= 60 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-300 text-xs w-32 flex-shrink-0">{name}</span>
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-9 text-right flex-shrink-0 ${textColor}`}>{pct}%</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<'live' | 'analytics'>('live');
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [rankings, setRankings] = useState<OperatorRanking[]>([]);
  const [lastRefresh, setLastRefresh] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── KPI cards (always visible) ── */}
      <div className="flex-shrink-0 px-5 pt-4 pb-0 space-y-3">
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: Phone,        label: "Jami qo'ng'iroqlar", value: String(activeCalls.length + 47), sub: `${activeCalls.length} faol hozir`,  color: 'bg-indigo-600' },
            { icon: Clock,        label: "O'rt. davomiylik",   value: '5:40',                           sub: '340 sek (Excel)',                    color: 'bg-purple-600' },
            { icon: CheckCircle2, label: 'Yakunlash darajasi', value: '28%',                            sub: '14 ta / 50 ta qo\'ng\'iroq',         color: 'bg-emerald-600' },
            { icon: Shield,       label: 'KYC Compliance',     value: '46%',                            sub: 'Past — diqqat kerak',                color: 'bg-red-600' },
          ].map(({ icon: Icon, label, value, sub, color }) => (
            <div key={label} className="bg-slate-900 rounded-xl border border-slate-800 p-3.5 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-[18px] h-[18px] text-white" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">{label}</p>
                <p className="text-white text-2xl font-black leading-tight">{value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + refresh */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-slate-800/60 p-1 rounded-lg">
            {([['live', 'Jonli Monitoring'], ['analytics', 'Tahlil']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  tab === key
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <Activity className="w-3.5 h-3.5" />
            <span>{lastRefresh}</span>
            <button
              onClick={refresh}
              className={`p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto min-h-0 p-5 pt-4">

        {/* ══ JONLI MONITORING ══ */}
        {tab === 'live' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-5">
              {/* Active calls */}
              <div className="col-span-2 bg-slate-900 rounded-xl border border-slate-800">
                <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span className="text-white font-medium text-sm">Faol Qo&apos;ng&apos;iroqlar</span>
                  <span className="ml-2 px-2 py-0.5 bg-indigo-600/20 text-indigo-300 text-xs rounded-full border border-indigo-700/40">
                    {activeCalls.length} faol
                  </span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {['Operator', 'Mijoz', 'Davomiylik', 'Hissiyot', 'Holat', 'Ogohlantirish'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-slate-500 text-xs font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {activeCalls.map(call => (
                      <tr key={call.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-indigo-700 rounded-full flex items-center justify-center text-xs text-white font-bold">
                              {call.operator[0]}
                            </div>
                            <span className="text-white text-sm">{call.operator}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">{call.customer}</td>
                        <td className="px-4 py-3 text-slate-300 font-mono text-sm">{formatDuration(call.duration)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${sentimentDot(call.sentiment)}`} />
                            <span className={`text-xs ${sentimentTextColor(call.sentiment)}`}>{sentimentLabel(call.sentiment)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-emerald-900/30 text-emerald-300 text-xs rounded-full border border-emerald-700/40">Faol</span>
                        </td>
                        <td className="px-4 py-3">
                          {call.alerts > 0 ? (
                            <span className="flex items-center gap-1 text-red-400 text-xs">
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

              {/* Right: alerts + rankings */}
              <div className="space-y-4">
                <div className="bg-slate-900 rounded-xl border border-slate-800">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-white text-sm font-medium">Ogohlantirishlar</span>
                  </div>
                  <div className="p-3 space-y-2 max-h-52 overflow-y-auto">
                    {alerts.map(a => (
                      <div key={a.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${severityColor(a.severity)}`}>
                            {a.severity.toUpperCase()}
                          </span>
                          <span className="text-slate-500 text-xs">{a.time}</span>
                        </div>
                        <p className="text-slate-300 text-xs">{a.description}</p>
                        <p className="text-slate-500 text-xs mt-1">{a.operator}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 rounded-xl border border-slate-800">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-white text-sm font-medium">Operator Reytingi</span>
                  </div>
                  <div className="p-3 space-y-2">
                    {rankings.slice(0, 5).map(r => (
                      <div key={r.rank} className="flex items-center gap-3 p-2.5 bg-slate-800 rounded-lg">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          r.rank === 1 ? 'bg-amber-500 text-white' : r.rank === 2 ? 'bg-slate-400 text-white' : r.rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-400'
                        }`}>{r.rank}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{r.name}</p>
                          <p className="text-slate-500 text-xs">{r.calls} ta · {r.conversion}% konv.</p>
                        </div>
                        <p className={`text-sm font-bold ${r.score >= 80 ? 'text-emerald-400' : r.score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{r.score}</p>
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

            {/* Row 1: Intent + Sale results */}
            <div className="grid grid-cols-[1fr_300px] gap-5">
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
                <h3 className="text-white font-semibold text-sm mb-1">Murojaat Sabablari</h3>
                <p className="text-slate-500 text-xs mb-4">Qo&apos;ng&apos;iroqdagi asosiy mavzu</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={intentData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 14]} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={115} />
                    <Tooltip {...tooltipStyle} formatter={v => [`${v} ta`]} />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Qo'ng'iroqlar" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
                <h3 className="text-white font-semibold text-sm mb-1">Qo&apos;ng&apos;iroq Natijalari</h3>
                <p className="text-slate-500 text-xs mb-3">Yakuniy holat</p>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={saleResultData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {saleResultData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v} ta`, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-1">
                  {saleResultData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                        <span className="text-slate-300">{d.name}</span>
                      </div>
                      <span className="font-bold text-white">{d.value} <span className="text-slate-500 font-normal">({Math.round(d.value/50*100)}%)</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: KYC compliance */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
              <h3 className="text-white font-semibold text-sm mb-1">KYC / AML Compliance</h3>
              <p className="text-slate-500 text-xs mb-4">Har bir tekshiruv necha foiz qo&apos;ng&apos;iroqda bajarilgan — o&apos;rtacha 46%</p>
              <div className="space-y-3">
                {kycData.map(d => <ComplianceRow key={d.name} name={d.name} pct={d.pct} />)}
              </div>
              <div className="mt-4 flex items-start gap-2 bg-amber-950/40 border border-amber-700/40 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-200 text-xs leading-relaxed">
                  PEP tekshiruvi faqat <strong>34%</strong> hollarda, AML manba <strong>44%</strong> — operatorlarni qayta o&apos;qitish tavsiya etiladi.
                </p>
              </div>
            </div>

            {/* Row 3: Operators + Segments */}
            <div className="grid grid-cols-[1fr_260px] gap-5">
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
                <h3 className="text-white font-semibold text-sm mb-4">Operator Samaradorligi</h3>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      {['Operator', "Qo'ng'iroq", 'Compliance', 'Yakunlangan'].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-slate-500 text-xs font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {operatorAnalyticsData.map((op, i) => {
                      const cc = op.compliance >= 55 ? 'text-emerald-400' : op.compliance >= 40 ? 'text-amber-400' : 'text-red-400';
                      const bc = op.compliance >= 55 ? 'bg-emerald-500' : op.compliance >= 40 ? 'bg-amber-500' : 'bg-red-500';
                      return (
                        <tr key={op.id} className="border-b border-slate-800 hover:bg-slate-800/40">
                          <td className="py-2 px-3 flex items-center gap-2">
                            <div className="w-6 h-6 bg-indigo-700 rounded-full flex items-center justify-center text-[10px] font-bold text-white">{i+1}</div>
                            <span className="text-white text-xs font-medium">{op.id}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-300 text-xs">{op.calls} ta</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-14 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div className={`h-full ${bc} rounded-full`} style={{ width: `${op.compliance}%` }} />
                              </div>
                              <span className={`text-xs font-bold ${cc}`}>{op.compliance}%</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-xs">
                            <span className={op.completed > 0 ? 'text-emerald-400 font-medium' : 'text-slate-500'}>{op.completed} ta</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
                <h3 className="text-white font-semibold text-sm mb-1">Mijoz Segmentlari</h3>
                <p className="text-slate-500 text-xs mb-2">50 ta mijoz (CRM)</p>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={segmentData} cx="50%" cy="50%" outerRadius={60} paddingAngle={3} dataKey="value">
                      {segmentData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v} ta`, n]} />
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

            {/* Row 4: Branch */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
              <h3 className="text-white font-semibold text-sm mb-1">Filial Faolligi</h3>
              <p className="text-slate-500 text-xs mb-4">Har bir filialdan kelgan qo&apos;ng&apos;iroqlar</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={branchData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="branch" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 10]} />
                  <Tooltip {...tooltipStyle} formatter={v => [`${v} ta`]} />
                  <Bar dataKey="calls" fill="#6366f1" radius={[4, 4, 0, 0]} name="Qo'ng'iroqlar" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
