'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSimulator } from '@/hooks/useSimulator';
import {
  Bot,
  Send,
  RotateCcw,
  Flame,
  HelpCircle,
  Brain,
  Trophy,
  ChevronRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type PersonaType = 'angry' | 'confused' | 'savvy';

interface PersonaConfig {
  id: PersonaType;
  label: string;
  labelUz: string;
  icon: React.ElementType;
  description: string;
  difficulty: 'Oson' | "O'rta" | 'Qiyin';
  difficultyColor: string;
  color: string;
}

// ─── Persona configs ──────────────────────────────────────────────────────────
const PERSONAS: PersonaConfig[] = [
  {
    id: 'angry',
    label: 'angry',
    labelUz: "G'azablangan",
    icon: Flame,
    description: "Mijoz xizmatdan norozi, agressiv muloqot qiladi. Sabr-toqat va empatiya muhim.",
    difficulty: 'Qiyin',
    difficultyColor: 'text-red-400 border-red-500/40 bg-red-900/20',
    color: 'border-red-500/40 hover:border-red-400',
  },
  {
    id: 'confused',
    label: 'confused',
    labelUz: 'Chalkash',
    icon: HelpCircle,
    description: 'Mijoz moliyaviy mahsulotlar haqida bilimi kam. Tushuntirishga sabr kerak.',
    difficulty: "O'rta",
    difficultyColor: 'text-amber-400 border-amber-500/40 bg-amber-900/20',
    color: 'border-amber-500/40 hover:border-amber-400',
  },
  {
    id: 'savvy',
    label: 'savvy',
    labelUz: 'Ayyor',
    icon: Brain,
    description: "Mijoz moliyaviy savodxon, raqiblar bilan taqqoslaydi. Chuqur bilim talab etiladi.",
    difficulty: 'Qiyin',
    difficultyColor: 'text-purple-400 border-purple-500/40 bg-purple-900/20',
    color: 'border-purple-500/40 hover:border-purple-400',
  },
];

// ─── Score bar ────────────────────────────────────────────────────────────────
function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500';
  const textColor =
    value >= 70 ? 'text-emerald-400' : value >= 40 ? 'text-amber-400' : 'text-red-400';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-slate-300 text-xs">{label}</span>
        <span className={`text-xs font-bold ${textColor}`}>{value}</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ─── Grade calculation ────────────────────────────────────────────────────────
function calcGrade(scores: Record<string, number>): string {
  const avg =
    Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
  if (avg >= 85) return 'A';
  if (avg >= 70) return 'B';
  if (avg >= 55) return 'C';
  if (avg >= 40) return 'D';
  return 'F';
}

function gradeColor(g: string) {
  switch (g) {
    case 'A': return 'text-emerald-400 border-emerald-500';
    case 'B': return 'text-indigo-400 border-indigo-500';
    case 'C': return 'text-amber-400 border-amber-500';
    case 'D': return 'text-orange-400 border-orange-500';
    default: return 'text-red-400 border-red-500';
  }
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function SimulatorPage() {
  const { session, messages, scores, feedback, startSession, sendMessage, endSession } =
    useSimulator();

  const [step, setStep] = useState<'setup' | 'active' | 'results'>('setup');
  const [selectedPersona, setSelectedPersona] = useState<PersonaType | null>(null);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleStart = async () => {
    if (!selectedPersona) return;
    setStep('active');
    await startSession(1, selectedPersona);
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText('');
  };

  const handleEnd = () => {
    endSession();
    setStep('results');
  };

  const handleReset = () => {
    setStep('setup');
    setSelectedPersona(null);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const grade = scores
    ? calcGrade({
        empathy: scores.empathy,
        compliance: scores.compliance,
        product_knowledge: scores.product_knowledge,
        objection_handling: scores.objection_handling,
      })
    : 'F';

  // ── STEP 1: Setup ──
  if (step === 'setup') {
    return (
      <div className="h-full overflow-y-auto flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600/20 border border-indigo-500/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-indigo-400" />
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">Qo&apos;ng&apos;iroq Simulatori</h2>
            <p className="text-slate-400">
              Haqiqiy mijoz personajlari bilan mashq qiling va ko&apos;nikmalaringizni yaxshilang
            </p>
          </div>

          <h3 className="text-slate-400 text-sm font-medium mb-4 text-center">
            Mijoz personajini tanlang
          </h3>

          <div className="grid grid-cols-3 gap-4 mb-8">
            {PERSONAS.map((p) => {
              const Icon = p.icon;
              const isSelected = selectedPersona === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersona(p.id)}
                  className={`relative flex flex-col p-5 rounded-xl border-2 text-left transition-all duration-200 ${
                    isSelected
                      ? `${p.color} bg-indigo-900/20 border-indigo-500 shadow-lg shadow-indigo-900/30`
                      : `border-slate-700 bg-slate-900 ${p.color}`
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                      <ChevronRight className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <Icon
                    className={`w-8 h-8 mb-3 ${
                      p.id === 'angry' ? 'text-red-400' : p.id === 'confused' ? 'text-amber-400' : 'text-purple-400'
                    }`}
                  />
                  <p className="text-white font-semibold mb-1">{p.labelUz}</p>
                  <p className="text-slate-400 text-xs leading-relaxed mb-3">
                    {p.description}
                  </p>
                  <span className={`self-start text-xs px-2 py-0.5 rounded-full border font-medium ${p.difficultyColor}`}>
                    {p.difficulty}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleStart}
            disabled={!selectedPersona}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all text-base"
          >
            Mashqni Boshlash
          </button>
        </div>
      </div>
    );
  }

  // ── STEP 3: Results ──
  if (step === 'results') {
    return (
      <div className="h-full overflow-y-auto flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-xl">
          <div className="text-center mb-6">
            <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <h2 className="text-white text-2xl font-bold">Mashq Yakunlandi</h2>
            <p className="text-slate-400 text-sm mt-1">Sizning natijangiz</p>
          </div>

          {/* Grade */}
          <div className="flex justify-center mb-8">
            <div className={`w-28 h-28 rounded-2xl border-4 flex items-center justify-center ${gradeColor(grade)}`}>
              <span className="text-6xl font-black">{grade}</span>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-5 mb-4">
            <h3 className="text-white font-medium mb-4">Batafsil Natijalar</h3>
            <div className="space-y-4">
              <ScoreBar label="Empatiya" value={scores.empathy} />
              <ScoreBar label="Muvofiqlik" value={scores.compliance} />
              <ScoreBar label="Mahsulot Bilimi" value={scores.product_knowledge} />
              <ScoreBar label="E'tiroz Boshqaruvi" value={scores.objection_handling} />
            </div>
          </div>

          {/* AI feedback */}
          {feedback && (
            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 mb-6">
              <p className="text-indigo-300 text-sm font-medium mb-1">AI Tahlili</p>
              <p className="text-slate-300 text-sm leading-relaxed">{feedback}</p>
            </div>
          )}

          {/* Improvement tips */}
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-4 mb-6">
            <p className="text-slate-400 text-xs font-medium mb-2">Takomillashtirish bo&apos;yicha tavsiyalar</p>
            <ul className="space-y-2">
              {[
                scores.empathy < 70 && 'Mijoz bilan empatiya ko\'rsatishni kuchaytiring',
                scores.compliance < 70 && 'Muvofiqlik qoidalariga e\'tibor bering',
                scores.product_knowledge < 70 && 'Mahsulotlar haqida ko\'proq ma\'lumot o\'rganing',
                scores.objection_handling < 70 && 'E\'tirozlarga ishonchli javob berishni mashq qiling',
              ].filter(Boolean).map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  {tip}
                </li>
              ))}
              {Object.values(scores).every((v) => v >= 70) && (
                <li className="text-emerald-400 text-xs">
                  Zo&apos;r natija! Barcha ko&apos;rsatkichlar yaxshi darajada.
                </li>
              )}
            </ul>
          </div>

          <button
            onClick={handleReset}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Qayta Urinish
          </button>
        </div>
      </div>
    );
  }

  // ── STEP 2: Active simulation ──
  const currentPersona = PERSONAS.find((p) => p.id === session?.persona_type);

  return (
    <div className="flex h-full gap-0">
      {/* Left: Chat */}
      <div className="flex-1 flex flex-col border-r border-slate-700 min-h-0">
        {/* Chat header */}
        <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-3 bg-slate-900">
          {currentPersona && (
            <>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                currentPersona.id === 'angry' ? 'bg-red-900/40 border border-red-600/40' : currentPersona.id === 'confused' ? 'bg-amber-900/40 border border-amber-600/40' : 'bg-purple-900/40 border border-purple-600/40'
              }`}>
                <currentPersona.icon className={`w-5 h-5 ${
                  currentPersona.id === 'angry' ? 'text-red-400' : currentPersona.id === 'confused' ? 'text-amber-400' : 'text-purple-400'
                }`} />
              </div>
              <div>
                <p className="text-white font-medium text-sm">
                  AI Mijoz ({currentPersona.labelUz})
                </p>
                <p className="text-slate-500 text-xs">Simulyatsiya rejimi</p>
              </div>
            </>
          )}
          <div className="flex-1" />
          <button
            onClick={handleEnd}
            className="px-3 py-1.5 bg-slate-800 hover:bg-red-900/30 border border-slate-600 hover:border-red-600/40 text-slate-300 hover:text-red-300 text-xs rounded-lg transition-all"
          >
            Yakunlash
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-600 text-sm">Suhbat boshlanishini kuting...</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 ${msg.role === 'operator' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'ai' && (
                <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-slate-400" />
                </div>
              )}
              <div
                className={`max-w-[78%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${
                  msg.role === 'operator'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700'
                }`}
              >
                {msg.text}
                <p className={`text-xs mt-1 ${msg.role === 'operator' ? 'text-indigo-300' : 'text-slate-500'}`}>
                  {msg.timestamp}
                </p>
              </div>
              {msg.role === 'operator' && (
                <div className="w-7 h-7 bg-indigo-700 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">Op</span>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700 bg-slate-900">
          <div className="flex gap-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Javobingizni yozing... (Enter = yuborish)"
              rows={2}
              className="flex-1 bg-slate-800 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors flex items-center gap-1"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right: Scores */}
      <div className="w-72 flex flex-col bg-slate-900 p-4 space-y-4">
        <div>
          <p className="text-white text-sm font-semibold mb-1">Joriy Natijalar</p>
          <p className="text-slate-500 text-xs">Har bir javobdan so&apos;ng yangilanadi</p>
        </div>

        <div className="space-y-4">
          <ScoreBar label="Empatiya" value={scores?.empathy ?? 0} />
          <ScoreBar label="Muvofiqlik" value={scores?.compliance ?? 0} />
          <ScoreBar label="Mahsulot Bilimi" value={scores?.product_knowledge ?? 0} />
          <ScoreBar label="E'tiroz Boshqaruvi" value={scores?.objection_handling ?? 0} />
        </div>

        {/* Overall */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-3 text-center">
          <p className="text-slate-400 text-xs mb-1">Umumiy baho</p>
          <p className={`text-4xl font-black ${gradeColor(calcGrade({
            empathy: scores?.empathy ?? 0,
            compliance: scores?.compliance ?? 0,
            product_knowledge: scores?.product_knowledge ?? 0,
            objection_handling: scores?.objection_handling ?? 0,
          })).split(' ')[0]}`}>
            {calcGrade({
              empathy: scores?.empathy ?? 0,
              compliance: scores?.compliance ?? 0,
              product_knowledge: scores?.product_knowledge ?? 0,
              objection_handling: scores?.objection_handling ?? 0,
            })}
          </p>
        </div>

        {/* AI Feedback */}
        {feedback && (
          <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-3">
            <p className="text-indigo-300 text-xs font-medium mb-1">AI Tavsiya</p>
            <p className="text-slate-300 text-xs leading-relaxed">{feedback}</p>
          </div>
        )}

        <div className="flex-1" />

        <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
          <p className="text-slate-500 text-xs">Xabarlar: {messages.length}</p>
          <p className="text-slate-500 text-xs mt-0.5">Persona: {currentPersona?.labelUz}</p>
        </div>
      </div>
    </div>
  );
}
