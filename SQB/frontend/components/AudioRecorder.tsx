'use client';

import { useRef, useEffect, useCallback } from 'react';

interface AudioRecorderProps {
  onTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  isActive: boolean;
}

// Minimal type definitions for Web Speech API (not always in tslib dom)
interface ISpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
}
interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}

// Extend Window type for speech recognition
declare global {
  interface Window {
    SpeechRecognition: ISpeechRecognitionConstructor;
    webkitSpeechRecognition: ISpeechRecognitionConstructor;
  }
}

export function AudioRecorder({ onTranscript, onInterimTranscript, isActive }: AudioRecorderProps) {
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onInterimRef = useRef(onInterimTranscript);

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onInterimRef.current = onInterimTranscript; }, [onInterimTranscript]);

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    recognitionRef.current = null;
  }, []);

  const start = useCallback(() => {
    if (typeof window === 'undefined') return;
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) {
      console.warn('SpeechRecognition not supported in this browser');
      return;
    }
    if (recognitionRef.current) return;

    const recognition = new API();
    recognition.lang = 'uz-UZ';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex ?? 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          const hasWord = /[a-zA-ZА-яёҒҳқЎўҚ]{2,}/u.test(text);
          if (hasWord) onTranscriptRef.current(text);
          onInterimRef.current?.('');
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) onInterimRef.current?.(interim);
    };

    recognition.onerror = () => { recognitionRef.current = null; };
    recognition.onend = () => {
      // Auto-restart if still meant to be active (prevents API silence drop)
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error('Recognition start failed:', e);
    }
  }, []);

  // Auto-start when call goes active, stop when ends
  useEffect(() => {
    if (isActive) {
      start();
    } else {
      stop();
    }
    return () => { stop(); };
  }, [isActive, start, stop]);

  return null;
}
