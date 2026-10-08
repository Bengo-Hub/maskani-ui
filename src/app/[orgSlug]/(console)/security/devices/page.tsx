'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Tablet, Trash2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Field } from '@/components/common/field';
import { PageHeader } from '@/components/common/page-header';
import { PropertyRequired, usePropertyOrSingle } from '@/components/common/property-required';
import { useSlug } from '@/hooks/use-access';
import { useRegisterDevice } from '@/hooks/use-security';
import { forgetDevice, getDevice, saveDevice, type GateDeviceCreds } from '@/lib/gate/device';
import { clearGateData } from '@/lib/gate/queue';

/**
 * Registers the device you are holding as a gate tablet. The key comes back once and is stored only
 * on this device; nobody types or sees it. Then the tablet opens straight to the gate screen.
 */
export default function GateDevicesPage() {
  const slug = useSlug();
  const propertyId = usePropertyOrSingle();
  const register = useRegisterDevice();
  const [current, setCurrent] = useState<GateDeviceCreds | null>(null);
  const [name, setName] = useState('Gate tablet 1');
  const [gateName, setGateName] = useState('Main gate');
  const [forgetting, setForgetting] = useState(false);

  useEffect(() => setCurrent(getDevice(slug)), [slug]);

  const setup = () => register.mutate({ property_id: propertyId, name: name.trim(), gate_name: gateName.trim() }, {
    onSuccess: (res) => {
      const creds: GateDeviceCreds = {
        deviceKey: res.device_key, deviceId: res.device.id, propertyId: res.device.property_id,
        name: res.device.name, gateName: res.device.gate_name || gateName, tenantSlug: slug,
      };
      saveDevice(creds);
      setCurrent(creds);
    },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Gate tablets" subtitle="Each tablet at a gate is registered once by a manager" />
      {!propertyId ? <PropertyRequired what="Gate tablets" /> : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>This device</CardTitle>
              <CardDescription>Do this on the tablet that will stay at the gate.</CardDescription>
            </CardHeader>
            <CardContent>
              {current ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-center gap-2"><Tablet className="h-5 w-5 text-primary" /> Set up as <strong>{current.gateName}</strong> ({current.name})</p>
                  <div className="flex gap-2">
                    <Link href={`/${slug}/gate`} className={buttonVariants()}><ExternalLink /> Open the gate screen</Link>
                    <Button variant="outline" onClick={() => setForgetting(true)}><Trash2 /> Remove from this device</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <Field label="Tablet name" htmlFor="d-name"><Input id="d-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
                  <Field label="Gate" htmlFor="d-gate"><Input id="d-gate" value={gateName} onChange={(e) => setGateName(e.target.value)} /></Field>
                  <Button onClick={setup} disabled={!name.trim() || register.isPending}>{register.isPending ? 'Setting up...' : 'Set up this device'}</Button>
                </div>
              )}
            </CardContent>
          </Card>
          <p className="text-sm text-muted-foreground">
            Guards sign on at the tablet with their badge and a PIN. Set PINs on the security company&apos;s page under <Link href={`/${slug}/vendors`} className="text-primary underline">Vendors</Link>.
          </p>
        </div>
      )}
      <ConfirmDialog
        open={forgetting}
        onOpenChange={setForgetting}
        variant="warning"
        title="Remove the gate setup from this device?"
        description="Entries still waiting to send are deleted too. Set the tablet up again to use it at the gate."
        confirmLabel="Remove"
        onConfirm={() => { forgetDevice(slug); void clearGateData(); setCurrent(null); setForgetting(false); }}
      />
    </div>
  );
}
