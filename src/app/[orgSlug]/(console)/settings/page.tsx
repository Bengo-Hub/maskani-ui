'use client';

import { Suspense } from 'react';
import { Blocks, ListTree, Palette, SlidersHorizontal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { SectionLayout, type Section } from '@/components/common/section-nav';
import { BrandingSettings } from '@/components/settings/branding-settings';
import { CatalogueSettings } from '@/components/settings/catalogue-settings';
import { GeneralSettings } from '@/components/settings/general-settings';
import { ModuleSettings } from '@/components/settings/module-settings';
import { useUrlParam } from '@/hooks/use-url-param';

const TABS = ['general', 'branding', 'modules', 'lists'] as const;
type Tab = (typeof TABS)[number];

const SECTIONS: Section<Tab>[] = [
  { value: 'general', label: 'General', icon: SlidersHorizontal, hint: 'Billing, readings, messages' },
  { value: 'branding', label: 'Branding', icon: Palette, hint: 'Logo and colours' },
  { value: 'modules', label: 'Modules', icon: Blocks, hint: 'What this estate uses' },
  { value: 'lists', label: 'Lists', icon: ListTree, hint: 'Dropdown entries' },
];

export default function SettingsPage() {
  return <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-7xl" />}><Settings /></Suspense>;
}

function Settings() {
  const [tab, setTab] = useUrlParam<Tab>('tab', 'general', TABS);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Settings" subtitle="How Maskani runs for this estate" />
      <SectionLayout sections={SECTIONS} value={tab} onChange={(v) => setTab(v, { kind: null })}>
        {tab === 'general' && <GeneralSettings />}
        {tab === 'branding' && <BrandingSettings />}
        {tab === 'modules' && <ModuleSettings />}
        {tab === 'lists' && <CatalogueSettings />}
      </SectionLayout>
    </div>
  );
}
