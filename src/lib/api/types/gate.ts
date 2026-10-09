import type { Base } from './common';

export type PassType = 'guest_single' | 'guest_recurring' | 'domestic_staff' | 'delivery' | 'contractor' | 'agency';
export type PassStatus = 'active' | 'used' | 'expired' | 'cancelled';

/**
 * A pass as the API returns it (Ent VisitorPass). Staff lists and `GET /visitor-passes/{id}` add
 * `unit_code` and `block` (gate.PassView); create adds `code` and `qr_token` once (gate.IssuedPass).
 */
export interface VisitorPass extends Base {
  property_id: string;
  unit_id?: string | null;
  host_party_id?: string | null;
  created_by_kind?: string;
  created_by_id?: string | null;
  pass_type: PassType;
  visitor_name: string;
  visitor_phone?: string;
  vehicle_plate?: string;
  code_hint?: string;
  valid_from: string;
  valid_to: string;
  recurrence?: Record<string, unknown> | null;
  max_entries?: number;
  entries_used?: number;
  work_order_id?: string | null;
  status?: PassStatus;
  notes?: string;
  visitor_id?: string | null;
  unit_code?: string;
  block?: string;
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

export type GateEventKind = 'entry' | 'exit' | 'denied' | 'walk_in_request' | 'walk_in_approved' | 'walk_in_declined';
export type GateDecision = 'pending' | 'approved' | 'declined' | 'timeout' | 'none';

/** A gate log row (gate.EventView): the Ent GateEvent plus unit, block and guard spelled out. */
export interface GateEvent extends Base {
  property_id?: string;
  device_id?: string | null;
  pass_id?: string | null;
  kind: GateEventKind;
  visitor_name?: string;
  visitor_phone?: string;
  host_unit_id?: string | null;
  vehicle_plate?: string;
  id_sighted?: boolean;
  occurred_at: string;
  offline?: boolean;
  client_event_id?: string;
  guard_personnel_id?: string | null;
  decision?: GateDecision;
  decided_at?: string | null;
  /** "host" or "guard" on a decided walk-in. */
  decided_by?: string;
  notes?: string;
  visitor_id?: string | null;
  /** Set on an entry once its exit is recorded. */
  exited_at?: string | null;
  /** Set on an exit: the entry it closes. */
  entry_event_id?: string | null;
  unit_code?: string;
  block?: string;
  guard_name?: string;
}

/** Someone let in with no exit yet (`GET /gate/inside`, gate.InsidePerson). */
export interface InsidePerson {
  event_id: string;
  visitor_name: string;
  vehicle_plate?: string;
  host_unit_id?: string;
  unit_code?: string;
  block?: string;
  since: string;
  pass_id?: string;
  visitor_id?: string;
  walk_in: boolean;
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

/** The Ent GateDevice returned once by `POST /gate/devices` with the device key. */
export interface GateDevice extends Base {
  name: string;
  gate_name?: string;
  property_id: string;
  registered_by?: string | null;
  last_seen_at?: string | null;
  app_version?: string;
  offline_alerted?: boolean;
  status?: 'active' | 'revoked';
}

/** A tablet in `GET /gate/devices` (gate.DeviceView); online means seen in the last 15 minutes. */
export interface GateDeviceView {
  id: string;
  property_id: string;
  name: string;
  gate_name: string;
  status: 'active' | 'revoked';
  last_seen_at?: string;
  online: boolean;
  app_version?: string;
  created_at: string;
}
