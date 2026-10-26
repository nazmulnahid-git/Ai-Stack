import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import HealthService from '#modules/health/health.service'

/**
 * Thin HTTP layer: validate input, call the service, serialize the result.
 */
@inject()
export default class HealthController {
  constructor(protected healthService: HealthService) {}

  async show({ serialize }: HttpContext) {
    return serialize(await this.healthService.check())
  }
}
