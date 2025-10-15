"use client";
import React, { useEffect, useState } from 'react';
import { useApp } from './AppContext';

export default function Splash() {
  const { ready } = useApp();
  const [show, setShow] = useState(false);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // Show only the first time in this session
    const seen = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('tg_splash_seen');
    if (!seen) setShow(true);
  }, []);

  useEffect(() => {
    if (!show) return;
    // Keep at least 700ms then fade out when ready
    const minTimer = setTimeout(() => {
      if (ready) {
        setFade(true);
        setTimeout(() => {
          setShow(false);
          try { sessionStorage.setItem('tg_splash_seen', '1'); } catch {}
        }, 300);
      }
    }, 700);

    return () => clearTimeout(minTimer);
  }, [show, ready]);

  if (!show) return null;
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-white transition-opacity ${fade ? 'opacity-0' : 'opacity-100'}`}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow">
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
        </div>
        <div className="text-lg font-medium text-gray-900">Travel Guide</div>
        <div className="w-5 h-5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
      </div>
    </div>
  );
}

