'use client';

import { useEffect } from 'react';
import { useSlug } from './use-access';
import { useProperties } from './use-register';
import { usePropertyStore, useStoredPropertyChoice } from '@/store/property';

/**
 * Opens the console on the default property (treasury's outlet pattern): when nothing was chosen
 * for this tenant yet, or the saved property is gone, it selects the property the API marks
 * is_default (the head office outlet's, else the first by name). "All properties" stays a valid
 * choice once picked, but only where there is more than one property. Mounted once, in the shell,
 * so every page (dashboard, reports, water) reads the same selection the header shows.
 */
export function useDefaultProperty() {
  const slug = useSlug();
  const { data: properties, isSuccess } = useProperties();
  const stored = useStoredPropertyChoice(slug);
  const select = usePropertyStore((s) => s.select);

  useEffect(() => {
    if (!isSuccess || !properties?.length) return;
    const keep = stored === '' ? properties.length > 1 : !!stored && properties.some((p) => p.id === stored);
    if (keep) return;
    const preferred = properties.find((p) => p.is_default) ?? properties[0];
    select(slug, preferred.id);
  }, [isSuccess, properties, stored, slug, select]);
}
