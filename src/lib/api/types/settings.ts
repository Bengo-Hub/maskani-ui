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

/** Who approves a credit in an amount band (GET /settings/approval-rules). */
export interface ApprovalRule {
  id: string;
  action: 'credit_note' | 'adjustment';
  min_amount: string | number;
  max_amount?: string | number | null;
  levels: number;
  approver_roles?: string[];
  active: boolean;
}

export interface ApprovalRuleInput {
  action: ApprovalRule['action'];
  min_amount: number;
  max_amount?: number | null;
  levels: number;
  approver_roles: string[];
  active: boolean;
}
