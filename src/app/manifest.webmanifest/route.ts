import { NextResponse } from 'next/server';

/** Default manifest for the landing page. Tenant routes use /{orgSlug}/manifest.webmanifest. */
export function GET() {
  return NextResponse.json(
    {
      id: '/',
      name: 'Maskani',
      short_name: 'Maskani',
      description: 'Estate and property management by Codevertex.',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#FFFFFF',
      theme_color: '#6E1A5A',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' } },
  );
}
