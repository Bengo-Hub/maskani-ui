import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * A headline figure that links to the records behind it. `progress` (0 to 1) draws a gold bar,
 * used for "collected of billed".
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  detail,
  href,
  progress,
  tone = 'default',
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  href?: string;
  progress?: number | null;
  tone?: 'default' | 'warning' | 'danger';
  loading?: boolean;
}) {
  const body = (
    <div className="flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition-colors group-hover:border-primary/40">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-4 w-4 text-primary" aria-hidden /> {label}
        </span>
        {href && <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <div className={cn('font-display text-2xl font-semibold tabular', tone === 'warning' && 'text-warning', tone === 'danger' && 'text-destructive')}>
          {value}
        </div>
      )}
      {typeof progress === 'number' && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
        </div>
      )}
      {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="group block focus-visible:rounded-xl">
      {body}
    </Link>
  ) : body;
}
