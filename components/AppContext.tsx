"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Currency, Rates, defaultRates, toTHB } from '@/lib/currency';
import { idbGet, idbSet } from '@/lib/db';
import { tryCloudLoad, tryCloudSync } from '@/lib/supabase';
import { isEntitiesMode, loadAllFromEntities, entAddChecklistItem, entToggleChecklistItem, entDeleteChecklistItem, entAddExpense, entUpdateExpenseAmount, entDeleteExpense, entAddDay, entDeleteDay, entAddActivity, entUpdateActivity, entDeleteActivity } from '@/lib/entities';
import { isStoragePath } from '@/lib/storage';

export type ChecklistItem = { id: number; text: string; checked: boolean };
export type Expense = {
  id: number;
  item: string;
  amount: number;
  currency: Currency;
  category: string;
  date: string;
  timestamp: string;
  billPhoto?: string | null;
  paidBy?: string | null;
  participants?: string[]; // names that share this expense equally
};

export type Activity = {
  id: number;
  title: string;
  description: string;
  cost: number;
  currency: Currency;
  category: string;
  mapLink?: string;
  arriveTime?: string;
  leaveTime?: string;
};

export type DayPlan = {
  id: number;
  title: string;
  activities: Activity[];
};

type AppState = {
  checklist: ChecklistItem[];
  expenses: Expense[];
  itinerary: DayPlan[];
  notes: string;
  rates: Rates;
  people: string[];
  ready: boolean;
  busy: boolean;
  busyText: string | null;

  // Checklist
  addChecklistItem: (text: string) => void;
  toggleChecklistItem: (id: number) => void;
  deleteChecklistItem: (id: number) => void;
  clearChecked: () => void;
  resetChecklist: () => void;

  // Expenses
  addExpense: (e: Omit<Expense, 'id' | 'timestamp'> & Partial<Pick<Expense, 'billPhoto'>>) => void;
  updateExpenseAmount: (id: number, amount: number) => void;
  deleteExpense: (id: number) => void;
  resetExpenses: () => void;
  setRates: (r: Partial<Rates>) => void;
  setPeople: (p: string[]) => void;
  transientBusy: (label?: string, ms?: number) => void;

  // Itinerary
  addNewDay: (title: string) => void;
  deleteDay: (dayId: number) => void;
  addActivity: (dayId: number, a: Omit<Activity, 'id'>) => void;
  updateActivity: (dayId: number, activityId: number, a: Partial<Activity>) => void;
  deleteActivity: (dayId: number, activityId: number) => void;

  // Notes
  setNotes: (val: string) => void;

  // Import/Export
  exportData: () => string;
  importData: (json: string) => void;

  // Helpers
  toTHB: (amount: number, currency: Currency) => number;

  // Cloud
  cloudSync: () => Promise<unknown>;
  cloudLoad: () => Promise<unknown>;
  cloudEnabled: boolean;
  reloadFromRemote: () => Promise<boolean>;
  pushToRemote: () => Promise<boolean>;
  isEntities: boolean;
};

const AppContext = createContext<AppState | null>(null);

const DEFAULT_ITINERARY: DayPlan[] = [
  {
    id: 1,
    title: 'Day 1 - Tokyo',
    activities: [
      { id: 1, title: 'Morning - Narita Airport', description: 'Arrive in Tokyo', cost: 3000, currency: 'JPY', category: 'Transport' },
      { id: 2, title: 'Lunch - Ichiran Ramen', description: 'Try authentic ramen', cost: 1200, currency: 'JPY', category: 'Food' },
      { id: 3, title: 'Evening - Shibuya', description: 'Walk around and shopping', cost: 5000, currency: 'JPY', category: 'Shopping' },
    ],
  },
  {
    id: 2,
    title: 'Day 2 - Asakusa & Skytree',
    activities: [
      { id: 4, title: 'Morning - Sensoji Temple', description: "Visit Tokyo's oldest temple", cost: 500, currency: 'JPY', category: 'Activity' },
      { id: 5, title: 'Afternoon - Tokyo Skytree', description: 'View Tokyo from above', cost: 2100, currency: 'JPY', category: 'Activity' },
    ],
  },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [itinerary, setItinerary] = useState<DayPlan[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [rates, setRatesState] = useState<Rates>(defaultRates);
  const [people, setPeopleState] = useState<string[]>(['You', 'Friend 1', 'Friend 2']);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState<string | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from storage/Supabase on first mount
  useEffect(() => {
    (async () => {
      try {
        if (isEntitiesMode) {
          // Load from normalized tables
          try {
            const { checklist: clE, expenses: exE, itinerary: itE, notes: ntE, people: pplE } = await loadAllFromEntities();
            setChecklist(clE);
            setExpenses(exE);
            setItinerary(itE);
            setNotes(ntE);
            if (pplE && pplE.length) setPeopleState(pplE);
            setRatesState(defaultRates);
            setReady(true);
            return; // skip local init
          } catch (err) {
            console.warn('Entities mode load failed, falling back to local/JSON:', err);
          }
        }
        const [cl, ex, it, nt, st, ppl] = await Promise.all([
          idbGet<ChecklistItem[]>('checklist', 'items'),
          idbGet<Expense[]>('expenses', 'items'),
          idbGet<DayPlan[]>('itinerary', 'items'),
          idbGet<string>('notes', 'text'),
          idbGet<Rates>('settings', 'rates'),
          idbGet<string[]>('settings', 'people')
        ]);
        const normalizeExpenses = (arr: any[] = []) => arr.map((e) => ({
          ...e,
          amount: Number((e as any).amount ?? 0),
          currency: (e as any).currency || 'THB',
          paidBy: (e as any).paidBy ?? null,
          participants: Array.isArray((e as any).participants) ? (e as any).participants : undefined,
        }));
        const normalizeItinerary = (arr: any[] = []) => arr.map((d) => ({
          ...d,
          activities: Array.isArray((d as any).activities)
            ? (d as any).activities.map((a: any) => ({
                ...a,
                cost: Number(a?.cost ?? 0),
                currency: a?.currency || 'THB',
              }))
            : [],
        }));

        setChecklist(cl || JSON.parse(localStorage.getItem('travelChecklist') || '[]'));
        setExpenses(normalizeExpenses(ex || JSON.parse(localStorage.getItem('travelExpenses') || '[]')));
        setItinerary(normalizeItinerary(it || JSON.parse(localStorage.getItem('travelItinerary') || JSON.stringify(DEFAULT_ITINERARY))));
        setNotes(nt != null ? nt : (localStorage.getItem('travelNotes') || ''));
        setRatesState(st || defaultRates);
        setPeopleState(ppl && ppl.length ? ppl : ['You', 'Friend 1', 'Friend 2']);
        setReady(true);
      } catch {
        const normalizeExpenses = (arr: any[] = []) => arr.map((e) => ({ ...e, amount: Number(e?.amount ?? 0), currency: e?.currency || 'THB', paidBy: (e as any).paidBy ?? null, participants: Array.isArray((e as any).participants) ? (e as any).participants : undefined }));
        const normalizeItinerary = (arr: any[] = []) => arr.map((d) => ({
          ...d,
          activities: Array.isArray((d as any).activities)
            ? (d as any).activities.map((a: any) => ({ ...a, cost: Number(a?.cost ?? 0), currency: a?.currency || 'THB' }))
            : [],
        }));
        setChecklist(JSON.parse(localStorage.getItem('travelChecklist') || '[]'));
        setExpenses(normalizeExpenses(JSON.parse(localStorage.getItem('travelExpenses') || '[]')));
        setItinerary(normalizeItinerary(JSON.parse(localStorage.getItem('travelItinerary') || JSON.stringify(DEFAULT_ITINERARY))));
        setNotes(localStorage.getItem('travelNotes') || '');
        setRatesState(defaultRates);
        setPeopleState(['You', 'Friend 1', 'Friend 2']);
        setReady(true);
      }

      // try cloud load (non-blocking) when JSON mode
      if (!isEntitiesMode) tryCloudLoad().then((res) => {
        if (res.ok && res.data) {
          const d = res.data as any;
          const normalizeExpenses = (arr: any[] = []) => arr.map((e) => ({ ...e, amount: Number(e?.amount ?? 0), currency: e?.currency || 'THB' }));
          const normalizeItinerary = (arr: any[] = []) => arr.map((x) => ({
            ...x,
            activities: Array.isArray(x.activities)
              ? x.activities.map((a: any) => ({ ...a, cost: Number(a?.cost ?? 0), currency: a?.currency || 'THB' }))
              : [],
          }));
          if (d.checklist) setChecklist(d.checklist);
          if (d.expenses) setExpenses(normalizeExpenses(d.expenses));
          if (d.itinerary) setItinerary(normalizeItinerary(d.itinerary));
          if (typeof d.notes === 'string') setNotes(d.notes);
          if (Array.isArray(d.people)) setPeopleState(d.people);
        }
      });
    })();
  }, []);

  const queueCloudSync = () => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      void tryCloudSync({ checklist, expenses, itinerary, notes, people });
    }, 800);
  };

  const runBusy = async (label: string, fn: () => Promise<any>) => {
    try {
      setBusy(true);
      setBusyText(label);
      await fn();
    } finally {
      setBusy(false);
      setBusyText(null);
    }
  };

  const transientBusy = (label?: string, ms = 300) => {
    setBusy(true);
    if (label) setBusyText(label);
    setTimeout(() => { setBusy(false); setBusyText(null); }, ms);
  };

  // Persist to IDB + localStorage and attempt cloud sync (JSON mode only)
  useEffect(() => {
    idbSet('checklist', 'items', checklist);
    localStorage.setItem('travelChecklist', JSON.stringify(checklist));
    if (!isEntitiesMode) queueCloudSync();
  }, [checklist]);

  useEffect(() => {
    idbSet('expenses', 'items', expenses);
    // Store a lightweight copy in localStorage to avoid QuotaExceeded (skip base64 images)
    try {
      const lite = expenses.map((e) => ({
        ...e,
        billPhoto: e.billPhoto && isStoragePath(e.billPhoto) && e.billPhoto.length < 512 ? e.billPhoto : null,
      }));
      localStorage.setItem('travelExpenses', JSON.stringify(lite));
    } catch {
      // If quota exceeded, fall back to clearing the local copy (IDB still keeps full data)
      try { localStorage.removeItem('travelExpenses'); } catch {}
    }
    if (!isEntitiesMode) queueCloudSync();
  }, [expenses]);

  useEffect(() => {
    idbSet('itinerary', 'items', itinerary);
    localStorage.setItem('travelItinerary', JSON.stringify(itinerary));
    if (!isEntitiesMode) queueCloudSync();
  }, [itinerary]);

  useEffect(() => {
    idbSet('notes', 'text', notes);
    localStorage.setItem('travelNotes', notes);
    if (!isEntitiesMode) queueCloudSync();
  }, [notes]);

  useEffect(() => {
    idbSet('settings', 'rates', rates);
  }, [rates]);

  useEffect(() => {
    if (Array.isArray(people) && people.length) {
      idbSet('settings', 'people', people);
    }
    if (!isEntitiesMode) queueCloudSync();
  }, [people]);

  // Checklist API
  const addChecklistItem = async (text: string) => {
    if (isEntitiesMode) {
      await runBusy('Saving item...', async () => {
        const row = await entAddChecklistItem(text);
        setChecklist((prev) => [...prev, { id: row.id, text: row.text, checked: row.checked }]);
      });
    } else {
      setChecklist((prev) => [...prev, { id: Date.now(), text, checked: false }]);
      transientBusy('Saved');
    }
  };
  const toggleChecklistItem = async (id: number) => {
    setChecklist((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
    if (isEntitiesMode) {
      const curr = checklist.find((i) => i.id === id);
      if (curr) await runBusy('Updating...', () => entToggleChecklistItem(id, !curr.checked));
    } else transientBusy('Updated');
  };
  const deleteChecklistItem = async (id: number) => {
    setChecklist((prev) => prev.filter((i) => i.id !== id));
    if (isEntitiesMode) await runBusy('Deleting...', () => entDeleteChecklistItem(id));
    else transientBusy('Deleted');
  };
  const clearChecked = () => setChecklist((prev) => prev.map((i) => ({ ...i, checked: false })));
  const resetChecklist = () => setChecklist([]);

  // Expenses API
  const addExpense: AppState['addExpense'] = async (e) => {
    if (isEntitiesMode) {
      await runBusy('Saving expense...', async () => {
        const id = await entAddExpense(e);
        setExpenses((prev) => [
          ...prev,
          {
            id,
            item: e.item,
            amount: e.amount,
            currency: e.currency,
            category: e.category,
            date: e.date,
            timestamp: new Date().toISOString(),
            billPhoto: e.billPhoto ?? null,
            paidBy: e.paidBy ?? null,
            participants: e.participants && e.participants.length ? e.participants : undefined,
          },
        ]);
      });
    } else {
      setExpenses((prev) => [
        ...prev,
        { id: Date.now(), item: e.item, amount: e.amount, currency: e.currency, category: e.category, date: e.date, timestamp: new Date().toISOString(), billPhoto: e.billPhoto ?? null, paidBy: e.paidBy ?? null, participants: e.participants && e.participants.length ? e.participants : undefined },
      ]);
      transientBusy('Saved');
    }
  };
  const updateExpenseAmount = async (id: number, amount: number) => {
    setExpenses((prev) => prev.map((x) => (x.id === id ? { ...x, amount } : x)));
    if (isEntitiesMode) await runBusy('Updating amount...', () => entUpdateExpenseAmount(id, amount));
    else transientBusy('Updated');
  };
  const deleteExpense = async (id: number) => {
    setExpenses((prev) => prev.filter((x) => x.id !== id));
    if (isEntitiesMode) await runBusy('Deleting...', () => entDeleteExpense(id));
    else transientBusy('Deleted');
  };
  const resetExpenses = () => setExpenses([]);
  const setRates = (r: Partial<Rates>) => setRatesState((prev) => ({ ...prev, ...r }));

  // Itinerary API
  const addNewDay = async (title: string) => {
    if (isEntitiesMode) {
      await runBusy('Adding day...', async () => {
        const id = await entAddDay(title);
        setItinerary((prev) => [...prev, { id, title, activities: [] }]);
      });
    } else {
      setItinerary((prev) => [...prev, { id: Date.now(), title, activities: [] }]);
      transientBusy('Added');
    }
  };
  const deleteDay = async (dayId: number) => {
    setItinerary((prev) => prev.filter((d) => d.id !== dayId));
    if (isEntitiesMode) await runBusy('Deleting day...', () => entDeleteDay(dayId));
    else transientBusy('Deleted');
  };
  const addActivity: AppState['addActivity'] = async (dayId, a) => {
    if (isEntitiesMode) {
      await runBusy('Adding activity...', async () => {
        const id = await entAddActivity(dayId, a);
        setItinerary((prev) => prev.map((d) => (d.id === dayId ? { ...d, activities: [...d.activities, { id, ...a }] } : d)));
      });
    } else {
      setItinerary((prev) => prev.map((d) => (d.id === dayId ? { ...d, activities: [...d.activities, { id: Date.now(), ...a }] } : d)));
      transientBusy('Added');
    }
  };
  const updateActivity: AppState['updateActivity'] = async (dayId, activityId, a) => {
    setItinerary((prev) => prev.map((d) => (d.id === dayId ? { ...d, activities: d.activities.map((x) => (x.id === activityId ? { ...x, ...a } : x)) } : d)));
    if (isEntitiesMode) await runBusy('Updating activity...', () => entUpdateActivity(dayId, activityId, a));
    else transientBusy('Updated');
  };
  const deleteActivity: AppState['deleteActivity'] = async (dayId, activityId) => {
    setItinerary((prev) => prev.map((d) => (d.id === dayId ? { ...d, activities: d.activities.filter((a) => a.id !== activityId) } : d)));
    if (isEntitiesMode) await runBusy('Deleting activity...', () => entDeleteActivity(activityId));
    else transientBusy('Deleted');
  };

  // Import / Export
  const exportData = () => {
    const data = { expenses, checklist, itinerary, notes, exportDate: new Date().toISOString() };
    return JSON.stringify(data, null, 2);
  };
  const importData = (json: string) => {
    const data = JSON.parse(json);
    const normalizeExpenses = (arr: any[] = []) => arr.map((e) => ({ ...e, amount: Number(e?.amount ?? 0), currency: e?.currency || 'THB' }));
    const normalizeItinerary = (arr: any[] = []) => arr.map((x) => ({
      ...x,
      activities: Array.isArray(x.activities)
        ? x.activities.map((a: any) => ({ ...a, cost: Number(a?.cost ?? 0), currency: a?.currency || 'THB' }))
        : [],
    }));
    if (data.expenses) setExpenses(normalizeExpenses(data.expenses));
    if (data.checklist) setChecklist(data.checklist);
    if (data.itinerary) setItinerary(normalizeItinerary(data.itinerary));
    if (typeof data.notes === 'string') setNotes(data.notes);
  };

  const value = useMemo<AppState>(() => ({
    checklist,
    expenses,
    itinerary,
    notes,
    rates,
    people,
    ready,
    busy,
    busyText,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    clearChecked,
    resetChecklist,
    addExpense,
    updateExpenseAmount,
    deleteExpense,
    resetExpenses,
    setRates,
    setPeople: (p: string[]) => {
      setPeopleState(p);
      if (isEntitiesMode) {
        import('@/lib/entities').then(m => { try { m.entReplaceMembers(p); } catch {} });
      }
    },
    transientBusy,
    addNewDay,
    deleteDay,
    addActivity,
    updateActivity,
    deleteActivity,
    setNotes,
    exportData,
    importData,
    toTHB: (amt, cur) => toTHB(amt, cur, rates),
    cloudSync: async () => tryCloudSync({ checklist, expenses, itinerary, notes, people }),
    cloudLoad: async () => tryCloudLoad(),
    cloudEnabled: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    reloadFromRemote: async () => {
      try {
        if (isEntitiesMode) {
          const { checklist: clE, expenses: exE, itinerary: itE, notes: ntE } = await loadAllFromEntities();
          setChecklist(clE);
          setExpenses(exE);
          setItinerary(itE);
          setNotes(ntE);
          return true;
        }
        const res = await tryCloudLoad();
        if (res.ok && res.data) {
          const d: any = res.data;
          if (d.checklist) setChecklist(d.checklist);
          if (d.expenses) setExpenses(d.expenses.map((e: any) => ({ ...e, amount: Number(e?.amount ?? 0) })));
          if (d.itinerary) setItinerary(d.itinerary.map((x: any) => ({
            ...x,
            activities: Array.isArray(x.activities) ? x.activities.map((a: any) => ({ ...a, cost: Number(a?.cost ?? 0) })) : [],
          })));
          if (typeof d.notes === 'string') setNotes(d.notes);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    pushToRemote: async () => {
      try {
        if (isEntitiesMode) return true; // entities writes occur per action
        const res = await tryCloudSync({ checklist, expenses, itinerary, notes });
        return (res as any)?.ok ?? false;
      } catch {
        return false;
      }
    },
    isEntities: isEntitiesMode,
  }), [checklist, expenses, itinerary, notes, rates, people, ready, busy, busyText]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
