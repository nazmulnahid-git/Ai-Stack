// Validates environment variables before dev or build starts
import './lib/env'

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // @__NAME__/api is only imported for its generated Tuyau route registry and types
  transpilePackages: ['@__NAME__/ui', '@__NAME__/api'],
}

export default nextConfig
