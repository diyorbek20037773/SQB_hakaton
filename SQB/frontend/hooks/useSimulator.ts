'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { SimulatorSession, SimulatorMessage } from '@/lib/types';
import { createSimulatorWebSocket } from '@/lib/websocket';

interface SimulatorScores {
  empathy: number;
  compliance: number;
  product_knowledge: number;
  objection_handling: number;
}

interface ChatMessage {
  role: 'ai' | 'operator';
  text: string;
  timestamp: string;
}

interface UseSimulatorResult {
  session: SimulatorSession | null;
  messages: ChatMessage[];
  isConnected: boolean;
  scores: SimulatorScores;
  feedback: string;
  startSession: (operatorId: number, personaType: string) => Promise<void>;
  sendMessage: (text: string) => void;
  endSession: () => void;
}

const DEFAULT_SCORES: SimulatorScores = {
  empathy: 0,
  compliance: 0,
  product_knowledge: 0,
  objection_handling: 0,
};

// Mock AI responses per persona for demo mode
const MOCK_RESPONSES: Record<string, string[]> = {
  angry: [
    "Bu bank bilan ishlayman deb o'ylagandim, lekin bu nima? Har doim muammolar!",
    "Sizning xizmatingiz dahshatli! Men boshqa bankka o'taman!",
    "Nega bu qadar ko'p hujjat talab qilasizlar? Bu vaqtimni isrof qilmoqda!",
    "Men bir soatdan beri kutayapman! Bu qanday xizmat?",
  ],
  confused: [
    "Kechirasiz, men tushunmayapman. Bu kredit nima uchun kerak?",
    "Foiz stavkasi... bu qancha bo'ladi? Men hisoblay olmayman.",
    "Siz aytgan hujjatlar qaysi hujjatlar? Ro'yxat bera olasizmi?",
    "Men birinchi marta kredit olmoqchiman, qaerdan boshlayman?",
  ],
  savvy: [
    "Sizning foiz stavkangiz raqiblaringiznikidan yuqori. Nima uchun sizni tanlashim kerak?",
    "Men boshqa bankdan 14% stavka taklif olganman. Siz mos kelasizmi?",
    "Erta to'lash jarimasi bormi? Shartnoma shartlarini batafsil tushuntiring.",
    "KYC jarayoni qancha vaqt oladi? Men bugun javob olishim kerak.",
  ],
};

const DEMO_OPENINGS: Record<string, string> = {
  angry: "Assalomu alaykum! Men kredit masalasida murojaat qilmoqchiman. Lekin sizlar har doim kechiktirasizlar!",
  confused: "Salom... Men kredit haqida so'ramoqchi edim. Qayerdan boshlayman?",
  savvy: "Salom. Men sizning kredit mahsulotlaringizni boshqa banklar bilan solishtirayotirman. Gapirishingiz mumkinmi?",
};

export function useSimulator(): UseSimulatorResult {
  const [session, setSession] = useState<SimulatorSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [scores, setScores] = useState<SimulatorScores>(DEFAULT_SCORES);
  const [feedback, setFeedback] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const personaRef = useRef<string>('angry');
  const responseIndexRef = useRef(0);

  const addMessage = useCallback((role: 'ai' | 'operator', text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        role,
        text,
        timestamp: new Date().toLocaleTimeString('uz-UZ', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      },
    ]);
  }, []);

  const connectWS = useCallback((sessionId: number, personaType: string) => {
    const ws = createSimulatorWebSocket(sessionId, (data: SimulatorMessage) => {
      if (data.ai_response) addMessage('ai', data.ai_response);
      if (data.scores) setScores(data.scores as SimulatorScores);
      if (data.feedback) setFeedback(data.feedback);
    });
    ws.onopen = () => setIsConnected(true);
    ws.onerror = () => {
      setIsConnected(false);
      addMessage('ai', DEMO_OPENINGS[personaType] ?? DEMO_OPENINGS.angry);
    };
    ws.onclose = () => setIsConnected(false);
    wsRef.current = ws;
  }, [addMessage]);

  const startSession = useCallback(
    async (operatorId: number, personaType: string) => {
      personaRef.current = personaType;
      responseIndexRef.current = 0;
      setMessages([]);
      setScores(DEFAULT_SCORES);
      setFeedback('');

      // Try real API session first, fallback to demo
      try {
        const { startSimulatorSession } = await import('@/lib/api');
        const realSession = await startSimulatorSession(operatorId, personaType);
        setSession(realSession);
        // Add initial message from API response if available
        const init = (realSession as { initial_message?: string }).initial_message;
        if (init) addMessage('ai', init);
        connectWS(realSession.id, personaType);
      } catch {
        // Demo mode
        const mockSession: SimulatorSession = {
          id: Math.floor(Math.random() * 1000) + 1,
          operator_id: operatorId,
          persona_type: personaType as 'angry' | 'confused' | 'savvy',
          started_at: new Date().toISOString(),
        };
        setSession(mockSession);
        addMessage('ai', DEMO_OPENINGS[personaType] ?? DEMO_OPENINGS.angry);
      }
    },
    [addMessage, connectWS]
  );

  const sendMessage = useCallback(
    (text: string) => {
      if (!session) return;
      addMessage('operator', text);

      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ operator_message: text }));
      } else {
        // Demo mode mock response
        setTimeout(() => {
          const responses = MOCK_RESPONSES[personaRef.current] ?? MOCK_RESPONSES.angry;
          const idx = responseIndexRef.current % responses.length;
          const aiResponse = responses[idx];
          responseIndexRef.current += 1;
          addMessage('ai', aiResponse);

          // Update mock scores
          setScores((prev) => ({
            empathy: Math.min(100, prev.empathy + Math.floor(Math.random() * 15)),
            compliance: Math.min(100, prev.compliance + Math.floor(Math.random() * 12)),
            product_knowledge: Math.min(100, prev.product_knowledge + Math.floor(Math.random() * 10)),
            objection_handling: Math.min(100, prev.objection_handling + Math.floor(Math.random() * 13)),
          }));
          setFeedback(
            "Yaxshi javob! Mijoz bilan empatiya ko'rsating va mahsulot afzalliklarini aniq tushuntiring."
          );
        }, 1000);
      }
    },
    [session, addMessage]
  );

  const endSession = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
    if (session) {
      setSession((prev) => (prev ? { ...prev, ended_at: new Date().toISOString() } : null));
    }
  }, [session]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return {
    session,
    messages,
    isConnected,
    scores,
    feedback,
    startSession,
    sendMessage,
    endSession,
  };
}
