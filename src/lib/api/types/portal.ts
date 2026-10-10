import type { PayInstruction, UnitAccount } from './billing';
import type { Money } from './common';
import type { Property, Unit, UnitParty } from './register';

export interface PortalUnit {
  link: UnitParty;
  unit: Unit;
  property: Property;
  /** Each account carries its fund (name, paybill) under edges.fund. */
  accounts: UnitAccount[];
  /** How to pay each account at its paybill, keyed by account id. */
  pay?: Record<string, PayInstruction>;
  /** Latest accepted water reading within six months. */
  last_reading?: { period: string; reading: Money; consumption: Money; read_at: string; estimated: boolean; photo_key?: string };
}
