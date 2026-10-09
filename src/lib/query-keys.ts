/**
 * Every TanStack query key in one place, so realtime invalidation and mutations always hit the
 * same keys the screens read. Keys start with the tenant slug so tenants never share cache.
 */
export const qk = {
  me: (slug: string) => [slug, 'me'] as const,
  imports: (slug: string) => [slug, 'imports'] as const,
  importJob: (slug: string, id: string) => [slug, 'imports', id] as const,

  properties: (slug: string) => [slug, 'properties'] as const,
  property: (slug: string, id: string) => [slug, 'properties', id] as const,
  propertyStaff: (slug: string, id: string) => [slug, 'properties', id, 'staff'] as const,
  units: (slug: string) => [slug, 'units'] as const,
  unitList: (slug: string, filters: object) => [slug, 'units', 'list', filters] as const,
  unit: (slug: string, id: string) => [slug, 'units', id] as const,
  parties: (slug: string) => [slug, 'parties'] as const,
  partyList: (slug: string, q: string) => [slug, 'parties', 'list', q] as const,
  party: (slug: string, id: string) => [slug, 'parties', id] as const,

  funds: (slug: string) => [slug, 'funds'] as const,
  charges: (slug: string) => [slug, 'charges'] as const,
  runs: (slug: string) => [slug, 'billing-runs'] as const,
  runList: (slug: string, propertyId?: string) => [slug, 'billing-runs', 'list', propertyId ?? 'all'] as const,
  run: (slug: string, id: string) => [slug, 'billing-runs', id] as const,
  runLines: (slug: string, id: string) => [slug, 'billing-runs', id, 'lines'] as const,
  accounts: (slug: string) => [slug, 'accounts'] as const,
  accountList: (slug: string, filters: object) => [slug, 'accounts', 'list', filters] as const,
  statement: (slug: string, id: string) => [slug, 'accounts', id, 'statement'] as const,
  suspense: (slug: string) => [slug, 'suspense'] as const,
  arrears: (slug: string, propertyId?: string) => [slug, 'arrears', propertyId ?? 'all'] as const,

  meters: (slug: string, propertyId: string) => [slug, 'meters', propertyId] as const,
  round: (slug: string, propertyId: string, period: string) => [slug, 'readings', propertyId, period] as const,
  readings: (slug: string) => [slug, 'readings'] as const,
  waterBalance: (slug: string, propertyId: string) => [slug, 'water-balance', propertyId] as const,

  priceLists: (slug: string, propertyId: string) => [slug, 'price-lists', propertyId] as const,
  availability: (slug: string, propertyId: string) => [slug, 'availability', propertyId] as const,
  reservations: (slug: string) => [slug, 'reservations'] as const,
  contracts: (slug: string) => [slug, 'contracts'] as const,
  contractList: (slug: string, filters: object) => [slug, 'contracts', 'list', filters] as const,
  contract: (slug: string, id: string) => [slug, 'contracts', id] as const,
  salesPosition: (slug: string, propertyId?: string) => [slug, 'sales-position', propertyId ?? 'all'] as const,

  workOrders: (slug: string) => [slug, 'work-orders'] as const,
  workOrderList: (slug: string, filters: object) => [slug, 'work-orders', 'list', filters] as const,
  workOrder: (slug: string, id: string) => [slug, 'work-orders', id] as const,
  vendors: (slug: string) => [slug, 'vendors'] as const,
  vendor: (slug: string, id: string) => [slug, 'vendors', id] as const,

  passes: (slug: string) => [slug, 'passes'] as const,
  gateEvents: (slug: string) => [slug, 'gate-events'] as const,
  incidents: (slug: string) => [slug, 'incidents'] as const,

  notices: (slug: string) => [slug, 'notices'] as const,
  deliveries: (slug: string, id: string) => [slug, 'notices', id, 'deliveries'] as const,

  dashboard: (slug: string) => [slug, 'dashboard'] as const,
  dashboardFor: (slug: string, propertyId: string | undefined, period: string) => [slug, 'dashboard', propertyId ?? 'all', period] as const,

  settings: (slug: string) => [slug, 'settings'] as const,
  modules: (slug: string) => [slug, 'settings', 'modules'] as const,
  catalogue: (slug: string, kind: string) => [slug, 'catalogue', kind] as const,
  users: (slug: string, kind?: string) => [slug, 'users', kind ?? 'all'] as const,
  roles: (slug: string) => [slug, 'roles'] as const,
  permissions: (slug: string) => [slug, 'permissions'] as const,

  portal: (slug: string) => [slug, 'portal'] as const,
  portalUnits: (slug: string) => [slug, 'portal', 'units'] as const,
  portalStatement: (slug: string, id: string) => [slug, 'portal', 'statement', id] as const,
  portalPurchase: (slug: string) => [slug, 'portal', 'purchase'] as const,
  portalPasses: (slug: string) => [slug, 'portal', 'passes'] as const,
  portalRequests: (slug: string) => [slug, 'portal', 'requests'] as const,
  portalNotices: (slug: string) => [slug, 'portal', 'notices'] as const,

  subscription: (tenantId: string) => ['subscription', tenantId] as const,
};

/** Realtime event type to the query key prefixes it makes stale. */
export function keysForEvent(slug: string, type: string): readonly (readonly unknown[])[] {
  switch (type) {
    case 'billing_run.progress':
      return [qk.runs(slug)];
    case 'payment.applied':
      return [qk.dashboard(slug), qk.accounts(slug), qk.units(slug), qk.suspense(slug), qk.contracts(slug), qk.portal(slug),
        [slug, 'arrears'] as const];
    case 'work_order.updated':
      return [qk.workOrders(slug), qk.portalRequests(slug), qk.dashboard(slug)];
    case 'gate.event':
    case 'walk_in.requested':
    case 'walk_in.decided':
      return [qk.gateEvents(slug), qk.passes(slug), qk.portalPasses(slug)];
    case 'reading.saved':
      return [qk.readings(slug)];
    case 'notice.status':
      return [qk.notices(slug), qk.portalNotices(slug)];
    default:
      return [];
  }
}
