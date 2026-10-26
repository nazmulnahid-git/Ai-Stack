'use client'

import { Button } from '@__NAME__/ui/components/button'
import { Skeleton } from '@__NAME__/ui/components/skeleton'
import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { getErrorMessage } from '@/lib/errors'

interface QueryStateProps<TData> {
  query: UseQueryResult<TData>
  /** Shown while loading. Defaults to a skeleton block. */
  loading?: ReactNode
  /** Renders the loaded response, e.g. `{({ data }) => …}` */
  children: (data: TData) => ReactNode
}

/**
 * The one way to render a query's loading, error and success states.
 * Errors show the API's message with a retry button.
 */
export function QueryState<TData>({ query, loading, children }: QueryStateProps<TData>) {
  if (query.isPending) return loading ?? <Skeleton className="h-24 w-full" />

  if (query.isError) {
    return (
      <div
        role="alert"
        className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 p-4 text-sm"
      >
        <span className="text-destructive">{getErrorMessage(query.error)}</span>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  return children(query.data)
}
