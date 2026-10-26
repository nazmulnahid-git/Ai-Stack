import { Exception } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'

/**
 * Business logic of the health module. Other modules may import this
 * file, and only this file.
 */
export default class HealthService {
  /**
   * Reports the API as healthy, or throws a 503 when the database is unreachable
   */
  async check() {
    try {
      await db.rawQuery('select 1')
    } catch (error) {
      throw new Exception('Database is unreachable', {
        status: 503,
        code: 'E_DATABASE_UNREACHABLE',
        cause: error,
      })
    }
    return { status: 'ok' as const, database: 'ok' as const }
  }
}
