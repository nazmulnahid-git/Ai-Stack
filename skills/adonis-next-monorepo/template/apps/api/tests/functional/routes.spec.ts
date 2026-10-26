import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

/**
 * Routes require authentication by default. A route must opt out explicitly
 * with middleware.public(); forgetting both markers fails this test.
 */
test.group('Routes', () => {
  test('every route is marked with either auth or public middleware', ({ assert }) => {
    const unmarked = Object.values(router.toJSON())
      .flat()
      .filter((route) => {
        const names = [...route.middleware.all()].map((entry) =>
          'name' in entry ? entry.name : undefined
        )
        return !names.includes('auth') && !names.includes('public')
      })
      .map((route) => `${route.methods.join('|')} ${route.pattern}`)

    assert.deepEqual(
      unmarked,
      [],
      `Routes without auth or public middleware: ${unmarked.join(', ')}`
    )
  })
})
