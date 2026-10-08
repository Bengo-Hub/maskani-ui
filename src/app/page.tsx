import Image from 'next/image';
import { ArrowUpRight, Droplets, FileSpreadsheet, Receipt, ShieldCheck, Smartphone, Wrench } from 'lucide-react';
import { EstateLauncher } from '@/components/landing/estate-launcher';
import { EstateMap } from '@/components/landing/estate-map';
import { Reveal } from '@/components/landing/reveal';
import { SiteNav } from '@/components/landing/site-nav';
import { MARKETPLACE_URL } from '@/lib/config';
import { fraunces } from '@/lib/fonts';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    img: '/images/amenity-pool.webp',
    alt: 'A rooftop pool in a residential block at dusk',
    icon: Receipt,
    title: 'Service charge that collects itself',
    body: 'Monthly service charge, water and levies are billed per unit. Owners pay by M-Pesa and the payment lands on the right account without anyone retyping it.',
    span: 'lg:col-span-7',
  },
  {
    img: '/images/estate-gate.webp',
    alt: 'The gate and guard house of a residential estate',
    icon: ShieldCheck,
    title: 'A gate that knows who is coming',
    body: 'Visitor passes by code or QR, walk-in approval from the host, and a gate tablet that keeps working when the internet drops.',
    span: 'lg:col-span-5',
  },
  {
    img: '/images/owners-keys.webp',
    alt: 'Wooden family figures and a house beside a set of keys',
    icon: Smartphone,
    title: 'Owners see their own statement',
    body: 'Owners sign in with the phone number the office has on file. They see what they owe, pay, and raise requests from the same screen.',
    span: 'lg:col-span-5',
  },
  {
    img: '/images/sales-keys.webp',
    alt: 'House keys resting among small model houses',
    icon: FileSpreadsheet,
    title: 'Unit sales on a payment plan',
    body: 'Price lists, reservations, sale contracts and instalment schedules, with every payment showing on the buyer statement as it arrives.',
    span: 'lg:col-span-7',
  },
];

const SMALL = [
  { icon: Droplets, title: 'Water readings', body: 'Caretakers read meters on a phone. A photo is optional, and odd readings are flagged before bills go out.' },
  { icon: Wrench, title: 'Repairs and vendors', body: 'Work orders with response times, vendor licences with expiry reminders, and a resident sign-off when the job is done.' },
];

const STEPS = [
  { n: '01', title: 'Bring your register', body: 'Upload units and owners from a spreadsheet. We check every row before anything is saved.' },
  { n: '02', title: 'Send the first bills', body: 'Set the charges once. Each month the bills go out by email and WhatsApp with a pay link.' },
  { n: '03', title: 'Watch it reconcile', body: 'Payments match to units as they arrive, and the dashboard shows who is up to date.' },
];

export default function LandingPage() {
  return (
    <div className={cn(fraunces.variable, 'min-h-dvh bg-paper')}>
      <SiteNav />

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-14">
          <div className="space-y-8">
            <div className="space-y-5">
              <p className="animate-rise text-sm font-medium tracking-wide text-gold" style={{ '--rise-delay': '0ms' } as React.CSSProperties}>
                Estate management, made in Nairobi
              </p>
              <h1
                className="animate-rise font-serif-soft text-[2.6rem] leading-[1.05] text-foreground sm:text-6xl"
                style={{ '--rise-delay': '80ms' } as React.CSSProperties}
              >
                A calmer way to run your estate.
              </h1>
              <p
                className="animate-rise max-w-lg text-lg leading-relaxed text-muted-foreground"
                style={{ '--rise-delay': '160ms' } as React.CSSProperties}
              >
                Bills, water, sales, repairs and the gate, on one record that the office, owners and guards all share.
              </p>
            </div>
            <div className="animate-rise max-w-lg" style={{ '--rise-delay': '240ms' } as React.CSSProperties}>
              <EstateLauncher />
            </div>
          </div>

          <div className="relative animate-rise" style={{ '--rise-delay': '120ms' } as React.CSSProperties}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-lift sm:aspect-[5/6]">
              <Image
                src="/images/estate-palms.webp"
                alt="An apartment block in Nairobi seen through palm trees"
                fill
                priority
                sizes="(min-width: 1024px) 520px, 100vw"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-8 -left-4 hidden w-48 overflow-hidden rounded-3xl border-4 border-paper shadow-lift sm:block lg:-left-10">
              <div className="relative aspect-square">
                <Image src="/images/home-lounge.webp" alt="A sunlit lounge with plants" fill sizes="200px" className="object-cover" />
              </div>
            </div>
            <div className="absolute -top-4 right-4 rounded-2xl bg-card px-4 py-3 shadow-soft sm:right-6">
              <p className="text-xs text-muted-foreground">Paid by M-Pesa</p>
              <p className="text-sm font-semibold">Lands on the right unit</p>
            </div>
          </div>
        </section>

        {/* Features gallery */}
        <section id="features" className="scroll-mt-20 bg-background py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mb-12 max-w-2xl space-y-3">
              <h2 className="font-serif-soft text-4xl leading-tight sm:text-5xl">Everything an estate does in a month</h2>
              <p className="text-lg text-muted-foreground">Each part works on its own, and they all share the same units, owners and accounts.</p>
            </Reveal>
            <div className="grid gap-5 lg:grid-cols-12">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={(i % 2) * 90} className={cn('group', f.span)}>
                  <article className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-soft">
                    <div className="photo-zoom relative aspect-[16/10]">
                      <Image src={f.img} alt={f.alt} fill sizes="(min-width: 1024px) 640px, 100vw" className="object-cover" />
                    </div>
                    <div className="flex flex-1 gap-4 p-6 sm:p-7">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
                        <f.icon className="h-5 w-5" aria-hidden />
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold">{f.title}</h3>
                        <p className="mt-1.5 leading-relaxed text-muted-foreground">{f.body}</p>
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {SMALL.map((f, i) => (
                <Reveal key={f.title} delay={i * 90}>
                  <div className="flex h-full gap-4 rounded-[1.75rem] border border-border/60 bg-paper p-6 sm:p-7">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-card text-primary shadow-soft">
                      <f.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold">{f.title}</h3>
                      <p className="mt-1.5 leading-relaxed text-muted-foreground">{f.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Who uses it: the map */}
        <section id="people" className="scroll-mt-20 py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="mx-auto mb-14 max-w-2xl space-y-3 text-center">
              <h2 className="font-serif-soft text-4xl leading-tight sm:text-5xl">Everyone works from the same page</h2>
              <p className="text-lg text-muted-foreground">No more reconciling the office spreadsheet with the guard book and the M-Pesa statement at month end.</p>
            </Reveal>
            <Reveal>
              <EstateMap />
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 bg-background py-20 lg:py-28">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <Reveal className="relative order-last lg:order-first">
              <div className="photo-zoom relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-lift">
                <Image src="/images/home-bedroom.webp" alt="A bright bedroom with white linen and tall windows" fill sizes="(min-width: 1024px) 480px, 100vw" className="object-cover" />
              </div>
            </Reveal>
            <div className="space-y-10">
              <Reveal className="space-y-3">
                <h2 className="font-serif-soft text-4xl leading-tight sm:text-5xl">Getting started is simple</h2>
                <p className="text-lg text-muted-foreground">Most estates start from a spreadsheet and a paybill. That is all you need.</p>
              </Reveal>
              <ol className="space-y-4">
                {STEPS.map((s, i) => (
                  <Reveal as="li" key={s.n} delay={i * 90}>
                    <div className="flex gap-5 rounded-[1.5rem] border border-border/60 bg-paper p-5 sm:p-6">
                      <span className="font-serif-soft text-3xl text-gold">{s.n}</span>
                      <div>
                        <h3 className="text-lg font-semibold">{s.title}</h3>
                        <p className="mt-1 leading-relaxed text-muted-foreground">{s.body}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Marketplace band */}
        <section className="py-20 lg:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <div className="grid overflow-hidden rounded-[2rem] bg-primary text-primary-foreground lg:grid-cols-2">
                <div className="flex flex-col justify-center gap-5 p-8 sm:p-12">
                  <h2 className="font-serif-soft text-3xl leading-tight sm:text-4xl">Looking for a home rather than running one?</h2>
                  <p className="max-w-md text-primary-foreground/80">
                    Maskani Marketplace lists units in estates that are already managed on Maskani, with prices and payment plans from the developer.
                  </p>
                  <a
                    href={MARKETPLACE_URL}
                    className="inline-flex w-fit items-center gap-2 rounded-full bg-card px-6 py-3 text-sm font-semibold text-primary transition-transform hover:-translate-y-0.5"
                  >
                    Browse the marketplace <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </a>
                </div>
                <div className="photo-zoom relative min-h-64 lg:min-h-full">
                  <Image src="/images/tower-green.webp" alt="A residential tower with planted balconies" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="space-y-2">
            <Image src="/brand/maskani-logo.svg" alt="Maskani by Codevertex" width={130} height={31} />
            <p className="text-sm text-muted-foreground">Built by Codevertex Africa Limited, Nairobi.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground" aria-label="Footer">
            <a href={MARKETPLACE_URL} className="hover:text-foreground">Marketplace</a>
            <a href="#open" className="hover:text-foreground">Sign in</a>
            <a href="https://codevertexafrica.com" className="hover:text-foreground">Codevertex Africa</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
