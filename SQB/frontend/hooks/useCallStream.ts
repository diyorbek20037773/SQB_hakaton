'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { AIAnalysis } from '@/lib/types';
import { createCallWebSocket } from '@/lib/websocket';

interface UseCallStreamResult {
  analysis: AIAnalysis | null;
  isConnected: boolean;
  streamingSuggestion: string;
  isStreaming: boolean;
  sendTranscript: (text: string) => void;
  disconnect: () => void;
}

export function useCallStream(callId: number | null): UseCallStreamResult {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [streamingSuggestion, setStreamingSuggestion] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const streamingRef = useRef(false);

  useEffect(() => {
    if (callId === null) return;

    const onToken = (token: string) => {
      if (!streamingRef.current) {
        streamingRef.current = true;
        setIsStreaming(true);
        setStreamingSuggestion(token);
      } else {
        setStreamingSuggestion(prev => prev + token);
      }
    };

    const onAnalysis = (data: AIAnalysis) => {
      streamingRef.current = false;
      setIsStreaming(false);
      setStreamingSuggestion('');
      setAnalysis(data);
    };

    const ws = createCallWebSocket(callId, onAnalysis, onToken);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

    wsRef.current = ws;

    return () => {
      ws.close();
      wsRef.current = null;
      setIsConnected(false);
    };
  }, [callId]);

  const sendTranscript = useCallback((text: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ transcript_chunk: text }));
    }
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  return { analysis, isConnected, streamingSuggestion, isStreaming, sendTranscript, disconnect };
}
