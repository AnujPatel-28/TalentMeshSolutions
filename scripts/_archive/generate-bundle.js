const fs = require('fs');
const path = require('path');

const CONFIG = {
  includeExtensions: ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.html', '.md', '.json', '.yaml', '.yml', '.sql'],
  excludeDirectories: [
    'node_modules', '.git', '.next', 'dist', 'build', '.vercel', 'bundles', 'tmp', 'coverage',
    '.agents', '.augment', '.claude', '.kilocode', '.qoder', '.qwen', '.roo', '.trae', '.windsurf'
  ],
  excludeFiles: ['.env', '.env.local', 'package-lock.json', 'yarn.lock', '.DS_Store', 'tsconfig.tsbuildinfo'],
  projectRoot: path.resolve(__dirname, '..'),
  outputDir: path.resolve(__dirname, '../bundles'),
};

function getRelativePath(absolutePath) {
  return path.relative(CONFIG.projectRoot, absolutePath);
}

function shouldInclude(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath);
  
  if (CONFIG.excludeFiles.includes(basename)) return false;
  if (!CONFIG.includeExtensions.includes(ext)) return false;
  
  return true;
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!CONFIG.excludeDirectories.includes(file)) {
        walk(filePath, fileList);
      }
    } else {
      if (shouldInclude(filePath)) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

function generateBundle() {
  console.log('Generating project bundle...');
  const files = walk(CONFIG.projectRoot);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFileName = `project_${timestamp}.xml`;
  const outputPath = path.join(CONFIG.outputDir, outputFileName);

  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>\n<bundle>\n  <metadata>\n    <created>${new Date().toISOString()}</created>\n    <projectPath>${CONFIG.projectRoot}</projectPath>\n  </metadata>\n  <files>\n`;
  const xmlFooter = `  </files>\n</bundle>`;

  const stream = fs.createWriteStream(outputPath);
  stream.write(xmlHeader);

  for (const filePath of files) {
    const relPath = getRelativePath(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const type = relPath.endsWith('.json') || relPath.endsWith('.yaml') ? 'config' : 'code';
    
    stream.write(`    <file path="${escapeXml(relPath)}" type="${type}">\n`);
    stream.write(`      <content>${escapeXml(content)}</content>\n`);
    stream.write(`    </file>\n`);
  }

  stream.write(xmlFooter);
  stream.end();

  console.log(`Bundle generated successfully: ${outputPath}`);
}

generateBundle();
