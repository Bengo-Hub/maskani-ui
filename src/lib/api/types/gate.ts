import type { Base } from './common';

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
