import { getPresets } from 'eslint-config-molindo';
import nextPlugin from '@next/eslint-plugin-next';

const presets = await getPresets('typescript', 'react', 'jest');

export default [
  // Ignore compiled / generated outputs and vendor-style trees
  {
    ignores: [
      'next.config.js',
      // Workflow DevKit generated routes (SWC loader / build artifacts)
      'src/app/.well-known/**',
      'scripts/**',
      'local-scripts/**',
      'src/components/ui/**',
    ],
  },
  ...presets,
  // Next.js plugin configuration
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
    },
  },
  // Custom rule overrides
  {
    rules: {
      // 大括号内保留空格，如 import { cn }、const { a } = obj
      'object-curly-spacing': ['error', 'always'],
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'type',
          ],
          pathGroups: [
            { pattern: 'react', group: 'external', position: 'before' },
            { pattern: 'react/**', group: 'external', position: 'before' },
            // UI 组件排在 internal 最前
            {
              pattern: '@/components/**',
              group: 'internal',
              position: 'before',
            },
            // 逻辑/工具类 @/ 保持 internal（components 已单独匹配）
            { pattern: '@/lib/**', group: 'internal' },
            { pattern: '@/hooks/**', group: 'internal' },
            { pattern: '@/constants/**', group: 'internal' },
            { pattern: '@/contexts/**', group: 'internal' },
            { pattern: '@/types/**', group: 'internal' },
            { pattern: '@/config/**', group: 'internal' },
            // Monorepo workspace packages: keep classification stable across CI vs
            // local (Vercel often resolves these as node_modules "external").
            // Must precede the generic `@/**` pathGroup — first match wins.
            { pattern: '@app/**', group: 'internal' },
            { pattern: '@/**', group: 'internal' },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          warnOnUnassignedImports: false,
        },
      ],
      'sort-imports': 'off',
      'func-style': 'off',
      'arrow-body-style': 'off',
      'react/jsx-sort-props': 'off',
      'prefer-arrow-callback': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/method-signature-style': 'off',
      'sort-destructure-keys/sort-destructure-keys': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      'dot-notation': 'warn',
      // TODO: Fix these and remove - temporarily set to warn for build
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/media-has-caption': 'warn',
      'react/button-has-type': 'warn',
      'react/no-unstable-nested-components': 'warn',
      'react/function-component-definition': 'warn',
      'react/no-unescaped-entities': 'warn',
      'react/no-unused-prop-types': 'warn',
      'react/display-name': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'import/no-extraneous-dependencies': 'warn',
      'unicorn/explicit-length-check': 'warn',
      'no-console': 'warn',
      'no-control-regex': 'warn',
      'func-names': 'warn',
      '@typescript-eslint/no-shadow': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/switch-exhaustiveness-check': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/heading-has-content': 'warn',
      'jsx-a11y/anchor-has-content': 'warn',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': 'warn',
      // Keep as error - critical rule, use eslint-disable only for false positives
      'react-hooks/rules-of-hooks': 'error',
    },
  },
];
