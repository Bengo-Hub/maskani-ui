'use client';

import { useState } from 'react';
import { Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { AppSwitcherTrigger, useVisibleServices } from '@bengo-hub/shared-ui-lib/app-switcher';
import { AccountPanel } from '@bengo-hub/shared-ui-lib/account-panel';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useSlug } from '@/hooks/use-access';
import { useSubscription } from '@/providers/subscription-provider';
import { AUTH_UI_URL, TREASURY_UI_URL } from '@/lib/config';
import { initials } from '@/lib/utils';
import { useAuthStore, hasPermission } from '@/store/auth';
import { PropertySwitcher } from './property-switcher';

// Literal env expressions so the bundler inlines them (see shared-ui-lib service-registry docs).
const SERVICE_URLS = {
  maskani: process.env.NEXT_PUBLIC_APP_URL || 'https://maskaniapp.codevertexafrica.com',
  treasury: TREASURY_UI_URL,
  erp: process.env.NEXT_PUBLIC_ERP_UI_URL || 'https://erp.codevertexafrica.com',
  notifications: process.env.NEXT_PUBLIC_NOTIFICATIONS_UI_URL || 'https://notifications.codevertexafrica.com',
  subscriptions: process.env.NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL || 'https://pricing.codevertexafrica.com',
  auth: AUTH_UI_URL,
};

export function Header({ title, onMenu }: { title?: string; onMenu: () => void }) {
  const slug = useSlug();
  const me = useAuthStore((s) => s.me);
  const logout = useAuthStore((s) => s.logout);
  const { info } = useSubscription();
  const { resolvedTheme, setTheme } = useTheme();
  const [accountOpen, setAccountOpen] = useState(false);
  const services = useVisibleServices({
    orgSlug: slug,
    urls: SERVICE_URLS,
    canManageLinks: hasPermission(me, 'tenant.admin') || hasPermission(me, 'settings.manage'),
    activeServiceTags: info?.activeProducts ?? null,
  });
  const name = me?.user?.name || me?.email || 'Account';

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-card px-3 pt-safe sm:h-16 sm:px-5">
      <Button variant="ghost" size="icon-lg" className="lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu />
      </Button>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {title && <span className="truncate font-display text-base font-semibold lg:hidden">{title}</span>}
        <div className="hidden min-w-0 lg:block"><PropertySwitcher /></div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <div className="lg:hidden"><PropertySwitcher /></div>
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Switch theme"
          className="hidden sm:inline-flex"
        >
          {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
        </Button>
        <AppSwitcherTrigger services={services} />
        <button type="button" onClick={() => setAccountOpen(true)} className="ml-1 rounded-full" aria-label="Account">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">{initials(name)}</AvatarFallback>
          </Avatar>
        </button>
      </div>
      <AccountPanel
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        user={{ name, email: me?.email ?? '' }}
        onSignOut={() => void logout(slug)}
        links={[{ label: 'Profile and security', href: `${AUTH_UI_URL}/dashboard/profile` }]}
      />
    </header>
  );
}
