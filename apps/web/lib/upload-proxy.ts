import { NextRequest, NextResponse } from 'next/server';

const API_HOST = process.env.INTERNAL_API_HOST;
const API_BASE = API_HOST ? `http://${API_HOST}` : 'http://localhost:4000';

/**
 * Proxies a multipart upload request to the backend API,
 * explicitly forwarding Authorization and Content-Type headers.
 *
 * Next.js rewrites can silently drop headers on multipart requests,
 * so upload endpoints use dedicated Route Handlers instead.
 */
export async function proxyUpload(req: NextRequest, backendPath: string): Promise<NextResponse> {
  try {
    const authorization = req.headers.get('authorization') || '';
    if (!authorization) {
      return NextResponse.json(
        { success: false, error: 'No authorization token — please log in again' },
        { status: 401 },
      );
    }

    const body = await req.arrayBuffer();

    const headers: Record<string, string> = { authorization };

    const contentType = req.headers.get('content-type');
    if (contentType) headers['content-type'] = contentType;

    const corporateId = req.headers.get('x-corporate-id');
    if (corporateId) headers['x-corporate-id'] = corporateId;

    const url = `${API_BASE}${backendPath}`;

    const apiRes = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(120_000),
    });

    const data = await apiRes.json().catch(() => ({ success: false, error: 'Invalid API response' }));
    return NextResponse.json(data, { status: apiRes.status });
  } catch (err: any) {
    console.error(`Upload proxy error [${backendPath}]:`, err?.message || err);
    return NextResponse.json(
      { success: false, error: 'Upload proxy failed — ' + (err?.message || 'unknown') },
      { status: 502 },
    );
  }
}
