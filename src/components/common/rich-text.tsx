'use client';

import { useMemo } from 'react';
import { RichTextEditor } from '@bengo-hub/shared-ui-lib/rich-text-editor';
import { cn } from '@/lib/utils';

/**
 * Long text fields (descriptions, notes, notice messages) use the shared Tiptap editor. The API
 * sanitises what it stores (maskani-api internal/shared/richtext) and sends plain text to
 * WhatsApp; RichTextView renders it back.
 */
export function RichTextField({ id, value, onChange, placeholder, disabled, className }: {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <RichTextEditor
      id={id}
      value={value}
      onChange={(html) => onChange(html === '<p></p>' ? '' : html)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn('min-h-32', className)}
    />
  );
}

const ALLOWED = new Set(['P', 'BR', 'H2', 'H3', 'STRONG', 'B', 'EM', 'I', 'S', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'CODE', 'PRE', 'A']);

/** Keeps only the editor's own tags and safe links (defence in depth over the API's sanitiser). */
function clean(html: string): string {
  if (typeof window === 'undefined' || !/<[a-z/][^>]*>/i.test(html)) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      if (!ALLOWED.has(child.tagName)) {
        child.replaceWith(...Array.from(child.childNodes));
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const keep = child.tagName === 'A' && attr.name === 'href' && /^(https?:|mailto:|tel:)/i.test(attr.value);
        if (!keep) child.removeAttribute(attr.name);
      }
      if (child.tagName === 'A') {
        child.setAttribute('target', '_blank');
        child.setAttribute('rel', 'noopener noreferrer nofollow');
      }
      walk(child);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

/** One-line preview of stored long text (lists, table cells): tags dropped, entities decoded. */
export function toPlainText(value?: string | null): string {
  if (!value) return '';
  const spaced = value.replace(/<\/(p|h2|h3|li|blockquote|pre)>|<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '');
  const decoded = spaced.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return decoded.replace(/\s+/g, ' ').trim();
}

/** Shows stored long text: formatted when it came from the editor, as plain paragraphs otherwise. */
export function RichTextView({ value, className }: { value?: string | null; className?: string }) {
  const html = useMemo(() => (value ? clean(value) : ''), [value]);
  if (!value) return null;
  if (!html) return <p className={cn('whitespace-pre-line text-sm leading-relaxed', className)}>{value}</p>;
  return (
    <div
      className={cn(
        'text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
        '[&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-1.5 [&_ul]:list-disc',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
