import type { UnitAccount } from './billing';
import type { Base, Money } from './common';

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
  /** Gallery media keys in order; the first is the cover. */
  photos?: string[];
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
  /** Gallery media keys in order; the first is the cover. */
  photos?: string[];
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
