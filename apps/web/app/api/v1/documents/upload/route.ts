import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_HOST = process.env.INTERNAL_API_HOST;
const API_BASE = API_HOST ? `http://${API_HOST}` : 'http://localhost:4000';

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const incoming = await req.formData();

    const outgoing = new FormData();
    for (const [key, value] of incoming.entries()) {
      outgoing.append(key, value);
    }

    const res = await fetch(`${API_BASE}/api/v1/documents/upload`, {
      method: 'POST',
      headers: {
        authorization,
      },
      body: outgoing,
      signal: AbortSignal.timeout(120_000),
    });

    const data = await res.json().catch(() => ({ success: false, error: 'Invalid API response' }));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('Upload proxy error:', err?.message || err);
    return NextResponse.json(
      { success: false, error: 'Upload failed: ' + (err?.message || 'unknown error') },
      { status: 502 },
    );
  }
}
