import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AuthService from '#modules/auth/auth.service'
import { loginValidator, signupValidator } from '#modules/auth/auth.validator'
import UserTransformer from '#transformers/user_transformer'

/**
 * Thin HTTP layer: validate input, call the service, serialize the result.
 */
@inject()
export default class AuthController {
  constructor(protected authService: AuthService) {}

  async signup({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(signupValidator)
    const { user, token } = await this.authService.signup(payload)
    return serialize({ user: UserTransformer.transform(user), token })
  }

  async login({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(loginValidator)
    const { user, token } = await this.authService.login(payload)
    return serialize({ user: UserTransformer.transform(user), token })
  }

  async me({ auth, serialize }: HttpContext) {
    return serialize(UserTransformer.transform(auth.getUserOrFail()))
  }

  async logout({ auth, serialize }: HttpContext) {
    await this.authService.logout(auth.getUserOrFail())
    return serialize({ loggedOut: true })
  }
}
