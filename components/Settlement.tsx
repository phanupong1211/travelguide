"use client";
import React, { useMemo } from 'react';
import { useApp } from './AppContext';

function format(n: number) {
  return Math.round(n).toLocaleString();
}

export default function Settlement() {
  const { expenses, people, toTHB } = useApp();

  const { owed, paid, balance, transfers } = useMemo(() => {
    const owed: Record<string, number> = Object.fromEntries((people || []).map((p) => [p, 0]));
    const paid: Record<string, number> = Object.fromEntries((people || []).map((p) => [p, 0]));

    for (const e of expenses) {
      const thb = toTHB(Number(e.amount ?? 0), e.currency);
      const parts = (Array.isArray(e.participants) && e.participants.length) ? e.participants : (people || []);
      const share = parts.length ? thb / parts.length : 0;
      for (const p of parts) owed[p] = (owed[p] || 0) + share;
      if (e.paidBy) paid[e.paidBy] = (paid[e.paidBy] || 0) + thb;
    }

    const balance: Record<string, number> = {};
    for (const p of people || []) balance[p] = (paid[p] || 0) - (owed[p] || 0);

    // Greedy settlement: negatives pay positives
    const debtors = Object.entries(balance)
      .filter(([_, v]) => v < 0)
      .map(([name, v]) => ({ name, amt: -v })) // amount to pay
      .sort((a, b) => b.amt - a.amt);
    const creditors = Object.entries(balance)
      .filter(([_, v]) => v > 0)
      .map(([name, v]) => ({ name, amt: v })) // amount to receive
      .sort((a, b) => b.amt - a.amt);

    const transfers: { from: string; to: string; amount: number }[] = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].amt, creditors[j].amt);
      if (pay > 0) transfers.push({ from: debtors[i].name, to: creditors[j].name, amount: pay });
      debtors[i].amt -= pay;
      creditors[j].amt -= pay;
      if (debtors[i].amt <= 1e-6) i++;
      if (creditors[j].amt <= 1e-6) j++;
    }

    return { owed, paid, balance, transfers };
  }, [expenses, people, toTHB]);

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-medium">Settlement</h2>
      <div className="bg-gray-50 p-3 rounded">
        <div className="grid grid-cols-4 gap-2 font-medium border-b pb-1 mb-2">
          <div>Person</div>
          <div>Paid (THB)</div>
          <div>Owes (THB)</div>
          <div className="text-right">Balance</div>
        </div>
        {(people || []).map((p) => (
          <div key={p} className="grid grid-cols-4 gap-2 py-1 text-sm">
            <div>{p}</div>
            <div>{format(paid[p] || 0)}</div>
            <div>{format(owed[p] || 0)}</div>
            <div className={(balance[p] || 0) >= 0 ? 'text-green-700 text-right' : 'text-red-700 text-right'}>
              {format(balance[p] || 0)}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 p-3 rounded">
        <h3 className="font-medium mb-2">Suggested Transfers</h3>
        <div className="text-sm space-y-1">
          {transfers.length === 0 && <div>All settled 🎉</div>}
          {transfers.map((t, idx) => (
            <div key={idx} className="flex justify-between">
              <span>{t.from} → {t.to}</span>
              <span className="font-medium">{format(t.amount)} THB</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

