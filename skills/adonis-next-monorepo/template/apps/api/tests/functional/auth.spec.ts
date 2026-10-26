import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

import { UserFactory } from '#database/factories/user_factory'

test.group('Auth', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('POST /api/v1/auth/signup creates an account and returns a token', async ({
    client,
    assert,
  }) => {
    const response = await client.visit('auth.signup').json({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password123',
      passwordConfirmation: 'password123',
    })

    response.assertStatus(200)
    response.assertBodyContains({ data: { user: { email: 'ada@example.com' } } })
    assert.isString(response.body().data.token)
  })

  test('POST /api/v1/auth/signup rejects invalid input with the error shape', async ({
    client,
  }) => {
    const response = await client
      .visit('auth.signup')
      // @ts-expect-error: deliberately invalid body
      .json({ email: 'not-an-email' })

    response.assertStatus(422)
    response.assertBodyContains({
      errors: [{ code: 'E_VALIDATION_ERROR', field: 'email', rule: 'email' }],
    })
  })

  test('POST /api/v1/auth/login returns a token for valid credentials', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.merge({ password: 'password123' }).create()

    const response = await client
      .visit('auth.login')
      .json({ email: user.email, password: 'password123' })

    response.assertStatus(200)
    assert.isString(response.body().data.token)
  })

  test('POST /api/v1/auth/login rejects invalid credentials', async ({ client }) => {
    const user = await UserFactory.create()

    const response = await client
      .visit('auth.login')
      .json({ email: user.email, password: 'wrong-password' })

    response.assertStatus(400)
    response.assertBodyContains({ errors: [{ code: 'E_INVALID_CREDENTIALS' }] })
  })

  test('GET /api/v1/auth/me returns the signed-in user', async ({ client }) => {
    const user = await UserFactory.create()

    const response = await client.visit('auth.me').loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({ data: { id: user.id, email: user.email } })
  })

  test('GET /api/v1/auth/me requires authentication', async ({ client }) => {
    const response = await client.visit('auth.me')

    response.assertStatus(401)
    response.assertBodyContains({ errors: [{ code: 'E_UNAUTHORIZED_ACCESS' }] })
  })

  test('POST /api/v1/auth/logout revokes the token', async ({ client }) => {
    const user = await UserFactory.create()

    const response = await client.visit('auth.logout').loginAs(user)

    response.assertStatus(200)
    response.assertBody({ data: { loggedOut: true } })
  })
})
