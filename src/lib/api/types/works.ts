import type { Base, Money } from './common';

export type WorkPriority = 'emergency' | 'high' | 'normal' | 'low';
export type WorkStatus =
  | 'requested' | 'triaged' | 'assigned' | 'quoted' | 'approved' | 'in_progress'
  | 'completed' | 'confirmed' | 'reopened' | 'closed' | 'cancelled';
export type WorkAction =
  | 'assign' | 'quote' | 'approve_quote' | 'start' | 'complete' | 'confirm' | 'reopen' | 'cancel' | 'close';

export interface WorkOrderEvent {
  id: string;
  kind: string;
  from_status?: string;
  to_status?: string;
  note?: string;
  actor_kind?: string;
  created_at: string;
}

export interface WorkOrder extends Base {
  number: string;
  property_id: string;
  unit_id?: string | null;
  area?: string;
  category: string;
  priority: WorkPriority;
  title: string;
  description?: string;
  source?: 'resident' | 'staff' | 'schedule' | 'inspection' | 'gate';
  assignee_kind?: 'vendor' | 'staff' | 'none';
  vendor_id?: string | null;
  erp_employee_id?: string;
  assigned_user_id?: string | null;
  response_due_at?: string | null;
  resolution_due_at?: string | null;
  responded_at?: string | null;
  completed_at?: string | null;
  confirmed_at?: string | null;
  reopened_count?: number;
  sla_breached?: boolean;
  quote_amount?: Money | null;
  quote_status?: 'none' | 'pending' | 'approved' | 'rejected';
  cost_amount?: Money;
  recharge?: boolean;
  photos_before?: string[];
  photos_after?: string[];
  minutes_on_site?: number;
  status: WorkStatus;
  edges?: { events?: WorkOrderEvent[] };
}

export interface VendorDocument extends Base {
  vendor_id: string;
  doc_type: string;
  number?: string;
  issued_at?: string | null;
  expires_at?: string | null;
  file_key?: string;
}

export interface VendorPersonnel extends Base {
  vendor_id: string;
  full_name: string;
  badge_number?: string;
  phone?: string;
  role?: string;
  status?: string;
  property_ids?: string[];
  has_pin?: boolean;
}

export interface Vendor extends Base {
  name: string;
  categories?: string[];
  registration_number?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  status?: string;
  documents?: VendorDocument[];
  personnel?: VendorPersonnel[];
  next_expiry?: string | null;
  expired_documents?: number;
}
