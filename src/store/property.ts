'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * The selected property, remembered per tenant slug so switching tenants never carries one
 * tenant's property into another (tenant-switch outlet cache fix). Empty means "all properties".
 */
interface PropertyState {
  byTenant: Record<string, string>;
  select: (slug: string, propertyId: string) => void;
}

export const usePropertyStore = create<PropertyState>()(
  persist(
    (set) => ({
      byTenant: {},
      select: (slug, propertyId) => set((s) => ({ byTenant: { ...s.byTenant, [slug]: propertyId } })),
    }),
    { name: 'maskani-property', storage: createJSONStorage(() => localStorage) },
  ),
);

export function useSelectedPropertyId(slug: string): string {
  return usePropertyStore((s) => s.byTenant[slug] ?? '');
}
