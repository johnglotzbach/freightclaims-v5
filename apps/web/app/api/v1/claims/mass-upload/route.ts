import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_HOST = process.env.INTERNAL_API_HOST;
const API_BASE = API_HOST ? `http://${API_HOST}` : 'http://localhost:4000';

export async function POST(req: NextRequest) {
  try {
    const headers: Record<string, string> = {};
    const auth = req.headers.get('authorization');
    if (auth) headers['authorization'] = auth;
    const ct = req.headers.get('content-type');
    if (ct) headers['content-type'] = ct;
    const cl = req.headers.get('content-length');
    if (cl) headers['content-length'] = cl;

    const res = await fetch(`${API_BASE}/api/v1/claims/mass-upload`, {
      method: 'POST',
      headers,
      body: req.body,
      // @ts-expect-error duplex required for streaming request bodies
      duplex: 'half',
      signal: AbortSignal.timeout(120_000),
    });

    const data = await res.json().catch(() => ({ success: false, error: 'Invalid API response' }));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Upload failed' }, { status: 502 });
  }
}
