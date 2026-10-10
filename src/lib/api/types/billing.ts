import type { Base, Money } from './common';
import type { Unit } from './register';

export interface Fund extends Base {
  /** Billing runs and charge types reference the fund by this code (for example "estate"). */
  code?: string;
  /** estate, sales, deposits, client_rent, reserve, other. */
  kind?: string;
  name: string;
  paybill_shortcode?: string;
  account_prefix?: string;
  treasury_bank_account_id?: string;
  cost_center_code?: string;
}

export interface ChargeRate extends Base {
  charge_type_id?: string;
  scope: 'tenant' | 'property' | 'unit_type' | 'unit';
  property_id?: string | null;
  unit_type?: string | null;
  unit_id?: string | null;
  amount?: Money;
  tariff?: { from: number; to?: number | null; rate: number }[] | null;
  fixed_meter_charge?: Money;
  effective_from: string;
  notes?: string;
}

export type ChargeBasis = 'fixed' | 'per_unit_type' | 'per_sqm' | 'entitlement' | 'metered' | 'percentage' | 'one_off';

export interface ChargeType extends Base {
  code: string;
  name: string;
  description?: string;
  charge_group: string;
  basis: ChargeBasis;
  frequency?: string;
  bill_to?: string;
  fund_code?: string;
  vat_rate?: number;
  tax_exempt?: boolean;
  proration?: string;
  tariff_kind?: 'flat' | 'block';
  allocation_priority?: number;
  seeded_from?: string;
  active: boolean;
  rates?: ChargeRate[];
}

export interface UnitAccount extends Base {
  unit_id: string;
  fund_id: string;
  account_ref: string;
  primary_party_id?: string | null;
  customer_name?: string;
  customer_phone?: string;
  balance: Money;
  opening_balance?: Money;
  balance_synced_at?: string | null;
  last_payment_at?: string | null;
  status?: string;
  edges?: { fund?: Fund; unit?: Unit };
}

export interface LedgerInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  total_amount: Money;
  amount_paid: Money;
  payment_status: string;
  public_token?: string;
  description?: string;
}

export interface LedgerPayment {
  id: string;
  amount: Money;
  method?: string;
  reference?: string;
  paid_at: string;
  unapplied?: Money;
}

/** One bill or payment of a statement, with the balance after it (worked out by the API). */
export interface StatementEntry {
  kind: 'bill' | 'payment';
  date: string;
  label: string;
  reference?: string;
  debit: Money;
  credit: Money;
  status?: string;
  balance_after: Money;
}

export interface Statement {
  account: UnitAccount;
  /** Newest first. */
  entries: StatementEntry[];
  /** Treasury's list was full, so older history exists beyond these entries. */
  trimmed: boolean;
  ledger: {
    account_ref: string;
    balance: Money;
    total_billed: Money;
    total_paid: Money;
    credit?: Money;
    last_paid_at?: string | null;
    invoices: LedgerInvoice[];
    payments: LedgerPayment[];
  } | null;
}

export interface PreviewLine {
  unit_id: string;
  unit_code: string;
  unit_account_id?: string;
  account_ref?: string;
  customer_name?: string;
  party_id?: string;
  lines: { charge_code: string; description: string; quantity?: Money; rate?: Money; amount: Money; tax_rate?: number; tax?: Money }[];
  subtotal: Money;
  tax: Money;
  total: Money;
  skip_reason?: string;
}

export interface BillingPreview {
  property_id: string;
  fund: string;
  period: string;
  units: number;
  billable: number;
  skipped: number;
  total: Money;
  lines: PreviewLine[];
}

export type RunStatus = 'draft' | 'issuing' | 'issued' | 'partially_failed' | 'cancelled';

export interface BillingRun extends Base {
  property_id: string;
  fund_id: string;
  period: string;
  run_kind?: 'regular' | 'adhoc';
  status: RunStatus;
  invoice_date?: string;
  due_date?: string;
  unit_count?: number;
  line_count?: number;
  total_amount?: Money;
  issued_count?: number;
  failed_count?: number;
  skipped_count?: number;
  issued_at?: string | null;
  error?: string;
}

export interface BillingRunLine extends Base {
  run_id: string;
  unit_id: string;
  unit_account_id: string;
  party_id?: string | null;
  unit_code: string;
  lines?: PreviewLine['lines'];
  subtotal?: Money;
  tax_total?: Money;
  total: Money;
  status: 'pending' | 'issued' | 'failed' | 'skipped';
  skip_reason?: string;
  treasury_invoice_id?: string | null;
  invoice_number?: string;
  attempts?: number;
  last_error?: string;
}

export interface SuspenseRow {
  trans_id: string;
  business_shortcode: string;
  amount: Money;
  bill_ref_number: string;
  msisdn?: string;
  payer_name?: string;
  trans_time: string;
  status: string;
  created_at?: string;
}

export interface ArrearsRow {
  account_id: string;
  account_ref: string;
  customer_name?: string;
  customer_phone?: string;
  balance: Money;
  last_payment_at?: string | null;
}

export interface PayRequest {
  amount?: number;
  payment_method?: string;
  phone?: string;
  gateway?: string;
  email?: string;
  callback_url?: string;
  idempotency_key?: string;
}

export interface PayIntent {
  intent_id: string;
  status: string;
  payment_method?: string;
  amount: Money | number;
  currency?: string;
  checkout_request_id?: string;
  authorization_url?: string;
  instructions?: string;
}

/** A property's billing schedule and where its next scheduled run stands (GET /billing-schedule). */
export type ScheduleStage = 'off' | 'scheduled' | 'collecting_readings' | 'waiting_for_readings' | 'ready_to_run' | 'due' | 'issued';

export interface MissingReading {
  meter_id: string;
  serial: string;
  unit_id?: string;
  unit_code?: string;
}

export interface BillingSchedule {
  enabled: boolean;
  fund: string;
  /** auto: the run starts on the billing day; remind: finance is told it is ready. */
  mode: 'auto' | 'remind';
  /** wait: hold the run for missing readings; skip: run without them. */
  missing_readings: 'wait' | 'skip';
  remind_days_before: number;
  approved?: Record<string, string>;
  sent?: Record<string, string>;
  billing_day: number;
  /** The month the next scheduled run bills (YYYY-MM). */
  period: string;
  billing_date: string;
  stage: ScheduleStage;
  metered: boolean;
  missing_count: number;
  missing: MissingReading[];
  run_id?: string;
  run_status?: string;
  approved_by?: string;
}

export interface BillingScheduleInput {
  property_id: string;
  enabled?: boolean;
  fund?: string;
  mode?: 'auto' | 'remind';
  missing_readings?: 'wait' | 'skip';
  remind_days_before?: number;
}

/** A collections call or contact recorded on an account. */
export interface CollectionNote {
  at: string;
  by?: string;
  outcome: 'reached' | 'no_answer' | 'promised' | 'disputed' | 'wrong_number' | 'paid';
  promise_date?: string;
  text?: string;
}

/** An account's place on the collections ladder (GET /unit-accounts/{id}/collections). */
export interface CollectionLadder {
  /** The oldest unpaid due date the steps count from. */
  episode?: string;
  /** Ladder days already done (1, 7, 14, 30...). */
  done?: number[];
  last_day?: string;
  call_list?: boolean;
  promise_date?: string;
  notes?: CollectionNote[];
}

/** One account on the collections call list. */
export interface CallRow {
  account_id: string;
  account_ref: string;
  customer_name: string;
  customer_phone: string;
  unit_code: string;
  property_id: string;
  balance: Money;
  last_payment_at?: string;
  oldest_due: string;
  promise_date?: string;
  last_note?: CollectionNote;
}
