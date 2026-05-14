'use client';

import { ReactNode, useState } from 'react';

import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from '@tanstack/react-query';

import { TooltipProvider } from '@/components/ui/tooltip';

interface QueryClientProviderWrapperProps {
  children: ReactNode;
}

/**
 * QueryClientProvider wrapper for TanStack React Query
 * App-wide React Query client (server state, retries, dedupe)
 * Includes global error handling for React Query errors
 *
 * Error Handling Strategy:
 * - All environments: Logs errors to console with context information
 * - Components: Can still handle errors locally for user-facing messages
 */
export function QueryClientProviderWrapper({
  children,
}: QueryClientProviderWrapperProps) {
  // Create QueryClient instance with default options
  // Using useState to ensure single instance across re-renders
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error: unknown, query) => {
            // Global error handler for queries
            // Log errors with context information for debugging
            console.error('[React Query] Query error:', error, {
              queryKey: query.queryKey,
              queryHash: query.queryHash,
              state: query.state,
            });
          },
        }),
        mutationCache: new MutationCache({
          onError: (error: unknown) => {
            // Global error handler for mutations
            // Log errors for debugging
            console.error('[React Query] Mutation error:', error);
          },
        }),
        defaultOptions: {
          queries: {
            // Consider data fresh for 30 seconds
            staleTime: 30 * 1000,
            // Cache data for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Retry failed requests 1 time
            retry: 1,
            // Don't refetch on window focus by default
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* Single Radix tooltip context for the app (e.g. StatusBadge thumbnail overlays). */}
      <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}
