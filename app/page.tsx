"use client";
import React, { useEffect, useState } from 'react';
import { AppProvider } from '@/components/AppContext';
import TabNav from '@/components/TabNav';
import Checklist from '@/components/Checklist';
import Expenses from '@/components/Expenses';
import Itinerary from '@/components/Itinerary';
import nextDynamic from 'next/dynamic';
const SyncButton = nextDynamic(() => import('@/components/SyncButton'), { ssr: false });
const Settings = nextDynamic(() => import('@/components/Settings'), { ssr: false });
const Settlement = nextDynamic(() => import('@/components/Settlement'), { ssr: false });

export default function Page() {
  const [tab, setTab] = useState<'checklist' | 'expenses' | 'itinerary'>('checklist');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [view, setView] = useState<'main' | 'settings' | 'settlement'>('main');
  const [menuOpen, setMenuOpen] = useState(false);

  if (!mounted) {
    // Avoid hydration mismatch by rendering nothing until client mounts
    return null;
  }

  return (
    <AppProvider>
      <div className="max-w-md mx-auto bg-white border-l border-r border-gray-200 min-h-full">
        <div className="bg-gray-900 text-white p-4 border-b border-gray-200 relative">
          <div className="flex items-center justify-between" suppressHydrationWarning>
            <div className="flex items-center gap-2">
              <button aria-label="Menu" onClick={() => setMenuOpen((v) => !v)} className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700">☰</button>
              <h1 className="text-xl font-medium flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
                Travel Guide
              </h1>
            </div>
            <SyncButton />
          </div>
          {menuOpen && (
            <div className="absolute top-14 left-3 bg-white text-gray-900 rounded shadow border min-w-[160px] z-20">
              <button className="w-full text-left px-3 py-2 hover:bg-gray-100" onClick={() => { setView('main'); setMenuOpen(false); }}>Home</button>
              <button className="w-full text-left px-3 py-2 hover:bg-gray-100" onClick={() => { setView('settings'); setMenuOpen(false); }}>Settings</button>
              <button className="w-full text-left px-3 py-2 hover:bg-gray-100" onClick={() => { setView('settlement'); setMenuOpen(false); }}>Settlement</button>
            </div>
          )}
        </div>

        {view === 'main' && (
          <>
            <TabNav active={tab} onChange={setTab} />
            {tab === 'checklist' && <Checklist />}
            {tab === 'expenses' && <Expenses />}
            {tab === 'itinerary' && <Itinerary />}
          </>
        )}
        {view === 'settings' && <Settings />}
        {view === 'settlement' && <Settlement />}
      </div>
    </AppProvider>
  );
}

export const dynamic = 'force-dynamic';
