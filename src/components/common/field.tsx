'use client';

import * as React from 'react';
import { SearchableCombobox, type ComboboxOption } from '@bengo-hub/shared-ui-lib/combobox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** Label, control and an optional hint or error, stacked. Every form field uses this. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-destructive" aria-hidden>*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

type OptionEl = React.ReactElement<{ value?: string | number; children?: React.ReactNode; disabled?: boolean }>;

/** Plain text of an option's children (options are usually strings, sometimes small fragments). */
function textOf(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

export interface SelectProps {
  value?: string | number | readonly string[];
  /** Starting value when the parent does not control `value`. */
  defaultValue?: string | number | readonly string[];
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children?: React.ReactNode;
  id?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
  /** Search box placeholder; the list is always searchable. */
  searchPlaceholder?: string;
}

/**
 * The app's dropdown: the shared-ui-lib SearchableCombobox (searchable, keyboard friendly, the same
 * control in every Codevertex app) behind the `<select>`-style API every form already uses:
 * `<option>` children, `value`, and `onChange(e)` reading `e.target.value`. A first option with an
 * empty value becomes the placeholder and makes the field clearable. For lists the estate edits
 * (unit types, categories) use CatalogueCombobox, which can also add entries.
 */
export function NativeSelect({ value, defaultValue, onChange, children, id, className, disabled, searchPlaceholder, ...rest }: SelectProps) {
  const [own, setOwn] = React.useState(defaultValue == null ? '' : String(defaultValue));
  const controlled = value !== undefined;
  const options: ComboboxOption[] = [];
  let placeholder = 'Choose...';
  let clearable = false;
  for (const child of React.Children.toArray(children)) {
    if (!React.isValidElement(child)) continue;
    const o = child as OptionEl;
    if (o.props.disabled) continue;
    const v = o.props.value != null ? String(o.props.value) : textOf(o.props.children);
    const label = textOf(o.props.children) || v;
    if (v === '') {
      placeholder = label;
      clearable = true;
      continue;
    }
    options.push({ value: v, label });
  }
  const current = controlled ? (value == null ? '' : String(value)) : own;
  const emit = (v: string) => {
    if (!controlled) setOwn(v);
    // Shaped like a change event so existing `(e) => set(e.target.value)` handlers keep working.
    const target = { value: v } as HTMLSelectElement;
    onChange?.({ target, currentTarget: target } as React.ChangeEvent<HTMLSelectElement>);
  };
  return (
    <div id={id} data-slot="select" role="group" aria-label={rest['aria-label']} className={cn('min-w-0', className)}>
      <SearchableCombobox
        options={options}
        value={current}
        onChange={(v) => emit(v)}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder ?? 'Search'}
        clearable={clearable}
        disabled={disabled}
      />
    </div>
  );
}
