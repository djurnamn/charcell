// The workspace lint: the recommended JavaScript and typescript-eslint rules
// across every source file the project writes, plus each framework's own
// plugin for its component files (React hooks for `.tsx`, Vue for `.vue`,
// Svelte for `.svelte`, Astro for the site's `.astro` pages). Formatting is
// Prettier's job, so the stylistic rules are switched off last.
import javascript from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import astro from "eslint-plugin-astro";
import reactHooks from "eslint-plugin-react-hooks";
import svelte from "eslint-plugin-svelte";
import vue from "eslint-plugin-vue";
import globals from "globals";
import typescript from "typescript-eslint";

export default defineConfig(
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      // Generated sources: the preview's build input and static build, the
      // site's component data, and the cell check's compare page.
      ".preview-generated/",
      ".preview-static/",
      "site/.astro/",
      "site/src/generated/",
      "test/text/compare.html",
      // Agent worktrees, which are full copies of the repository.
      ".claude/",
      // The experiments that tested the kit's premise, kept as they were run.
      "expressibility/",
    ],
  },
  javascript.configs.recommended,
  typescript.configs.recommended,
  vue.configs["flat/essential"],
  svelte.configs["flat/recommended"],
  astro.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      // A leading underscore marks a deliberate discard: a prop pulled out of
      // a rest spread so it is not forwarded, or a parameter kept for its
      // position.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // `interface Props extends OtherProps {}` names a public props type that
      // may grow members later.
      "@typescript-eslint/no-empty-object-type": [
        "error",
        { allowInterfaces: "with-single-extends" },
      ],
      // The kit's public component names are single words (`Table`, `Tabs`,
      // `Field`), the same name on every framework.
      "vue/multi-word-component-names": "off",
    },
  },
  {
    files: ["**/*.vue"],
    languageOptions: { parserOptions: { parser: typescript.parser } },
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts"],
    languageOptions: { parserOptions: { parser: typescript.parser } },
  },
  {
    files: ["**/*.svelte"],
    rules: {
      // A bare read inside `$effect` (`$effect(() => { code; measure(); })`)
      // is how a Svelte effect subscribes to a value it does not otherwise use.
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
  {
    files: ["**/*.tsx"],
    plugins: { "react-hooks": reactHooks },
    // The two classic hook rules. The plugin's React Compiler rules are left
    // out: nothing here is compiled by the React Compiler, and those rules
    // judge compatibility with it.
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  // Known findings in files that are not to be touched in the change that
  // introduced the linter. Each entry names the file and the rule; fix the
  // file and delete its entry.
  {
    files: [
      "site/src/components/ScenarioSelect.tsx",
      "site/src/components/Snippets.tsx",
    ],
    rules: { "react-hooks/exhaustive-deps": "off" },
  },
  {
    files: ["src/drivers/vue/SortableList.vue"],
    rules: { "vue/no-dupe-keys": "off" },
  },
  prettier,
);
