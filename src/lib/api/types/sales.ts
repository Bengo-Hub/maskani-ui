import type { Base, Money } from './common';
import type { SaleStatus } from './register';

export interface PriceListItem {
  unit_type?: string;
  unit_id?: string;
  price: Money;
  reservation_fee?: Money;
  deposit_pct?: Money;
  max_term_months?: number;
}

/** One line of a new price list (POST /price-lists): numbers, not decimal strings. */
export interface PriceItemInput {
  unit_type?: string;
  unit_id?: string;
  price: number;
  reservation_fee?: number;
  deposit_pct?: number;
  max_term_months?: number;
}

export interface PriceList extends Base {
  property_id: string;
  name: string;
  phase?: string;
  effective_from: string;
  status?: string;
  items?: PriceListItem[];
  edges?: { items?: PriceListItem[] };
}

/** One tile of the availability board (GET /availability): only what the tile and its sheet show. */
export interface AvailabilityUnit {
  id: string;
  code: string;
  unit_type?: string;
  bedrooms?: number;
  size_sqm?: Money | null;
  phase?: string;
  sale_status: SaleStatus;
  price?: Money | null;
  reservation_fee?: Money | null;
  deposit_pct?: Money | number | null;
  price_list_item_id?: string | null;
}

/** A block of the board (or a phase when units have no block), grouped and ordered by the API. */
export interface AvailabilityGroup {
  name: string;
  available: number;
  units: AvailabilityUnit[];
}

export interface Reservation extends Base {
  unit_id: string;
  party_id: string;
  status: 'pending_payment' | 'active' | 'converted' | 'expired' | 'cancelled';
  price?: Money;
  fee_amount?: Money;
  fee_paid_at?: string | null;
  reserved_at?: string;
  expires_at?: string;
  sale_contract_id?: string | null;
  /** List view (GET /reservations). */
  unit_code?: string;
  property_id?: string;
  buyer_name?: string;
}

export type ContractStatus =
  | 'draft' | 'active' | 'fully_paid' | 'handed_over' | 'titled' | 'in_default' | 'terminated' | 'cancelled';

export interface Instalment extends Base {
  contract_id: string;
  schedule_id?: string;
  kind: 'reservation' | 'deposit' | 'instalment' | 'milestone' | 'balance' | 'financier';
  milestone_label?: string;
  seq: number;
  due_date: string;
  amount: Money;
  paid_amount?: Money;
  paid_at?: string | null;
  status: 'scheduled' | 'invoiced' | 'partially_paid' | 'paid' | 'overdue' | 'waived';
  treasury_invoice_id?: string | null;
  invoice_number?: string;
}

export interface SaleContract extends Base {
  contract_number: string;
  property_id: string;
  unit_id: string;
  primary_buyer_id: string;
  reservation_id?: string | null;
  price: Money;
  discount?: Money;
  discount_reason?: string;
  net_price: Money;
  reservation_credit?: Money;
  deposit_amount?: Money;
  payment_option: 'outright' | 'instalments' | 'milestone' | 'financed';
  frequency?: string;
  term_months?: number;
  status: ContractStatus;
  signed_at?: string | null;
  invoiced_total?: Money;
  paid_total?: Money;
  unit_account_id?: string | null;
  /** Detail view only (GET /sale-contracts/{id}, /me/purchase). */
  instalments?: Instalment[];
  next_due?: Instalment | null;
  balance?: Money;
  /** An approved new plan waiting for the buyer to accept. */
  pending_plan?: PlanVersion | null;
  /** The unit's handover once booked. */
  handover?: Handover | null;
}

/** One version of a contract's payment plan (GET /sale-contracts/{id}/schedules). */
export interface PlanVersion extends Base {
  contract_id: string;
  version: number;
  status: 'proposed' | 'active' | 'superseded' | 'rejected';
  reason?: string;
  approved_at?: string | null;
  buyer_accepted_at?: string | null;
  metadata?: {
    proposed_by_name?: string;
    replaces_version?: number;
    accepted_via?: 'code' | 'portal';
    code_sent_at?: string;
    [k: string]: unknown;
  };
  instalments: Instalment[];
  total: Money;
}

export interface RestructureInput {
  reason: string;
  option: 'instalments' | 'outright';
  frequency?: 'monthly' | 'quarterly';
  term_months?: number;
  /** YYYY-MM-DD */
  first_due: string;
}

export interface Snag {
  id?: string;
  description: string;
  location?: string;
  photos?: string[];
  status: 'open' | 'fixed';
  fixed_at?: string;
}

export interface ChecklistItem { item: string; ok: boolean; note?: string }
export interface HandoverKey { label: string; count: number }

export interface Handover extends Base {
  contract_id: string;
  unit_id: string;
  scheduled_at?: string | null;
  completed_at?: string | null;
  keys?: HandoverKey[];
  readings?: { meter_id: string; reading: Money; serial?: string }[];
  checklist?: ChecklistItem[];
  snag_items?: Snag[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface HandoverInput {
  scheduled_at?: string;
  keys?: HandoverKey[];
  checklist?: ChecklistItem[];
  snags?: Snag[];
}

export type TitleStageStatus = 'pending' | 'in_progress' | 'done' | 'blocked';

export interface TitleStage {
  code: string;
  name: string;
  status: TitleStageStatus;
  stage_date?: string | null;
  reference?: string;
  document_id?: string | null;
  notes?: string;
}

export interface TitleStageInput {
  status: TitleStageStatus;
  stage_date?: string;
  reference?: string;
  /** Sent back unchanged so saving a stage never drops its document. */
  document_id?: string | null;
  notes?: string;
}

export interface ContractInput {
  unit_id: string;
  buyer_id: string;
  buyers?: { party_id: string; share?: number }[];
  reservation_id?: string;
  price: number;
  discount?: number;
  discount_reason?: string;
  deposit_amount?: number;
  payment_option: SaleContract['payment_option'];
  frequency?: string;
  term_months?: number;
  interest_rate?: number;
  grace_days?: number;
  milestones?: { label: string; pct: number }[];
  financier?: Record<string, unknown>;
  buyer_advocate?: { name?: string; firm?: string; phone?: string };
  seller_advocate?: { name?: string; firm?: string; phone?: string };
  notes?: string;
}
