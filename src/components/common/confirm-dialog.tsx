'use client';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Info, Trash2, TriangleAlert, type LucideIcon } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

const ICONS: Record<ConfirmVariant, LucideIcon> = { danger: Trash2, warning: TriangleAlert, info: Info };
const ICON_CLASS: Record<ConfirmVariant, string> = {
  danger: 'bg-destructive/10 text-destructive',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-primary/10 text-primary',
};
const CONFIRM_CLASS: Record<ConfirmVariant, string> = {
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
  info: '',
};

/** Confirmation for destructive or sensitive actions. Never use window.confirm. */
export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm,
  variant = 'info', loading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: ConfirmVariant;
  loading?: boolean;
}) {
  const Icon = ICONS[variant];
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className={ICON_CLASS[variant]}>
            <Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction className={CONFIRM_CLASS[variant]} disabled={loading} onClick={onConfirm}>
            {loading ? 'Working...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
