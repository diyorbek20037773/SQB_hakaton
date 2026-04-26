'use client';

import {
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Phone, Clock, CheckCircle2, Shield, TrendingUp, Users, AlertTriangle } from 'lucide-react';

// ─── Real data from keyes12_call_center_data.xlsx ─────────────────────────────

const intentData = [
  { name: 'Karta masalasi',   count: 12 },
  { name: 'Foiz stavkasi',    count: 12 },
  { name: 'Depozit ochish',   count: 11 },
  { name: 'O\'tkazma',        count: 9  },
  { name: 'Kredit so\'rash',  count: 6  },
];

const saleResultData = [
  { name: 'Yakunlangan', value: 14, color: '#10b981' },
  { name: 'Kutilmoqda',  value: 19, color: '#f59e0b' },
  { name: 'Rad etilgan', value: 17, color: '#ef4444' },
];

const segmentData = [
  { name: 'Mass',    value: 20, color: '#64748b' },
  { name: 'Premium', value: 17, color: '#6366f1' },
  { name: 'VIP',     value: 13, color: '#f59e0b' },
];

const kycComplianceData = [
  { name: 'KYC Pasport',    pct: 66 },
  { name: 'KYC PINFL',      pct: 42 },
  { name: 'AML Maqsad',     pct: 52 },
  { name: 'AML Manba',      pct: 44 },
  { name: 'PEP Tekshiruv',  pct: 34 },
];

const branchData = [
  { branch: 'F-002', calls: 8 },
  { branch: 'F-009', calls: 8 },
  { branch: 'F-010', calls: 7 },
  { branch: 'F-008', calls: 6 },
  { branch: 'F-006', calls: 6 },
  { branch: 'F-003', calls: 6 },
  { branch: 'F-005', calls: 4 },
  { branch: 'F-007', calls: 3 },
];

const operatorData = [
  { id: 'OP007', calls: 5, compliance: 47, completed: 2, crossSell: 1 },
  { id: 'OP017', calls: 4, compliance: 54, completed: 2, crossSell: 2 },
  { id: 'OP018', calls: 4, compliance: 46, completed: 1, crossSell: 1 },
  { id: 'OP025', calls: 4, compliance: 46, completed: 1, crossSell: 0 },
  { id: 'OP021', calls: 3, compliance: 50, completed: 2, crossSell: 1 },
  { id: 'OP024', calls: 3, compliance: 55, completed: 0, crossSell: 1 },
  { id: 'OP028', calls: 2, compliance: 50, completed: 1, crossSell: 1 },
  { id: 'OP002', calls: 2, compliance: 25, completed: 0, crossSell: 0 },
];

const productData = [
  { name: 'Kredit karta', has: 34 },
  { name: 'Kredit',       has: 26 },
  { name: 'Depozit',      has: 21 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f8fafc',
    fontSize: '12px',
  },
  itemStyle: { color: '#cbd5e1' },
  labelStyle: { color: '#94a3b8' },
};

function ChartCard({ title, subtitle, children, className = '' }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-slate-900 rounded-xl border border-slate-800 p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4.5 h-4.5 w-[18px] h-[18px] text-white" />
      </div>
      <div>
        <p className="text-slate-400 text-xs">{label}</p>
        <p className="text-white text-2xl font-black leading-tight">{value}</p>
        <p className="text-slate-500 text-xs mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// Custom compliance bar row
function ComplianceRow({ name, pct }: { name: string; pct: number }) {
  const color = pct >= 60 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = pct >= 60 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-300 text-xs w-32 flex-shrink-0">{name}</span>
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-10 text-right flex-shrink-0 ${textColor}`}>{pct}%</span>
    </div>
  );
}

// Custom label for pie
const renderPieLabel = ({ name, value }: { name: string; value: number }) =>
  `${name}: ${value}`;

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const totalCalls = 50;
  const avgCompliancePct = Math.round(kycComplianceData.reduce((s, d) => s + d.pct, 0) / kycComplianceData.length);
  const crossSellRate = Math.round(15 / totalCalls * 100);

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">
      <div>
        <h2 className="text-white font-bold text-lg">Analitika</h2>
        <p className="text-slate-500 text-xs mt-0.5">Manba: 50 ta haqiqiy qo&apos;ng&apos;iroq · keyes12_call_center_data.xlsx</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard icon={Phone}         label="Jami qo'ng'iroqlar" value="50"    sub="24 ta operator"          color="bg-indigo-600" />
        <KpiCard icon={Clock}         label="O'rtacha davomiylik" value="5:40" sub="min (340 sek)"            color="bg-purple-600" />
        <KpiCard icon={CheckCircle2}  label="Yakunlangan"         value="28%"  sub="14 ta / 50 ta"           color="bg-emerald-600" />
        <KpiCard icon={Shield}        label="O'rtacha KYC bali"   value={`${avgCompliancePct}%`} sub="Past — diqqat kerak!" color="bg-red-600" />
      </div>

      {/* ── Row 1: Intent + Sale results ── */}
      <div className="grid grid-cols-[1fr_320px] gap-5">
        <ChartCard title="Murojaat Sabablari" subtitle="Qo'ng'iroqdagi asosiy mavzu bo'yicha (50 ta qo'ng'iroq)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={intentData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 15]} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={120} />
              <Tooltip {...tooltipStyle} formatter={(v) => [`${v} ta qo'ng'iroq`]} />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Qo'ng'iroqlar" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Qo'ng'iroq Natijalari" subtitle="Yakuniy holat bo'yicha">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={saleResultData}
                cx="50%" cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {saleResultData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v} ta`, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {saleResultData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-slate-300">{d.name}</span>
                </div>
                <span className="font-bold text-white">{d.value} ta <span className="text-slate-500 font-normal">({Math.round(d.value/50*100)}%)</span></span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ── Row 2: KYC/AML Compliance ── */}
      <ChartCard
        title="KYC / AML Compliance Darajasi"
        subtitle="Har bir tekshiruv qo'ng'iroqlarning necha foizida bajarilgan — o'rtacha 46% (past)"
      >
        <div className="space-y-3 py-1">
          {kycComplianceData.map((d) => (
            <ComplianceRow key={d.name} name={d.name} pct={d.pct} />
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 bg-amber-950/40 border border-amber-700/40 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-200 text-xs leading-relaxed">
            PEP tekshiruvi faqat <strong>34%</strong> hollarda bajarilgan. AML manba so&apos;rovi <strong>44%</strong>.
            Bu bank uchun jiddiy compliance xatari — operatorlarni qayta o&apos;qitish tavsiya etiladi.
          </p>
        </div>
      </ChartCard>

      {/* ── Row 3: Operator table + Segments ── */}
      <div className="grid grid-cols-[1fr_280px] gap-5">
        <ChartCard title="Operator Samaradorligi" subtitle="Compliance bali, yakunlangan qo'ng'iroqlar">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Operator', "Qo'ng'iroq", 'Compliance', 'Yakunlangan', 'Cross-sell'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-slate-500 text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operatorData.map((op, i) => {
                  const compColor = op.compliance >= 55 ? 'text-emerald-400' : op.compliance >= 40 ? 'text-amber-400' : 'text-red-400';
                  return (
                    <tr key={op.id} className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 flex items-center gap-2">
                        <div className="w-6 h-6 bg-indigo-700 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-white text-xs font-medium">{op.id}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-300 text-xs">{op.calls} ta</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${op.compliance >= 55 ? 'bg-emerald-500' : op.compliance >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${op.compliance}%` }} />
                          </div>
                          <span className={`text-xs font-bold ${compColor}`}>{op.compliance}%</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-xs">
                        <span className={op.completed > 0 ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                          {op.completed} ta
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs">
                        <span className={op.crossSell > 0 ? 'text-indigo-400' : 'text-slate-600'}>
                          {op.crossSell > 0 ? `${op.crossSell} ta` : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-800">
            <span>Cross-sell urinish: <strong className="text-indigo-400">30%</strong> (15/50)</span>
            <span>O'rtacha compliance: <strong className="text-amber-400">46%</strong></span>
          </div>
        </ChartCard>

        <div className="space-y-5">
          <ChartCard title="Mijoz Segmentlari" subtitle="CRM bo'yicha 50 ta mijoz">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={segmentData} cx="50%" cy="50%" outerRadius={65} paddingAngle={3} dataKey="value">
                  {segmentData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v} ta`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5">
              {segmentData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-slate-300">{d.name}</span>
                  </div>
                  <span className="text-white font-bold">{d.value} <span className="text-slate-500 font-normal">ta</span></span>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Mahsulot Egaligi" subtitle="Mijozlarda mavjud">
            <div className="space-y-3 py-1">
              {productData.map((d) => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="text-slate-300 text-xs w-24 flex-shrink-0">{d.name}</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${d.has/50*100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-slate-300 w-6 text-right">{d.has}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* ── Row 4: Branch activity ── */}
      <ChartCard title="Filial Faolligi" subtitle="Har bir filialdan kelgan qo'ng'iroqlar soni">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={branchData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="branch" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 10]} />
            <Tooltip {...tooltipStyle} formatter={(v) => [`${v} ta qo'ng'iroq`]} />
            <Bar dataKey="calls" fill="#6366f1" radius={[4, 4, 0, 0]} name="Qo'ng'iroqlar" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

    </div>
  );
}
