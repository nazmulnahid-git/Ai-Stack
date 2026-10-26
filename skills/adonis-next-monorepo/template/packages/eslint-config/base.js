import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier'
import checkFile from 'eslint-plugin-check-file'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'

import { projectPlugin } from './rules.js'

/**
 * Shared rules for every workspace. Workspace presets (adonis, next,
 * react-library) extend this and add their own structure rules.
 *
 * @param {string} tsconfigRootDir The workspace root (pass `import.meta.dirname`)
 */
export function base(tsconfigRootDir) {
  return defineConfig(
    globalIgnores(['**/node_modules/**', '**/dist/**', '**/build/**', '**/.turbo/**']),
    js.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      plugins: {
        'check-file': checkFile,
        'simple-import-sort': simpleImportSort,
        project: projectPlugin,
      },
      rules: {
        // Imports
        'simple-import-sort/imports': 'error',
        'simple-import-sort/exports': 'error',
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/no-import-type-side-effects': 'error',
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                // ../.adonisjs is AdonisJS's generated output, which has no alias
                regex: String.raw`^\.\./(?!\.adonisjs/)`,
                message:
                  'Use the workspace import alias (#… in apps/api, @/… in apps/web) instead of ../',
              },
            ],
          },
        ],

        // No barrel files
        'check-file/no-index': ['error', { ignoreMiddleExtensions: true }],

        // Naming
        '@typescript-eslint/naming-convention': [
          'error',
          { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow' },
          // PascalCase: React components, classes, lazily imported controllers
          {
            selector: ['variable', 'function', 'parameter', 'import'],
            format: ['camelCase', 'PascalCase'],
            leadingUnderscore: 'allow',
          },
          {
            selector: 'variable',
            modifiers: ['const'],
            format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          },
          { selector: 'typeLike', format: ['PascalCase'] },
          { selector: 'enumMember', format: ['PascalCase', 'UPPER_CASE'] },
          // Lucid's $columns / $extras etc.
          { selector: 'memberLike', filter: { regex: '^\\$', match: true }, format: null },
          // Object keys mirror external shapes (HTTP headers, DB columns, route names)
          {
            selector: ['objectLiteralProperty', 'objectLiteralMethod', 'typeProperty'],
            format: null,
          },
        ],

        // Correctness
        eqeqeq: ['error', 'smart'],
        'no-console': ['error', { allow: ['warn', 'error'] }],
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
        ],
        // Framework methods (Adonis migrations, controllers) are async by contract
        '@typescript-eslint/require-await': 'off',
        // Declaration merging (`interface X extends InferY<…> {}`) is how AdonisJS types configs
        '@typescript-eslint/no-empty-object-type': [
          'error',
          { allowInterfaces: 'with-single-extends' },
        ],
      },
    },
    {
      files: ['**/*.{js,mjs,cjs}'],
      extends: [tseslint.configs.disableTypeChecked],
    },
    // Must stay last: turns off every rule that would fight Prettier
    eslintConfigPrettier
  )
}
