import { Badge } from '@/components/ui/badge';
import { cn, titleCase } from '@/lib/utils';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'gold' | 'info';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-destructive/10 text-destructive',
  gold: 'bg-gold/15 text-gold-foreground dark:text-gold',
  info: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
};

/** The single status-to-colour map for every list and detail screen. */
const STATUS_TONE: Record<string, Tone> = {
  active: 'success', issued: 'success', paid: 'success', accepted: 'success', confirmed: 'success', sent: 'success',
  valid: 'success', fully_paid: 'success', available: 'success', claimed: 'success',
  completed: 'primary', handed_over: 'primary', titled: 'primary', owner_occupied: 'primary',
  tenanted: 'info', under_agreement: 'info', issuing: 'info', sending: 'info', invoiced: 'info', triaged: 'info',
  assigned: 'info', approved: 'info', in_progress: 'info',
  reserved: 'gold', quoted: 'gold',
  partially_failed: 'warning', partially_paid: 'warning', pending: 'warning', pending_payment: 'warning',
  recheck: 'warning', requested: 'warning', reopened: 'warning', high: 'warning', open: 'warning',
  unreconciled: 'warning', scheduled: 'neutral',
  in_default: 'danger', overdue: 'danger', failed: 'danger', rejected: 'danger', terminated: 'danger', emergency: 'danger',
  denied: 'danger',
};

export function ToneBadge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return <Badge variant="outline" className={cn('border-transparent font-semibold', TONE_CLASS[tone], className)}>{children}</Badge>;
}

export function StatusBadge({ status, label }: { status?: string | null; label?: string }) {
  if (!status) return null;
  return <ToneBadge tone={STATUS_TONE[status] ?? 'neutral'}>{label ?? titleCase(status)}</ToneBadge>;
}
