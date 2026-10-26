'use client'

import { useQuery } from '@tanstack/react-query'

import { QueryState } from '@/components/query-state'
import { api } from '@/lib/api'

export function ApiStatus() {
  const health = useQuery(api.health.show.queryOptions())

  return (
    <QueryState query={health}>
      {({ data }) => (
        <div className="rounded-lg border p-4 text-sm">
          API {data.status} · database {data.database}
        </div>
      )}
    </QueryState>
  )
}
