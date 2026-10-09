import type { Money } from './common';

export interface Dashboard {
  period: string;
  billed: Money;
  collected: Money;
  collection_rate?: Money | number | null;
  outstanding: Money;
  accounts_owing: number;
  arrears_60_accounts: number;
  arrears_60_amount: Money;
  open_work_orders: number;
  past_sla: number;
  water_loss_pct?: Money | number | null;
  vendors_due_for_renewal: number;
  units: number;
  occupied: number;
  units_sold: number;
  sales_value?: Money;
  sales_collected?: Money;
  collections_by_week?: { week_start: string; billed: Money; collected: Money }[];
  arrears_ageing?: { bucket: string; accounts: number; amount: Money }[];
}

export interface SalesPosition {
  by_status: Record<string, number>;
  contract_value: Money;
  collected: Money;
  balance: Money;
}
