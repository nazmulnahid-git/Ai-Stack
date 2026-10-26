import type { Infer } from '@vinejs/vine/types'

import User from '#models/user'
import type { loginValidator, signupValidator } from '#modules/auth/auth.validator'

/**
 * Business logic of the auth module. Other modules may import this
 * file, and only this file.
 */
export default class AuthService {
  async signup({ fullName, email, password }: Infer<typeof signupValidator>) {
    const user = await User.create({ fullName, email, password })
    return this.issueToken(user)
  }

  async login({ email, password }: Infer<typeof loginValidator>) {
    const user = await User.verifyCredentials(email, password)
    return this.issueToken(user)
  }

  async logout(user: User) {
    if (user.currentAccessToken) {
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    }
  }

  private async issueToken(user: User) {
    const token = await User.accessTokens.create(user)
    return { user, token: token.value!.release() }
  }
}
