import type { Base } from './common';

export interface Notice extends Base {
  property_id?: string | null;
  audience?: Record<string, unknown>;
  channels: string[];
  category?: string;
  priority: 'routine' | 'emergency';
  title: string;
  body: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduled_at?: string | null;
  sent_at?: string | null;
}

export interface NoticeDelivery {
  id: string;
  party_id?: string;
  recipient?: string;
  channel: string;
  status: string;
  error?: string;
  updated_at?: string;
}
