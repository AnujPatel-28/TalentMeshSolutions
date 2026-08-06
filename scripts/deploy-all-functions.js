const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const functionsDir = path.join(__dirname, '..', 'insforge', 'functions');
const distDir = path.join(__dirname, '..', '.insforge-dist');

// InsForge deploys ONE file per function, so `_shared/` modules are inlined at deploy
// time: any function importing from _shared is bundled with esbuild (npm:/node:/jsr:
// specifiers stay external — the Deno runtime resolves those). Never hand-copy _shared
// code into a function. See doc 14 R-2.
function resolveDeployFile(slug) {
  const entry = path.join(functionsDir, slug, 'index.ts');
  const source = fs.readFileSync(entry, 'utf8');
  if (!source.includes('_shared/')) {
    return `insforge/functions/${slug}/index.ts`;
  }
  fs.mkdirSync(distDir, { recursive: true });
  const outfile = path.join(distDir, `${slug}.ts`);
  esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    external: ['npm:*', 'node:*', 'jsr:*', 'https:*'],
    outfile,
  });
  return path.relative(path.join(__dirname, '..'), outfile);
}

function deployFunctions() {
  const entries = fs.readdirSync(functionsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== '_shared') {
      const slug = entry.name;
      console.log(`\n🚀 Deploying function: ${slug}...`);

      try {
        const name = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        const file = resolveDeployFile(slug);
        const cmd = `npx @insforge/cli functions deploy ${slug} --file ${file} --name "${name}"`;

        execSync(cmd, { stdio: 'inherit' });
        console.log(`✅ Successfully deployed: ${slug}`);
      } catch (error) {
        console.error(`❌ Failed to deploy ${slug}: ${error.message}`);
      }
    }
  }
}

console.log('--- Starting Bulk Deployment ---');
deployFunctions();
console.log('\n--- Deployment Complete ---');
