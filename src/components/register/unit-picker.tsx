'use client';

import { useMemo } from 'react';
import { SearchableCombobox, type ComboboxOption } from '@bengo-hub/shared-ui-lib/combobox';
import { useSlug } from '@/hooks/use-access';
import { useUnits } from '@/hooks/use-register';
import { registerApi } from '@/lib/api/register';
import type { Unit } from '@/lib/api/types';

const option = (u: Unit): ComboboxOption => ({
  value: u.id,
  label: u.code,
  hint: u.edges?.block?.name || u.edges?.block?.code || undefined,
  description: u.owner_name || undefined,
});

/**
 * Picks one unit of a property on the shared combobox. The first page of units loads with the
 * list; typing a code that is not on it searches the API, and "Load more" pages through the rest.
 */
export function UnitPicker({ propertyId, value, onChange, placeholder = 'Choose a unit', id, className, disabled }: {
  propertyId: string;
  value: string;
  onChange: (unitId: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}) {
  const slug = useSlug();
  const units = useUnits({ property_id: propertyId });
  const options = useMemo(() => units.rows.map(option), [units.rows]);

  return (
    <div id={id} className={className}>
      <SearchableCombobox
        options={options}
        value={value}
        onChange={(v) => onChange(v)}
        onRemoteSearch={async (q) => (await registerApi.units(slug, { property_id: propertyId, q, limit: 20 })).data.map(option)}
        onLoadMore={() => void units.loadMore()}
        hasMore={units.hasMore}
        loading={units.isLoading || units.loadingMore}
        placeholder={placeholder}
        searchPlaceholder="Unit code"
        emptyText="No unit matches"
        clearable
        disabled={disabled || !propertyId}
      />
    </div>
  );
}
