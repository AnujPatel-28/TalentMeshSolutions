# InsForge functions

InsForge does not support `_shared/` or any cross-function relative import — a function deployed with a raw `../_shared/...` import fails the whole project build. Always bundle with esbuild before a manual deploy (`node scripts/deploy-all-functions.js` does this for every function automatically); run `npm run check:functions-bundling` to list which functions still need bundling.
