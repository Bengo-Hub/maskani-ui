/** Display labels for API enum values, in one place so every screen words them the same way. */

export const CHARGE_BASIS: Record<string, string> = {
  fixed: 'Fixed per unit',
  per_unit_type: 'By unit type',
  per_sqm: 'Per m2',
  entitlement: 'By entitlement',
  metered: 'Metered',
  percentage: 'Percentage',
  one_off: 'One off',
};

export const CHARGE_GROUP: Record<string, string> = {
  occupancy: 'Occupancy',
  services: 'Services',
  utilities: 'Utilities',
  reserves: 'Reserves',
  amenities: 'Amenities',
  recoveries: 'Recoveries',
  sales: 'Sales',
};

export const CHARGE_FREQUENCY: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Every six months',
  annual: 'Yearly',
  on_event: 'On an event',
  one_off: 'One off',
};

export const BILL_TO: Record<string, string> = {
  owner: 'Owner',
  occupant: 'Occupant',
  buyer: 'Buyer',
};

export const RATE_SCOPE: Record<string, string> = {
  tenant: 'All units',
  property: 'One property',
  unit_type: 'One unit type',
  unit: 'One unit',
};

export const SALE_STATUS: Record<string, string> = {
  not_for_sale: 'Not for sale',
  available: 'Available',
  reserved: 'Reserved',
  under_agreement: 'Under agreement',
  fully_paid: 'Fully paid',
  handed_over: 'Handed over',
  titled: 'Title issued',
  in_default: 'In default',
};

export const OCCUPANCY_STATUS: Record<string, string> = {
  vacant: 'Vacant',
  owner_occupied: 'Owner occupied',
  tenanted: 'Tenanted',
  under_renovation: 'Under renovation',
  coming_vacant: 'Coming vacant',
};

export const PARTY_ROLE: Record<string, string> = {
  owner: 'Owner',
  joint_owner: 'Joint owner',
  buyer: 'Buyer',
  occupant: 'Occupant',
  household_member: 'Household member',
  domestic_staff: 'Domestic staff',
  emergency_contact: 'Emergency contact',
  landlord: 'Landlord',
};

export const UNIT_USE: Record<string, string> = {
  residential: 'Residential', office: 'Office', retail: 'Retail', industrial: 'Industrial',
  parking: 'Parking', land: 'Land', storage: 'Storage', other: 'Other',
};

export const WORK_STATUS: Record<string, string> = {
  requested: 'Requested', triaged: 'Triaged', assigned: 'Assigned', quoted: 'Quoted', approved: 'Approved',
  in_progress: 'In progress', completed: 'Completed', confirmed: 'Confirmed', reopened: 'Reopened',
  closed: 'Closed', cancelled: 'Cancelled',
};

export const PASS_TYPE: Record<string, string> = {
  guest_single: 'Guest, one visit',
  guest_recurring: 'Guest, recurring',
  domestic_staff: 'Domestic staff',
  delivery: 'Delivery',
  contractor: 'Contractor',
  agency: 'Agency personnel',
};

export function label(map: Record<string, string>, v?: string | null): string {
  if (!v) return '';
  return map[v] ?? v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
