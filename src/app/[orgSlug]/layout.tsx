import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { OrgProviders } from '@/providers/org-providers';

/**
 * Server component so the tenant manifest link is in the first HTML. Mobile install reads it
 * before any client script runs (pwa-tenant-manifest-fix).
 */
export async function generateMetadata({ params }: { params: Promise<{ orgSlug: string }> }): Promise<Metadata> {
  const { orgSlug } = await params;
  return { manifest: `/${orgSlug}/manifest.webmanifest` };
}

export default function OrgLayout({ children }: { children: ReactNode }) {
  return <OrgProviders>{children}</OrgProviders>;
}
