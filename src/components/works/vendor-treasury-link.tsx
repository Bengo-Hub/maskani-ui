'use client';

import { useState } from 'react';
import { Link2 } from 'lucide-react';
import { SearchableCombobox, type ComboboxOption } from '@bengo-hub/shared-ui-lib/combobox';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { useSlug } from '@/hooks/use-access';
import { useLinkTreasurySupplier } from '@/hooks/use-vendor-ops';
import { worksApi } from '@/lib/api/operations';
import type { Vendor } from '@/lib/api/types';
import { kes } from '@/lib/utils';

/**
 * Which treasury supplier this vendor is paid as. Its invoices become supplier bills against that
 * supplier, so the link is picked from treasury's own list by name, never typed.
 */
export function VendorTreasuryLink({ vendor, manage }: { vendor: Vendor; manage: boolean }) {
  const slug = useSlug();
  const link = useLinkTreasurySupplier(vendor.id);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const linkedName = vendor.metadata?.treasury_vendor_name;

  const search = async (q: string): Promise<ComboboxOption[]> => {
    if (q.trim().length < 2) return [];
    const rows = (await worksApi.treasurySuppliers(slug, q.trim())).data ?? [];
    return rows.filter((r) => r.vendor_id).map((r) => ({ value: r.vendor_id!, label: r.vendor_name, hint: `Owed ${kes(r.balance_owed)}` }));
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-sm">
        <p className="font-medium">Paid in treasury as</p>
        <p className="text-muted-foreground">{vendor.treasury_vendor_id ? linkedName || 'A linked supplier' : 'Not linked yet. Link it before its invoices can be paid.'}</p>
      </div>
      {manage && <Button size="sm" variant="outline" onClick={() => { setPicked(null); setOpen(true); }}><Link2 /> {vendor.treasury_vendor_id ? 'Change' : 'Link supplier'}</Button>}
      <FormSheet
        open={open}
        onOpenChange={setOpen}
        size="md"
        title="Link to a treasury supplier"
        description="Type at least two letters of the supplier's name as it is in treasury."
        footer={<>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!picked || link.isPending}
            onClick={() => picked && link.mutate({ treasury_vendor_id: picked.id, name: picked.name }, { onSuccess: () => setOpen(false) })}>
            {link.isPending ? 'Linking...' : 'Link'}
          </Button>
        </>}
      >
        <Field label="Supplier" htmlFor="vt-sup" required>
          <div id="vt-sup">
            <SearchableCombobox
              options={[]}
              value={picked?.id ?? ''}
              valueLabel={picked?.name}
              onChange={(v, opt) => setPicked(v ? { id: v, name: opt?.label ?? '' } : null)}
              onRemoteSearch={search}
              remoteThreshold={0}
              placeholder="Search treasury suppliers"
              searchPlaceholder="Supplier name"
              emptyText="No supplier matches. Add the supplier in treasury first."
              clearable
            />
          </div>
        </Field>
      </FormSheet>
    </div>
  );
}
