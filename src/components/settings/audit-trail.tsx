'use client';

import { useMemo, useState } from 'react';
import type { DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/common/field';
import { KeysetTable } from '@/components/common/keyset-table';
import { useAuditLogs } from '@/hooks/use-settings';
import type { AuditEntry } from '@/lib/api/types';
import { fmtDateTime } from '@/lib/utils';

/** Plain names for the recorded actions (the API's allowlist). */
const ACTION: Record<string, string> = {
  'role.create': 'Created a role', 'role.customize': 'Customised a role', 'role.update': 'Changed a role', 'role.delete': 'Deleted a role',
  'user.invite': 'Invited a staff member', 'user.roles_change': "Changed someone's roles", 'user.status_change': 'Suspended or restored a user',
  'property.staff_assign': 'Assigned staff to a property', 'property.staff_remove': 'Removed staff from a property',
  'party.portal_invite': 'Invited someone to the portal', 'gate.device_register': 'Registered a gate tablet', 'gate.device_revoke': 'Revoked a gate tablet',
  'vendor.personnel_pin_set': "Set a vendor guard's PIN",
  'settings.update': 'Changed settings', 'settings.modules_change': 'Switched modules', 'approval_rule.create': 'Added an approval rule',
  'approval_rule.update': 'Changed an approval rule', 'approval_rule.delete': 'Removed an approval rule',
  'document.sequence_change': 'Changed document numbering', 'document.template_approve': 'Approved a document template', 'fund.update': 'Changed a fund or its paybill',
  'approval.approve': 'Approved a step', 'approval.reject': 'Rejected an approval', 'manual_payment.verify': 'Verified a payment',
  'manual_payment.reject': 'Rejected a payment', 'adjustment.request': 'Asked for a credit', 'adjustment.approve': 'Approved a credit',
  'adjustment.reject': 'Rejected a credit', 'payment.suspense_assign': 'Assigned an unmatched payment', 'payment.bank_statement_import': 'Imported a bank statement',
  'payment_plan.agree': 'Agreed a payment plan', 'payment_plan.cancel': 'Cancelled a payment plan', 'billing.run_without_readings': 'Ran billing without readings',
  'unit.link_end': "Ended someone's link to a unit", 'unit.transfer': 'Transferred a unit', 'register.import_commit': 'Imported the register',
  'privacy.verify': "Confirmed a person's identity for a privacy request", 'privacy.export': "Downloaded a person's data",
  'privacy.erase': "Erased a person's details", 'privacy.reject': 'Rejected a privacy request',
};

const AREAS = [
  { value: '', label: 'Everything' },
  { value: 'role', label: 'Roles' }, { value: 'user', label: 'Staff' }, { value: 'property', label: 'Property staff' },
  { value: 'settings', label: 'Settings' }, { value: 'approval_rule', label: 'Approval rules' }, { value: 'fund', label: 'Funds and paybills' },
  { value: 'approval', label: 'Approvals' }, { value: 'manual_payment', label: 'Manual payments' }, { value: 'adjustment', label: 'Credits' },
  { value: 'payment', label: 'Payments' }, { value: 'unit', label: 'Units and ownership' }, { value: 'gate', label: 'Gate tablets' },
  { value: 'privacy', label: 'Personal data' },
];

/**
 * The audit trail: only critical security workflows (who has access, how the estate is configured,
 * money decisions and changes of ownership), never routine work. Read only.
 */
export function AuditTrail() {
  const [area, setArea] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const list = useAuditLogs({ targetType: area, from, to });
  const columns = useMemo<DataTableColumn<AuditEntry>[]>(() => [
    { key: 'when', header: 'When', accessor: (e) => e.created_at, render: (e) => <span className="text-sm tabular">{fmtDateTime(e.created_at)}</span> },
    { key: 'what', header: 'What', primary: true, accessor: (e) => e.action, render: (e) => <span className="font-medium">{ACTION[e.action] ?? e.action}</span> },
    { key: 'who', header: 'Who', accessor: (e) => e.actor_email ?? '', render: (e) => <span className="text-sm">{e.actor_email || 'System'}</span> },
    { key: 'ip', header: 'From', hideBelow: 'lg', accessor: (e) => e.ip ?? '', render: (e) => <span className="font-mono text-xs text-muted-foreground">{e.ip}</span> },
  ], []);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Audit trail</h2>
        <p className="text-sm text-muted-foreground">Changes to access, settings, money decisions, ownership and personal data. Routine work is not recorded here.</p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <NativeSelect className="w-48" value={area} onChange={(e) => setArea(e.target.value)} aria-label="Area">
          {AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </NativeSelect>
        <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
        <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
      </div>
      <KeysetTable columns={columns} rows={list.rows} rowKey={(e) => e.id} loading={list.isLoading} error={list.isError}
        onRetry={() => void list.refetch()} hasMore={list.hasMore} loadMore={() => void list.loadMore()} loadingMore={list.loadingMore}
        emptyText="Nothing recorded for this choice." />
    </section>
  );
}
