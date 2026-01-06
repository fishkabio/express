const ts = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const unusedImports = require('eslint-plugin-unused-imports');

module.exports = [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '*.js', '**/*.test.ts', '**/*.spec.ts', 'test-e2e/**'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': ts,
      'unused-imports': unusedImports,
    },
    rules: {
      ...ts.configs.recommended.rules,
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-wrapper-object-types': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          vars: 'all',
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          caughtErrors: 'all',
        },
      ],
      'unused-imports/no-unused-imports': 'error',
      'no-unreachable': 'error',
      'eqeqeq': 'error',
      '@typescript-eslint/no-floating-promises': ['error'],
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
];
