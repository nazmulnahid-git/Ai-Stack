import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'

const HealthController = () => import('#modules/health/health.controller')

/**
 * Mounted under /api/v1 by start/routes.ts. Public: used by uptime checks
 * and load balancers.
 */
export default function healthRoutes() {
  router
    .group(() => {
      router.get('/', [HealthController, 'show']).as('show')
    })
    .prefix('health')
    .as('health')
    .use(middleware.public())
}
