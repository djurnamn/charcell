import { svelte } from "@sveltejs/vite-plugin-svelte";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

// The React target (and the static checks) run as plain tsx; the Vue target
// needs the Vue compiler in the pipeline, and the Svelte target the Svelte
// compiler, once for the server and once for the browser.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "react",
          include: ["test/**/*.test.{ts,tsx}", "preview/**/*.test.ts"],
          exclude: [
            "test/**/*.svelte.test.ts",
            "test/**/*.svelte.dom.test.ts",
            "test/**/*.vue.test.ts",
          ],
        },
      },
      {
        plugins: [svelte()],
        test: {
          name: "svelte",
          include: ["test/**/*.svelte.test.ts"],
        },
      },
      {
        // Mounted in jsdom, so Svelte resolves to its browser build, where the
        // server-render smokes above need the server one.
        plugins: [svelte()],
        resolve: { conditions: ["browser"] },
        test: {
          name: "svelte-dom",
          include: ["test/**/*.svelte.dom.test.ts"],
          environment: "jsdom",
        },
      },
      {
        plugins: [vue()],
        test: {
          name: "vue",
          include: ["test/**/*.vue.test.ts"],
        },
      },
    ],
  },
});
