import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Marks a route as intentionally public. Routes require authentication by
 * default (`middleware.auth()`); a route without either marker fails the
 * guard test in tests/functional/routes.spec.ts.
 */
export default class PublicMiddleware {
  handle(_ctx: HttpContext, next: NextFn) {
    return next()
  }
}
