import type { Base, Money } from './common';
import type { Unit } from './register';

export interface PriceListItem {
  unit_type?: string;
  unit_id?: string;
  price: Money;
  reservation_fee?: Money;
  deposit_pct?: Money;
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

export interface AvailabilityUnit extends Unit {
  price?: Money | null;
  reservation_fee?: Money | null;
  deposit_pct?: Money | null;
  price_list_item_id?: string | null;
}

export interface Reservation extends Base {
  unit_id: string;
  party_id: string;
  status: 'pending_payment' | 'active' | 'converted' | 'expired' | 'cancelled';
  fee?: Money;
  expires_at?: string;
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
