import {
  BarChart3, Building2, DoorOpen, Droplets, FileSignature, FileUp, Gauge, Home, KeyRound, Landmark, LayoutGrid,
  ListTree, Megaphone, Receipt, ScrollText, Settings, ShieldAlert, ShieldCheck, Tablet, UserCog, Users, Wallet,
  Wrench, Truck, type LucideIcon,
} from 'lucide-react';
import type { MaskaniMe } from '@/lib/api/types';
import { CATALOGUE_KINDS } from '@/lib/catalogues';
import { hasModule, hasPermission } from '@/store/auth';

export interface NavItem {
  label: string;
  /** Path under /{orgSlug}, optionally with a query (`?tab=arrears`) for a tab or filter child. */
  path: string;
  icon?: LucideIcon;
  /** Any of these modules must be on (empty: always). Children inherit their parent's gate. */
  modules?: string[];
  /** Any of these permissions (empty: any signed-in staff). */
  perms?: string[];
  /** Sub-items, shown in a collapsible list under the item (up to two levels). */
  children?: NavItem[];
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
      {
        label: 'Units', path: '/units', icon: LayoutGrid, modules: ['properties'], perms: ['units.view'],
        children: [
          { label: 'All units', path: '/units' },
          { label: 'Import CSV', path: '/units/import', icon: FileUp, perms: ['imports.run'] },
        ],
      },
      { label: 'Owners and residents', path: '/parties', icon: Users, modules: ['properties'], perms: ['parties.view'] },
    ],
  },
  {
    label: 'Money',
    items: [
      {
        label: 'Billing', path: '/billing/runs', icon: Receipt, modules: ['billing'], perms: ['billing.view'],
        children: [
          { label: 'Billing runs', path: '/billing/runs' },
          { label: 'Unit accounts', path: '/billing/accounts', icon: Wallet },
          {
            label: 'Charges and funds', path: '/billing/charges', icon: ScrollText,
            children: [
              { label: 'Charge types', path: '/billing/charges?tab=charges' },
              { label: 'Rates', path: '/billing/charges?tab=rates' },
              { label: 'Funds', path: '/billing/charges?tab=funds' },
            ],
          },
        ],
      },
      {
        label: 'Collections', path: '/collections', icon: Landmark, modules: ['billing'], perms: ['billing.collect', 'billing.view'],
        children: [
          { label: 'Unmatched payments', path: '/collections?tab=suspense', perms: ['billing.collect'] },
          { label: 'Arrears', path: '/collections?tab=arrears' },
        ],
      },
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
      {
        label: 'Settings', path: '/settings', icon: Settings, perms: ['settings.view'],
        children: [
          { label: 'General', path: '/settings?tab=general' },
          { label: 'Modules', path: '/settings?tab=modules' },
          {
            label: 'Lists', path: '/settings?tab=lists', icon: ListTree,
            children: CATALOGUE_KINDS.map((k) => ({ label: k.label, path: `/settings?tab=lists&kind=${k.kind}` })),
          },
        ],
      },
      {
        label: 'Users and roles', path: '/settings/users', icon: UserCog, perms: ['users.view'],
        children: [
          { label: 'Staff', path: '/settings/users' },
          { label: 'Roles and permissions', path: '/settings/roles', icon: KeyRound },
        ],
      },
    ],
  },
];

export function navAllowed(me: MaskaniMe | null, item: Pick<NavItem, 'modules' | 'perms'>): boolean {
  if (!me) return false;
  if (item.modules?.length && !item.modules.some((m) => hasModule(me, m)) && !me.bypass) return false;
  if (item.perms?.length && !item.perms.some((p) => hasPermission(me, p))) return false;
  return true;
}

function filterItems(me: MaskaniMe | null, items: NavItem[]): NavItem[] {
  return items
    .filter((i) => navAllowed(me, i))
    .map((i) => (i.children ? { ...i, children: filterItems(me, i.children) } : i));
}

/** The groups and items this user may see, children filtered the same way. */
export function visibleNav(me: MaskaniMe | null): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: filterItems(me, g.items) })).filter((g) => g.items.length > 0);
}

/** Splits a nav path into its pathname and query. */
export function splitNavPath(path: string): { pathname: string; query: URLSearchParams } {
  const [pathname, q = ''] = path.split('?');
  return { pathname, query: new URLSearchParams(q) };
}

/**
 * Whether a nav path matches the current location. A path with a query matches only when every
 * query key it names has that value (so "?tab=arrears" is active on the arrears tab only).
 */
export function navPathActive(path: string, pathAfterSlug: string, search: URLSearchParams, exact = false): boolean {
  const { pathname, query } = splitNavPath(path);
  const pathOk = exact || [...query.keys()].length > 0
    ? pathAfterSlug === pathname
    : pathAfterSlug === pathname || pathAfterSlug.startsWith(`${pathname}/`);
  if (!pathOk) return false;
  for (const [k, v] of query) if (search.get(k) !== v) return false;
  return true;
}

/** The nav entry that owns a pathname (longest matching prefix, children included), used by the route guard. */
export function navItemFor(pathAfterSlug: string): NavItem | undefined {
  let best: NavItem | undefined;
  const walk = (items: NavItem[], inherited?: Pick<NavItem, 'modules' | 'perms'>) => {
    for (const i of items) {
      // A child without its own gate carries its parent's.
      const gated: NavItem = { ...i, modules: i.modules ?? inherited?.modules, perms: i.perms ?? inherited?.perms };
      const { pathname } = splitNavPath(i.path);
      if ((pathAfterSlug === pathname || pathAfterSlug.startsWith(`${pathname}/`)) && (!best || pathname.length > splitNavPath(best.path).pathname.length)) best = gated;
      if (i.children) walk(i.children, gated);
    }
  };
  for (const g of NAV) walk(g.items);
  return best;
}
