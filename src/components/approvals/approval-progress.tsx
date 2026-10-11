'use client';

import { Check, Circle, X } from 'lucide-react';
import { useRoles } from '@/hooks/use-settings';
import type { ApprovalModule, ApprovalRequest } from '@/lib/api/types';
import { cn, fmtDate } from '@/lib/utils';

/** Workflow names as staff know them. */
export const APPROVAL_MODULE: Record<ApprovalModule, string> = {
  credit_note: 'Credit notes', adjustment: 'Waivers', manual_payment: 'Manual payments', work_order_quote: 'Work order quotes',
  restructure: 'Plan restructures', vendor_bill: 'Vendor bills', refund: 'Refunds', deposit_deduction: 'Deposit deductions',
  remittance: 'Remittances', write_off: 'Write-offs',
};

/** The workflows an estate can set rules for today (the rest arrive with their flows). */
export const RULE_MODULES: ApprovalModule[] = ['credit_note', 'adjustment', 'manual_payment', 'work_order_quote', 'restructure'];

const PERMISSION: Record<string, string> = {
  'maskani.billing.approve': 'someone who approves credits',
  'maskani.billing.verify': 'someone who verifies payments',
  'maskani.works.manage': 'someone who manages works',
};

/** Names who acts on a step: the role's name, or what the permission means. */
export function useApproverName() {
  const { data: roles = [] } = useRoles();
  return (role?: string, permission?: string) =>
    role ? roles.find((r) => r.code === role)?.name ?? role : PERMISSION[permission ?? ''] ?? 'an approver';
}

/**
 * An approval's steps in order: done steps with who decided, the current one, and any left. Shown
 * beside every queue row and in the central inbox, so all workflows read the same way.
 */
export function ApprovalProgress({ request, compact }: { request?: ApprovalRequest; compact?: boolean }) {
  const name = useApproverName();
  if (!request) return <span className="text-xs text-muted-foreground">No approval needed</span>;
  const steps = request.actions ?? [];
  if (compact) {
    const done = steps.filter((s) => s.status === 'approved').length;
    const cur = steps.find((s) => s.status === 'pending' && s.sequence === request.current_sequence);
    return (
      <span className="text-xs">
        {request.status === 'pending' && cur ? `Step ${done + 1} of ${steps.length}: ${name(cur.approver_role, cur.permission)}`
          : request.status === 'approved' ? `Approved${steps.at(-1)?.acted_by_name ? ` by ${steps.at(-1)?.acted_by_name}` : ''}`
            : request.status === 'rejected' ? 'Rejected' : 'Cancelled'}
      </span>
    );
  }
  return (
    <ol className="space-y-1.5">
      {steps.map((s) => {
        const current = request.status === 'pending' && s.status === 'pending' && s.sequence === request.current_sequence;
        return (
          <li key={s.sequence} className="flex items-start gap-2 text-sm">
            <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full',
              s.status === 'approved' ? 'bg-success text-white' : s.status === 'rejected' ? 'bg-destructive text-white' : current ? 'border-2 border-primary' : 'border')}>
              {s.status === 'approved' ? <Check className="h-3 w-3" aria-hidden /> : s.status === 'rejected' ? <X className="h-3 w-3" aria-hidden /> : current ? <Circle className="h-1.5 w-1.5 fill-primary text-primary" aria-hidden /> : null}
            </span>
            <span>
              <span className={current ? 'font-medium' : ''}>{s.name}</span>
              <span className="text-muted-foreground">
                {s.acted_by_name ? `, ${s.status === 'rejected' ? 'rejected' : 'approved'} by ${s.acted_by_name}${s.acted_at ? ` on ${fmtDate(s.acted_at)}` : ''}`
                  : s.status === 'skipped' ? ', not needed' : `, by ${name(s.approver_role, s.permission)}`}
              </span>
              {s.comment && <span className="block text-xs text-muted-foreground">{s.comment}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
