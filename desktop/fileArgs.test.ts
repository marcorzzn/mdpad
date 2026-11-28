import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  extractFilePathsFromArgv,
  isPlainTextDocumentPath,
  formatWindowTitle,
} = require('./fileArgs.cjs') as {
  extractFilePathsFromArgv: (argv: string[], isPackaged: boolean) => string[];
  isPlainTextDocumentPath: (filePath: string) => boolean;
  formatWindowTitle: (tabTitle: string, isDirty: boolean) => string;
};

test('extractFilePathsFromArgv extracts file paths in packaged Windows launches and skips flags', () => {
  const argv = [
    'C:\\Users\\Marco\\AppData\\Local\\Programs\\MDPad\\MDPad.exe',
    '--allow-file-access-from-files',
    'C:\\Users\\Marco\\Documents\\Appunti.md',
    '-v',
    'D:\\Progetti\\_POST-IT.md',
  ];
  assert.deepEqual(extractFilePathsFromArgv(argv, true), [
    'C:\\Users\\Marco\\Documents\\Appunti.md',
    'D:\\Progetti\\_POST-IT.md',
  ]);
});

test('extractFilePathsFromArgv skips electron executable and main script in unpackaged mode', () => {
  const argv = ['electron', 'desktop/main.cjs', '--inspect', 'README.md'];
  assert.deepEqual(extractFilePathsFromArgv(argv, false), ['README.md']);
});

test('isPlainTextDocumentPath distinguishes Markdown/text from binary Office/PDF files', () => {
  assert.equal(isPlainTextDocumentPath('C:\\Docs\\note.md'), true);
  assert.equal(isPlainTextDocumentPath('C:\\Docs\\README.MARKDOWN'), true);
  assert.equal(isPlainTextDocumentPath('C:\\Docs\\desktop.ini'), true);
  assert.equal(isPlainTextDocumentPath('/home/user/.directory'), true);
  assert.equal(isPlainTextDocumentPath('C:\\Docs\\contratto.pdf'), false);
  assert.equal(isPlainTextDocumentPath('C:\\Docs\\report.docx'), false);
  assert.equal(isPlainTextDocumentPath('C:\\Docs\\budget.xlsx'), false);
});

test('formatWindowTitle matches classic Windows Notepad dirty indicator format', () => {
  assert.equal(formatWindowTitle('Appunti.md', false), 'Appunti.md - MDPad');
  assert.equal(formatWindowTitle('Appunti.md', true), '*Appunti.md - MDPad');
  assert.equal(formatWindowTitle('', false), 'Senza titolo.md - MDPad');
});
