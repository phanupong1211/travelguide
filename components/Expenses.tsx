"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from './AppContext';
import { Modal } from './Modal';
import { compressImageToBlob, uploadBillBlob, deleteBill, getSignedBillUrl, isStoragePath, storageAvailable, blobToDataUrl } from '@/lib/storage';

const categories = ['Food', 'Hotel', 'Transport', 'Shopping', 'Activity', 'Other'] as const;

export default function Expenses() {
  const {
    expenses,
    addExpense,
    updateExpenseAmount,
    deleteExpense,
    rates,
    setRates,
    toTHB,
    people,
  } = useApp();

  const [item, setItem] = useState(''); 
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<'THB' | 'USD' | 'JPY'>('THB');
  const [category, setCategory] = useState<(typeof categories)[number]>('Food');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [billPreview, setBillPreview] = useState<string | null>(null);
  const [billBlob, setBillBlob] = useState<Blob | null>(null);
  const [paidBy, setPaidBy] = useState<string>(() => (people?.[0] || 'You'));
  const [selected, setSelected] = useState<Record<string, boolean>>(() => Object.fromEntries((people || []).map(p => [p, true])) as Record<string, boolean>);

  const [editId, setEditId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [viewPhotoExpenseId, setViewPhotoExpenseId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [addOpen, setAddOpen] = useState(false);

  const onAdd = async () => {
    const amt = parseFloat(amount);
    if (!item.trim() || isNaN(amt) || !date) return;
    let billPhoto: string | undefined;
    try {
      if (billBlob && storageAvailable()) {
        const path = await uploadBillBlob(billBlob, 'webp');
        billPhoto = path; // store storage path
      } else if (billBlob) {
        billPhoto = await blobToDataUrl(billBlob);
      }
    } catch {
      // ignore upload error and fall back
      if (billBlob) billPhoto = await blobToDataUrl(billBlob);
    }
    const parts = Object.entries(selected).filter(([_, v]) => v).map(([k]) => k);
    await addExpense({ item: item.trim(), amount: amt, currency, category, date, billPhoto, paidBy, participants: parts });
    setItem('');
    setAmount('');
    if (billPreview) URL.revokeObjectURL(billPreview);
    setBillPreview(null);
    setBillBlob(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const summary = useMemo(() => {
    const sum: Record<string, number> = {};
    let total = 0;
    for (const e of expenses) {
      const thb = toTHB(e.amount, e.currency);
      total += thb;
      sum[e.category] = (sum[e.category] || 0) + thb;
    }
    return { sum, total };
  }, [expenses, rates]);


  useEffect(() => {
    setPaidBy((prev) => (people?.includes(prev) ? prev : (people?.[0] || 'You')));
    setSelected((prev) => {
      const next: Record<string, boolean> = {};
      (people || []).forEach((p) => { next[p] = prev?.[p] ?? true; });
      return next;
    });
  }, [people]);

  const onUpload = async (file?: File) => {
    if (!file) return;
    const { blob } = await compressImageToBlob(file, 300_000, 1600);
    setBillBlob(blob);
    const url = URL.createObjectURL(blob);
    if (billPreview) URL.revokeObjectURL(billPreview);
    setBillPreview(url);
  };

  return (
    <div id="expenses" className="p-4">
      <div className="bg-gray-50 p-3 rounded mb-4">
        <h3 className="font-medium mb-2">Exchange Rates</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <label className="block text-gray-600">USD → THB</label>
            <input
              type="number"
              value={String(rates.USD)}
              step="0.01"
              className="w-full px-2 py-1 border border-gray-300 rounded"
              onChange={(e) => setRates({ USD: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="block text-gray-600">JPY → THB</label>
            <input
              type="number"
              value={String(rates.JPY)}
              step="0.01"
              className="w-full px-2 py-1 border border-gray-300 rounded"
              onChange={(e) => setRates({ JPY: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded mb-4 hidden">
        <h3 className="font-medium mb-2">Add Expense</h3>
        <div className="space-y-2">
          <input
            type="text"
            id="expenseItem"
            placeholder="Item..."
            className="w-full px-3 py-2 border border-gray-300 rounded"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (document.getElementById('expenseAmount') as HTMLInputElement)?.focus()}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              id="expenseAmount"
              placeholder="Amount"
              step="0.01"
              className="px-3 py-2 border border-gray-300 rounded"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAdd()}
            />
            <select value={currency} onChange={(e) => setCurrency(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded">
              <option value="THB">THB</option>
              <option value="USD">USD</option>
              <option value="JPY">JPY</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded">
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input type="date" id="expenseDate" className="px-3 py-2 border border-gray-300 rounded" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="bg-white border border-gray-200 rounded p-3 text-sm space-y-3">
            {/* Split between (บน) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-gray-600">Split between</label>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {(people || []).map((p) => {
                  const active = !!selected[p];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelected((prev) => ({ ...prev, [p]: !prev[p] }))}
                      className={`px-3 py-1 rounded-full border ${active ? 'bg-gray-100 border-gray-500 text-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                    >
                      {active ? '✓ ' : '+ '}{p}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  const all: Record<string, boolean> = {};
                  (people || []).forEach((p) => { all[p] = true; });
                  setSelected(all);
                }}
                className="w-full px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
              >
                + เลือกทุกคน
              </button>

              {/* share preview */}
              {(() => {
                const parts = Object.entries(selected).filter(([_, v]) => v).map(([k]) => k);
                const amtNum = parseFloat(amount) || 0;
                const thb = toTHB(amtNum, currency);
                const count = Math.max(parts.length, 1);
                const share = thb / count;
                return (
                  <div className="mt-2 text-xs text-gray-500">
                    Split with {parts.length} person{parts.length === 1 ? '' : 's'} • ≈ {share.toLocaleString()} THB per person
                  </div>
                );
              })()}
            </div>

            {/* Paid by (ล่าง) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-gray-600">Paid by</label>
                <div className="text-xs text-gray-500">เลือกผู้ที่จ่าย</div>
              </div>
              <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded">
                {(people || []).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="border border-dashed border-gray-300 rounded p-2 text-sm">
            <input ref={fileRef} type="file" id="billUpload" accept="image/*" className="hidden" onChange={(e) => void onUpload(e.target.files?.[0])} />
            <button type="button" onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800">
              <span>📷 Upload Bill</span>
            </button>
            <div id="billPreview" className={`mt-2 ${billPreview ? '' : 'hidden'}`}>
              <img id="billImage" className="w-full h-32 object-cover rounded border" alt="Bill preview" src={billPreview || ''} />
              <button onClick={() => { if (billPreview) URL.revokeObjectURL(billPreview); setBillPreview(null); setBillBlob(null); if (fileRef.current) fileRef.current.value=''; }} className="mt-2 text-red-600 text-sm">
                Remove photo
              </button>
            </div>
          </div>
          <button onClick={onAdd} className="w-full bg-gray-900 text-white py-2 rounded hover:bg-gray-800">
            Add Expense
          </button>
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded mb-3">
        <h3 className="font-medium mb-2">Summary</h3>
        <div id="expenseSummary" className="text-sm space-y-1">
          {Object.entries(summary.sum).map(([cat, amt]) => (
            <div key={cat} className="flex justify-between">
              <span>{cat}:</span>
              <span className="font-medium">{amt.toLocaleString()} THB</span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2 flex justify-between font-bold text-gray-900">
            <span>Total:</span>
            <span>{summary.total.toLocaleString()} THB</span>
          </div>
        </div>
      </div>

      {/* Add button between Summary and Expense List */}
      <div className="mb-3">
        <button onClick={() => setAddOpen(true)} className="w-full bg-gray-900 text-white py-2 rounded hover:bg-gray-800">+ Add Expense</button>
      </div>


      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium">Expense List</h3>
        </div>
        <div id="expensesList" className="space-y-1">
          {expenses.map((expense) => (
            <div key={expense.id} className="expense-row bg-white rounded border border-gray-200 text-sm">
              <div className="flex items-center gap-2 p-2">
                <div className="flex-1">
                  <div className="font-medium">{expense.item}</div>
                  <div className="text-gray-500 text-xs">{expense.category} • {expense.date}</div>
                  {(expense.paidBy || (expense.participants && expense.participants.length)) && (
                    <div className="text-xs text-gray-500">{expense.paidBy ? `Paid by ${expense.paidBy}` : ''}{expense.paidBy && expense.participants && expense.participants.length ? ' • ' : ''}{expense.participants && expense.participants.length ? `Split: ${expense.participants.join(', ')}` : ''}</div>
                  )}
                  {expense.billPhoto ? (
                    <button onClick={() => setViewPhotoExpenseId(expense.id)} className="text-blue-600 hover:text-blue-800 text-xs mt-1">📷 View Bill</button>
                  ) : null}
                </div>
                <div className="text-right">
                  <div className="font-medium cursor-pointer hover:text-gray-600" onClick={() => { setEditId(expense.id); setEditAmount(String(expense.amount)); }}>
                    {Number(expense.amount ?? 0).toLocaleString()} {expense.currency}
                  </div>
                  <div className="text-xs text-gray-500">≈ {toTHB(Number(expense.amount ?? 0), expense.currency).toLocaleString()} THB</div>
                </div>
                <button onClick={async () => {
                  if (!confirm('Delete this expense?')) return;
                  const exp = expenses.find((e) => e.id === expense.id);
                  if (exp?.billPhoto && isStoragePath(exp.billPhoto) && storageAvailable()) {
                    try { await deleteBill(exp.billPhoto); } catch {}
                  }
                  deleteExpense(expense.id);
                }} className="text-gray-400 hover:text-gray-600 p-1">
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      

      <Modal open={editId !== null} onClose={() => setEditId(null)}>
        <h3 className="font-medium mb-4">Edit Amount</h3>
        <input
          type="number"
          value={editAmount}
          step="0.01"
          className="w-full px-3 py-2 border border-gray-300 rounded mb-4"
          onChange={(e) => setEditAmount(e.target.value)}
        />
        <div className="flex gap-2">
          <button onClick={() => setEditId(null)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400">Cancel</button>
          <button
            onClick={() => {
              if (editId !== null && !isNaN(parseFloat(editAmount))) {
                updateExpenseAmount(editId, parseFloat(editAmount));
              }
              setEditId(null);
            }}
            className="flex-1 bg-gray-900 text-white py-2 rounded hover:bg-gray-800"
          >
            Update
          </button>
        </div>
      </Modal>

      {/* Add Expense Modal (new) */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)}>
        <h3 className="font-medium mb-3">Add Expense</h3>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Item..."
            className="w-full px-3 py-2 border border-gray-300 rounded"
            value={item}
            onChange={(e) => setItem(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Amount"
              step="0.01"
              className="px-3 py-2 border border-gray-300 rounded"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <select value={currency} onChange={(e) => setCurrency(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded">
              <option value="THB">THB</option>
              <option value="USD">USD</option>
              <option value="JPY">JPY</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded">
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input type="date" className="px-3 py-2 border border-gray-300 rounded" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Split between */}
          <div className="bg-gray-50 border border-gray-200 rounded p-2 text-sm space-y-2">
            <div className="text-gray-600">Split between</div>
            <div className="flex flex-wrap gap-2 mb-2">
              {(people || []).map((p) => {
                const active = !!selected[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelected((prev) => ({ ...prev, [p]: !prev[p] }))}
                    className={`px-3 py-1 rounded-full border ${active ? 'bg-gray-100 border-gray-500 text-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                  >
                    {active ? '✓ ' : '+ '}{p}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                const all: Record<string, boolean> = {};
                (people || []).forEach((p) => { all[p] = true; });
                setSelected(all);
              }}
              className="w-full px-3 py-2 rounded border border-gray-300 hover:bg-gray-100"
            >
              + เลือกทุกคน
            </button>
          </div>

          {/* Paid by */}
          <div className="text-sm">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-gray-600">Paid by</label>
              <div className="text-xs text-gray-500">เลือกผู้ที่จ่าย</div>
            </div>
            <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded">
              {(people || []).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="border border-dashed border-gray-300 rounded p-2 text-sm">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onUpload(e.target.files?.[0])} />
            <button type="button" onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800">
              <span>📷 Upload Bill</span>
            </button>
            <div className={`mt-2 ${billPreview ? '' : 'hidden'}`}>
              <img className="w-full h-32 object-cover rounded border" alt="Bill preview" src={billPreview || ''} />
              <button onClick={() => { if (billPreview) URL.revokeObjectURL(billPreview); setBillPreview(null); setBillBlob(null); if (fileRef.current) fileRef.current.value=''; }} className="mt-2 text-red-600 text-sm">
                Remove photo
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setAddOpen(false)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300">Cancel</button>
            <button onClick={async () => { await onAdd(); setAddOpen(false); }} className="flex-1 bg-gray-900 text-white py-2 rounded hover:bg-gray-800">Add</button>
          </div>
        </div>
      </Modal>

      <Modal open={viewPhotoExpenseId !== null} onClose={() => setViewPhotoExpenseId(null)}>
        {(() => {
          const exp = expenses.find((e) => e.id === viewPhotoExpenseId);
          if (!exp || !exp.billPhoto) return <div>No photo</div>;
          return <BillViewer pathOrData={exp.billPhoto} title={`${exp.item} - Bill`} />;
        })()}
      </Modal>
    </div>
  );
}

function isHttpOrData(u: string) {
  return u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:');
}

function BillViewer({ pathOrData, title }: { pathOrData: string; title: string }) {
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (isHttpOrData(pathOrData)) { setUrl(pathOrData); return; }
        if (storageAvailable() && isStoragePath(pathOrData)) {
          const s = await getSignedBillUrl(pathOrData, 60 * 10);
          if (alive) setUrl(s);
        } else {
          setUrl('');
        }
      } catch { setUrl(''); }
    })();
    return () => { alive = false; };
  }, [pathOrData]);
  if (!url) return <div>Loading...</div>;
  return (
    <>
      <div className="p-0 border-b mb-3">
        <h3 className="font-medium">{title}</h3>
      </div>
      <img src={url} alt="Bill photo" className="w-full rounded border" />
    </>
  );
}
