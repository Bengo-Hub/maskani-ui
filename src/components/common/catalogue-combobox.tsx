'use client';

import { useMemo } from 'react';
import { toast } from 'sonner';
import { SearchableCombobox, type ComboboxOption } from '@bengo-hub/shared-ui-lib/combobox';
import { catalogueCode } from '@/components/settings/catalogue-settings';
import { useAccess } from '@/hooks/use-access';
import { useCatalogue, useUpsertCatalogue } from '@/hooks/use-settings';
import { apiErrorMessage } from '@/lib/api/errors';
import type { CatalogueKind } from '@/lib/catalogues';
import { titleCase } from '@/lib/utils';

/** Who may add to each list from a dropdown; mirrors maskani-api rbac.CatalogueManagePerms. */
const CREATE_PERMS: Record<CatalogueKind, string[]> = {
  unit_type: ['settings.manage', 'units.manage', 'properties.manage'],
  property_type: ['settings.manage', 'properties.manage'],
  wo_category: ['settings.manage', 'works.manage'],
  vendor_category: ['settings.manage', 'vendors.manage'],
  incident_type: ['settings.manage', 'gate.manage'],
  notice_category: ['settings.manage', 'notices.manage'],
};

/**
 * Dropdown over one of the estate's lists (unit types, categories...) on the shared searchable
 * combobox. People allowed to manage what the list describes can add a missing entry by typing it
 * ("5 bedroom maisonette"); it is saved to the list and selected. The value is the entry code.
 */
export function CatalogueCombobox({ kind, value, onChange, placeholder, disabled, id, className }: {
  kind: CatalogueKind;
  value?: string;
  onChange: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}) {
  const { can } = useAccess();
  const { data = [], isLoading } = useCatalogue(kind);
  const upsert = useUpsertCatalogue(kind, true);
  const options: ComboboxOption[] = useMemo(() => data.map((e) => ({ value: e.code, label: e.name })), [data]);
  const canCreate = CREATE_PERMS[kind].some((p) => can(p));

  const create = async (text: string): Promise<ComboboxOption | void> => {
    const code = catalogueCode(text);
    if (!code) return;
    try {
      // The hook waits for the list to refetch, so the new entry is there when it is selected.
      await upsert.mutateAsync({ code, name: text.trim(), active: true });
      toast.success(`Added "${text.trim()}"`);
      onChange(code);
      return { value: code, label: text.trim() };
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not add that entry.'));
    }
  };

  return (
    <div id={id} className={className}>
      <SearchableCombobox
        options={options}
        value={value}
        valueLabel={value ? titleCase(value) : undefined}
        onChange={(v) => onChange(v)}
        loading={isLoading}
        disabled={disabled}
        placeholder={placeholder ?? 'Choose...'}
        searchPlaceholder={canCreate ? 'Search or type a new one' : 'Search'}
        emptyText="No matches"
        onCreate={canCreate ? create : undefined}
        createLabel='Add "{text}"'
      />
    </div>
  );
}
