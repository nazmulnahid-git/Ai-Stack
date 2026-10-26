import { registry } from '@__NAME__/api/registry'
import { createTuyau } from '@tuyau/core/client'
import { createTuyauReactQueryClient } from '@tuyau/react-query'

import { env } from '@/lib/env'

/**
 * Typed HTTP client for the __TITLE__ API. Routes, params, bodies and
 * responses are inferred from the AdonisJS backend (`pnpm codegen`).
 */
export const client = createTuyau({
  baseUrl: env.NEXT_PUBLIC_API_URL,
  registry,
  credentials: 'include',
})

/**
 * TanStack Query bindings over the same client, keyed by AdonisJS route
 * name, e.g. `useQuery(api.health.show.queryOptions())`.
 */
export const api = createTuyauReactQueryClient({ client })
