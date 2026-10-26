import pluginNext from '@next/eslint-plugin-next'
import { defineConfig, globalIgnores } from 'eslint/config'
import pluginReactHooks from 'eslint-plugin-react-hooks'
import turboPlugin from 'eslint-plugin-turbo'
import globals from 'globals'

import { base } from './base.js'

/**
 * apps/web (Next.js App Router). Kebab-case files, route folders follow the
 * App Router conventions, and a route's `_components` stay private to it.
 *
 * @param {string} tsconfigRootDir The workspace root (pass `import.meta.dirname`)
 */
export function next(tsconfigRootDir) {
  return defineConfig(
    globalIgnores(['**/.next/**', '**/out/**', '**/next-env.d.ts']),
    base(tsconfigRootDir),
    pluginReactHooks.configs.flat.recommended,
    {
      languageOptions: { globals: { ...globals.browser, ...globals.node } },
      plugins: { '@next/next': pluginNext, turbo: turboPlugin },
      rules: {
        ...pluginNext.configs.recommended.rules,
        ...pluginNext.configs['core-web-vitals'].rules,
        'turbo/no-undeclared-env-vars': 'error',
        'project/route-private-components': ['error', { root: tsconfigRootDir }],
        'check-file/filename-naming-convention': [
          'error',
          { '**/*.{ts,tsx,js,mjs}': 'KEBAB_CASE' },
          { ignoreMiddleExtensions: true },
        ],
        'check-file/folder-naming-convention': [
          'error',
          {
            '**/app/**/': 'NEXT_JS_APP_ROUTER_CASE',
            '**/{components,hooks,lib}/**/': 'KEBAB_CASE',
          },
        ],
      },
    }
  )
}
