import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const tableName = process.env.NEXT_PUBLIC_SUPABASE_TABLE || 'travel_data';
const recordId = Number(process.env.NEXT_PUBLIC_SUPABASE_RECORD_ID || 1);
export const billsBucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'bills';

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type CloudSyncPayload = {
  checklist: any[];
  expenses: any[];
  itinerary: any[];
  notes: string;
};

export async function tryCloudSync(payload: CloudSyncPayload) {
  if (!supabase) return { ok: false, reason: 'Supabase not configured' } as const;
  try {
    const { data, error } = await supabase
      .from(tableName)
      .upsert({ id: recordId, payload, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .select();
    if (error) throw error;
    return { ok: true, data } as const;
  } catch (e) {
    return { ok: false, reason: (e as Error).message } as const;
  }
}

export async function tryCloudLoad() {
  if (!supabase) return { ok: false, reason: 'Supabase not configured' } as const;
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('payload')
      .eq('id', recordId)
      .single();
    if (error) throw error;
    return { ok: true, data: data?.payload } as const;
  } catch (e) {
    return { ok: false, reason: (e as Error).message } as const;
  }
}
