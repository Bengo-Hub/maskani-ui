// NEXT_PUBLIC_* values must stay literal expressions so the bundler inlines them at build time.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://maskaniapi.codevertexafrica.com';
export const SSO_URL = process.env.NEXT_PUBLIC_SSO_URL || 'https://sso.codevertexafrica.com';
export const SSO_CLIENT_ID = process.env.NEXT_PUBLIC_SSO_CLIENT_ID || 'maskani-ui';
export const AUTH_UI_URL = process.env.NEXT_PUBLIC_AUTH_UI_URL || 'https://accounts.codevertexafrica.com';
export const TREASURY_API_URL = process.env.NEXT_PUBLIC_TREASURY_API_URL || 'https://booksapi.codevertexafrica.com';
export const TREASURY_UI_URL = process.env.NEXT_PUBLIC_TREASURY_UI_URL || 'https://books.codevertexafrica.com';
export const SUBSCRIPTIONS_UI_URL = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL || 'https://pricing.codevertexafrica.com';
/** maskani-commerce, the public marketplace of homes in Maskani-managed estates. */
export const MARKETPLACE_URL = process.env.NEXT_PUBLIC_MARKETPLACE_URL || 'https://maskani.codevertexafrica.com';

/** Base path for tenant-scoped maskani-api routes. */
export function tenantBase(slug: string): string {
  return `/api/v1/${encodeURIComponent(slug)}/maskani`;
}
