import {
  scriptFailureAttribute,
  scriptFailureBootstrapScript as bootstrapScriptFor,
} from "@scaffold-ui-kit/helpers/runtime";

/** The attribute the bootstrap stamps on `<html>` once a script fails to
 *  load: `data-charcell-scripts`, holding `failed`. */
export const SCRIPT_FAILURE_ATTRIBUTE = scriptFailureAttribute("charcell");

/**
 * An inline script that marks the page when its scripts fail to load, so a
 * Tabs shows every panel and a Tree every folded group's rows, as they do
 * with scripting off. A browser that runs no scripts matches
 * `@media (scripting: none)`, which charcell's stylesheet covers on its own;
 * one whose scripts are blocked or never arrive matches nothing, and this
 * script covers it. It loads nothing itself and stamps
 * `data-charcell-scripts="failed"` on `<html>` at the first script that fails
 * to load; while nothing fails it stamps nothing, so a page that loads
 * normally never shows the fallback. A component whose driver did mount
 * keeps working.
 *
 * Place it in `<head>`, before the page's own scripts. A Content Security
 * Policy that blocks inline scripts needs a nonce or a hash for it.
 *
 * @returns The script's source, to place inside a `<script>` element.
 * @example
 * <script dangerouslySetInnerHTML={{ __html: scriptFailureBootstrapScript() }} />
 */
export function scriptFailureBootstrapScript(): string {
  return bootstrapScriptFor({ prefix: "charcell" });
}
