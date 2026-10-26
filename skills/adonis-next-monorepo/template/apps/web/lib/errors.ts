import type { ApiError } from '@__NAME__/api/errors'
import { TuyauHTTPError, TuyauNetworkError } from '@tuyau/core/client'

/**
 * The API's error entries from a failed request (`{ errors: ApiError[] }`),
 * or a single synthetic entry for network and unexpected failures.
 */
function getApiErrors(error: unknown): ApiError[] {
  if (error instanceof TuyauHTTPError) {
    const body = error.response as { errors?: ApiError[] } | undefined
    if (body?.errors?.length) return body.errors
    return [{ code: 'E_HTTP_ERROR', message: `Request failed with status ${error.status}` }]
  }
  if (error instanceof TuyauNetworkError) {
    return [{ code: 'E_NETWORK', message: 'Cannot reach the server. Check your connection.' }]
  }
  return [{ code: 'E_UNKNOWN', message: 'Something went wrong' }]
}

/**
 * A message to show the user for any failed request
 */
export function getErrorMessage(error: unknown) {
  return getApiErrors(error)[0]?.message ?? 'Something went wrong'
}
