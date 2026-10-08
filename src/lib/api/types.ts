// Shapes returned by maskani-api. Decimals arrive as strings; Ent relations sit under `edges`.

export type Money = string;

export interface Page<T> {
  data: T[];
  next_cursor?: string;
  has_more?: boolean;
}

export interface Base {
  id: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown> | null;
  custom_fields?: Record<string, unknown> | null;
}

// ---- identity -------------------------------------------------------------

export interface MaskaniUser {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  kind?: string;
}

export interface MaskaniMe {
  id: string;
  email?: string;
  tenant_id: string;
  tenant_slug: string;
  roles: string[];
  permissions: string[];
  is_platform_owner?: boolean;
  /** True when the API skips module, permission and property checks for this caller. */
  bypass?: boolean;
  all_properties?: boolean;
  property_ids?: string[] | null;
  party_ids?: string[] | null;
  is_staff?: boolean;
  is_portal_user?: boolean;
  modules: string[];
  user?: MaskaniUser;
  settings?: Record<string, unknown>;
}

// ---- register -------------------------------------------------------------

export interface Block extends Base {
  property_id: string;
  code: string;
  name?: string;
  phase?: string;
  floors?: number;
  sort?: number;
}

export interface Property extends Base {
  code: string;
  name: string;
  property_type?: string;
  use_case?: string;
  description?: string;
  address?: string;
  area?: string;
  town?: string;
  county?: string;
  latitude?: number | null;
  longitude?: number | null;
  amenities?: string[];
  phases?: string[];
  published?: boolean;
  public_slug?: string;
  status?: string;
  outlet_id?: string;
  unit_count?: number;
  occupied_count?: number;
  sold_count?: number;
  edges?: { blocks?: Block[] };
}

export type SaleStatus =
  | 'not_for_sale' | 'available' | 'reserved' | 'under_agreement' | 'fully_paid'
  | 'handed_over' | 'titled' | 'in_default';
export type OccupancyStatus = 'vacant' | 'owner_occupied' | 'tenanted' | 'under_renovation' | 'coming_vacant';

export interface Unit extends Base {
  property_id: string;
  block_id?: string | null;
  code: string;
  unit_type?: string;
  use?: string;
  bedrooms?: number;
  bathrooms?: number;
  size_sqm?: Money | number | null;
  floor?: number | null;
  entitlement?: Money | number | null;
  parking_bays?: number;
  phase?: string;
  sale_status?: SaleStatus;
  occupancy_status?: OccupancyStatus;
  walking_order?: number;
  status?: string;
  account_ref?: string;
  owner_name?: string;
  balance?: Money;
  parties?: UnitPartyView[];
  accounts?: UnitAccount[];
  edges?: { block?: Block; property?: Property };
}

export type PartyRole =
  | 'owner' | 'joint_owner' | 'buyer' | 'occupant' | 'household_member'
  | 'domestic_staff' | 'emergency_contact' | 'landlord';

export interface Party extends Base {
  kind: 'person' | 'company';
  display_name?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone?: string;
  alt_phone?: string;
  email?: string;
  national_id_masked?: string;
  kra_pin_masked?: string;
  is_diaspora?: boolean;
  preferred_channel?: string;
  auth_user_id?: string | null;
  units?: { unit_id: string; unit_code: string; role: PartyRole; start_date?: string; end_date?: string | null }[];
}

export interface UnitParty extends Base {
  unit_id: string;
  party_id: string;
  role: PartyRole;
  ownership_share?: Money | number | null;
  is_primary?: boolean;
  start_date?: string;
  end_date?: string | null;
  bill_to?: string[];
  edges?: { party?: Party; unit?: Unit };
}

export type UnitPartyView = UnitParty;

// ---- billing --------------------------------------------------------------

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

export interface Statement {
  account: UnitAccount;
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

// ---- utilities ------------------------------------------------------------

export interface Meter extends Base {
  property_id: string;
  unit_id?: string | null;
  kind: 'unit' | 'bulk_supply' | 'borehole' | 'common_area';
  utility?: string;
  serial: string;
  make?: string;
  location_note?: string;
  initial_reading?: Money;
  walking_order?: number;
}

export type ReadingFlag = 'lower_than_previous' | 'zero_occupied' | 'spike';

export interface MeterReading extends Base {
  meter_id: string;
  period: string;
  reading: Money;
  consumption?: Money;
  photo_key?: string;
  photo_url?: string;
  flags?: ReadingFlag[];
  status: 'pending' | 'accepted' | 'recheck' | 'rejected';
  estimated?: boolean;
  read_at?: string;
}

export interface RoundRow {
  meter_id: string;
  serial: string;
  kind: string;
  unit_id?: string | null;
  unit_code?: string;
  block?: string;
  previous_reading?: Money | null;
  current?: MeterReading | null;
}

export interface ReadingRound extends Base {
  property_id: string;
  period: string;
  status?: string;
  rows: RoundRow[];
  read: number;
  total: number;
}

export interface WaterBalanceRow {
  period: string;
  supplied_m3: Money;
  billed_m3: Money;
  common_m3: Money;
  unaccounted_m3: Money;
  loss_pct: Money | null;
  estimated_readings?: number;
}

// ---- sales ----------------------------------------------------------------

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

// ---- works and vendors ----------------------------------------------------

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

// ---- gate -----------------------------------------------------------------

export type PassType = 'guest_single' | 'guest_recurring' | 'domestic_staff' | 'delivery' | 'contractor' | 'agency';

export interface VisitorPass extends Base {
  property_id: string;
  unit_id?: string | null;
  pass_type: PassType;
  visitor_name: string;
  visitor_phone?: string;
  vehicle_plate?: string;
  valid_from: string;
  valid_to: string;
  max_entries?: number;
  entries_used?: number;
  status?: string;
  unit_code?: string;
  code?: string;
  qr_token?: string;
}

export interface PassInput {
  property_id: string;
  unit_id?: string;
  pass_type: PassType;
  visitor_name: string;
  visitor_phone?: string;
  vehicle_plate?: string;
  valid_from: string;
  valid_to: string;
  max_entries?: number;
  notes?: string;
}

export type GateEventKind = 'entry' | 'exit' | 'denied' | 'walk_in_request';

export interface GateEvent extends Base {
  client_event_id?: string;
  kind: GateEventKind;
  pass_id?: string | null;
  visitor_name?: string;
  visitor_phone?: string;
  host_unit_id?: string | null;
  host_unit_code?: string;
  vehicle_plate?: string;
  occurred_at: string;
  offline?: boolean;
  status?: string;
  notes?: string;
}

export interface Incident extends Base {
  property_id: string;
  unit_id?: string | null;
  category: string;
  severity: string;
  title: string;
  description?: string;
  occurred_at: string;
  status?: string;
  photos?: string[];
}

export interface GateDevice extends Base {
  name: string;
  gate_name?: string;
  property_id: string;
  last_seen_at?: string | null;
}

// ---- notices --------------------------------------------------------------

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

// ---- reports --------------------------------------------------------------

export interface Dashboard {
  period: string;
  billed: Money;
  collected: Money;
  collection_rate?: Money | number | null;
  outstanding: Money;
  accounts_owing: number;
  arrears_60_accounts: number;
  arrears_60_amount: Money;
  open_work_orders: number;
  past_sla: number;
  water_loss_pct?: Money | number | null;
  vendors_due_for_renewal: number;
  units: number;
  occupied: number;
  units_sold: number;
  sales_value?: Money;
  sales_collected?: Money;
  collections_by_week?: { week_start: string; billed: Money; collected: Money }[];
  arrears_ageing?: { bucket: string; accounts: number; amount: Money }[];
}

export interface SalesPosition {
  by_status: Record<string, number>;
  contract_value: Money;
  collected: Money;
  balance: Money;
}

// ---- settings -------------------------------------------------------------

export interface CatalogEntry {
  id?: string;
  tenant_id?: string | null;
  kind: string;
  code: string;
  name: string;
  description?: string;
  parent_code?: string;
  sort?: number;
  active?: boolean;
  attrs?: Record<string, unknown>;
}

/** Local maskani user row (`MaskaniUser`) with role codes. */
export interface StaffUser {
  id: string;
  auth_service_user_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  kind?: 'staff' | 'customer' | 'vendor_supervisor' | 'guard';
  status?: string;
  roles?: string[];
}

export type PropertyRole = 'property_manager' | 'caretaker' | 'finance' | 'sales' | 'letting' | 'security' | 'other';

/** Staff assignment to a property's outlet (`MaskaniUserOutlet`). */
export interface StaffAssignment {
  id: string;
  user_id: string;
  outlet_id: string;
  is_home_outlet?: boolean;
  property_role: PropertyRole;
  erp_employee_id?: string;
  assigned_at?: string;
}

export interface Role {
  id: string;
  tenant_id?: string | null;
  role_code: string;
  name: string;
  description?: string;
  is_system_role?: boolean;
  is_customer_role?: boolean;
  edges?: { permissions?: { permission_code: string; name: string; module: string }[] };
}

export interface ModulesState {
  enabled: string[];
  presets: Record<string, string[]>;
  /** Module code to released flag (a JSON object, from Go map[string]bool). */
  released?: Record<string, boolean>;
  dependencies?: Record<string, string[]>;
}

// ---- portal ---------------------------------------------------------------

export interface PortalUnit {
  link: UnitParty;
  unit: Unit;
  property: Property;
  /** Each account carries its fund (name, paybill) under edges.fund. */
  accounts: UnitAccount[];
}

export interface MediaUpload {
  key: string;
  url: string;
}
