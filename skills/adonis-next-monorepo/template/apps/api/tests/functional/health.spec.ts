import { test } from '@japa/runner'

test.group('Health', () => {
  test('GET /api/v1/health reports the API and database as healthy', async ({ client }) => {
    const response = await client.visit('health.show')

    response.assertStatus(200)
    response.assertBody({ data: { status: 'ok', database: 'ok' } })
  })
})
