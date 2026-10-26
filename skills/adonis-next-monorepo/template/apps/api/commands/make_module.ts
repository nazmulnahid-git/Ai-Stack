import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'

import { args, BaseCommand } from '@adonisjs/core/ace'
import string from '@adonisjs/core/helpers/string'
import type { CommandOptions } from '@adonisjs/core/types/ace'

const STUBS = ['routes', 'controller', 'service', 'validator', 'test']

/**
 * Generates a feature module in app/modules/<name> (<name>.routes.ts,
 * <name>.controller.ts, <name>.service.ts, <name>.validator.ts) from the stubs in
 * stubs/make/module and registers its routes in start/routes.ts.
 * This is the only way module files are created.
 */
export default class MakeModule extends BaseCommand {
  static commandName = 'make:module'
  static description =
    'Create a feature module (routes, controller, service, validator, functional test) and register its routes'
  static options: CommandOptions = {}

  @args.string({ description: 'Module name in snake_case, e.g. "blogs" or "blog_posts"' })
  declare name: string

  async run() {
    const moduleName = string.snakeCase(this.name)
    if (!/^[a-z][a-z0-9_]*$/.test(moduleName)) {
      this.logger.error(`"${this.name}" is not a valid module name`)
      this.exitCode = 1
      return
    }
    if (existsSync(this.app.makePath('app/modules', moduleName))) {
      this.logger.error(`Module "${moduleName}" already exists`)
      this.exitCode = 1
      return
    }

    const pascal = string.pascalCase(moduleName)
    const camel = string.camelCase(moduleName)
    const routePrefix = string.dashCase(moduleName)
    const state = {
      moduleName,
      moduleTitle: string.sentenceCase(moduleName),
      controllerName: `${pascal}Controller`,
      serviceName: `${pascal}Service`,
      serviceVar: `${camel}Service`,
      listValidatorName: `list${pascal}Validator`,
      routesFunctionName: `${camel}Routes`,
      routePrefix,
      fullPath: `/api/v1/${routePrefix}`,
    }

    const codemods = await this.createCodemods()
    const files = [this.app.startPath('routes.ts')]
    for (const stub of STUBS) {
      const output = await codemods.makeUsingStub(
        this.app.makePath('stubs'),
        `make/module/${stub}.stub`,
        state
      )
      files.push(output.destination)
    }
    await this.registerRoutes(state.routesFunctionName, moduleName)
    await this.format(files)

    this.logger.info('Run "pnpm codegen" (or keep "pnpm dev" running) to update the Tuyau types')
  }

  /**
   * Runs the generated files through the repo's Prettier config
   */
  private async format(files: string[]) {
    const prettier = await import('prettier')
    for (const file of files) {
      const options = await prettier.resolveConfig(file)
      const source = await readFile(file, 'utf8')
      await writeFile(file, await prettier.format(source, { ...options, filepath: file }))
    }
  }

  /**
   * Adds `import <fn> from '#modules/<name>/<name>.routes'` and a `<fn>()` call inside
   * the `/api/v1` group of start/routes.ts, keeping both lists sorted.
   */
  private async registerRoutes(routesFunctionName: string, moduleName: string) {
    const file = this.app.startPath('routes.ts')
    const lines = (await readFile(file, 'utf8')).split('\n')

    const importPattern = /^import \w+ from '(#modules\/(\w+)\/\2\.routes)'$/
    const callPattern = /^\s+\w+Routes\(\)$/
    const groupPattern = /^(\s*)\.group\(\(\) => \{$/

    const groupLine = lines.findIndex((line) => groupPattern.test(line))
    if (groupLine === -1) {
      throw new Error('start/routes.ts must contain a `router.group(() => {` block')
    }
    const indent = `${lines[groupLine]?.match(groupPattern)?.[1] ?? ''}  `

    const imports = lines.filter((line) => importPattern.test(line))
    const calls = lines.filter((line) => callPattern.test(line))
    const source = (line: string) => importPattern.exec(line)?.[1] ?? ''
    const sortedImports = [
      ...imports,
      `import ${routesFunctionName} from '#modules/${moduleName}/${moduleName}.routes'`,
    ].sort((a, b) => source(a).localeCompare(source(b)))
    const sortedCalls = [...calls, `${indent}${routesFunctionName}()`].sort((a, b) =>
      a.trim().localeCompare(b.trim())
    )

    // Without existing entries, imports go after the last import (in their own
    // group) and calls go first inside the group
    const lastImport = lines.findLastIndex((line) => line.startsWith('import '))
    const output: string[] = []
    lines.forEach((line, index) => {
      if (imports.includes(line)) {
        if (line === imports[0]) output.push(...sortedImports)
        return
      }
      if (calls.includes(line)) {
        if (line === calls[0]) output.push(...sortedCalls)
        return
      }
      output.push(line)
      if (!imports.length && index === lastImport) output.push('', ...sortedImports)
      if (!calls.length && index === groupLine) output.push(...sortedCalls)
    })

    await writeFile(file, output.join('\n'))
    this.logger.action('update start/routes.ts').succeeded()
  }
}
