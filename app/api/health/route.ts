import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const mode = (process.env.NEXT_PUBLIC_DATA_MODE || 'json').toLowerCase();
  const tripId = Number(process.env.NEXT_PUBLIC_TRIP_ID || 1);

  if (!url || !key) {
    return NextResponse.json(
      { ok: false, reason: 'Missing Supabase URL or ANON KEY env', urlOk: !!url, keyOk: !!key },
      { status: 500 }
    );
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const result: any = { ok: true, mode, tripId };

  try {
    const trip = await supabase.from('trips').select('id').eq('id', tripId).maybeSingle();
    result.trip = { exists: !!trip.data, error: trip.error?.message || null };
  } catch (e: any) {
    result.trip = { exists: false, error: e?.message || String(e) };
  }

  const q = async (table: string, col: string, val: number) => {
    try {
      const { data, error } = await supabase.from(table).select('id', { count: 'exact' }).eq(col, val).limit(1);
      return { count: (data || []).length, error: error?.message || null };
    } catch (e: any) {
      return { count: 0, error: e?.message || String(e) };
    }
  };

  if (mode === 'entities') {
    result.checklist = await q('checklist', 'trip_id', tripId);
    result.expenses = await q('expenses', 'trip_id', tripId);
    result.days = await q('itinerary_days', 'trip_id', tripId);
    result.members = await q('trip_members', 'trip_id', tripId);
  } else {
    // JSON mode sanity check: just confirm table exists
    try {
      const { data, error } = await supabase.from(process.env.NEXT_PUBLIC_SUPABASE_TABLE || 'travel_data').select('id').eq('id', Number(process.env.NEXT_PUBLIC_SUPABASE_RECORD_ID || 1)).limit(1);
      result.jsonPayload = { exists: (data || []).length > 0, error: error?.message || null };
    } catch (e: any) {
      result.jsonPayload = { exists: false, error: e?.message || String(e) };
    }
  }

  return new NextResponse(JSON.stringify(result, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  });
}

