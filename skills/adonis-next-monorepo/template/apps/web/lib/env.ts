import { z } from 'zod'

/**
 * Environment variables, validated once at startup: next.config.ts imports
 * this file, so `next dev` and `next build` fail on a missing or invalid value.
 * Read env vars only through `env`, never `process.env`.
 */
const schema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
})

export const env = schema.parse({
  // Each NEXT_PUBLIC_ variable must be referenced literally so Next.js inlines it
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
})
