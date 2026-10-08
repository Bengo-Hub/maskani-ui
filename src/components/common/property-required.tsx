'use client';

import { Building2 } from 'lucide-react';
import { NativeSelect } from '@/components/common/field';
import { useSlug } from '@/hooks/use-access';
import { useProperties } from '@/hooks/use-register';
import { usePropertyStore } from '@/store/property';
import { EmptyState } from './empty-state';

/**
 * For screens that work on one property at a time (gate, readings, sales board). Uses the header's
 * property; with "All properties" selected it asks for one instead of firing a request without one.
 * With a single property it picks that one.
 */
export function usePropertyOrSingle(): string {
  const slug = useSlug();
  const selected = usePropertyStore((s) => s.byTenant[slug] ?? '');
  const { data = [] } = useProperties();
  return selected || (data.length === 1 ? data[0].id : '');
}

export function PropertyRequired({ what }: { what: string }) {
  const slug = useSlug();
  const { data = [] } = useProperties();
  const select = usePropertyStore((s) => s.select);
  return (
    <EmptyState
      icon={Building2}
      title="Choose a property"
      description={`${what} are kept per property.`}
      action={
        <NativeSelect className="w-64" defaultValue="" onChange={(e) => e.target.value && select(slug, e.target.value)} aria-label="Property">
          <option value="" disabled>Choose a property</option>
          {data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </NativeSelect>
      }
    />
  );
}
