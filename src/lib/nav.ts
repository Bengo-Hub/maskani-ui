import {
  BarChart3, Building2, ClipboardList, DoorOpen, Droplets, FileSignature, Gauge, Home, Landmark, LayoutGrid,
  Megaphone, Receipt, ScrollText, Settings, ShieldAlert, ShieldCheck, Tablet, Users, Wallet, Wrench, Truck,
  type LucideIcon,
} from 'lucide-react';
import type { MaskaniMe } from '@/lib/api/types';
import { hasModule, hasPermission } from '@/store/auth';

export interface NavItem {
  label: string;
  /** Path under /{orgSlug}. */
  path: string;
  icon: LucideIcon;
  /** Any of these modules must be on (empty: always). */
  modules?: string[];
  /** Any of these permissions (empty: any signed-in staff). */
  perms?: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', path: '/dashboard', icon: Gauge, perms: ['reports.view'] }],
  },
  {
    label: 'Register',
    items: [
      { label: 'Properties', path: '/properties', icon: Building2, modules: ['properties'], perms: ['properties.view'] },
      { label: 'Units', path: '/units', icon: LayoutGrid, modules: ['properties'], perms: ['units.view'] },
      { label: 'Owners and residents', path: '/parties', icon: Users, modules: ['properties'], perms: ['parties.view'] },
    ],
  },
  {
    label: 'Money',
    items: [
      { label: 'Billing runs', path: '/billing/runs', icon: Receipt, modules: ['billing'], perms: ['billing.view'] },
      { label: 'Unit accounts', path: '/billing/accounts', icon: Wallet, modules: ['billing'], perms: ['billing.view'] },
      { label: 'Collections', path: '/collections', icon: Landmark, modules: ['billing'], perms: ['billing.collect', 'billing.view'] },
      { label: 'Charges and funds', path: '/billing/charges', icon: ScrollText, modules: ['billing'], perms: ['billing.view'] },
    ],
  },
  {
    label: 'Utilities',
    items: [
      { label: 'Meter readings', path: '/utilities/readings', icon: Droplets, modules: ['utilities'], perms: ['utilities.read', 'utilities.view'] },
      { label: 'Water balance', path: '/utilities/water', icon: BarChart3, modules: ['utilities'], perms: ['utilities.view'] },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Availability', path: '/sales', icon: Home, modules: ['sales'], perms: ['sales.view'] },
      { label: 'Sale contracts', path: '/sales/contracts', icon: FileSignature, modules: ['sales'], perms: ['sales.view'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Work orders', path: '/works', icon: Wrench, modules: ['maintenance'], perms: ['works.view'] },
      { label: 'Vendors', path: '/vendors', icon: Truck, modules: ['providers', 'maintenance'], perms: ['vendors.view'] },
    ],
  },
  {
    label: 'Security',
    items: [
      { label: 'Visitor passes', path: '/security/passes', icon: ShieldCheck, modules: ['gate'], perms: ['gate.view'] },
      { label: 'Gate log', path: '/security/log', icon: DoorOpen, modules: ['gate'], perms: ['gate.view'] },
      { label: 'Incidents', path: '/security/incidents', icon: ShieldAlert, modules: ['gate'], perms: ['gate.view'] },
      { label: 'Gate tablets', path: '/security/devices', icon: Tablet, modules: ['gate'], perms: ['gate.manage'] },
    ],
  },
  {
    label: 'Communication',
    items: [{ label: 'Notices', path: '/notices', icon: Megaphone, modules: ['communication'], perms: ['notices.manage'] }],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Settings', path: '/settings', icon: Settings, perms: ['settings.view'] },
      { label: 'Users and roles', path: '/settings/users', icon: ClipboardList, perms: ['users.view'] },
    ],
  },
];

export function navAllowed(me: MaskaniMe | null, item: Pick<NavItem, 'modules' | 'perms'>): boolean {
  if (!me) return false;
  if (item.modules?.length && !item.modules.some((m) => hasModule(me, m)) && !me.bypass) return false;
  if (item.perms?.length && !item.perms.some((p) => hasPermission(me, p))) return false;
  return true;
}

export function visibleNav(me: MaskaniMe | null): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => navAllowed(me, i)) })).filter((g) => g.items.length > 0);
}

/** The nav entry that owns a pathname (longest matching prefix), used by the route guard. */
export function navItemFor(pathAfterSlug: string): NavItem | undefined {
  let best: NavItem | undefined;
  for (const g of NAV) {
    for (const i of g.items) {
      if ((pathAfterSlug === i.path || pathAfterSlug.startsWith(`${i.path}/`)) && (!best || i.path.length > best.path.length)) best = i;
    }
  }
  return best;
}
