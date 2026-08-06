const fs = require('fs');
const path = require('path');

const functionsDir = path.join(__dirname, '..', 'insforge', 'functions');

const replacements = [
  {
    from: "import { createClient } from '@insforge/sdk';",
    to: "import { createClient } from 'npm:@insforge/sdk';"
  },
  {
    from: "import { z } from 'zod';",
    to: "import { z } from 'npm:zod';"
  },
  {
    from: /process\.env\.(\w+)/g,
    to: "Deno.env.get('$1')"
  }
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const r of replacements) {
    if (typeof r.from === 'string') {
      if (content.includes(r.from)) {
        content = content.split(r.from).join(r.to);
        changed = true;
      }
    } else {
      if (r.from.test(content)) {
        content = content.replace(r.from, r.to);
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  }
}

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.isFile() && (entry.name === 'index.ts' || entry.name.endsWith('.ts'))) {
      fixFile(fullPath);
    }
  }
}

processDir(functionsDir);
console.log('All functions fixed.');
