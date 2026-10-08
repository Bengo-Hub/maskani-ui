import { Fraunces } from 'next/font/google';

/**
 * Soft serif for public-page headlines. Imported only by the landing and sign-in screens, so the
 * console never downloads it; apply `fraunces.variable` on the page wrapper and use `font-serif-soft`.
 */
export const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'opsz'],
});
