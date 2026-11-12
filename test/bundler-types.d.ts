// What a consumer's bundler declares for stylesheet imports (vite's
// `vite/client`, for one): the linked face imports each component's CSS
// beside it, and `typecheck:dist` checks it as such a consumer would.
declare module "*.css" {}
