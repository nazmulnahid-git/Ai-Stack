/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| Mounts every module's routes under /api/v1. `node ace make:module`
| adds the import and the call for new modules; don't add routes here.
|
*/

import router from '@adonisjs/core/services/router'

import authRoutes from '#modules/auth/auth.routes'
import healthRoutes from '#modules/health/health.routes'

router
  .group(() => {
    authRoutes()
    healthRoutes()
  })
  .prefix('/api/v1')
