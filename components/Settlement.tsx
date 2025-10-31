"use client";
import React, { useMemo, useState } from 'react';
import { useApp } from './AppContext';

function format(n: number) {
  return Math.round(n).toLocaleString();
}

export default function Settlement() {
  const { expenses, people, toTHB } = useApp();
  const [openPerson, setOpenPerson] = useState<Record<string, boolean>>({});
  const [openPair, setOpenPair] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const { owed, paid, balance, transfers, paidDetails, shareDetails, pairDetails } = useMemo(() => {
    // owed: total fair share across the trip (not outstanding)
    // paid: out-of-pocket (net): purchases minus refunds received + refunds sent
    const owed: Record<string, number> = Object.fromEntries((people || []).map((p) => [p, 0]));
    const paid: Record<string, number> = Object.fromEntries((people || []).map((p) => [p, 0]));
    const paidDetails: Record<string, { kind: 'purchase' | 'refund_received' | 'refund_sent'; amount: number; item: string; date: string; with?: string }[]> = Object.fromEntries((people || []).map((p) => [p, []]));
    const shareDetails: Record<string, { amount: number; item: string; date: string }[]> = Object.fromEntries((people || []).map((p) => [p, []]));
    const pairDetails: Record<string, { from: string; to: string; amount: number; item: string; date: string }[]> = {};

    for (const e of expenses) {
      const thb = toTHB(Number(e.amount ?? 0), e.currency);
      const allPeople = people || [];
      const parts = (Array.isArray(e.participants) && e.participants.length) ? e.participants : allPeople;
      const share = parts.length ? thb / parts.length : 0;
      const settledSet = new Set<string>((Array.isArray(e.settledBy) ? e.settledBy : []).filter(Boolean));

      // Fair share accrual for each participant
      for (const p of parts) {
        owed[p] = (owed[p] || 0) + share;
        shareDetails[p].push({ amount: share, item: e.item, date: e.date });
      }

      // Purchases increase payer's out-of-pocket
      if (e.paidBy) {
        paid[e.paidBy] = (paid[e.paidBy] || 0) + thb;
        paidDetails[e.paidBy].push({ kind: 'purchase', amount: thb, item: e.item, date: e.date });
      }

      // Refunds (settlements): decrease payer's out-of-pocket and increase settler's out-of-pocket
      for (const p of parts) {
        if (p === e.paidBy) continue;
        if (settledSet.has(p)) {
          if (e.paidBy) {
            paid[e.paidBy] = (paid[e.paidBy] || 0) - share; // refund received reduces payer out-of-pocket
            paidDetails[e.paidBy].push({ kind: 'refund_received', amount: -share, item: e.item, date: e.date, with: p });
          }
          paid[p] = (paid[p] || 0) + share; // refund sent increases participant out-of-pocket
          paidDetails[p].push({ kind: 'refund_sent', amount: share, item: e.item, date: e.date, with: e.paidBy || undefined });
        }
      }

      // Outstanding obligations (for detail by pair): participants who haven't settled owe their share to payer
      if (e.paidBy) {
        for (const p of parts) {
          if (p === e.paidBy) continue;
          if (!settledSet.has(p)) {
            const key = `${p}__${e.paidBy}`;
            if (!pairDetails[key]) pairDetails[key] = [];
            pairDetails[key].push({ from: p, to: e.paidBy, amount: share, item: e.item, date: e.date });
          }
        }
      }
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

    return { owed, paid, balance, transfers, paidDetails, shareDetails, pairDetails };
  }, [expenses, people, toTHB]);

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-medium">Settlement</h2>
      <div className="bg-gray-50 p-3 rounded">
        <div className="grid grid-cols-4 gap-2 font-medium border-b pb-1 mb-2">
          <div>Person</div>
          <div>Paid (THB)</div>
          <div>Share (THB)</div>
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
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Suggested Transfers</h3>
          {transfers.length > 0 && (
            <div className="text-xs text-gray-600">
              {transfers.length} items • {format(transfers.reduce((s, x) => s + (x.amount || 0), 0))} THB
            </div>
          )}
        </div>
        <div className="text-sm space-y-2">
          {transfers.length === 0 && (
            <div className="px-3 py-2 rounded bg-green-50 text-green-700 border border-green-200">
              All settled 🎉
            </div>
          )}
          {transfers.map((t, idx) => {
            const key = `${t.from}__${t.to}`;
            const lines = pairDetails[key] || [];
            const onCopy = async () => {
              try {
                const header = `${t.from} -> ${t.to} : ${format(t.amount)} THB`;
                const detail = lines.map((ln) => `- ${ln.item} (${ln.date}): ${format(ln.amount)} THB`).join('\n');
                const text = header + (detail ? `\n${detail}` : '');
                await (navigator.clipboard?.writeText(text));
                setCopied(key);
                setTimeout(() => setCopied(null), 1200);
              } catch {}
            };
            return (
              <div key={idx} className="bg-white border border-gray-200 rounded p-2 hover:shadow-sm transition">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">{t.from}</span>
                    <span className="text-gray-400">→</span>
                    <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">{t.to}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{format(t.amount)} THB</span>
                    <button
                      className="text-gray-600 hover:text-gray-800 px-2 py-1 rounded border border-gray-300 text-xs"
                      title="Copy details"
                      onClick={onCopy}
                    >
                      {copied === key ? 'Copied' : '📋'}
                    </button>
                    <button
                      className="text-gray-600 hover:text-gray-800 px-2 py-1 rounded border border-gray-300 text-xs"
                      onClick={() => setOpenPair((s) => ({ ...s, [key]: !s[key] }))}
                      aria-label="Toggle details"
                    >
                      {openPair[key] ? '▴' : '▾'}
                    </button>
                  </div>
                </div>
                {openPair[key] && lines.length > 0 && (
                  <div className="mt-2 border-t pt-2">
                    <div className="grid grid-cols-5 px-1 text-xs font-medium text-gray-600">
                      <div className="col-span-3">รายการ • วันที่</div>
                      <div className="col-span-2 text-right">Amount (THB)</div>
                    </div>
                    <div className="divide-y">
                      {lines.map((ln, i) => (
                        <div key={i} className="grid grid-cols-5 px-1 py-1 text-xs text-gray-700">
                          <div className="col-span-3 truncate">{ln.item} <span className="text-gray-500">({ln.date})</span></div>
                          <div className="col-span-2 text-right">{format(ln.amount)} THB</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded">
        <h3 className="font-medium mb-2">Details by Person</h3>
        <div className="text-sm">
          {(people || []).map((p) => {
            const rows = (shareDetails[p] || []).slice().sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
            const total = rows.reduce((s, r) => s + (r.amount || 0), 0);
            return (
              <div key={p} className="border-b last:border-b-0 py-2">
                <button className="w-full text-left flex justify-between items-center" onClick={() => setOpenPerson((s) => ({ ...s, [p]: !s[p] }))}>
                  <span className="font-medium">{p}</span>
                  <span className="text-xs text-gray-600">{rows.length} items • {format(total)} THB</span>
                </button>
                {openPerson[p] && (
                  <div className="mt-2 bg-white border border-gray-200 rounded">
                    <div className="grid grid-cols-5 px-3 py-2 text-xs font-medium text-gray-600 border-b">
                      <div className="col-span-3">รายการ • วันที่</div>
                      <div className="col-span-2 text-right">Share (THB)</div>
                    </div>
                    <div className="divide-y">
                      {rows.map((d, i) => (
                        <div key={i} className="grid grid-cols-5 px-3 py-2 text-xs">
                          <div className="col-span-3 truncate">{d.item} <span className="text-gray-500">({d.date})</span></div>
                          <div className="col-span-2 text-right">{format(d.amount)} THB</div>
                        </div>
                      ))}
                      <div className="grid grid-cols-5 px-3 py-2 text-xs bg-gray-50">
                        <div className="col-span-3 font-medium">รวม</div>
                        <div className="col-span-2 text-right font-medium">{format(total)} THB</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
