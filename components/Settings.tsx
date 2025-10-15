"use client";
import React, { useEffect, useState } from 'react';
import { useApp } from './AppContext';

export default function Settings() {
  const { people, setPeople } = useApp();
  const [names, setNames] = useState<string[]>(people || ['You', 'Friend 1', 'Friend 2']);

  useEffect(() => {
    setNames(people || []);
  }, [people]);

  const update = (idx: number, val: string) => {
    setNames((prev) => prev.map((n, i) => (i === idx ? val : n)));
  };

  const onAdd = () => setNames((prev) => [...prev, `Friend ${prev.length}`]);
  const onRemove = (idx: number) => setNames((prev) => prev.filter((_, i) => i !== idx));
  const onSave = () => setPeople(names.filter((n) => n.trim().length > 0));

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-medium">Settings</h2>
      <div className="bg-gray-50 p-3 rounded">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Trip Members</div>
          <button onClick={onAdd} className="text-sm bg-gray-700 text-white px-2 py-1 rounded">+ Add</button>
        </div>
        <div className="space-y-2">
          {names.map((n, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={n} onChange={(e) => update(i, e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded" />
              <button onClick={() => onRemove(i)} className="text-red-600 text-sm px-2 py-1">Remove</button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={() => setNames(people || [])} className="px-3 py-2 bg-gray-200 rounded">Reset</button>
          <button onClick={onSave} className="px-3 py-2 bg-gray-900 text-white rounded">Save</button>
        </div>
      </div>
    </div>
  );
}

