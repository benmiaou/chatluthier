import { AppShell } from '@mantine/core';
import type { ReactNode } from 'react';
import { AppHeader } from './Header';
import { AppFooter } from './Footer';
import { SETTINGS } from '../../constants/settings';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <AppShell
      header={{ height: SETTINGS.HEADER_HEIGHT }}
      footer={{ height: 48 }}
      padding="md"
    >
      <AppShell.Header>
        <AppHeader />
      </AppShell.Header>

      <AppShell.Main>{children}</AppShell.Main>

      <AppShell.Footer>
        <AppFooter />
      </AppShell.Footer>
    </AppShell>
  );
}
