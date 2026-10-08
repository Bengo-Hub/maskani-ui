import { ToneBadge } from '@/components/common/status-badge';
import type { Vendor } from '@/lib/api/types';
import { daysUntil } from '@/lib/utils';

/** Vendor compliance at a glance: expired documents, or the next expiry within 30 days. */
export function ExpiryBadge({ vendor }: { vendor: Pick<Vendor, 'next_expiry' | 'expired_documents'> }) {
  if ((vendor.expired_documents ?? 0) > 0) return <ToneBadge tone="danger">{vendor.expired_documents} expired</ToneBadge>;
  const d = daysUntil(vendor.next_expiry);
  if (d !== null && d <= 30) return <ToneBadge tone="warning">Expires in {d} days</ToneBadge>;
  return <ToneBadge tone="success">Documents valid</ToneBadge>;
}
