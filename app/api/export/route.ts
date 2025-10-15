import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'edge';

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Use POST to echo/export data' });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="travel-data.json"'
      }
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
