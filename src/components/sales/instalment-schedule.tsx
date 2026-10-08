import { StatusBadge } from '@/components/common/status-badge';
import type { Instalment } from '@/lib/api/types';
import { fmtDate, kes, num, titleCase } from '@/lib/utils';

/** Payment schedule; the total row always equals the sum of the instalments shown. */
export function InstalmentSchedule({ instalments }: { instalments: Instalment[] }) {
  const rows = [...instalments].sort((a, b) => a.seq - b.seq);
  const total = rows.reduce((s, i) => s + num(i.amount), 0);
  const paid = rows.reduce((s, i) => s + num(i.paid_amount), 0);
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[460px] text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Due</th><th className="px-3 py-2">For</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-right">Paid</th><th className="px-3 py-2">Status</th></tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((i) => (
            <tr key={i.id}>
              <td className="px-3 py-2 tabular text-muted-foreground">{i.seq}</td>
              <td className="px-3 py-2">{fmtDate(i.due_date)}</td>
              <td className="px-3 py-2">{i.milestone_label || titleCase(i.kind)}</td>
              <td className="px-3 py-2 text-right tabular">{kes(i.amount)}</td>
              <td className="px-3 py-2 text-right tabular">{kes(i.paid_amount ?? 0)}</td>
              <td className="px-3 py-2"><StatusBadge status={i.status} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t bg-muted/30 font-semibold">
          <tr><td className="px-3 py-2" colSpan={3}>Total</td><td className="px-3 py-2 text-right tabular">{kes(total)}</td><td className="px-3 py-2 text-right tabular">{kes(paid)}</td><td /></tr>
        </tfoot>
      </table>
    </div>
  );
}
