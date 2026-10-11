'use client';

import { Suspense } from 'react';
import { Blocks, FileText, History, ListTree, Palette, SlidersHorizontal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { SectionLayout, type Section } from '@/components/common/section-nav';
import { AuditTrail } from '@/components/settings/audit-trail';
import { BrandingSettings } from '@/components/settings/branding-settings';
import { CatalogueSettings } from '@/components/settings/catalogue-settings';
import { DocumentTemplates } from '@/components/settings/document-templates';
import { GeneralSettings } from '@/components/settings/general-settings';
import { ModuleSettings } from '@/components/settings/module-settings';
import { useAccess } from '@/hooks/use-access';
import { useUrlParam } from '@/hooks/use-url-param';

const TABS = ['general', 'branding', 'modules', 'lists', 'documents', 'audit'] as const;
type Tab = (typeof TABS)[number];

const SECTIONS: Section<Tab>[] = [
  { value: 'general', label: 'General', icon: SlidersHorizontal, hint: 'Billing, readings, messages' },
  { value: 'branding', label: 'Branding', icon: Palette, hint: 'Logo and colours' },
  { value: 'modules', label: 'Modules', icon: Blocks, hint: 'What this estate uses' },
  { value: 'lists', label: 'Lists', icon: ListTree, hint: 'Dropdown entries' },
  { value: 'documents', label: 'Documents', icon: FileText, hint: 'Letters and certificates' },
];

const AUDIT: Section<Tab> = { value: 'audit', label: 'Audit trail', icon: History, hint: 'Access, settings and money changes' };

export default function SettingsPage() {
  return <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-7xl" />}><Settings /></Suspense>;
}

function Settings() {
  const { can } = useAccess();
  const admin = can('settings.manage');
  const [tab, setTab] = useUrlParam<Tab>('tab', 'general', admin ? TABS : TABS.filter((t) => t !== 'audit'));
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Settings" subtitle="How Maskani runs for this estate" />
      <SectionLayout sections={admin ? [...SECTIONS, AUDIT] : SECTIONS} value={tab} onChange={(v) => setTab(v, { kind: null })}>
        {tab === 'general' && <GeneralSettings />}
        {tab === 'branding' && <BrandingSettings />}
        {tab === 'modules' && <ModuleSettings />}
        {tab === 'lists' && <CatalogueSettings />}
        {tab === 'documents' && <DocumentTemplates />}
        {tab === 'audit' && admin && <AuditTrail />}
      </SectionLayout>
    </div>
  );
}
