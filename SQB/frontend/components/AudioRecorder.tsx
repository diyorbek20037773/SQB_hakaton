'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';

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
  const [isRecording, setIsRecording] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognitionAPI =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    setSupported(!!SpeechRecognitionAPI);
  }, []);

  const startRecording = useCallback(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
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
          if (hasWord) onTranscript(text);
          onInterimTranscript?.('');
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) onInterimTranscript?.(interim);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    if (!isActive) stopRecording();
    return () => { stopRecording(); };
  }, [isActive, stopRecording]);

  if (!isActive) return null;

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
      {/* Recording indicator */}
      {isRecording ? (
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-400 text-xs font-medium">Tinglanmoqda...</span>
        </span>
      ) : (
        <span className="text-slate-500 text-xs">Mijoz ovozini tinglash uchun bosing</span>
      )}

      <div className="flex-1" />

      {/* Record button */}
      {supported ? (
        <button
          onClick={toggleRecording}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            isRecording
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isRecording ? (
            <>
              <MicOff className="w-4 h-4" />
              To'xtatish
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Yozish
            </>
          )}
        </button>
      ) : (
        <span className="text-slate-500 text-xs">
          Brauzer qo&apos;llab-quvvatlamaydi
        </span>
      )}
    </div>
  );
}
