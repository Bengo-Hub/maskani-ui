import Image from 'next/image';
import { Building2, Droplets, KeyRound, Receipt, ShieldCheck, Wrench } from 'lucide-react';
import { EstateLauncher } from '@/components/landing/estate-launcher';

const FEATURES = [
  { icon: Receipt, title: 'Bills and payments', body: 'Monthly service charge, water and levies billed per unit. Owners pay by M-Pesa prompt or paybill and the balance updates on its own.' },
  { icon: Droplets, title: 'Water readings', body: 'Caretakers read meters on a phone with a photo of each meter. Odd readings are flagged before bills go out.' },
  { icon: Building2, title: 'Unit sales', body: 'Price lists, reservations, sale contracts and instalment schedules, with every payment on the buyer statement.' },
  { icon: Wrench, title: 'Repairs and vendors', body: 'Work orders with response times, vendor documents with expiry reminders, and resident confirmation when a job is done.' },
  { icon: ShieldCheck, title: 'Gate and security', body: 'Visitor passes by code or QR, walk-in approval by the host, and a gate tablet that keeps working offline.' },
  { icon: KeyRound, title: 'Owner portal', body: 'Owners sign in with their phone number to see statements, pay, create visitor passes and raise requests.' },
];

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Image src="/brand/maskani-logo.svg" alt="Maskani by Codevertex" width={168} height={40} priority />
          <a href="https://codevertexafrica.com" className="text-sm text-muted-foreground hover:text-foreground">Codevertex</a>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold">Estate management</p>
          <h1 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Run your estate from one place: bills, water, sales, repairs and the gate.
          </h1>
          <p className="max-w-xl text-base text-muted-foreground">
            Maskani keeps management, owners and guards on the same records. Payments land against the right unit,
            owners see their own statement, and the gate knows who is expected.
          </p>
        </div>
        <EstateLauncher />
      </section>

      <section className="border-t bg-card">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border bg-background p-5">
              <f.icon className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="mt-3 text-base font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <span>Maskani by Codevertex Africa Limited</span>
          <span>Nairobi, Kenya</span>
        </div>
      </footer>
    </main>
  );
}
