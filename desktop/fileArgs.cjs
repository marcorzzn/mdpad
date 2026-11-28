'use strict';

const path = require('node:path');

const PLAIN_TEXT_EXTENSIONS = new Set([
  '.md',
  '.markdown',
  '.mdown',
  '.mkd',
  '.txt',
  '.ini',
  '.cfg',
  '.log',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.directory',
]);

/**
 * Extract document file paths passed via CLI / Windows Explorer "Open With" or double-click.
 * Filters out the executable, Chromium/Electron flags, and script entry points.
 * @param {string[]} argv
 * @param {boolean} isPackaged
 * @returns {string[]}
 */
function extractFilePathsFromArgv(argv, isPackaged) {
  if (!Array.isArray(argv) || argv.length === 0) return [];
  const startIndex = isPackaged ? 1 : 2;
  const results = [];

  for (let i = startIndex; i < argv.length; i++) {
    const raw = typeof argv[i] === 'string' ? argv[i].trim() : '';
    if (!raw) continue;
    if (raw.startsWith('-') || raw.startsWith('--')) continue;
    if (raw === '.' || raw === './') continue;
    // Ignore Squirrel / Windows installer lifecycle hooks if ever passed
    if (/^--squirrel-/i.test(raw)) continue;
    // Ignore direct main.cjs path in dev launches
    if (!isPackaged && /(^|[\\/])main\.cjs$/i.test(raw)) continue;
    results.push(raw);
  }

  return results;
}

/**
 * Determine whether a file path should be opened directly as plain text/Markdown
 * rather than routed through the MarkItDown binary converter.
 * @param {string} filePath
 * @returns {boolean}
 */
function isPlainTextDocumentPath(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) return false;
  const base = path.basename(filePath).toLowerCase();
  if (base === '.directory' || base === 'desktop.ini') return true;
  const ext = path.extname(base).toLowerCase();
  return PLAIN_TEXT_EXTENSIONS.has(ext);
}

/**
 * Format native OS window title in classic Windows Notepad style.
 * @param {string} tabTitle
 * @param {boolean} isDirty
 * @returns {string}
 */
function formatWindowTitle(tabTitle, isDirty) {
  const safeName = (tabTitle || 'Senza titolo.md').trim();
  return `${isDirty ? '*' : ''}${safeName} - MDPad`;
}

module.exports = {
  extractFilePathsFromArgv,
  isPlainTextDocumentPath,
  formatWindowTitle,
};
