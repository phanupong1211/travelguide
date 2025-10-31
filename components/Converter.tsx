"use client";
import React, { useMemo, useState } from 'react';
import { useApp } from './AppContext';
import { Currency } from '@/lib/currency';

function convert(amount: number, from: Currency, to: Currency, rates: { USD: number; JPY: number }) {
  if (isNaN(amount)) return 0;
  if (from === to) return amount;
  const toTHB = (a: number, cur: Currency) => {
    if (cur === 'THB') return a;
    if (cur === 'USD') return a * (rates.USD || 32.33);
    if (cur === 'JPY') return a * (rates.JPY || 0.21);
    return a;
  };
  const fromTHB = (a: number, cur: Currency) => {
    if (cur === 'THB') return a;
    if (cur === 'USD') return a / (rates.USD || 32.33);
    if (cur === 'JPY') return a / (rates.JPY || 0.21);
    return a;
  };
  const thb = toTHB(amount, from);
  return fromTHB(thb, to);
}

export default function Converter() {
  const { rates, setRates } = useApp();
  const [amount, setAmount] = useState<string>('1000');
  const [from, setFrom] = useState<Currency>('THB');
  const [to, setTo] = useState<Currency>('USD');

  const value = parseFloat(amount) || 0;
  const result = useMemo(() => convert(value, from, to, rates), [value, from, to, rates]);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-medium">Currency Converter</h2>

      {/* Rates */}
      <div className="bg-gray-50 p-3 rounded">
        <h3 className="font-medium mb-2">Rates (to THB)</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <label className="block text-gray-600 mb-1">USD → THB</label>
            <input
              type="number"
              step="0.01"
              value={String(rates.USD)}
              onChange={(e) => setRates({ USD: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">JPY → THB</label>
            <input
              type="number"
              step="0.01"
              value={String(rates.JPY)}
              onChange={(e) => setRates({ JPY: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      {/* Converter */}
      <div className="bg-white p-3 rounded border space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            className="px-3 py-2 border border-gray-300 rounded"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
          />
          <select value={from} onChange={(e) => setFrom(e.target.value as Currency)} className="px-3 py-2 border border-gray-300 rounded">
            <option value="THB">THB</option>
            <option value="USD">USD</option>
            <option value="JPY">JPY</option>
          </select>
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => { setFrom(to); setTo(from); }}
            className="px-3 py-1 text-sm rounded border bg-gray-50 hover:bg-gray-100"
          >
            ⇅ Swap
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            disabled
            className="px-3 py-2 border border-gray-300 rounded bg-gray-50"
            value={Number(result || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          />
          <select value={to} onChange={(e) => setTo(e.target.value as Currency)} className="px-3 py-2 border border-gray-300 rounded">
            <option value="THB">THB</option>
            <option value="USD">USD</option>
            <option value="JPY">JPY</option>
          </select>
        </div>
      </div>
    </div>
  );
}

