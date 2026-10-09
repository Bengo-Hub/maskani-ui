'use client';

import { useState, type ReactNode } from 'react';
import { BarChart3, Table2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * A chart with a table view of the same figures, for screen readers, print and anyone who wants
 * the exact numbers. The view toggle sits in the card header.
 */
export function ChartCard({ title, description, chart, table, footer, className }: {
  title: string;
  description?: ReactNode;
  chart: ReactNode;
  table: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const btn = (v: 'chart' | 'table', Icon: typeof BarChart3, label: string) => (
    <button
      type="button"
      onClick={() => setView(v)}
      aria-pressed={view === v}
      aria-label={label}
      title={label}
      className={cn('grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted', view === v && 'bg-muted text-foreground')}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription className="mt-1">{description}</CardDescription>}
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-lg border p-0.5">
          {btn('chart', BarChart3, 'Show as chart')}
          {btn('table', Table2, 'Show as table')}
        </div>
      </CardHeader>
      <CardContent>
        {view === 'chart' ? chart : <div className="max-h-80 overflow-auto">{table}</div>}
        {footer && <div className="mt-3 text-xs text-muted-foreground">{footer}</div>}
      </CardContent>
    </Card>
  );
}

/** A plain figures table used by the chart cards' table view. Amounts right aligned. */
export function FiguresTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground">
          {head.map((h, i) => <th key={h} className={cn('py-2 font-medium', i > 0 && 'text-right')}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={String(r[0])} className="border-b last:border-0">
            {r.map((c, i) => <td key={i} className={cn('py-2', i > 0 && 'text-right tabular')}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
