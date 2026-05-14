import type React from 'react';

import { ErrorHandlerProvider } from '@/components/providers/error-handler-provider';

import { AppSidebar } from './_components/sidebar';
import { AppTopBar } from './_components/topbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorHandlerProvider>
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppTopBar />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-y-auto bg-muted/30 p-4 pt-2 outline-none lg:p-4 lg:pt-2"
          >
            {children}
          </main>
        </div>
      </div>
    </ErrorHandlerProvider>
  );
}
