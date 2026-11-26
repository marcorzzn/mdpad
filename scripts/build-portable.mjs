import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

const ROOT = process.cwd();
const RELEASE_DIR = path.join(ROOT, 'release');
const OUT_ZIP = path.join(RELEASE_DIR, 'MDPad-Portable.zip');

async function addDirectoryToZip(zip, absDir, zipPrefix) {
  const entries = await fs.readdir(absDir, { withFileTypes: true });
  for (const entry of entries) {
    const absPath = path.join(absDir, entry.name);
    const relPath = path.posix.join(zipPrefix, entry.name);
    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, absPath, relPath);
    } else if (entry.isFile()) {
      const content = await fs.readFile(absPath);
      zip.file(relPath, content);
    }
  }
}

async function main() {
  const distDir = path.join(ROOT, 'dist');
  try {
    await fs.access(path.join(distDir, 'index.html'));
  } catch {
    throw new Error('dist/index.html non trovato. Esegui prima "npm run build".');
  }

  await fs.mkdir(RELEASE_DIR, { recursive: true });
  const zip = new JSZip();

  await addDirectoryToZip(zip, distDir, 'MDPad-Portable/dist');
  await addDirectoryToZip(zip, path.join(ROOT, 'public', 'samples'), 'MDPad-Portable/public/samples');
  await addDirectoryToZip(zip, path.join(ROOT, 'src', 'lib', 'markitdown'), 'MDPad-Portable/src/lib/markitdown');

  for (const file of ['server.ts', 'package.json', 'package-lock.json', 'README.md', 'LICENSE']) {
    const abs = path.join(ROOT, file);
    try {
      const data = await fs.readFile(abs);
      zip.file(`MDPad-Portable/${file}`, data);
    } catch {
      // Optional file
    }
  }

  const winLauncher = [
    '@echo off',
    'title MDPad - Blocco Note Markdown + MarkItDown',
    'cd /d "%~dp0"',
    'if not exist node_modules (',
    '  echo Prima configurazione dipendenze Node.js...',
    '  call npm install --omit=dev --no-audit --no-fund',
    ')',
    'set NODE_ENV=production',
    'start "" http://localhost:3000',
    'node --experimental-strip-types server.ts',
    'pause',
    '',
  ].join('\r\n');

  const unixLauncher = [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    'cd "$(dirname "$0")"',
    'if [ ! -d node_modules ]; then',
    '  npm install --omit=dev --no-audit --no-fund',
    'fi',
    'export NODE_ENV=production',
    'echo "Avvio MDPad su http://localhost:3000"',
    'node --experimental-strip-types server.ts',
    '',
  ].join('\n');

  zip.file('MDPad-Portable/Avvia_MDPad.bat', winLauncher);
  zip.file('MDPad-Portable/start-mdpad.sh', unixLauncher, { unixPermissions: '755' });

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  await fs.writeFile(OUT_ZIP, buffer);
  console.log(`Creato pacchetto portatile: ${OUT_ZIP} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
