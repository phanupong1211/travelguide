"use client";
import React, { useState } from 'react';
import { useApp } from './AppContext';

export default function SyncButton() {
  const { reloadFromRemote, pushToRemote, cloudEnabled, isEntities } = useApp();
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);

  if (!cloudEnabled && !isEntities) return null;

  const doSync = async () => {
    setBusy(true);
    setOk(null);
    try {
      // JSON mode: push first then reload; Entities: reload only
      if (!isEntities) await pushToRemote();
      const success = await reloadFromRemote();
      setOk(success);
    } finally {
      setBusy(false);
      setTimeout(() => setOk(null), 2000);
    }
  };

  return (
    <button
      onClick={doSync}
      disabled={busy}
      className={`no-print flex items-center gap-1 px-3 py-1 rounded text-white text-sm ${busy ? 'bg-gray-600' : ok === false ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
      title={isEntities ? 'Reload from Supabase' : 'Sync to/from Supabase'}
    >
      <span className="inline-block">{busy ? '⟳' : '⚙'}</span>
      <span>Sync</span>
    </button>
  );
}

