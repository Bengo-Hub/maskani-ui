import type { Base, Money } from './common';

export type WorkPriority = 'emergency' | 'high' | 'normal' | 'low';
export type WorkStatus =
  | 'requested' | 'triaged' | 'assigned' | 'quoted' | 'approved' | 'in_progress'
  | 'completed' | 'confirmed' | 'reopened' | 'closed' | 'cancelled';
export type WorkAction =
  | 'assign' | 'quote' | 'approve_quote' | 'reject_quote' | 'start' | 'complete' | 'confirm' | 'reopen' | 'cancel' | 'close';

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
  /** Set on a work order booked by the guard as the provider came in (source gate). */
  metadata?: {
    booked_at_gate?: boolean; gate_event_id?: string; provider?: { name?: string; phone?: string };
    /** The ERP staff member's name, kept when the work order was assigned to them. */
    erp_employee_name?: string;
  } | null;
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

/** An ERP staff member as the pickers show it (`GET /erp/employees`); the record stays in ERP. */
export interface ErpEmployee {
  id: string;
  employee_number?: string;
  name: string;
  email?: string;
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
  /** Older documents of a type uploaded again since; kept for the record, they no longer count. */
  replaced_documents?: string[];
  /** Service contracts at the caller's properties (GET /vendors/{id}). */
  contracts?: VendorContract[];
  /** The payable supplier in treasury this vendor is paid as, when linked; its name is in metadata. */
  treasury_vendor_id?: string | null;
  metadata?: { treasury_vendor_name?: string } | null;
}

export type FeeBasis = 'fixed_monthly' | 'per_visit' | 'per_post' | 'rate_card';

/** A vendor's service contract at one property: fee, SLA, service credits and renewal. */
export interface VendorContract extends Base {
  vendor_id: string;
  property_id: string;
  contract_number?: string;
  service_category: string;
  scope?: string;
  fee_basis: FeeBasis;
  fee_amount: Money;
  sla?: { response_hours?: number; resolution_hours?: number; visits_per_month?: number } | null;
  service_credits?: { breach: string; percent: number }[] | null;
  starts_on: string;
  ends_on?: string | null;
  renewal_notice_days?: number;
  auto_renew?: boolean;
  budget_line_code?: string;
  status: 'draft' | 'active' | 'expired' | 'terminated';
}

export interface VendorContractInput {
  property_id: string;
  contract_number?: string;
  service_category: string;
  scope?: string;
  fee_basis: FeeBasis;
  fee_amount: number;
  sla?: { response_hours?: number; resolution_hours?: number; visits_per_month?: number };
  service_credits?: { breach: string; percent: number }[];
  starts_on: string;
  ends_on?: string;
  renewal_notice_days?: number;
  auto_renew?: boolean;
  budget_line_code?: string;
}

export type VisitFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'half_yearly';

/** A visit plan under a contract: which days the vendor comes and what they check. */
export interface ServiceSchedule extends Base {
  contract_id: string;
  property_id: string;
  name: string;
  frequency: VisitFrequency;
  days?: number[];
  time_window?: string;
  zone?: string;
  checklist?: { item: string }[] | null;
  active: boolean;
}

export interface ServiceScheduleInput {
  name: string;
  frequency: VisitFrequency;
  days?: number[];
  time_window?: string;
  zone?: string;
  checklist?: { item: string }[];
  active?: boolean;
}

export type VisitStatus = 'scheduled' | 'completed' | 'partial' | 'missed';

export interface ServiceVisit extends Base {
  schedule_id?: string | null;
  contract_id: string;
  vendor_id: string;
  property_id: string;
  due_at: string;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  status: VisitStatus;
  photos?: string[];
  checklist_result?: { item: string; done?: boolean }[] | null;
}

export type MaintenanceFrequency = 'weekly' | 'monthly' | 'quarterly' | 'half_yearly' | 'annual';

/** A preventive maintenance plan: a work order is raised a week before each due date. */
export interface MaintenanceSchedule extends Base {
  property_id: string;
  asset_ref?: string;
  title: string;
  category: string;
  frequency: MaintenanceFrequency;
  next_due_at: string;
  default_vendor_id?: string | null;
  active: boolean;
}

export interface MaintenanceScheduleInput {
  property_id: string;
  asset_ref?: string;
  title: string;
  category: string;
  frequency: MaintenanceFrequency;
  next_due_at: string;
  default_vendor_id?: string | null;
  active?: boolean;
}

export type VendorInvoiceStatus = 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'paid';

/** A vendor's invoice as issued (amount includes VAT); approved ones become treasury bills. */
export interface VendorInvoice extends Base {
  vendor_id: string;
  contract_id: string;
  property_id: string;
  invoice_number: string;
  etims_number?: string;
  invoice_date: string;
  period_start: string;
  period_end: string;
  amount: Money;
  vat_amount: Money;
  attachments?: string[];
  status: VendorInvoiceStatus;
  decided_at?: string | null;
  paid_at?: string | null;
  metadata?: {
    entered_by_name?: string; decision_note?: string; cancel_reason?: string;
    treasury_bill_number?: string; treasury_bill_status?: string;
  } | null;
}

export interface VendorInvoiceInput {
  contract_id: string;
  invoice_number: string;
  etims_number?: string;
  invoice_date: string;
  period_start: string;
  period_end: string;
  amount: number;
  vat_amount: number;
  attachments?: string[];
}

/** An invoice beside its contract (GET /vendor-invoices/{id}/check). */
export interface VendorInvoiceCheck {
  fee_basis: FeeBasis;
  fee_amount: Money;
  months: number;
  visits: Partial<Record<'scheduled' | 'completed' | 'partial' | 'missed', number>>;
  credit_percent: Money;
  credit_due: Money;
  expected_amount: Money;
  computed: boolean;
  invoiced: Money;
  difference: Money;
}

/** A payable supplier in treasury, for linking a vendor (GET /vendors/treasury-lookup). */
export interface TreasurySupplier {
  vendor_id?: string;
  vendor_name: string;
  balance_owed?: Money;
  currency?: string;
}
