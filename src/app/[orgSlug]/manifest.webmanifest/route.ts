import { type NextRequest, NextResponse } from 'next/server';
import {
  serviceBrandingEntry,
  serviceFullName,
  serviceShortName,
  type ServiceBrandingEntry,
} from '@bengo-hub/shared-ui-lib/branding';

const AUTH_API_BASE = process.env.NEXT_PUBLIC_SSO_URL || 'https://sso.codevertexafrica.com';
const SERVICE_KEY = 'maskani'; // entry in tenant metadata.service_branding (Accounts > Branding)
const DEFAULT_THEME = '#6E1A5A';

interface TenantResponse { name?: string; logo_url?: string; brand_colors?: { primary?: string }; metadata?: Record<string, unknown> }

async function fetchTenant(slug: string): Promise<TenantResponse | null> {
  try {
    const res = await fetch(`${AUTH_API_BASE}/api/v1/tenants/by-slug/${encodeURIComponent(slug)}`, { next: { revalidate: 600 } });
    return res.ok ? ((await res.json()) as TenantResponse) : null;
  } catch {
    return null;
  }
}

function iconMime(url: string): string | undefined {
  const ext = url.split('?')[0]?.split('.').pop()?.toLowerCase();
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  return undefined;
}

// Bundled square icons are always listed so the app stays installable when a tenant icon is a
// wide logo. The tenant's own icon comes first so browsers prefer it.
const BUNDLED_ICONS = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
  { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const tenant = await fetchTenant(orgSlug);
  const entry: ServiceBrandingEntry = serviceBrandingEntry(tenant?.metadata, SERVICE_KEY) ?? {};
  const business = tenant?.name ?? orgSlug;
  const iconUrl = entry.icon_url;
  const iconType = iconUrl ? iconMime(iconUrl) : undefined;
  const shortcut = [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }];

  const manifest = {
    id: `/${orgSlug}/`,
    // Shared naming rule (shared-ui-lib branding): the tenant's own app name wins, else
    // "<Business> Maskani" with a "<brand word> Maskani" home-screen label.
    name: serviceFullName(business, 'Maskani', orgSlug, entry),
    short_name: serviceShortName(business, 'Maskani', orgSlug, entry),
    description: entry.tagline || 'Estate bills, payments, visitors and requests.',
    start_url: `/${orgSlug}/`,
    scope: `/${orgSlug}/`,
    display: 'standalone',
    orientation: 'any',
    background_color: '#FFFFFF',
    theme_color: entry.theme_color || DEFAULT_THEME,
    categories: ['business', 'lifestyle', 'productivity'],
    lang: 'en',
    icons: [
      ...(iconUrl ? [{ src: iconUrl, sizes: iconType === 'image/svg+xml' ? 'any' : '512x512', ...(iconType ? { type: iconType } : {}), purpose: 'any' }] : []),
      ...BUNDLED_ICONS,
    ],
    shortcuts: [
      { name: 'Pay', short_name: 'Pay', url: `/${orgSlug}/portal`, icons: shortcut },
      { name: 'Visitors', short_name: 'Visitors', url: `/${orgSlug}/portal/visitors`, icons: shortcut },
      { name: 'Requests', short_name: 'Requests', url: `/${orgSlug}/portal/requests`, icons: shortcut },
    ],
  };

  return NextResponse.json(manifest, {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=600, stale-while-revalidate=86400' },
  });
}
