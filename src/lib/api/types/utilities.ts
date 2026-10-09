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
