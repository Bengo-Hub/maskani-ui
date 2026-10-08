import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** maskani-api serialises decimals as strings ("6450.00"); null and blanks read as 0. */
export function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

const kesFormatter = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Full KES figure, never rounded to M or k, so parts and totals always add up on screen. */
export function kes(v: string | number | null | undefined): string {
  return kesFormatter.format(num(v));
}

const dateFormatter = new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat('en-KE', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function fmtDate(v?: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : dateFormatter.format(d);
}

export function fmtDateTime(v?: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : dateTimeFormatter.format(d);
}

/** Today as YYYY-MM-DD in local time (for date inputs). Never toISOString, which is UTC. */
export function todayInput(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * A date input value (YYYY-MM-DD) as RFC 3339 at local midnight with the local offset, the format
 * Go's time.Time decodes. Keeps the calendar day the user picked in any time zone.
 */
export function apiDate(day: string): string {
  if (!day) return day;
  const offsetMin = -new Date(`${day}T00:00:00`).getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  return `${day}T00:00:00${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

/** A datetime-local input value as RFC 3339 with the local offset. */
export function apiDateTime(local: string): string {
  if (!local) return local;
  return new Date(local).toISOString();
}

/** Current billing period as YYYY-MM in local time. */
export function currentPeriod(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Shift a YYYY-MM period by whole months (calendar arithmetic, never milliseconds). */
export function shiftPeriod(period: string, months: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 + months, 1);
  return currentPeriod(d);
}

export function periodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return period;
  return new Intl.DateTimeFormat('en-KE', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
}

/** Calendar days from today to a date (negative when past). Truncates to local midnight. */
export function daysUntil(v?: string | null): number | null {
  if (!v) return null;
  const target = new Date(v);
  if (Number.isNaN(target.getTime())) return null;
  const a = new Date();
  const start = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const end = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((end - start) / 86_400_000);
}

export function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function titleCase(v?: string | null): string {
  if (!v) return '';
  return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
