"use client";
import React, { useState } from 'react';
import { useApp } from './AppContext';

export default function Checklist() {
  const { checklist, addChecklistItem, toggleChecklistItem, deleteChecklistItem, clearChecked, resetChecklist } = useApp();
  const [text, setText] = useState('');

  const onAdd = () => {
    const t = text.trim();
    if (!t) return;
    addChecklistItem(t);
    setText('');
  };

  return (
    <div id="checklist" className="p-4">
      <div className="mb-4">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            id="newItem"
            placeholder="Add new item..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          />
          <button onClick={onAdd} className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800">
            +
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={clearChecked} className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700 text-sm">
            Clear checked
          </button>
          <button onClick={resetChecklist} className="flex-1 bg-gray-400 text-white py-2 rounded hover:bg-gray-500 text-sm">
            Reset all
          </button>
        </div>
      </div>
      <div id="checklistItems" className="space-y-2">
        {checklist.map((item) => (
          <div key={item.id} className={`flex items-center gap-3 p-3 bg-white rounded border border-gray-200 ${item.checked ? 'bg-gray-50' : ''}`}>
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleChecklistItem(item.id)}
              className="w-4 h-4 text-gray-600 rounded focus:ring-gray-400"
            />
            <span className={`flex-1 ${item.checked ? 'line-through text-gray-500' : ''}`}>{item.text}</span>
            <button onClick={() => { if (confirm('Delete this item?')) deleteChecklistItem(item.id); }} className="text-gray-400 hover:text-gray-600 p-1">
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
