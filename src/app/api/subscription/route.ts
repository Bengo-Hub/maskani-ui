import { NextRequest, NextResponse } from 'next/server';

// Server to server through in-cluster DNS (SUBSCRIPTION_BASE_URL in values.yaml), never the public
// domain, which would loop through Cloudflare (s2s loopback fix, 2026-09-10).
const SUBSCRIPTIONS_API = process.env.SUBSCRIPTION_BASE_URL || 'https://pricingapi.codevertexafrica.com';
const SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY ?? '';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/subscription?tenantId=<uuid>: proxies the tenant subscription with the service key. */
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenantId') ?? '';
  if (!UUID.test(tenantId)) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
  if (!SERVICE_KEY) return NextResponse.json({ error: 'service key not configured' }, { status: 503 });
  try {
    const upstream = await fetch(`${SUBSCRIPTIONS_API}/api/v1/tenants/${tenantId}/subscription`, {
      headers: { 'X-API-Key': SERVICE_KEY },
      next: { revalidate: 60 },
    });
    if (!upstream.ok) return NextResponse.json(null, { status: upstream.status });
    return NextResponse.json(await upstream.json());
  } catch {
    return NextResponse.json(null, { status: 503 });
  }
}
