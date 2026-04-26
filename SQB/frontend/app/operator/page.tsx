'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { TranscriptLine, AIAnalysis } from '@/lib/types';
import { useCallStream } from '@/hooks/useCallStream';
import { AudioRecorder } from '@/components/AudioRecorder';
import {
  Phone, PhoneOff, User, Shield, AlertTriangle,
  CheckCircle2, Circle, Star, Lightbulb,
  X, Copy, ChevronRight, Mic, Search,
  TrendingUp, TrendingDown, Zap,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CustomerProfile {
  id: number;
  full_name: string;
  phone: string;
  segment: 'VIP' | 'Premium' | 'Mass';
  monthly_income: number;
  existing_products: string[];
  kyc_status: 'verified' | 'pending' | 'expired';
  aml_risk_level: 'low' | 'medium' | 'high';
  credit_score: number;
  age: number;
  language_pref: 'uz' | 'ru';
  intent_hint: string;
  last_call_date: string;
  call_count: number;
  declined_products: { product: string; date: string; reason: string }[];
  risk_flags: { label: string; severity: 'critical' | 'warning' | 'info' }[];
  cross_sell_hint: string | null;
  history_note: string;
  predicted_questions: { icon: string; short: string; text: string }[];
}

// ─── Customers ────────────────────────────────────────────────────────────────
const CUSTOMERS: CustomerProfile[] = [
  {
    id: 1,
    full_name: 'Azimov Bobur Hamidovich',
    phone: '+998 90 123 45 67',
    segment: 'VIP',
    monthly_income: 32_000_000,
    existing_products: ['Omonat 24 oy', 'Debet karta', 'Internet banking'],
    kyc_status: 'verified',
    aml_risk_level: 'low',
    credit_score: 742,
    age: 34,
    language_pref: 'uz',
    intent_hint: "Uy-joy krediti so'ramoqda",
    last_call_date: '3 oy oldin',
    call_count: 4,
    declined_products: [
      { product: 'Ipoteka 25 mln', date: '2024-09-12', reason: "Kredit bali past edi (680). Hozir 742 — qayta ko'rib chiqish mumkin." },
    ],
    risk_flags: [],
    cross_sell_hint: 'VIP Ipoteka: kredit bali yetarli, daromad mos. 87% ehtimol.',
    history_note: '3 oy avval kredit rad etilgan, lekin bali yaxshilangan.',
    predicted_questions: [
      { icon: '🏠', short: 'Ipoteka qayta',     text: "3 oy oldin ipoteka rad etilgan edi, hozir kredit balim yaxshilandi. Qayta murojaat qilsam bo'ladimi?" },
      { icon: '📊', short: 'Foiz hozir',        text: "Hozirgi ipoteka foiz stavkalari qanday? VIP klient sifatida chegirma bormi?" },
      { icon: '💎', short: 'VIP imtiyoz',       text: "VIP klient sifatida menga qanday qo'shimcha imtiyozlar beriladi?" },
      { icon: '💼', short: 'Investitsiya',       text: "Bo'sh aktivlarimni investitsiya qilmoqchiman, qanday mahsulotlaringiz bor?" },
    ],
  },
  {
    id: 2,
    full_name: 'Karimova Malika Yusupovna',
    phone: '+998 91 456 78 90',
    segment: 'Premium',
    monthly_income: 18_500_000,
    existing_products: ['Debet karta'],
    kyc_status: 'pending',
    aml_risk_level: 'medium',
    credit_score: 694,
    age: 41,
    language_pref: 'ru',
    intent_hint: 'Depozit ochmoqchi',
    last_call_date: '1 hafta oldin',
    call_count: 2,
    declined_products: [],
    risk_flags: [
      { label: "AML: So'nggi 30 kunda 3 ta naqd pul operatsiyasi > 50M", severity: 'warning' },
      { label: 'KYC muddati tugagan — yangilash kerak', severity: 'critical' },
    ],
    cross_sell_hint: "Premium Depozit 18% yillik + Hayot sug'urtasi. Daromad mos.",
    history_note: "Rus tilida gaplashadi. KYC yangilash majburiy.",
    predicted_questions: [
      { icon: '💰', short: 'Depozit foiz',       text: "Какие ставки по депозитам сейчас? Хочу открыть депозит на 12 месяцев." },
      { icon: '🆔', short: 'KYC yangilash',     text: "KYC ma'lumotlarimni qanday yangilash mumkin? Office'ga borish kerakmi?" },
      { icon: '💵', short: 'USD depozit',        text: "Можно открыть депозит в долларах? Какие проценты?" },
      { icon: '🛡️', short: 'Sug\'urta',          text: "Hayot sug'urtasi bilan depozit kombinatsiyasi haqida ma'lumot bering" },
    ],
  },
  {
    id: 3,
    full_name: 'Nazarov Ulugbek Baxtiyorovich',
    phone: '+998 93 789 01 23',
    segment: 'Mass',
    monthly_income: 4_200_000,
    existing_products: ['Debet karta (bloklangan)'],
    kyc_status: 'pending',
    aml_risk_level: 'high',
    credit_score: 521,
    age: 28,
    language_pref: 'uz',
    intent_hint: "Kartasi bloklangan, ochishni so'raydi",
    last_call_date: '2 kun oldin',
    call_count: 6,
    declined_products: [
      { product: "Iste'mol krediti", date: '2024-11-03', reason: 'Kredit bali past (521), mavjud qarzdorlik.' },
      { product: 'Kredit karta', date: '2024-10-15', reason: 'Daromad yetarli emas.' },
    ],
    risk_flags: [
      { label: 'KRITIK: Firibgarlik urinishi aniqlangan — karta bloklangan', severity: 'critical' },
      { label: "PEP tekshiruvi o'tkazilmagan (soliq qo'mitasi xodimi)", severity: 'critical' },
      { label: "Kredit tarixi: 2 ta muddati o'tgan to'lov", severity: 'warning' },
    ],
    cross_sell_hint: null,
    history_note: "Oxirgi 6 qo'ng'iroqning 4 tasi shikoyat. Kredit taklif qilmang.",
    predicted_questions: [
      { icon: '🚫', short: 'Karta nega',         text: "Mening kartam nima uchun bloklangan? Hech qanday qoidabuzarlik qilmaganman!" },
      { icon: '⚡', short: 'Tez ochish',         text: "Kartamni tezda ochib bera olasizmi? Pulim qolib ketdi, juda kerak." },
      { icon: '😡', short: 'Shikoyat',           text: "Bu xizmat juda yomon. Boshqa bankka ko'chmoqchiman, qanday qilinadi?" },
      { icon: '💳', short: 'Yangi karta',        text: "Bloklangan kartani qaytmasdan, yangi karta ololaman?" },
    ],
  },
  {
    id: 4,
    full_name: 'Holmatova Zilola Kamolovna',
    phone: '+998 97 234 56 78',
    segment: 'VIP',
    monthly_income: 85_000_000,
    existing_products: ['VIP Omonat', 'Kredit karta 50M', 'Ipoteka', 'Biznes hisob'],
    kyc_status: 'verified',
    aml_risk_level: 'medium',
    credit_score: 801,
    age: 52,
    language_pref: 'uz',
    intent_hint: "Katta miqdorda o'tkazma (taxminan 500M)",
    last_call_date: '2 oy oldin',
    call_count: 12,
    declined_products: [
      { product: 'Premium Plastik karta', date: '2024-08-20', reason: "Mijoz o'zi xohlamadi (\"keraksiz\")." },
    ],
    risk_flags: [
      { label: "AML: 500M dan yuqori o'tkazma — maqsadni so'rash majburiy", severity: 'warning' },
    ],
    cross_sell_hint: 'Biznes depozit yoki VIP investitsiya mahsuloti. Aktivlari katta.',
    history_note: "Doimiy mijoz, 12 ta qo'ng'iroq. Yuqori aktivlar. Karta taklif qilmang.",
    predicted_questions: [
      { icon: '💸', short: '500M o\'tkazma',     text: "500 million so'mni boshqa hisobimga o'tkazmoqchiman, mumkinmi va qanday tartibda?" },
      { icon: '⏱️', short: 'Necha kunda',        text: "Bu o'tkazma necha kunda yetib boradi va komissiya qancha?" },
      { icon: '🏢', short: 'Biznes hisob',       text: "Yangi biznes hisob ochmoqchiman, qanday hujjatlar kerak?" },
      { icon: '💎', short: 'VIP investitsiya',   text: "Bo'sh aktivlarim uchun yuqori foizli investitsiya mahsuloti bormi?" },
    ],
  },
  {
    id: 5,
    full_name: 'Toshmatov Jasur Aliyevich',
    phone: '+998 94 567 89 01',
    segment: 'Mass',
    monthly_income: 3_800_000,
    existing_products: [],
    kyc_status: 'pending',
    aml_risk_level: 'low',
    credit_score: 538,
    age: 23,
    language_pref: 'uz',
    intent_hint: "Iste'mol krediti olmoqchi",
    last_call_date: 'Birinchi marta',
    call_count: 0,
    declined_products: [],
    risk_flags: [
      { label: 'Kredit bali past (538) — kredit berilmasligi mumkin', severity: 'warning' },
      { label: "Mavjud mahsulot yo'q — to'liq KYC o'tkazish kerak", severity: 'info' },
    ],
    cross_sell_hint: "Debet karta + internet banking (boshlang'ich mahsulot). Kredit emas.",
    history_note: 'Yangi mijoz. Kredit berish xavfli. Alternativ taklif qiling.',
    predicted_questions: [
      { icon: '💰', short: 'Kredit miqdor',     text: "Iste'mol krediti olmoqchiman. Mening daromadim 3.8M, qancha kredit bera olasizlar?" },
      { icon: '📊', short: 'Foiz qancha',        text: "Foiz stavka qancha bo'ladi va necha oyga olishim mumkin?" },
      { icon: '📋', short: 'Qanday hujjat',     text: "Birinchi marta bankka murojaat qilyapman, qanday hujjatlar kerak?" },
      { icon: '🎴', short: 'Karta',              text: "Hech qachon bank karta olmaganman, qanday tartibda olish mumkin?" },
    ],
  },
];

const MOCK_INITIAL_ANALYSIS: AIAnalysis = {
  sentiment: 'neutral',
  sentiment_score: 0.0,
  compliance_alerts: [],
  suggested_response: 'Mijozni xush kelibsiz deya murojaat qiling va maqsadini aniqlang.',
  topics: [],
  kyc_checklist_update: { income_verified: false, purpose_stated: false, pep_checked: false },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}
function sentimentLabel(s: string) {
  return s === 'positive' ? 'Ijobiy' : s === 'negative' ? 'Salbiy' : 'Neytral';
}
function sentimentEmoji(s: string) {
  return s === 'positive' ? '😊' : s === 'negative' ? '😟' : '😐';
}
function sentimentPct(score: number) { return Math.round((score + 1) * 50); }
function amlLabel(l: string) { return l === 'low' ? 'Past' : l === 'medium' ? "O'rta" : 'Yuqori'; }
function segmentBadge(seg: string) {
  const m: Record<string, string> = {
    VIP: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    Premium: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50',
    Mass: 'bg-slate-500/20 text-slate-300 border-slate-500/50',
  };
  return m[seg] ?? m.Mass;
}

const WAVE = [3,5,8,4,9,6,11,7,5,10,8,6,4,9,7,5,8,11,6,4,9,7,5,8,11,6,4,9,7,5,8,6];

// ─── Main Component ────────────────────────────────────────────────────────────
export default function OperatorPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile>(CUSTOMERS[0]);
  const [callActive, setCallActive] = useState(false);
  const [callId, setCallId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [callSummary, setCallSummary] = useState<{ summary: string; quality_score: number; next_steps: string[] } | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [interimText, setInterimText] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [analysis, setAnalysis] = useState<AIAnalysis>(MOCK_INITIAL_ANALYSIS);
  const [kyc, setKyc] = useState({ income_verified: false, purpose_stated: false, pep_checked: false });
  const [alerts, setAlerts] = useState<AIAnalysis['compliance_alerts']>([]);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedSpeechRef = useRef('');

  const { analysis: wsAnalysis, streamingSuggestion, isStreaming, sendTranscript } = useCallStream(callId);

  const applyAnalysis = useCallback((a: Partial<AIAnalysis>) => {
    setAnalysis(prev => ({
      ...prev,
      ...a,
      suggested_response: a.suggested_response?.trim() ? a.suggested_response : prev.suggested_response,
      nbo: a.nbo !== undefined ? a.nbo : prev.nbo,
    }));
    if (a.kyc_checklist_update) setKyc(a.kyc_checklist_update);
    if (a.compliance_alerts?.length) setAlerts(prev => [...prev, ...a.compliance_alerts!]);
  }, []);

  useEffect(() => {
    if (wsAnalysis) applyAnalysis(wsAnalysis);
  }, [wsAnalysis, applyAnalysis]);

  useEffect(() => {
    if (callActive) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callActive]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimText]);

  const addLine = useCallback((speaker: 'operator' | 'customer', text: string) => {
    if (!text?.trim()) return;
    setTranscript(prev => [...prev, {
      speaker, text: text.trim(),
      timestamp: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    }]);
  }, []);

  const handleStartCall = async (customer: CustomerProfile) => {
    setSelectedCustomer(customer);
    setShowModal(false);
    setCallActive(true);
    setTranscript([]);
    setKyc({ income_verified: false, purpose_stated: false, pep_checked: false });
    setAlerts([]);
    setAnalysis(MOCK_INITIAL_ANALYSIS);
    try {
      const { startCall } = await import('@/lib/api');
      const call = await startCall(customer.id, 1);
      setCallId(call.id);
    } catch { /* demo mode */ }
  };

  const handleEndCall = async () => {
    setCallActive(false);
    setInterimText('');
    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
    accumulatedSpeechRef.current = '';
    if (callId) {
      try {
        const { endCall } = await import('@/lib/api');
        const result = await endCall(callId) as { summary_details?: { summary: string; quality_score: number; next_steps: string[] } };
        if (result.summary_details?.summary) {
          setCallSummary(result.summary_details);
          setShowSummary(true);
        }
      } catch { /* demo mode */ }
    }
    setCallId(null);
  };

  const TRIVIAL = /^(salom|assalomu alaykum|alaykum assalom|qalaysiz|qalaysan|xayr|rahmat|ok|ha|yo'q|yoq|barakalla|tushundim|davom eting|albatta|kerak|yaxshi)\b/i;

  const handleTranscript = useCallback((text: string) => {
    setInterimText('');
    addLine('customer', text);
    accumulatedSpeechRef.current += ' ' + text.trim();
    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
    aiDebounceRef.current = setTimeout(() => {
      const full = accumulatedSpeechRef.current.trim();
      accumulatedSpeechRef.current = '';
      const meaningful = full.length > 20 && !TRIVIAL.test(full);
      if (meaningful) sendTranscript(full);
    }, 1800);
  }, [addLine, sendTranscript]);

  const handleInterimTranscript = useCallback((text: string) => {
    setInterimText(text);
  }, []);

  // Demo question chip — inject as customer line + immediately send to AI
  const handleDemoQuestion = useCallback((text: string) => {
    if (!callActive) return;
    addLine('customer', text);
    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
    accumulatedSpeechRef.current = '';
    sendTranscript(text);
  }, [callActive, addLine, sendTranscript]);

  const displayedSuggestion = isStreaming ? streamingSuggestion : (streamingSuggestion || analysis.suggested_response);
  const copyResponse = () => {
    navigator.clipboard.writeText(displayedSuggestion);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const c = selectedCustomer;
  const criticalFlags = c.risk_flags.filter(f => f.severity === 'critical');
  const customerLines = transcript.filter(t => t.speaker === 'customer');
  const scorePercent = sentimentPct(analysis.sentiment_score);

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-950">
      {/* Subtle bg glow */}
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse at 20% 0%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(245,158,11,0.05) 0%, transparent 50%)' }} />

      {/* ── COMPLIANCE ALERT TICKER ── */}
      {alerts.length > 0 && (
        <div className="relative z-20 flex-shrink-0 bg-red-950/60 border-b border-red-800/50 px-5 py-2 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <span className="flex-1 text-red-300 text-xs truncate">
            {alerts[alerts.length - 1]?.description}
          </span>
          <button onClick={() => setAlerts([])} className="text-red-500 hover:text-red-300 ml-2 flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── PAGE HEADER ── */}
      <div className="relative z-10 flex-shrink-0 flex items-center bg-slate-950/90 backdrop-blur-md border-b border-slate-800/70 px-6 py-3 gap-4">

        {/* Brand */}
        <div className="flex-shrink-0 w-44">
          <h1 className="text-base font-bold text-white leading-tight">Yulduz AI</h1>
        </div>

        {/* Search */}
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2 w-72 bg-slate-900/60 border border-slate-800 rounded-full px-4 py-2">
            <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="text-xs text-slate-500 flex-1 truncate">Mijoz qidirish, telefon...</span>
            <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">⌘K</span>
          </div>
        </div>

        {/* Status only — no buttons (call control lives at bottom) */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {callActive && (
            <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/40 rounded-full px-4 py-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-wide">JONLI</span>
              <span className="font-mono text-sm font-bold text-white tabular-nums">{fmt(elapsed)}</span>
              <span className="text-xs text-slate-400">{c.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 3-COLUMN MAIN ── */}
      <div className="relative z-10 flex-1 grid operator-main-grid overflow-hidden min-h-0 divide-x divide-slate-800/60">

        {/* ════ LEFT — CUSTOMER PROFILE (280px) ════ */}
        <div className="flex flex-col overflow-hidden min-h-0">

          {/* Column header */}
          <div className="flex-shrink-0 px-5 py-2.5 border-b border-slate-800 flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] uppercase tracking-[1.5px] font-bold text-slate-400">Mijoz Profili</span>
            {criticalFlags.length > 0 && (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-red-300 bg-red-900/40 border border-red-700/50 px-1.5 py-0.5 rounded-full">
                <AlertTriangle className="w-2.5 h-2.5" />
                {criticalFlags.length} xavf
              </span>
            )}
          </div>

          {/* Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-4">

            {/* Identity card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500/18 to-slate-900/60 border border-indigo-500/30 rounded-2xl p-5">
              <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full pointer-events-none opacity-30"
                style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.6), transparent)' }} />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ boxShadow: '0 0 18px rgba(251,191,36,0.3)' }}
                  >
                    {c.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${segmentBadge(c.segment)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {c.segment}
                      </span>
                      <span className="text-[10px] text-slate-400">{c.age} yosh</span>
                    </div>
                    <p className="text-sm font-bold text-white leading-tight truncate">{c.full_name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{c.phone}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-950/50 rounded-xl p-3 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5 whitespace-nowrap">Kredit bali</p>
                    <p className={`text-lg font-bold leading-none ${c.credit_score >= 700 ? 'text-white' : 'text-red-400'}`}>{c.credit_score}</p>
                    <p className={`text-[10px] mt-1 ${c.credit_score >= 700 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {c.credit_score >= 700 ? `+${c.credit_score - 680}` : '▼ past'}
                    </p>
                  </div>
                  <div className="bg-slate-950/50 rounded-xl p-3 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Daromad</p>
                    <p className="text-lg font-bold text-white leading-none">
                      {(c.monthly_income / 1_000_000).toFixed(0)}M
                      <span className="text-[10px] text-slate-400 font-normal ml-1">so&apos;m</span>
                    </p>
                  </div>
                  <div className="bg-slate-950/50 rounded-xl p-3 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">AML</p>
                    <p className={`text-lg font-bold leading-none ${
                      c.aml_risk_level === 'low' ? 'text-emerald-400'
                      : c.aml_risk_level === 'medium' ? 'text-amber-400'
                      : 'text-red-400'
                    }`}>{amlLabel(c.aml_risk_level)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Intent card */}
            <div className="bg-gradient-to-br from-indigo-500/18 to-slate-900/60 border border-indigo-500/40 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3 h-3 text-white" />
                </div>
                <span className="text-[10px] uppercase tracking-[1.5px] font-bold text-indigo-300">Taxminiy maqsad</span>
              </div>
              <p className="text-sm font-medium text-white leading-snug">{c.intent_hint}</p>
              {c.history_note && (
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{c.history_note}</p>
              )}
            </div>

            {/* Risk flags */}
            {c.risk_flags.length > 0 && (
              <div className="space-y-2">
                {c.risk_flags.map((flag, i) => (
                  <div key={i} className={`flex items-start gap-2.5 p-3 rounded-lg border text-[11px] leading-relaxed ${
                    flag.severity === 'critical'
                      ? 'bg-red-950/60 border-red-700/50 text-red-300'
                      : flag.severity === 'warning'
                      ? 'bg-amber-950/50 border-amber-700/40 text-amber-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400'
                  }`}>
                    <span className="text-base flex-shrink-0 leading-none mt-0.5">
                      {flag.severity === 'critical' ? '🔴' : flag.severity === 'warning' ? '⚠️' : 'ℹ️'}
                    </span>
                    <p>{flag.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Products */}
            <div className="bg-slate-800/25 border border-slate-700/50 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-[1.5px] font-bold text-slate-400 mb-2.5">
                Mavjud mahsulotlar
                {c.existing_products.length > 0 && (
                  <span className="ml-1.5 text-slate-500">· {c.existing_products.length}</span>
                )}
              </p>
              {c.existing_products.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {c.existing_products.map(p => (
                    <span key={p} className="text-[11px] px-3 py-1 bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-full font-medium">{p}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic">Mahsulot yo&apos;q</p>
              )}
            </div>

            {/* Declined products */}
            {c.declined_products.length > 0 && (
              <div className="bg-slate-800/25 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[10px] uppercase tracking-[1.5px] font-bold text-slate-400">Rad etilgan</span>
                </div>
                <div className="space-y-2">
                  {c.declined_products.map((d, i) => (
                    <div key={i} className="bg-red-950/30 border border-red-800/30 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-semibold text-red-300">{d.product}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{d.date}</p>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{d.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cross-sell */}
            {c.cross_sell_hint && (
              <div className="bg-emerald-950/30 border border-emerald-700/30 rounded-xl p-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] uppercase tracking-[1.5px] font-bold text-emerald-300">Taklif imkoniyati</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{c.cross_sell_hint}</p>
              </div>
            )}

            {/* KYC Checklist */}
            <div className="bg-slate-800/25 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[10px] uppercase tracking-[1.5px] font-bold text-slate-400">KYC / AML Tekshiruv</span>
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  Object.values(kyc).filter(Boolean).length === 3
                    ? 'bg-emerald-900/40 text-emerald-300'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {Object.values(kyc).filter(Boolean).length}/3
                </span>
              </div>
              <div className="space-y-1.5">
                {([
                  { key: 'income_verified' as const, label: 'Daromad tasdiqlandi' },
                  { key: 'purpose_stated' as const, label: 'Maqsad aniqlandi' },
                  { key: 'pep_checked' as const, label: 'PEP tekshirildi' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setKyc(p => ({ ...p, [key]: !p[key] }))}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                      kyc[key]
                        ? 'bg-emerald-900/20 border-emerald-700/40'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {kyc[key] ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    )}
                    <span className={`text-xs ${kyc[key] ? 'text-emerald-300 line-through decoration-slate-500' : 'text-slate-400'}`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-3 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${(Object.values(kyc).filter(Boolean).length / 3) * 100}%` }}
                />
              </div>
            </div>

            {/* Compliance alerts in left panel */}
            {alerts.length > 0 && (
              <div className="bg-red-950/20 border border-red-800/40 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[10px] uppercase tracking-[1.5px] font-bold text-slate-400">
                    Ogohlantirishlar ({alerts.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {alerts.slice(-3).map((a, i) => (
                    <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-[10px] ${
                      a.severity === 'critical'
                        ? 'bg-red-900/30 text-red-300'
                        : 'bg-amber-900/20 text-amber-300'
                    }`}>
                      <span className="font-bold flex-shrink-0">{a.severity.toUpperCase()}</span>
                      <p>{a.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ════ CENTER — AI COPILOT (1fr) ════ */}
        <div className="flex flex-col overflow-hidden min-h-0">

          {/* Header */}
          <div className="flex-shrink-0 px-6 py-2.5 border-b border-slate-800 flex items-center gap-3">
            <div className="flex items-center gap-2 bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 rounded-full">
              <Lightbulb className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] uppercase tracking-[1.5px] font-bold text-indigo-300">AI Copilot</span>
              {callActive && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />}
            </div>
            {callActive && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-base">{sentimentEmoji(analysis.sentiment)}</span>
                <span className="text-xs text-slate-400">{sentimentLabel(analysis.sentiment)} {scorePercent}%</span>
                <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      analysis.sentiment === 'positive' ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                      : analysis.sentiment === 'negative' ? 'bg-red-500'
                      : 'bg-amber-500'
                    }`}
                    style={{ width: `${scorePercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-4">

            {/* Hero AI card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500/22 to-slate-900/70 border-2 border-indigo-400/50 rounded-3xl p-6"
              style={{ boxShadow: '0 20px 60px -20px rgba(99,102,241,0.4)' }}>
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(129,140,248,0.3), transparent)' }} />
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-[10px] uppercase tracking-[1.5px] font-bold text-amber-400">Tavsiya Etilgan Javob</p>
                </div>
                {isStreaming && (
                  <span className="text-[10px] text-indigo-400 bg-indigo-900/40 border border-indigo-700/40 px-2 py-0.5 rounded-full animate-pulse">
                    Real-time
                  </span>
                )}
              </div>
              <p className="relative z-10 text-[24px] leading-[1.55] text-slate-100 min-h-[3.5rem]">
                {displayedSuggestion}
                {isStreaming && <span className="inline-block w-0.5 h-5 bg-indigo-400 ml-0.5 animate-pulse align-middle" />}
              </p>
              <div className="relative z-10 flex items-center gap-2 mt-5 pt-4 border-t border-indigo-500/20">
                <button
                  onClick={copyResponse}
                  className="flex items-center gap-1.5 bg-white text-indigo-950 hover:bg-indigo-50 px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Nusxalandi!' : 'Nusxa olish'}
                </button>
                <button className="flex items-center gap-1.5 border border-indigo-500/40 hover:border-indigo-400/60 text-indigo-300 hover:text-indigo-200 px-4 py-2 rounded-xl text-xs font-semibold transition-colors">
                  Boshqa variant
                </button>
                <span className="ml-auto text-[10px] text-slate-500 font-mono">Claude Haiku 4.5 · {scorePercent}%</span>
              </div>
            </div>

            {/* NBO + Objection */}
            {analysis.nbo && (
              <div className={`grid gap-4 ${analysis.detected_objection ? 'grid-cols-[1.1fr_1fr]' : 'grid-cols-1'}`}>
                <div className="relative bg-gradient-to-br from-emerald-500/15 to-slate-900/60 border border-emerald-500/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-6 h-6 bg-emerald-700 rounded-md flex items-center justify-center">
                      <Star className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-[10px] uppercase tracking-[1.5px] font-bold text-emerald-300">Mahsulot Tavsiyasi</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-base text-emerald-300 leading-tight">{analysis.nbo.product_name}</p>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{analysis.nbo.reason}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-black text-2xl text-emerald-400 leading-none">
                        {Math.round(analysis.nbo.confidence * 100)}
                      </span>
                      <span className="text-sm text-emerald-500">%</span>
                    </div>
                  </div>
                  <div className="mt-3 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.round(analysis.nbo.confidence * 100)}%` }} />
                  </div>
                </div>

                {analysis.detected_objection && (
                  <div className="relative bg-gradient-to-br from-amber-500/15 to-slate-900/60 border border-amber-500/40 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[10px] uppercase tracking-[1.5px] font-bold text-amber-300">E&apos;tiroz</span>
                      <span className="ml-auto text-[10px] bg-amber-700/40 text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-600/40">
                        {analysis.detected_objection.type === 'high_interest' ? 'FOIZ' : analysis.detected_objection.type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs italic text-slate-300 border-l-2 border-amber-500/50 pl-3">
                      &ldquo;{analysis.detected_objection.customer_said}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Standalone objection */}
            {!analysis.nbo && analysis.detected_objection && (
              <div className="relative bg-gradient-to-br from-amber-500/15 to-slate-900/60 border border-amber-500/40 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] uppercase tracking-[1.5px] font-bold text-amber-300">E&apos;tiroz Aniqlandi</span>
                  <span className="ml-auto text-[10px] bg-amber-700/40 text-amber-300 px-2 py-0.5 rounded-full border border-amber-600/40">
                    {analysis.detected_objection.type === 'high_interest' ? 'FOIZ' : analysis.detected_objection.type.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs italic text-slate-300 border-l-2 border-amber-500/50 pl-3">
                  &ldquo;{analysis.detected_objection.customer_said}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ════ RIGHT — TRANSCRIPT (256px) ════ */}
        <div className="flex flex-col overflow-hidden min-h-0">

          {/* Header */}
          <div className="flex-shrink-0 px-4 py-2.5 border-b border-slate-800 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Mic className="w-3 h-3 text-amber-400" />
            </div>
            <span className="text-xs font-semibold text-slate-300">Mijoz Gaplari</span>
            <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full">
              {customerLines.length}
            </span>
            {callActive && (
              <span className="ml-auto flex items-center gap-1 text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full">
                <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                JONLI
              </span>
            )}
          </div>

          {/* Transcript list */}
          <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-2">
            {customerLines.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-10 px-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center mb-3">
                  <Mic className="w-5 h-5 text-slate-600" />
                </div>
                <p className="text-sm text-slate-500 font-medium mb-6">
                  {callActive ? 'Mijoz hali gapirmagan...' : "Qo'ng'iroqni boshlang"}
                </p>

                {/* Subtle demo hints — visible when chat empty, fade away when conversation starts */}
                <div className="w-full max-w-[260px] mt-2 opacity-70">
                  <p className="text-[9px] uppercase tracking-[1.5px] text-slate-600 mb-2">
                    Misol uchun sinab ko&apos;ring
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {c.predicted_questions.slice(0, 3).map(q => (
                      <button
                        key={q.short}
                        onClick={() => handleDemoQuestion(q.text)}
                        disabled={!callActive}
                        className="text-[10px] text-left px-3 py-2 bg-slate-900/40 hover:bg-indigo-500/15 hover:border-indigo-500/40 border border-slate-800/80 text-slate-400 hover:text-slate-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-start gap-2 leading-snug"
                        title={!callActive ? "Avval qo'ng'iroqni boshlang" : q.text}
                      >
                        <span className="flex-shrink-0">{q.icon}</span>
                        <span className="italic">&ldquo;{q.text.length > 50 ? q.text.slice(0, 50) + '…' : q.text}&rdquo;</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {customerLines.map((line, i) => {
              const isLatest = i === customerLines.length - 1;
              return (
                <div key={i}
                  className={`rounded-2xl p-3 border transition-all duration-300 ${
                    isLatest
                      ? 'bg-gradient-to-br from-amber-500/15 to-slate-900/60 border-amber-500/40'
                      : 'bg-slate-800/40 border-slate-800'
                  }`}
                  style={isLatest ? { boxShadow: '0 8px 24px -10px rgba(245,158,11,0.3)' } : undefined}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-[8px] font-bold">
                        {c.full_name[0]}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{line.timestamp}</span>
                    </div>
                    {isLatest && (
                      <span className="flex items-center gap-1 text-[9px] text-red-400 font-bold uppercase">
                        <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                        So&apos;nggi
                      </span>
                    )}
                  </div>
                  <p className={`leading-relaxed ${isLatest ? 'text-sm text-slate-100' : 'text-xs text-slate-300'}`}>
                    {line.text}
                  </p>
                </div>
              );
            })}

            {/* Interim */}
            {interimText && (
              <div className="bg-slate-700/30 border border-dashed border-slate-700 rounded-2xl p-3">
                <p className="text-[10px] text-slate-500 mb-1">Mijoz gapirmoqda...</p>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map(d => (
                    <span key={d} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"
                      style={{ animationDelay: `${d * 0.2}s` }} />
                  ))}
                  <span className="text-xs text-slate-400 italic ml-1">{interimText}</span>
                </div>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>

          {/* CTA / Live status footer */}
          <div className="flex-shrink-0 border-t border-slate-700/50 p-3">
            {callActive ? (
              /* ── End-call button (2-row stack) ── */
              <button
                onClick={handleEndCall}
                className="group relative w-full overflow-hidden bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white rounded-2xl py-3 px-4 flex flex-col items-center gap-2 transition-all shadow-[0_0_24px_rgba(239,68,68,0.4)] hover:shadow-[0_0_32px_rgba(239,68,68,0.6)]"
              >
                {/* Row 1: REC status */}
                <div className="flex items-center gap-2.5 w-full justify-center">
                  <span className="relative flex w-2.5 h-2.5 flex-shrink-0">
                    <span className="absolute inset-0 bg-white rounded-full animate-ping opacity-75" />
                    <span className="relative inline-flex w-2.5 h-2.5 bg-white rounded-full" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-white/90">REC</span>
                  <div className="flex items-center gap-px h-3.5">
                    {WAVE.slice(0, 14).map((h, i) => (
                      <div key={i} className="w-0.5 bg-white/80 rounded-full animate-pulse"
                        style={{ height: `${h}px`, animationDelay: `${i * 60}ms` }} />
                    ))}
                  </div>
                  <span className="font-mono text-xs font-bold text-white tabular-nums">{fmt(elapsed)}</span>
                </div>
                {/* Row 2: action label */}
                <div className="flex items-center gap-2 border-t border-white/20 pt-2 w-full justify-center">
                  <PhoneOff className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  <span className="text-sm font-bold">Tugalish</span>
                </div>
              </button>
            ) : (
              /* ── Big CTA: ringing phone ── */
              <button
                onClick={() => setShowModal(true)}
                className="group relative w-full overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white rounded-2xl py-4 px-5 flex items-center justify-center gap-3 transition-all shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:shadow-[0_0_32px_rgba(16,185,129,0.55)]"
              >
                {/* Outer pulse ring */}
                <span className="absolute inset-0 rounded-2xl border-2 border-emerald-300/60 animate-ping opacity-40 pointer-events-none" />
                {/* Wiggling phone icon */}
                <span className="relative z-10 flex items-center justify-center w-11 h-11 rounded-full bg-white/15 backdrop-blur-sm">
                  <Phone className="w-5 h-5 animate-wiggle" />
                </span>
                <div className="relative z-10 text-left">
                  <p className="text-base font-bold leading-tight">Qo&apos;ng&apos;iroqni qabul qilish</p>
                  <p className="text-[11px] text-emerald-100/90">Tinglash avtomatik boshlanadi</p>
                </div>
              </button>
            )}

            {/* Hidden recorder — runs auto on callActive */}
            <AudioRecorder
              onTranscript={handleTranscript}
              onInterimTranscript={handleInterimTranscript}
              isActive={callActive}
            />
          </div>
        </div>
      </div>

      {/* ── POST-CALL SUMMARY MODAL ── */}
      {showSummary && callSummary && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-700 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-white">Qo&apos;ng&apos;iroq Xulosasi</h2>
                    <p className="text-[11px] text-slate-500">AI tomonidan generatsiya qilindi</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-black ${
                    callSummary.quality_score >= 80 ? 'text-emerald-400'
                    : callSummary.quality_score >= 60 ? 'text-amber-400'
                    : 'text-red-400'
                  }`}>
                    {Math.round(callSummary.quality_score)}
                  </p>
                  <p className="text-[10px] text-slate-500">sifat bali</p>
                </div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 mb-4">
                <p className="text-sm text-slate-300 leading-relaxed">{callSummary.summary}</p>
              </div>
              {callSummary.next_steps.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Keyingi qadamlar</p>
                  <ul className="space-y-1.5">
                    {callSummary.next_steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <ChevronRight className="w-3 h-3 text-indigo-400 mt-0.5 flex-shrink-0" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={() => { setShowSummary(false); setCallSummary(null); }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOMER SELECT MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-base text-white">Mijozni Tanlang</h2>
                  <p className="text-[11px] text-slate-500">Qo&apos;ng&apos;iroq navbati · {CUSTOMERS.length} ta mijoz</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white p-1 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {CUSTOMERS.map(customer => {
                  const hasCritical = customer.risk_flags.some(f => f.severity === 'critical');
                  const hasWarning = customer.risk_flags.some(f => f.severity === 'warning');
                  return (
                    <button
                      key={customer.id}
                      onClick={() => handleStartCall(customer)}
                      className="w-full text-left bg-slate-800 hover:border-indigo-600/50 border border-slate-700 rounded-xl p-3.5 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                          customer.segment === 'VIP' ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                          : customer.segment === 'Premium' ? 'bg-gradient-to-br from-indigo-500 to-indigo-700'
                          : 'bg-gradient-to-br from-zinc-400 to-zinc-600'
                        }`}>
                          {customer.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-white truncate">{customer.full_name}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold flex-shrink-0 ${
                              customer.segment === 'VIP'
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                : customer.segment === 'Premium'
                                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                : 'bg-slate-500/20 border-slate-500/50 text-slate-300'
                            }`}>
                              {customer.segment}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{customer.phone}</p>
                          <p className="text-xs text-indigo-300 mt-0.5 truncate">{customer.intent_hint}</p>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                              customer.credit_score >= 700 ? 'bg-emerald-900/40 text-emerald-400'
                              : customer.credit_score >= 600 ? 'bg-amber-900/40 text-amber-400'
                              : 'bg-red-900/40 text-red-400'
                            }`}>
                              Bali: {customer.credit_score}
                            </span>
                            {hasCritical && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-600/30 text-red-300 font-bold">
                                🔴 Kritik
                              </span>
                            )}
                            {!hasCritical && hasWarning && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-800/30 text-amber-400">
                                ⚠️ Ogohlantirish
                              </span>
                            )}
                            {customer.cross_sell_hint && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-900/30 text-emerald-400">
                                💡 Taklif
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 ml-auto">
                              {customer.call_count === 0 ? '🆕 Yangi' : `📞 ${customer.call_count}x`}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 flex-shrink-0 mt-3 transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-600 text-center mt-3">
                Mijozni bosing — qo&apos;ng&apos;iroq avtomatik boshlanadi
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
