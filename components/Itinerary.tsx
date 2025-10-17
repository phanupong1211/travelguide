"use client";
import React, { useMemo, useState } from 'react';
import { useApp } from './AppContext';
import { Modal } from './Modal';
import Collapse from './Collapse';

function calculateDuration(arriveTime?: string, leaveTime?: string) {
  if (!arriveTime || !leaveTime) return '';
  const [ah, am] = arriveTime.split(':').map(Number);
  const [lh, lm] = leaveTime.split(':').map(Number);
  let minutes = lh * 60 + lm - (ah * 60 + am);
  if (minutes < 0) minutes += 24 * 60;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function calculateTravelTime(current: any, next: any) {
  if (!current?.leaveTime || !next?.arriveTime) return '';
  const [lh, lm] = current.leaveTime.split(':').map(Number);
  const [ah, am] = next.arriveTime.split(':').map(Number);
  let minutes = ah * 60 + am - (lh * 60 + lm);
  if (minutes < 0) minutes += 24 * 60;
  if (minutes === 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export default function Itinerary() {
  const { itinerary, addNewDay, deleteDay, addActivity, updateActivity, deleteActivity, addExpense, people, toTHB, moveActivity, moveDay } = useApp() as any;
  const [title, setTitle] = useState('');
  const [editMode, setEditMode] = useState(false);

  // Collapsed by default
  const [openDays, setOpenDays] = useState<Record<number, boolean>>(() => Object.fromEntries(itinerary.map((d: any) => [d.id, false])));
  // Ensure any newly loaded/added day starts collapsed
  React.useEffect(() => {
    setOpenDays((prev) => {
      const next = { ...prev } as Record<number, boolean>;
      (itinerary || []).forEach((d: any) => {
        if (!(d.id in next)) next[d.id] = false;
      });
      return next;
    });
  }, [itinerary]);
  const toggleDay = (id: number) => setOpenDays((prev) => {
    const currentlyOpen = !!prev[id];
    // Close all by default
    const next: Record<number, boolean> = {};
    (itinerary || []).forEach((d: any) => { next[d.id] = false; });
    // If the clicked day was closed, open it; if it was open, keep all closed
    if (!currentlyOpen) next[id] = true;
    return next;
  });

  const [editing, setEditing] = useState<{ dayId: number; activityId?: number } | null>(null);
  const [draft, setDraft] = useState<any>({});
  const [splitOpen, setSplitOpen] = useState<{ dayId: number; activity: any } | null>(null);
  const [splitSelected, setSplitSelected] = useState<Record<string, boolean>>({});
  const [splitPaidBy, setSplitPaidBy] = useState<string>('');
  const fmtTime = (t?: string) => {
    if (!t) return '';
    // Keep HH:MM only if HH:MM:SS sent through
    if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t.slice(0,5);
    return t;
  };

  const startAddActivity = (dayId: number) => {
    setEditing({ dayId });
    setDraft({ title: '', description: '', cost: 0, currency: 'THB', category: 'Activity', mapLink: '', arriveTime: '', leaveTime: '' });
  };
  const startEditActivity = (dayId: number, activity: any) => {
    setEditing({ dayId, activityId: activity.id });
    setDraft({ ...activity });
  };
  const saveActivity = () => {
    if (!editing) return;
    if (!draft.title?.trim()) return setEditing(null);
    const payload = {
      title: draft.title.trim(),
      description: draft.description?.trim() || '',
      cost: Number(draft.cost) || 0,
      currency: draft.currency as 'THB' | 'USD' | 'JPY',
      category: draft.category,
      mapLink: draft.mapLink?.trim() || '',
      arriveTime: draft.arriveTime || '',
      leaveTime: draft.leaveTime || '',
    };
    if (editing.activityId) updateActivity(editing.dayId, editing.activityId, payload);
    else addActivity(editing.dayId, payload);
    setEditing(null);
  };

  return (
    <div id="itinerary" className="p-4">
      <div className="bg-gray-50 p-3 rounded mb-4 no-print">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Add New Day</h3>
          <button onClick={() => setEditMode((v) => !v)} className={`px-3 py-1 rounded text-sm ${editMode ? 'bg-gray-900 text-white' : 'bg-gray-800/10 text-gray-800'}`}>{editMode ? 'Done' : 'Edit'}</button>
        </div>
        <div className="space-y-2">
          <input
            type="text"
            id="dayTitle"
            placeholder="Day title (e.g., Day 3 - Kyoto)"
            className="w-full px-3 py-2 border border-gray-300 rounded"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && title.trim() && (addNewDay(title.trim()), setTitle(''))}
          />
          <button onClick={() => title.trim() && (addNewDay(title.trim()), setTitle(''))} className="w-full bg-gray-900 text-white py-2 rounded hover:bg-gray-800">
            Add Day
          </button>
        </div>
      </div>

      <div id="itineraryDays" className="space-y-3">
        {itinerary.map((day: any) => (
          <div key={day.id} className="border border-gray-200 rounded overflow-hidden">
            <button onClick={() => toggleDay(day.id)} className="w-full bg-gray-50 p-3 text-left font-medium hover:bg-gray-100 flex justify-between items-center">
              <span>{day.title}</span>
              <div className="flex items-center gap-3">
                {editMode && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); const idx = itinerary.findIndex((d:any)=>d.id===day.id); if (idx>0) moveDay(idx, idx-1); }}
                      className="min-w-[40px] min-h-[40px] rounded-md border border-gray-300 bg-white text-gray-700 text-base flex items-center justify-center hover:bg-gray-100"
                    >▲</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); const idx = itinerary.findIndex((d:any)=>d.id===day.id); if (idx<itinerary.length-1) moveDay(idx, idx+1); }}
                      className="min-w-[40px] min-h-[40px] rounded-md border border-gray-300 bg-white text-gray-700 text-base flex items-center justify-center hover:bg-gray-100"
                    >▼</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm('Delete this day and all its activities?')) deleteDay(day.id); }}
                      className="min-w-[40px] min-h-[40px] rounded-md border border-red-300 bg-white text-red-600 flex items-center justify-center no-print hover:bg-red-50"
                    >🗑️</button>
                  </div>
                )}
                <span className="toggle-icon">{openDays[day.id] ? '▼' : '▶'}</span>
              </div>
            </button>
            <Collapse open={!!openDays[day.id]} className="p-3 bg-white">
              <div className="space-y-3">
                {day.activities.map((activity: any, index: number) => {
                  const duration = calculateDuration(activity.arriveTime, activity.leaveTime);
                  const next = day.activities[index + 1];
                  const travelTime = next ? calculateTravelTime(activity, next) : '';
                  return (
                    <div key={activity.id} className="border-l-4 border-gray-400 pl-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{activity.title}</h4>
                          <p className="text-sm text-gray-600">{activity.description}</p>
                          {(activity.arriveTime || activity.leaveTime) && (
                            <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                              <div className="flex flex-wrap gap-3">
                                {activity.arriveTime && <span>🕐 Arrive: {fmtTime(activity.arriveTime)}</span>}
                                {activity.leaveTime && <span>🕐 Leave: {fmtTime(activity.leaveTime)}</span>}
                                {duration && <span>⏱️ Duration: {duration}</span>}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 no-print">
                          {editMode && (
                            <>
                              <button
                                onClick={() => startEditActivity(day.id, activity)}
                                className="min-w-[40px] min-h-[40px] rounded-md border border-gray-300 bg-white text-gray-700 flex items-center justify-center hover:bg-gray-100"
                              >✏️</button>
                              <button
                                onClick={() => { if (confirm('Delete this activity?')) deleteActivity(day.id, activity.id); }}
                                className="min-w-[40px] min-h-[40px] rounded-md border border-red-300 bg-white text-red-600 flex items-center justify-center hover:bg-red-50"
                              >×</button>
                              <button
                                onClick={() => { const idx = day.activities.findIndex((a:any)=>a.id===activity.id); if (idx>0) moveActivity(day.id, idx, idx-1); }}
                                className="min-w-[40px] min-h-[40px] rounded-md border border-gray-300 bg-white text-gray-700 flex items-center justify-center hover:bg-gray-100"
                              >▲</button>
                              <button
                                onClick={() => { const idx = day.activities.findIndex((a:any)=>a.id===activity.id); if (idx<day.activities.length-1) moveActivity(day.id, idx, idx+1); }}
                                className="min-w-[40px] min-h-[40px] rounded-md border border-gray-300 bg-white text-gray-700 flex items-center justify-center hover:bg-gray-100"
                              >▼</button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Cost: {Number(activity.cost ?? 0).toLocaleString()} {activity.currency || 'THB'}</span>
                          {activity.mapLink && (
                            <a href={activity.mapLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs">📍 Map</a>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setSplitOpen({ dayId: day.id, activity });
                            // init selections
                            const initSel: Record<string, boolean> = {};
                            (people || []).forEach((p: string) => { initSel[p] = true; });
                            setSplitSelected(initSel);
                            setSplitPaidBy((people && people[0]) || 'You');
                          }}
                          className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-700 no-print"
                        >
                          + Add expense
                        </button>
                      </div>
                      {travelTime && (
                        <div className="flex justify-center my-3">
                          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">🚶 Travel time: {travelTime}</div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <button onClick={() => startAddActivity(day.id)} className="w-full bg-gray-100 text-gray-600 py-2 rounded hover:bg-gray-200 text-sm no-print">
                  + Add Activity
                </button>
              </div>
            </Collapse>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md mx-4 w-full">
            <h3 className="font-medium mb-4">{editing.activityId ? 'Edit Activity' : 'Add Activity'}</h3>
            <div className="space-y-3">
              <input type="text" value={draft.title || ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title..." className="w-full px-3 py-2 border border-gray-300 rounded" />
              <textarea value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description..." className="w-full px-3 py-2 border border-gray-300 rounded h-20 resize-none"></textarea>
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="text-sm font-medium mb-2 text-gray-700">⏰ Time Planning</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Arrive Time</label>
                    <input type="time" value={draft.arriveTime || ''} onChange={(e) => setDraft({ ...draft, arriveTime: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Leave Time</label>
                    <input type="time" value={draft.leaveTime || ''} onChange={(e) => setDraft({ ...draft, leaveTime: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <input type="number" value={draft.cost || 0} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} step="0.01" className="flex-1 px-3 py-2 border border-gray-300 rounded" />
                <select value={draft.currency || 'THB'} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} className="px-3 py-2 border border-gray-300 rounded">
                  <option value="THB">THB</option>
                  <option value="USD">USD</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>
              <select value={draft.category || 'Activity'} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded">
                <option value="Food">Food</option>
                <option value="Hotel">Hotel</option>
                <option value="Transport">Transport</option>
                <option value="Shopping">Shopping</option>
                <option value="Activity">Activity</option>
                <option value="Other">Other</option>
              </select>
              <input type="url" value={draft.mapLink || ''} onChange={(e) => setDraft({ ...draft, mapLink: e.target.value })} placeholder="Map link (optional)..." className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditing(null)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400">Cancel</button>
              <button onClick={saveActivity} className="flex-1 bg-gray-900 text-white py-2 rounded hover:bg-gray-800">{editing.activityId ? 'Update' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add expense split modal */}
      <Modal open={!!splitOpen} onClose={() => setSplitOpen(null)}>
        {splitOpen && (
          <div>
            <h3 className="font-medium mb-3">Add Expense</h3>
            <div className="text-sm text-gray-700 mb-2">{splitOpen.activity.title} • {Number(splitOpen.activity.cost || 0).toLocaleString()} {splitOpen.activity.currency}</div>

            <div className="bg-gray-50 border border-gray-200 rounded p-2 text-sm space-y-2">
              <div className="text-gray-600">Split between</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {(people || []).map((p: string) => {
                  const active = !!splitSelected[p];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSplitSelected((prev) => ({ ...prev, [p]: !prev[p] }))}
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
                  (people || []).forEach((p: string) => { all[p] = true; });
                  setSplitSelected(all);
                }}
                className="w-full px-3 py-2 rounded border border-gray-300 hover:bg-gray-100"
              >
                + เลือกทุกคน
              </button>
              <SplitPreview amount={splitOpen.activity.cost} currency={splitOpen.activity.currency} people={people} selected={splitSelected} toTHB={toTHB} />
            </div>

            <div className="text-sm mt-3">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-gray-600">Paid by</label>
                <div className="text-xs text-gray-500">เลือกผู้ที่จ่าย</div>
              </div>
              <select value={splitPaidBy} onChange={(e) => setSplitPaidBy(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded">
                {(people || []).map((p: string) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setSplitOpen(null)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300">Cancel</button>
              <button
                onClick={() => {
                  const parts = Object.entries(splitSelected).filter(([_, v]) => v).map(([k]) => k);
                  addExpense({
                    item: splitOpen.activity.title,
                    amount: splitOpen.activity.cost,
                    currency: splitOpen.activity.currency,
                    category: splitOpen.activity.category,
                    date: new Date().toISOString().split('T')[0],
                    paidBy: splitPaidBy,
                    participants: parts,
                  });
                  setSplitOpen(null);
                }}
                className="flex-1 bg-gray-900 text-white py-2 rounded hover:bg-gray-800"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SplitPreview({ amount, currency, people, selected, toTHB }: any) {
  const parts = Object.entries(selected || {}).filter(([_, v]) => v).map(([k]) => k);
  const thb = toTHB(Number(amount || 0), currency || 'THB');
  const count = Math.max(parts.length, 1);
  const share = thb / count;
  return (
    <div className="mt-2 text-xs text-gray-500">
      Split with {parts.length} person{parts.length === 1 ? '' : 's'} • ≈ {share.toLocaleString()} THB per person
    </div>
  );
}
