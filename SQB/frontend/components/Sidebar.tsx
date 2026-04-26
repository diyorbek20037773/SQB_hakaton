'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Headphones, LayoutDashboard, Zap, Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

const navItems = [
  { href: '/operator', label: 'Operator', icon: Headphones, showLive: true },
  { href: '/supervisor', label: 'Admin', icon: LayoutDashboard, showLive: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <aside className="relative z-10 flex flex-col flex-shrink-0 h-full w-[220px] dark:w-[72px] transition-[width] duration-300">

      {/* ── LIGHT MODE (V2 Editorial — 220px) ── */}
      <div className="dark:hidden flex flex-col h-full bg-white border-r border-stone-200">
        {/* Logo */}
        <div className="p-5 border-b border-stone-200">
          <p className="text-[10px] uppercase tracking-wider font-medium text-zinc-400 mb-2">SQB · v2.4</p>
          <div className="flex items-center gap-2.5">
            <div className="w-[30px] h-[30px] bg-zinc-950 rounded-md flex items-center justify-center flex-shrink-0">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-zinc-950 tracking-wide">Yulduz AI</span>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 p-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 mb-3 px-2">WORKSPACE</p>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-950 text-white'
                      : 'text-zinc-700 hover:bg-stone-100'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                  {item.showLive && isActive && (
                    <span className="ml-auto text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold tracking-wide">
                      Jonli
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Theme toggle */}
        <div className="px-4 pb-2">
          <button
            onClick={toggle}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-zinc-500 hover:bg-stone-100 text-sm transition-colors"
            title="Qorong'u rejim"
          >
            <Moon className="w-4 h-4 flex-shrink-0" />
            <span>Qorong&apos;u rejim</span>
          </button>
        </div>

        {/* User card */}
        <div className="p-4 border-t border-stone-200">
          <div className="flex items-center gap-2.5 p-3 border border-stone-200 rounded-xl bg-stone-50">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              N
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-950 truncate">Nilufar A.</p>
              <p className="text-[10px] text-zinc-400">Operator #1 · Onlayn</p>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* ── DARK MODE (V1 Premium Dark — 72px) ── */}
      <div className="hidden dark:flex flex-col h-full bg-slate-950 border-r border-slate-900">
        {/* Logo */}
        <div className="flex justify-center py-4 px-3 border-b border-slate-900">
          <div
            className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center"
            style={{ boxShadow: '0 0 20px rgba(99,102,241,0.35)' }}
          >
            <Zap className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 flex flex-col items-center gap-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all group ${
                  isActive
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-lg shadow-indigo-900/50'
                    : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                <div className="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-slate-600 shadow-lg">
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Theme toggle */}
        <div className="flex justify-center pb-2 px-2">
          <button
            onClick={toggle}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
            title="Yorug' rejim"
          >
            <Sun className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* User avatar */}
        <div className="border-t border-slate-900 p-3 flex justify-center">
          <div className="relative">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              N
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950" />
          </div>
        </div>
      </div>
    </aside>
  );
}
