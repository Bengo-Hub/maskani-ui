'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Car, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { Field, NativeSelect } from '@/components/common/field';
import { FormSheet } from '@/components/common/form-sheet';
import { IconButton } from '@/components/common/icon-button';
import { PageHeader } from '@/components/common/page-header';
import { useSlug } from '@/hooks/use-access';
import { useHousehold, useHouseholdActions, usePortalUnits } from '@/hooks/use-portal';
import { apiErrorMessage } from '@/lib/api/errors';

const ROLE = { household_member: 'Household member', domestic_staff: 'Domestic staff' } as const;

/**
 * The people and cars at a resident's unit: family members, domestic staff and vehicles. Owners and
 * occupants manage them; domestic staff then get gate passes from Visitors like anyone else, and the
 * gate recognises the household's cars.
 */
export default function PortalHouseholdPage() {
  const slug = useSlug();
  const { data: units = [], isLoading } = usePortalUnits();
  const manageable = units.filter((u) => ['owner', 'joint_owner', 'buyer', 'landlord', 'occupant'].includes(u.link.role));
  const [unitId, setUnitId] = useState('');
  useEffect(() => { if (!unitId && manageable[0]) setUnitId(manageable[0].unit.id); }, [unitId, manageable]);
  const { data: hh, isLoading: loadingHH } = useHousehold(unitId);
  const act = useHouseholdActions(unitId);
  const [adding, setAdding] = useState<'person' | 'car' | null>(null);
  const [person, setPerson] = useState({ name: '', phone: '', role: 'domestic_staff' as keyof typeof ROLE });
  const [car, setCar] = useState({ plate: '', make: '', model: '', colour: '' });
  const [removing, setRemoving] = useState<{ kind: 'person' | 'car'; id: string; label: string } | null>(null);
  const [error, setError] = useState('');

  const close = () => { setAdding(null); setError(''); setPerson({ name: '', phone: '', role: 'domestic_staff' }); setCar({ plate: '', make: '', model: '', colour: '' }); };
  const fail = (e: unknown) => setError(apiErrorMessage(e));

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-40" /><Skeleton className="h-48" /></div>;
  if (manageable.length === 0) {
    return <EmptyState icon={Users} title="Nothing to manage" description="The household is managed by the unit's owner or the person renting it." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Household" subtitle="Family, domestic staff and cars at your unit."
        actions={manageable.length > 1 ? (
          <NativeSelect className="w-44" value={unitId} onChange={(e) => setUnitId(e.target.value)} aria-label="Unit">
            {manageable.map((u) => <option key={u.unit.id} value={u.unit.id}>Unit {u.unit.code}</option>)}
          </NativeSelect>
        ) : undefined} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>People</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAdding('person')}><Plus /> Add someone</Button>
        </CardHeader>
        <CardContent className="p-0">
          {loadingHH ? <Skeleton className="m-4 h-16" /> : (hh?.people ?? []).length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No one added yet. Add your househelp or family so the estate knows them.</p>
          ) : (
            <ul className="divide-y">
              {hh!.people.map((p) => (
                <li key={p.link_id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
                  <div><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{ROLE[p.role]}{p.phone ? `, ${p.phone}` : ''}</p></div>
                  <div className="flex items-center gap-1">
                    {p.role === 'domestic_staff' && (
                      <Link href={`/${slug}/portal/visitors?new=1`} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-primary">
                        <ShieldCheck className="h-4 w-4" aria-hidden /> Gate pass
                      </Link>
                    )}
                    <IconButton label={`Remove ${p.name}`} onClick={() => setRemoving({ kind: 'person', id: p.link_id, label: p.name })}><Trash2 /></IconButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Cars</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAdding('car')}><Car /> Add a car</Button>
        </CardHeader>
        <CardContent className="p-0">
          {(hh?.vehicles ?? []).length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">Add your cars so the guards recognise them at the gate.</p>
          ) : (
            <ul className="divide-y">
              {hh!.vehicles.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
                  <div><p className="font-mono font-semibold">{v.plate}</p><p className="text-xs text-muted-foreground">{[v.make, v.model, v.colour].filter(Boolean).join(', ')}</p></div>
                  <IconButton label={`Remove ${v.plate}`} onClick={() => setRemoving({ kind: 'car', id: v.id, label: v.plate })}><Trash2 /></IconButton>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <FormSheet
        open={adding === 'person'}
        onOpenChange={(o) => !o && close()}
        size="sm"
        title="Add someone"
        footer={<>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button disabled={!person.name.trim() || act.addPerson.isPending}
            onClick={() => act.addPerson.mutate({ name: person.name.trim(), phone: person.phone.trim() || undefined, role: person.role }, { onSuccess: close, onError: fail })}>
            Add
          </Button>
        </>}
      >
        <div className="space-y-4">
          <Field label="Name" htmlFor="hh-name" required><Input id="hh-name" value={person.name} onChange={(e) => setPerson({ ...person, name: e.target.value })} /></Field>
          <Field label="Phone" htmlFor="hh-phone" hint="Optional; used for their gate passes">
            <Input id="hh-phone" type="tel" inputMode="tel" value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} placeholder="0712 345 678" />
          </Field>
          <Field label="Who are they" htmlFor="hh-role">
            <NativeSelect id="hh-role" value={person.role} onChange={(e) => setPerson({ ...person, role: e.target.value as keyof typeof ROLE })}>
              <option value="domestic_staff">Domestic staff</option>
              <option value="household_member">Household member</option>
            </NativeSelect>
          </Field>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </div>
      </FormSheet>

      <FormSheet
        open={adding === 'car'}
        onOpenChange={(o) => !o && close()}
        size="sm"
        title="Add a car"
        footer={<>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button disabled={!car.plate.trim() || act.addVehicle.isPending}
            onClick={() => act.addVehicle.mutate({ plate: car.plate, make: car.make || undefined, model: car.model || undefined, colour: car.colour || undefined }, { onSuccess: close, onError: fail })}>
            Add
          </Button>
        </>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Number plate" htmlFor="car-plate" required className="sm:col-span-2">
            <Input id="car-plate" value={car.plate} onChange={(e) => setCar({ ...car, plate: e.target.value })} className="font-mono uppercase" placeholder="KDQ 123A" />
          </Field>
          <Field label="Make" htmlFor="car-make"><Input id="car-make" value={car.make} onChange={(e) => setCar({ ...car, make: e.target.value })} /></Field>
          <Field label="Model" htmlFor="car-model"><Input id="car-model" value={car.model} onChange={(e) => setCar({ ...car, model: e.target.value })} /></Field>
          <Field label="Colour" htmlFor="car-colour"><Input id="car-colour" value={car.colour} onChange={(e) => setCar({ ...car, colour: e.target.value })} /></Field>
          {error && <p className="text-sm text-destructive sm:col-span-2" role="alert">{error}</p>}
        </div>
      </FormSheet>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        variant="warning"
        title={`Remove ${removing?.label}?`}
        description={removing?.kind === 'person' ? 'Their gate passes for this unit stop.' : 'The gate will no longer list this car for your unit.'}
        confirmLabel="Remove"
        loading={act.endPerson.isPending || act.removeVehicle.isPending}
        onConfirm={() => {
          if (!removing) return;
          const done = { onSuccess: () => setRemoving(null) };
          if (removing.kind === 'person') act.endPerson.mutate(removing.id, done);
          else act.removeVehicle.mutate(removing.id, done);
        }}
      />
    </div>
  );
}
