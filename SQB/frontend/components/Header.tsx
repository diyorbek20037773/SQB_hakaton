'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Wifi, WifiOff } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/operator': 'Operator Kopilot',
  '/supervisor': 'Supervisor Panel',
  '/analytics': 'Analitika',
  '/simulator': 'Qo\'ng\'iroq Simulatori',
};

interface HeaderProps {
  isConnected?: boolean;
  operatorName?: string;
}

export function Header({
  isConnected = false,
  operatorName = 'Operator #1',
}: HeaderProps) {
  const pathname = usePathname();
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString('uz-UZ', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const title = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] ?? 'Yulduz AI';

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-700 flex items-center px-6 gap-4">
      {/* Left: page title */}
      <h1 className="text-white font-semibold text-base">{title}</h1>

      {/* Center: clock */}
      <div className="flex-1 flex justify-center">
        <span className="text-slate-300 font-mono text-sm tracking-widest">
          {time}
        </span>
      </div>

      {/* Right: connection + operator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-emerald-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-slate-500" />
          )}
          <span
            className={`text-xs font-medium ${
              isConnected ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            {isConnected ? 'Ulangan' : 'Offline'}
          </span>
        </div>
        <div className="w-px h-5 bg-slate-700" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {operatorName[0]}
          </div>
          <span className="text-slate-300 text-sm">{operatorName}</span>
        </div>
      </div>
    </header>
  );
}
