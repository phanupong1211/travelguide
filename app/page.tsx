"use client";
import React, { useState } from 'react';
import { AppProvider } from '@/components/AppContext';
import TabNav from '@/components/TabNav';
import Checklist from '@/components/Checklist';
import Expenses from '@/components/Expenses';
import Itinerary from '@/components/Itinerary';
import nextDynamic from 'next/dynamic';
const SyncButton = nextDynamic(() => import('@/components/SyncButton'), { ssr: false });
const Settings = nextDynamic(() => import('@/components/Settings'), { ssr: false });
const Settlement = nextDynamic(() => import('@/components/Settlement'), { ssr: false });
const BusyOverlay = nextDynamic(() => import('@/components/BusyOverlay'), { ssr: false });
const Splash = nextDynamic(() => import('@/components/Splash'), { ssr: false });
const MobileDrawer = nextDynamic(() => import('@/components/MobileDrawer'), { ssr: false });
const Converter = nextDynamic(() => import('@/components/Converter'), { ssr: false });

export default function Page() {
  const [tab, setTab] = useState<'checklist' | 'expenses' | 'itinerary'>('checklist');
  const [view, setView] = useState<'main' | 'settings' | 'settlement' | 'converter'>('main');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <AppProvider>
      <div className="relative max-w-md mx-auto bg-white border-l border-r border-gray-200 min-h-full" suppressHydrationWarning>
        <div className="bg-gray-900 text-white p-4 border-b border-gray-200 relative">
          <div className="flex items-center justify-between" suppressHydrationWarning>
            <div className="flex items-center gap-3">
              <button aria-label="Menu" onClick={() => setMenuOpen((v) => !v)} className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-xl">☰</button>
              <h1 className="text-xl font-medium flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
                Travel Guide
              </h1>
            </div>
            <SyncButton />
          </div>
          <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={(v) => setView(v)} />
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
        {view === 'converter' && <Converter />}
        {view === 'settlement' && <Settlement />}
        <BusyOverlay />
        <Splash />
      </div>
    </AppProvider>
  );
}

// Avoid static pre-render mismatches
export const dynamic = 'force-dynamic';
