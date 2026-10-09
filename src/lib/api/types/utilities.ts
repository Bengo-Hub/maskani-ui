import type { Base, Money } from './common';

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
  round_id?: string | null;
  meter_id: string;
  unit_id?: string | null;
  period: string;
  reading: Money;
  previous_reading?: Money | null;
  /** Reading minus the previous one, worked out on the API. */
  consumption?: Money;
  read_at?: string;
  read_by?: string | null;
  photo_key?: string;
  source?: string;
  is_estimated?: boolean;
  flags?: ReadingFlag[];
  status: 'pending' | 'accepted' | 'recheck' | 'rejected';
  verified_by?: string | null;
  notes?: string;
}

/** One meter on a round (utilities.RoundRow). */
export interface RoundRow {
  meter_id: string;
  serial: string;
  kind: string;
  unit_id?: string;
  unit_code?: string;
  block?: string;
  /** The last reading before this period (the initial reading for a new meter). */
  previous_reading: Money;
  current?: MeterReading;
  /** Mean use over the meter's last three periods; absent without history. */
  average_use?: Money;
  /** Use above this is flagged as a spike (three times average_use); absent without history. */
  spike_above?: Money;
}

/** A property's round for a period (utilities.Round): the Ent ReadingRound plus its rows. */
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
