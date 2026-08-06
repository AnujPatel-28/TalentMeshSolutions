// InsForge does not support `_shared/` or any cross-function relative import at deploy
// time. Deploying a function's raw index.ts (instead of the esbuild-bundled output)
// fails the whole project build. This lists every function whose source still needs
// bundling before a manual `functions deploy` — see deploy-all-functions.js / README.
const fs = require('fs');
const path = require('path');

const functionsDir = path.join(__dirname, '..', 'insforge', 'functions');
const importRe = /^import .* from ['"]\.\.?\//;

const offenders = fs.readdirSync(functionsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== '_shared')
  .filter((e) => {
    const entry = path.join(functionsDir, e.name, 'index.ts');
    if (!fs.existsSync(entry)) return false;
    return fs.readFileSync(entry, 'utf8').split('\n').some((line) => importRe.test(line));
  })
  .map((e) => e.name);

if (offenders.length > 0) {
  console.error('These functions import from _shared/ and MUST be bundled with esbuild before a manual deploy (use `node scripts/deploy-all-functions.js` or bundle by hand first):');
  offenders.forEach((slug) => console.error(`  - ${slug}`));
  process.exit(1);
}

console.log('No functions found; nothing to bundle-check.');
