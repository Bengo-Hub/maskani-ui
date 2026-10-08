import Image from 'next/image';

/**
 * Full-screen branded loading state for session restore and route guards. Logo and a plain
 * indeterminate bar on the page background: no glow, no gradient, never a bare spinner.
 */
export function AppSplash({ label = 'Opening Maskani' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-6 bg-background" role="status" aria-live="polite">
      <Image src="/brand/maskani-logo-stacked.svg" alt="Maskani by Codevertex" width={168} height={128} priority />
      <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-2/5 rounded-full bg-primary animate-splash-bar" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
