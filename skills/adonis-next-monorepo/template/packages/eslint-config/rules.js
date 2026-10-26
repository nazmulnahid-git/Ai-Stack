import path from 'node:path'

/**
 * Project-specific ESLint rules that enforce the folder structure described in
 * docs/conventions.md. Registered as the `project` plugin.
 */

/**
 * Collects every static import/export source in a file and passes it to `check`.
 */
function onImportSource(check) {
  const visit = (node) => {
    if (node.source && typeof node.source.value === 'string') {
      check(node.source, node.source.value)
    }
  }
  return {
    ImportDeclaration: visit,
    ExportNamedDeclaration: visit,
    ExportAllDeclaration: visit,
    ImportExpression: visit,
  }
}

/**
 * apps/api: a module may import another module only through its service,
 * e.g. app/modules/blogs/* may import #modules/users/users.service.
 */
const moduleBoundaries = {
  meta: {
    type: 'problem',
    docs: { description: 'Only import another module through its `<module>.service` file' },
    messages: {
      crossModule:
        "Module '{{from}}' may not import '{{source}}'. Import another module only through '#modules/{{to}}/{{to}}.service'.",
    },
    schema: [],
  },
  create(context) {
    const ownMatch = context.filename
      .split(path.sep)
      .join('/')
      .match(/\/app\/modules\/([^/]+)\//)
    if (!ownMatch) return {}
    const own = ownMatch[1]

    return onImportSource((node, source) => {
      let target
      if (source.startsWith('#modules/')) {
        target = source.slice('#modules/'.length)
      } else if (source.startsWith('.')) {
        const resolved = path
          .resolve(path.dirname(context.filename), source)
          .split(path.sep)
          .join('/')
        target = resolved.match(/\/app\/modules\/(.+)$/)?.[1]
      }
      if (!target) return

      const [module, ...rest] = target.split('/')
      if (module === own) return

      const file = rest.join('/').replace(/\.(js|ts)$/, '')
      if (file === `${module}.service`) return

      context.report({ node, messageId: 'crossModule', data: { from: own, to: module, source } })
    })
  },
}

/**
 * apps/api: files in app/modules/<name>/ are named <name>.<kind>.ts, where
 * kind is one of MODULE_FILE_KINDS, e.g. app/modules/blogs/blogs.service.ts.
 */
const MODULE_FILE_KINDS = ['routes', 'controller', 'service', 'validator']

const moduleFileNames = {
  meta: {
    type: 'problem',
    docs: { description: 'Name module files `<module>.<routes|controller|service|validator>.ts`' },
    messages: {
      badName:
        "'{{file}}' in module '{{module}}' must be named {{module}}.<{{kinds}}>.ts. Generate modules with `node ace make:module`.",
    },
    schema: [],
  },
  create(context) {
    const match = context.filename
      .split(path.sep)
      .join('/')
      .match(/\/app\/modules\/([^/]+)\/([^/]+)$/)
    if (!match) return {}
    const [, module, file] = match
    const allowed = MODULE_FILE_KINDS.map((kind) => `${module}.${kind}.ts`)
    if (allowed.includes(file)) return {}

    return {
      Program(node) {
        context.report({
          node,
          messageId: 'badName',
          data: { file, module, kinds: MODULE_FILE_KINDS.join('|') },
        })
      },
    }
  },
}

/**
 * apps/web: an `_components` folder belongs to its route segment. Only files
 * inside that segment (or its child segments) may import from it.
 */
const routePrivateComponents = {
  meta: {
    type: 'problem',
    docs: { description: "Only import a route's `_components` from within that route" },
    messages: {
      foreignRoute:
        "'{{source}}' is private to another route. Move it to components/ if a second route needs it.",
    },
    schema: [
      { type: 'object', properties: { root: { type: 'string' } }, additionalProperties: false },
    ],
  },
  create(context) {
    const root = context.options[0]?.root ?? context.cwd
    const fromDir = path.dirname(context.filename)

    return onImportSource((node, source) => {
      if (!source.includes('_components')) return

      let resolved
      if (source.startsWith('@/')) resolved = path.join(root, source.slice(2))
      else if (source.startsWith('.')) resolved = path.resolve(fromDir, source)
      else return

      const owner = resolved.slice(0, resolved.indexOf(`${path.sep}_components`))
      const relative = path.relative(owner, fromDir)
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        context.report({ node, messageId: 'foreignRoute', data: { source } })
      }
    })
  },
}

export const projectPlugin = {
  meta: { name: 'project' },
  rules: {
    'module-boundaries': moduleBoundaries,
    'module-file-names': moduleFileNames,
    'route-private-components': routePrivateComponents,
  },
}
