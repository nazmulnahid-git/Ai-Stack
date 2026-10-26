'use client'

import { Button } from '@__NAME__/ui/components/button'

/**
 * Route-level error boundary: shown when rendering a page throws.
 * Failed requests are handled where they happen (QueryState, mutation toasts).
 */
export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <Button onClick={reset}>Try again</Button>
    </main>
  )
}
