"use client";
import React from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: 'main' | 'settings' | 'settlement') => void;
};

export default function MobileDrawer({ open, onClose, onNavigate }: Props) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      {/* backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* panel */}
      <div
        className={`absolute left-0 top-0 h-full w-[82%] max-w-[320px] bg-white shadow-xl border-r transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 border-b text-gray-800 font-medium">Menu</div>
        <nav className="flex flex-col p-2 text-gray-800">
          <button className="text-left px-3 py-3 hover:bg-gray-100 rounded" onClick={() => { onNavigate('main'); onClose(); }}>Home</button>
          <button className="text-left px-3 py-3 hover:bg-gray-100 rounded" onClick={() => { onNavigate('settings'); onClose(); }}>Settings</button>
          <button className="text-left px-3 py-3 hover:bg-gray-100 rounded" onClick={() => { onNavigate('settlement'); onClose(); }}>Settlement</button>
        </nav>
      </div>
    </div>
  );
}

