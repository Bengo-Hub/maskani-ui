'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { PropertyForm } from '@/components/register/property-form';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useProperties } from '@/hooks/use-register';
import { titleCase } from '@/lib/utils';

export default function PropertiesPage() {
  const slug = useSlug();
  const { can } = useAccess();
  const { data = [], isLoading } = useProperties();
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Properties"
        subtitle="Estates and buildings you manage"
        actions={can('properties.manage') ? <Button onClick={() => setOpen(true)}><Plus /> New property</Button> : undefined}
      />
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : data.length === 0 ? (
        <EmptyState icon={Building2} title="No properties yet" description="Add the estate first, then its blocks and units." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((p) => {
            const units = p.unit_count ?? 0;
            const occupied = p.occupied_count ?? 0;
            return (
              <Link key={p.id} href={`/${slug}/properties/${p.id}`} className="group">
                <Card className="h-full gap-3 p-5 transition-colors group-hover:border-primary/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-semibold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.code} &middot; {titleCase(p.property_type)}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  {(p.area || p.town) && (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {[p.area, p.town].filter(Boolean).join(', ')}</p>
                  )}
                  <dl className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
                    <div><dt className="text-[11px] text-muted-foreground">Units</dt><dd className="font-semibold tabular">{units}</dd></div>
                    <div><dt className="text-[11px] text-muted-foreground">Occupied</dt><dd className="font-semibold tabular">{occupied}</dd></div>
                    <div><dt className="text-[11px] text-muted-foreground">Sold</dt><dd className="font-semibold tabular">{p.sold_count ?? 0}</dd></div>
                  </dl>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
      <PropertyForm open={open} onOpenChange={setOpen} />
    </div>
  );
}
