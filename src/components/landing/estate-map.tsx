import { Building2, Droplets, HardHat, KeyRound, ShieldCheck, Smartphone, type LucideIcon } from 'lucide-react';

interface Node {
  icon: LucideIcon;
  who: string;
  does: string;
  /** Position of the node centre on the map, in percent of the box. */
  x: number;
  y: number;
}

const NODES: Node[] = [
  { icon: Building2, who: 'Estate office', does: 'Bills, collections and reports', x: 17, y: 20 },
  { icon: KeyRound, who: 'Owners and residents', does: 'Statement, pay, visitor passes', x: 83, y: 20 },
  { icon: Droplets, who: 'Caretakers', does: 'Meter readings on a phone', x: 10, y: 62 },
  { icon: ShieldCheck, who: 'Guards', does: 'Gate tablet, works offline', x: 90, y: 62 },
  { icon: HardHat, who: 'Vendors', does: 'Work orders and documents', x: 30, y: 90 },
  { icon: Smartphone, who: 'M-Pesa', does: 'Payments land on the right unit', x: 70, y: 90 },
];

const CX = 50;
const CY = 52;

/** One register in the middle, everyone who touches the estate around it. */
export function EstateMap() {
  return (
    <figure className="mx-auto max-w-5xl">
      {/* Wide screens: the map. */}
      <div className="relative hidden aspect-[16/9] md:block">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          {NODES.map((n) => {
            // A gentle curve from the centre to each node.
            const mx = (CX + n.x) / 2;
            const my = (CY + n.y) / 2 + (n.y < CY ? -6 : 6);
            return (
              <path
                key={n.who}
                d={`M ${CX} ${CY} Q ${mx} ${my} ${n.x} ${n.y}`}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeOpacity="0.28"
                strokeWidth="1.5"
                strokeDasharray="4 5"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        <div
          className="absolute flex w-56 -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-3xl bg-primary px-6 py-6 text-center text-primary-foreground shadow-lift"
          style={{ left: `${CX}%`, top: `${CY}%` }}
        >
          <span className="font-serif-soft text-xl">One estate record</span>
          <span className="mt-1 text-xs text-primary-foreground/75">Units, owners, accounts and the gate list, kept in one place</span>
        </div>
        {NODES.map((n) => (
          <div
            key={n.who}
            className="absolute flex w-52 -translate-x-1/2 -translate-y-1/2 items-start gap-3 rounded-2xl border bg-card px-4 py-3 shadow-soft"
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              <n.icon className="h-4 w-4" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold">{n.who}</span>
              <span className="block text-xs text-muted-foreground">{n.does}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Phones: the same content as a list hanging off the centre card. */}
      <div className="md:hidden">
        <div className="rounded-3xl bg-primary px-5 py-5 text-primary-foreground">
          <p className="font-serif-soft text-lg">One estate record</p>
          <p className="mt-1 text-xs text-primary-foreground/75">Units, owners, accounts and the gate list, kept in one place</p>
        </div>
        <ul className="ml-6 border-l border-dashed border-primary/30 pl-4 pt-3">
          {NODES.map((n) => (
            <li key={n.who} className="relative py-1.5 before:absolute before:-left-4 before:top-1/2 before:h-px before:w-4 before:border-t before:border-dashed before:border-primary/30">
              <div className="flex items-start gap-3 rounded-2xl border bg-card px-4 py-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><n.icon className="h-4 w-4" aria-hidden /></span>
                <span>
                  <span className="block text-sm font-semibold">{n.who}</span>
                  <span className="block text-xs text-muted-foreground">{n.does}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="sr-only">
        The estate office, owners, caretakers, guards, vendors and M-Pesa payments all work from the same estate record.
      </figcaption>
    </figure>
  );
}
