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

/** A role as this estate uses it (GET /roles): its own customised copy replaces the default. */
export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  /** A default role shared by every estate; customise it to change it here. */
  is_system_role: boolean;
  /** Portal roles (owner, occupant, vendor supervisor, guard), never staff. */
  is_customer_role: boolean;
  /** Created by this estate (not a customised default). */
  is_custom: boolean;
  cloned_from_role_id?: string;
  permissions: string[];
  /** Staff holding it. */
  holders: number;
  /** Tenant administrator: always every permission. */
  locked: boolean;
}

/** One entry of the permission catalogue (GET /permissions). */
export interface Permission {
  code: string;
  name: string;
  module: string;
  action: string;
}

export interface ModulesState {
  enabled: string[];
  presets: Record<string, string[]>;
  /** Module code to released flag (a JSON object, from Go map[string]bool). */
  released?: Record<string, boolean>;
  dependencies?: Record<string, string[]>;
}

export type ApprovalModule =
  | 'credit_note' | 'adjustment' | 'manual_payment' | 'work_order_quote'
  | 'restructure' | 'vendor_bill' | 'refund' | 'deposit_deduction' | 'remittance' | 'write_off';

export interface ApprovalStep { sequence: number; name: string; approver_role?: string; permission?: string }

/** An approval rule: a workflow's amount band and its ordered steps (GET /approvals/rules). */
export interface ApprovalRule {
  id: string;
  module: ApprovalModule;
  name: string;
  min_amount: string | number;
  max_amount?: string | number | null;
  steps: ApprovalStep[];
  is_active: boolean;
}

export interface ApprovalRuleInput {
  module: ApprovalModule;
  name: string;
  min_amount: number;
  max_amount?: number | null;
  steps: { name: string; approver_role: string }[];
  is_active: boolean;
}

export interface ApprovalAction extends ApprovalStep {
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  acted_by?: string;
  acted_by_name?: string;
  acted_at?: string;
  comment?: string;
}

/** One object's approval on the central engine (GET /approvals). */
export interface ApprovalRequest {
  id: string;
  module: ApprovalModule;
  object_id: string;
  object_reference: string;
  amount: string | number;
  property_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  current_sequence: number;
  current_approver: string;
  actions: ApprovalAction[];
  submitted_by?: string;
  submitted_by_name?: string;
  decided_at?: string;
  created_at: string;
  metadata?: { label?: string; account_ref?: string; unit_code?: string; account_id?: string; work_order_id?: string; reason?: string };
}
