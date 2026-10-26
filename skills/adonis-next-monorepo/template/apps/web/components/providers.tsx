'use client'

import { toast, Toaster } from '@__NAME__/ui/components/sonner'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TuyauHTTPError } from '@tuyau/core/client'
import type { ReactNode } from 'react'

import { ThemeProvider } from '@/components/theme-provider'
import { getErrorMessage } from '@/lib/errors'

/**
 * Client errors (4xx) won't succeed on retry; server and network errors might
 */
function isRetryable(error: unknown) {
  return !(error instanceof TuyauHTTPError && error.status !== undefined && error.status < 500)
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Avoid refetching immediately on the client after SSR hydration
        staleTime: 60 * 1000,
        retry: (failureCount, error) => isRetryable(error) && failureCount < 2,
      },
    },
    // Every failed mutation shows the API's error message as a toast
    mutationCache: new MutationCache({
      onError: (error) => toast.error(getErrorMessage(error)),
    }),
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  // Server: always a fresh client so data never leaks between requests
  if (typeof window === 'undefined') {
    return makeQueryClient()
  }
  // Browser: reuse one client so a suspending render doesn't throw it away
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children}
        <Toaster richColors />
      </ThemeProvider>
      <ReactQueryDevtools buttonPosition="bottom-left" />
    </QueryClientProvider>
  )
}
