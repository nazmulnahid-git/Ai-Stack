import { defineConfig } from 'eslint/config'
import pluginReactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

import { base } from './base.js'

/**
 * packages/ui. Generic, app-agnostic components: no imports from apps, no
 * data fetching, no Next.js APIs.
 *
 * @param {string} tsconfigRootDir The workspace root (pass `import.meta.dirname`)
 */
export function reactLibrary(tsconfigRootDir) {
  return defineConfig(base(tsconfigRootDir), pluginReactHooks.configs.flat.recommended, {
    languageOptions: { globals: globals.browser },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/*',
                '@__NAME__/web',
                '@__NAME__/web/*',
                '@__NAME__/api',
                '@__NAME__/api/*',
              ],
              message: 'packages/ui must not depend on an app. Keep app-specific code in the app.',
            },
            {
              group: ['next', 'next/*', '@tanstack/*', '@tuyau/*'],
              message: 'packages/ui components stay framework- and data-agnostic.',
            },
            { group: ['../*'], message: 'Use @__NAME__/ui/… instead of ../' },
          ],
        },
      ],
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.{ts,tsx,js,mjs}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],
      'check-file/folder-naming-convention': ['error', { '**/': 'KEBAB_CASE' }],
    },
  })
}
