import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'

const AuthController = () => import('#modules/auth/auth.controller')

/**
 * Mounted under /api/v1 by start/routes.ts. Routes require authentication;
 * put public routes in a separate group marked with middleware.public().
 */
export default function authRoutes() {
  router
    .group(() => {
      router.post('signup', [AuthController, 'signup']).as('signup')
      router.post('login', [AuthController, 'login']).as('login')
    })
    .prefix('auth')
    .as('auth')
    .use(middleware.public())

  router
    .group(() => {
      router.get('me', [AuthController, 'me']).as('me')
      router.post('logout', [AuthController, 'logout']).as('logout')
    })
    .prefix('auth')
    .as('auth')
    .use(middleware.auth())
}
