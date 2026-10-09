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
  /** Staff: property id to its modules, for properties whose use case or switches narrow `modules`. */
  property_modules?: Record<string, string[]>;
  user?: MaskaniUser;
  settings?: Record<string, unknown>;
  /** Portal users: the terms version they accepted ("" when not yet), checked against the estate's. */
  terms_accepted_version?: string;
}
