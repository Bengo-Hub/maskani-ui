'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchableCombobox, type ComboboxOption } from '@bengo-hub/shared-ui-lib/combobox';
import { useSlug } from '@/hooks/use-access';
import { apiErrorMessage } from '@/lib/api/errors';
import { worksApi } from '@/lib/api/operations';
import type { ErpEmployee } from '@/lib/api/types';

const option = (e: ErpEmployee): ComboboxOption => ({
  value: e.id,
  label: e.name,
  hint: e.employee_number || undefined,
  description: e.email || undefined,
});

/**
 * Picks one of the tenant's active ERP staff (estate caretakers, plumbers on the payroll). The list
 * comes from ERP through maskani-api and only when the plan includes ERP; otherwise the API answers
 * with the upgrade prompt and nothing is fetched. The picked name goes with the id so the work order
 * shows who is on it without asking ERP again.
 */
export function ErpStaffPicker({ value, onChange, id }: {
  value: string;
  onChange: (employee: { id: string; name: string } | null) => void;
  id?: string;
}) {
  const slug = useSlug();
  const first = useQuery({
    queryKey: [slug, 'erp-employees', ''],
    queryFn: () => worksApi.erpEmployees(slug, ''),
    staleTime: 60_000,
    retry: false,
  });
  const options = useMemo(() => (first.data?.data ?? []).map(option), [first.data]);

  if (first.isError) {
    return <p id={id} className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">{apiErrorMessage(first.error, 'ERP staff could not be loaded.')}</p>;
  }
  return (
    <div id={id}>
      <SearchableCombobox
        options={options}
        value={value}
        onChange={(v, opt) => onChange(v ? { id: v, name: opt?.label ?? options.find((o) => o.value === v)?.label ?? '' } : null)}
        onRemoteSearch={async (q) => (await worksApi.erpEmployees(slug, q)).data.map(option)}
        loading={first.isLoading}
        placeholder="Choose a staff member"
        searchPlaceholder="Name, staff number or email"
        emptyText="No staff member matches"
        clearable
      />
    </div>
  );
}
