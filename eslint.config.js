import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Minimal local mirror of the security engine's `dangerously-set-innerhtml`
// rule (the aislop quality gate also enforces it). Defining it here means a raw
// `dangerouslySetInnerHTML` is flagged by `eslint .` too — and that a deliberate,
// DOMPurify-sanitized sink can be cleared with a scoped `eslint-disable-next-line
// security/dangerously-set-innerhtml`, valid in both linters instead of breaking
// `eslint .` with an "unknown rule" error.
const security = {
  rules: {
    'dangerously-set-innerhtml': {
      meta: {
        type: 'problem',
        docs: { description: 'Flag dangerouslySetInnerHTML; sanitize before use.' },
        schema: [],
      },
      create(context) {
        return {
          JSXAttribute(node) {
            if (node.name?.name === 'dangerouslySetInnerHTML') {
              context.report({
                node,
                message: 'dangerouslySetInnerHTML can lead to XSS if not sanitized.',
              })
            }
          },
        }
      },
    },
  },
}

// Minimal local mirrors of the aislop lint engine's (oxlint) jsx-a11y rules that
// fire on this codebase. Like the security rule above, defining them here keeps a
// scoped `eslint-disable` directive valid in BOTH linters: aislop honors the
// comment directly, and `eslint .` resolves the rule name instead of erroring.
// The mirrors are deliberately narrow — they only reproduce the patterns oxlint
// flags here (intentional W3C APG ARIA that the heuristics can't recognize).
const staticRole = (node) => {
  const role = node.attributes?.find?.((a) => a.name?.name === 'role')
  return role?.value?.type === 'Literal' ? role.value : undefined
}
// Roles oxlint's prefer-tag-over-role maps to native tags (subset in use here).
const ROLE_WITH_NATIVE_TAG = new Set(['listbox', 'option', 'group', 'dialog', 'search', 'combobox'])
const jsxA11y = {
  rules: {
    'prefer-tag-over-role': {
      meta: { type: 'suggestion', docs: { description: 'Prefer native tags over role attributes.' }, schema: [] },
      create(context) {
        return {
          JSXAttribute(node) {
            if (
              node.name?.name === 'role' &&
              node.value?.type === 'Literal' &&
              ROLE_WITH_NATIVE_TAG.has(node.value.value)
            ) {
              context.report({ node, message: `Prefer a native tag over role="${node.value.value}".` })
            }
          },
        }
      },
    },
    'no-noninteractive-element-to-interactive-role': {
      meta: { type: 'suggestion', docs: { description: 'Non-interactive elements should not get interactive roles.' }, schema: [] },
      create(context) {
        const NONINTERACTIVE = new Set(['ul', 'ol', 'li'])
        const INTERACTIVE_ROLES = new Set(['listbox', 'option', 'combobox', 'menu', 'menuitem'])
        return {
          JSXOpeningElement(node) {
            const role = staticRole(node)
            if (
              NONINTERACTIVE.has(node.name?.name) &&
              role &&
              INTERACTIVE_ROLES.has(role.value)
            ) {
              context.report({ node: role.parent ?? node, message: `<${node.name.name}> should not have role="${role.value}".` })
            }
          },
        }
      },
    },
    'interactive-supports-focus': {
      meta: { type: 'suggestion', docs: { description: 'Elements with interactive roles must be focusable.' }, schema: [] },
      create(context) {
        const FOCUSABLE_TAGS = new Set(['input', 'button', 'select', 'textarea', 'a'])
        return {
          JSXOpeningElement(node) {
            const role = staticRole(node)
            const hasTabIndex = node.attributes?.some?.((a) => a.name?.name === 'tabIndex')
            if (role?.value === 'combobox' && !hasTabIndex && !FOCUSABLE_TAGS.has(node.name?.name)) {
              context.report({ node, message: 'Element with role="combobox" must be focusable.' })
            }
          },
        }
      },
    },
  },
}

export default defineConfig([
  globalIgnores(['dist', 'e2e', 'playwright.config.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { security, 'jsx-a11y': jsxA11y },
    rules: {
      'security/dangerously-set-innerhtml': 'error',
      'jsx-a11y/prefer-tag-over-role': 'warn',
      'jsx-a11y/no-noninteractive-element-to-interactive-role': 'warn',
      'jsx-a11y/interactive-supports-focus': 'warn',
    },
    languageOptions: {
      globals: globals.browser,
    },
  },
])
