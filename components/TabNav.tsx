"use client";
import React from 'react';

type Props = {
  active: 'checklist' | 'expenses' | 'itinerary';
  onChange: (tab: Props['active']) => void;
};

export default function TabNav({ active, onChange }: Props) {
  const btn = (key: Props['active'], label: string) => {
    const isActive = active === key;
    return (
      <button
        data-tab={key}
        onClick={() => onChange(key)}
        className={
          'tab-btn flex-1 py-3 px-2 text-sm font-medium ' +
          (isActive
            ? 'text-gray-900 border-b-2 border-gray-900'
            : 'text-gray-400 hover:text-gray-700')
        }
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex bg-white border-b border-gray-200">
      {btn('checklist', 'Checklist')}
      {btn('expenses', 'Expenses')}
      {btn('itinerary', 'Itinerary')}
    </div>
  );
}

