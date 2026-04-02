import { AppShell } from '@mantine/core';

import type { ReactNode } from 'react';

import React from 'react';

import { AppHeader } from './Header';

import { AppFooter } from './Footer';

import { SETTINGS } from '../../constants/settings';


interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: Readonly<AppLayoutProps>): React.ReactElement {


  return (
    <AppShell
      header={{ height: SETTINGS.HEADER_HEIGHT }}
      footer={{ height: SETTINGS.FOOTER_HEIGHT }}
      padding={0}
      h="100vh"
    >
      <AppShell.Header>
        <AppHeader />
      </AppShell.Header>

      <AppShell.Main bg="dark.9">
        {children}
      </AppShell.Main>

      <AppShell.Footer p={0}>




        <AppFooter />

      </AppShell.Footer>
    </AppShell >
  );
}
