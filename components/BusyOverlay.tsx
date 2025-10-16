"use client";
import React from 'react';
import { useApp } from './AppContext';

export default function BusyOverlay() {
  const { busy, busyText } = useApp();
  if (!busy) return null;
  return (
    <div className="fixed inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-[70] cursor-wait">
      <div role="status" aria-live="polite" className="flex items-center gap-3 px-4 py-2 rounded bg-white border shadow">
        <div className="w-4 h-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
        <div className="text-sm text-gray-700">{busyText || 'Working...'}</div>
      </div>
    </div>
  );
}
