import { supabase } from './supabase';
import type { ChecklistItem, Expense, DayPlan, Activity } from '@/components/AppContext';

export const isEntitiesMode = (process.env.NEXT_PUBLIC_DATA_MODE || '').toLowerCase() === 'entities';
const tripId = Number(process.env.NEXT_PUBLIC_TRIP_ID || 1);

function ensureClient() {
  if (!supabase) throw new Error('Supabase client not configured');
}

export async function loadAllFromEntities(): Promise<{ checklist: ChecklistItem[]; expenses: Expense[]; itinerary: DayPlan[]; notes: string; people: string[] }>
{
  ensureClient();
  // checklist
  const { data: cl, error: e1 } = await supabase!
    .from('checklist')
    .select('id,text,checked,sort_order,created_at')
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (e1) throw e1;

  // expenses
  const { data: ex, error: e2 } = await supabase!
    .from('expenses')
    .select('id,item,amount,currency,category,date,bill_photo,updated_at,paid_by,participants')
    .eq('trip_id', tripId)
    .order('date', { ascending: true })
    .order('id', { ascending: true });
  if (e2) throw e2;

  // days
  const { data: days, error: e3 } = await supabase!
    .from('itinerary_days')
    .select('id,title,sort_order')
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (e3) throw e3;

  const dayIds = (days || []).map((d) => d.id);
  let acts: any[] = [];
  if (dayIds.length) {
    const { data: aData, error: e4 } = await supabase!
      .from('itinerary_activities')
      .select('id,day_id,title,description,cost,currency,category,map_link,arrive_time,leave_time,sort_order')
      .in('day_id', dayIds)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    if (e4) throw e4;
    acts = aData || [];
  }

  // members
  const { data: members, error: e5 } = await supabase!
    .from('trip_members')
    .select('name, sort_order')
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: true });
  if (e5) throw e5;

  // Build structures
  const checklist: ChecklistItem[] = (cl || []).map((x) => ({ id: x.id, text: x.text, checked: !!x.checked }));

  const expenses: Expense[] = (ex || []).map((x) => ({
    id: x.id,
    item: x.item,
    amount: Number(x.amount ?? 0),
    currency: (x.currency || 'THB') as any,
    category: x.category,
    date: x.date as any,
    timestamp: (x.updated_at as any) || new Date().toISOString(),
    billPhoto: (x.bill_photo as any) || null,
    paidBy: (x as any).paid_by ?? null,
    participants: Array.isArray((x as any).participants) ? (x as any).participants : undefined,
  }));

  const itinerary: DayPlan[] = (days || []).map((d) => ({
    id: d.id,
    title: d.title,
    activities: acts
      .filter((a) => a.day_id === d.id)
      .map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description || '',
        cost: Number(a.cost ?? 0),
        currency: (a.currency || 'THB') as any,
        category: a.category || 'Activity',
        mapLink: a.map_link || '',
        arriveTime: a.arrive_time || '',
        leaveTime: a.leave_time || ''
      }))
  }));

  // Notes are not part of schema; keep local only for now
  const notes = typeof localStorage !== 'undefined' ? (localStorage.getItem('travelNotes') || '') : '';
  const people = (members || []).map((m: any) => m.name).filter(Boolean);

  return { checklist, expenses, itinerary, notes, people };
}

// Checklist CRUD
export async function entAddChecklistItem(text: string) {
  ensureClient();
  const sort_order = Math.floor(Date.now() / 1000);
  const { data, error } = await supabase!.from('checklist').insert({ trip_id: tripId, text, checked: false, sort_order }).select('id,text,checked');
  if (error) throw error;
  return data![0] as { id: number; text: string; checked: boolean };
}

export async function entToggleChecklistItem(id: number, checked: boolean) {
  ensureClient();
  const { error } = await supabase!.from('checklist').update({ checked }).eq('id', id).eq('trip_id', tripId);
  if (error) throw error;
}

export async function entDeleteChecklistItem(id: number) {
  ensureClient();
  const { error } = await supabase!.from('checklist').delete().eq('id', id).eq('trip_id', tripId);
  if (error) throw error;
}

// Expenses CRUD
export async function entAddExpense(e: Omit<Expense, 'id' | 'timestamp'> & { billPhoto?: string | null }) {
  ensureClient();
  const { data, error } = await supabase!.from('expenses').insert({
    trip_id: tripId,
    item: e.item,
    amount: e.amount,
    currency: e.currency,
    category: e.category,
    date: e.date,
    bill_photo: e.billPhoto || null,
    paid_by: e.paidBy ?? null,
    participants: e.participants && e.participants.length ? e.participants : null,
  }).select('id');
  if (error) throw error;
  return data![0].id as number;
}

export async function entUpdateExpenseAmount(id: number, amount: number) {
  ensureClient();
  const { error } = await supabase!.from('expenses').update({ amount }).eq('id', id).eq('trip_id', tripId);
  if (error) throw error;
}

export async function entDeleteExpense(id: number) {
  ensureClient();
  const { error } = await supabase!.from('expenses').delete().eq('id', id).eq('trip_id', tripId);
  if (error) throw error;
}

// Itinerary CRUD
export async function entAddDay(title: string) {
  ensureClient();
  const sort_order = Math.floor(Date.now() / 1000);
  const { data, error } = await supabase!.from('itinerary_days').insert({ trip_id: tripId, title, sort_order }).select('id,title');
  if (error) throw error;
  return data![0].id as number;
}

export async function entDeleteDay(dayId: number) {
  ensureClient();
  const { error } = await supabase!.from('itinerary_days').delete().eq('id', dayId).eq('trip_id', tripId);
  if (error) throw error;
}

export async function entAddActivity(dayId: number, a: Omit<Activity, 'id'>) {
  ensureClient();
  const sort_order = Math.floor(Date.now() / 1000);
  const { data, error } = await supabase!.from('itinerary_activities').insert({
    day_id: dayId,
    title: a.title,
    description: a.description,
    cost: a.cost,
    currency: a.currency,
    category: a.category,
    map_link: a.mapLink || null,
    arrive_time: a.arriveTime || null,
    leave_time: a.leaveTime || null,
    sort_order,
  }).select('id');
  if (error) throw error;
  return data![0].id as number;
}

export async function entUpdateActivity(dayId: number, activityId: number, a: Partial<Activity>) {
  ensureClient();
  const payload: any = {};
  if (a.title !== undefined) payload.title = a.title;
  if (a.description !== undefined) payload.description = a.description;
  if (a.cost !== undefined) payload.cost = a.cost;
  if (a.currency !== undefined) payload.currency = a.currency;
  if (a.category !== undefined) payload.category = a.category;
  if (a.mapLink !== undefined) payload.map_link = a.mapLink || null;
  if (a.arriveTime !== undefined) payload.arrive_time = a.arriveTime || null;
  if (a.leaveTime !== undefined) payload.leave_time = a.leaveTime || null;
  const { error } = await supabase!.from('itinerary_activities').update(payload).eq('id', activityId).eq('day_id', dayId);
  if (error) throw error;
}

export async function entDeleteActivity(activityId: number) {
  ensureClient();
  const { error } = await supabase!.from('itinerary_activities').delete().eq('id', activityId);
  if (error) throw error;
}

// Members management (replace-all strategy)
export async function entReplaceMembers(names: string[]) {
  ensureClient();
  // Delete old
  let { error } = await supabase!.from('trip_members').delete().eq('trip_id', tripId);
  if (error) throw error;
  if (!names.length) return;
  const rows = names.map((name, idx) => ({ trip_id: tripId, name, sort_order: idx + 1 }));
  const res = await supabase!.from('trip_members').insert(rows);
  if (res.error) throw res.error;
}
