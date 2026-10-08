/** The tenant's editable lists (maskani-api `/catalogues/{kind}`). One list for Settings and the nav. */
export const CATALOGUE_KINDS = [
  { kind: 'unit_type', label: 'Unit types' },
  { kind: 'property_type', label: 'Property types' },
  { kind: 'wo_category', label: 'Work order categories' },
  { kind: 'vendor_category', label: 'Vendor categories' },
  { kind: 'incident_type', label: 'Incident types' },
  { kind: 'notice_category', label: 'Notice categories' },
] as const;

export type CatalogueKind = (typeof CATALOGUE_KINDS)[number]['kind'];
