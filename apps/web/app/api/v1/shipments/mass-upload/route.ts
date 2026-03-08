import { NextRequest } from 'next/server';
import { proxyUpload } from '@/lib/upload-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return proxyUpload(req, '/api/v1/shipments/mass-upload');
}
