'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, MapPin, Pencil } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { PropertyBlocks } from '@/components/register/property-blocks';
import { PropertyForm } from '@/components/register/property-form';
import { PropertyStaff } from '@/components/register/property-staff';
import { useAccess, useSlug } from '@/hooks/use-access';
import { useProperty } from '@/hooks/use-register';
import { titleCase } from '@/lib/utils';

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const slug = useSlug();
  const { can } = useAccess();
  const { data: p, isLoading } = useProperty(id);
  const [edit, setEdit] = useState(false);

  if (isLoading || !p) {
    return <div className="mx-auto max-w-7xl space-y-3"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full" /></div>;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        back={{ href: `/${slug}/properties`, label: 'Properties' }}
        title={p.name}
        subtitle={<span className="inline-flex flex-wrap items-center gap-2">{p.code} &middot; {titleCase(p.property_type)} <StatusBadge status={p.status} /></span>}
        actions={<>
          <Link href={`/${slug}/units?property_id=${p.id}`} className={buttonVariants({ variant: 'outline' })}><LayoutGrid /> Units</Link>
          {can('properties.manage') && <Button onClick={() => setEdit(true)}><Pencil /> Edit</Button>}
        </>}
      />
      <Card className="mb-5 grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        <div><p className="text-xs text-muted-foreground">Units</p><p className="font-display text-xl font-semibold tabular">{p.unit_count ?? 0}</p></div>
        <div><p className="text-xs text-muted-foreground">Occupied</p><p className="font-display text-xl font-semibold tabular">{p.occupied_count ?? 0}</p></div>
        <div><p className="text-xs text-muted-foreground">Sold</p><p className="font-display text-xl font-semibold tabular">{p.sold_count ?? 0}</p></div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground">Location</p>
          <p className="flex items-center gap-1 text-sm"><MapPin className="h-3.5 w-3.5" /> {[p.area, p.town, p.county].filter(Boolean).join(', ') || 'Not set'}</p>
        </div>
      </Card>
      <Tabs defaultValue="blocks">
        <TabsList className="scrollbar-hide w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="blocks">Blocks</TabsTrigger>
          {can('users.view') && <TabsTrigger value="staff">Staff</TabsTrigger>}
        </TabsList>
        <TabsContent value="blocks" className="pt-4"><PropertyBlocks property={p} /></TabsContent>
        {can('users.view') && <TabsContent value="staff" className="pt-4"><PropertyStaff propertyId={p.id} /></TabsContent>}
      </Tabs>
      <PropertyForm open={edit} onOpenChange={setEdit} property={p} />
    </div>
  );
}
