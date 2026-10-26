import { Exception } from '@adonisjs/core/exceptions'
import { ExceptionHandler, type HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { errors as vineErrors } from '@vinejs/vine'
import type { SimpleError } from '@vinejs/vine/types'

/**
 * One entry of the error response body. Every failed request responds with
 * `{ errors: ApiError[] }`. It is a superset of VineJS's error shape, so the
 * validation error types Tuyau generates stay accurate.
 */
export interface ApiError {
  code: string
  message: string
  field?: string
  rule?: string
  meta?: Record<string, unknown>
}

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, server error messages are sent to the client
   */
  protected debug = !app.inProduction

  /**
   * Converts every error into the `{ errors: ApiError[] }` response shape
   */
  async handle(error: unknown, ctx: HttpContext) {
    const { status, errors } = this.toApiErrors(error)
    return ctx.response.status(status).send({ errors })
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }

  private toApiErrors(error: unknown): { status: number; errors: ApiError[] } {
    if (error instanceof vineErrors.E_VALIDATION_ERROR) {
      const messages = error.messages as SimpleError[]
      return {
        status: error.status,
        errors: messages.map(({ message, field, rule, meta }) => ({
          code: 'E_VALIDATION_ERROR',
          message,
          field,
          rule,
          ...(meta ? { meta } : {}),
        })),
      }
    }

    const status = error instanceof Exception ? error.status : 500
    const isServerError = status >= 500
    const code =
      error instanceof Exception && error.code
        ? error.code
        : isServerError
          ? 'E_INTERNAL_SERVER_ERROR'
          : 'E_HTTP_EXCEPTION'
    const message =
      isServerError && !this.debug
        ? 'Internal server error'
        : error instanceof Error
          ? error.message
          : 'Unknown error'

    return { status, errors: [{ code, message }] }
  }
}
