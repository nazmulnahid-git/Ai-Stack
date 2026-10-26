import factory from '@adonisjs/lucid/factories'

import User from '#models/user'

export const UserFactory = factory
  .define(User, ({ faker }) => ({
    fullName: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    password: 'password123',
  }))
  .build()
