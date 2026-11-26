import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearMarkdownFormatting,
  computeDocumentStats,
  encodeTextForDownload,
  extractOutline,
  findWildcardMatches,
  generateMarkdownTable,
  handleSmartEnter,
  handleSmartPaste,
  handleTableTab,
  toggleCheckboxAtIndex,
  toggleCheckboxAtLine,
} from './markdownOps';

test('handleSmartEnter continues bullet, numbered, and checklist items', () => {
  const r1 = handleSmartEnter('- Primo elemento', 16, 16);
  assert.ok(r1);
  assert.equal(r1.value, '- Primo elemento\n- ');

  const r2 = handleSmartEnter('1. Punto uno', 12, 12);
  assert.ok(r2);
  assert.equal(r2.value, '1. Punto uno\n2. ');

  const r3 = handleSmartEnter('  - [x] Fatto', 13, 13);
  assert.ok(r3);
  assert.equal(r3.value, '  - [x] Fatto\n  - [ ] ');

  // Empty list marker breaks out cleanly
  const r4 = handleSmartEnter('- Primo\n- ', 10, 10);
  assert.ok(r4);
  assert.equal(r4.value, '- Primo\n');
});

test('handleTableTab navigates cells and auto-aligns pipe table', () => {
  const table = '| A | B |\n| - | - |\n| foo | bar |';
  // Cursor inside "A" (index 2)
  const r1 = handleTableTab(table, 2, false);
  assert.ok(r1);
  assert.ok(r1.value.includes('| A   | B   |'));
  assert.equal(r1.value.slice(r1.selectionStart, r1.selectionEnd), 'B');

  // Pressing Tab at last cell appends a new row
  const lastCellPos = r1.value.lastIndexOf('bar');
  const r2 = handleTableTab(r1.value, lastCellPos, false);
  assert.ok(r2);
  assert.equal(r2.value.split('\n').length, 4);
});

test('handleSmartPaste wraps selected text as Markdown link when pasting URL', () => {
  const res = handleSmartPaste('Visita documentazione qui', 7, 21, 'https://example.com/docs');
  assert.ok(res);
  assert.equal(res.value, 'Visita [documentazione](https://example.com/docs) qui');

  const nonUrl = handleSmartPaste('Visita documentazione', 7, 21, 'testo normale');
  assert.equal(nonUrl, null);
});

test('clearMarkdownFormatting strips bold, italic, headings, links, and strikethrough', () => {
  const src = '## **Titolo** con ~~barrato~~ e [link](https://example.com)';
  const res = clearMarkdownFormatting(src, 0, src.length);
  assert.equal(res.value, 'Titolo con barrato e link');
});

test('toggleCheckboxAtIndex toggles target checkbox while ignoring fenced code blocks', () => {
  const doc = [
    '- [ ] Primo task',
    '```md',
    '- [ ] Non toccare questo',
    '```',
    '- [x] Secondo task',
  ].join('\n');

  const afterFirst = toggleCheckboxAtIndex(doc, 0);
  assert.ok(afterFirst.includes('- [x] Primo task'));
  assert.ok(afterFirst.includes('- [ ] Non toccare questo'));

  const afterSecond = toggleCheckboxAtIndex(afterFirst, 1);
  assert.ok(afterSecond.includes('- [ ] Secondo task'));

  const byLine = toggleCheckboxAtLine(doc, 1);
  assert.ok(byLine.includes('- [x] Primo task'));
  assert.ok(byLine.includes('- [x] Secondo task'));
  const byLine5 = toggleCheckboxAtLine(byLine, 5);
  assert.ok(byLine5.includes('- [ ] Secondo task'));
  // Non-checkbox line remains untouched
  assert.equal(toggleCheckboxAtLine(doc, 2), doc);
});

test('extractOutline returns H1-H3 headings and ignores code blocks', () => {
  const doc = '# Titolo\n\n```python\n# commento\n```\n\n## Sezione\n### Dettaglio';
  const outline = extractOutline(doc);
  assert.deepEqual(
    outline.map((h) => ({ level: h.level, text: h.text, line: h.line })),
    [
      { level: 1, text: 'Titolo', line: 1 },
      { level: 2, text: 'Sezione', line: 7 },
      { level: 3, text: 'Dettaglio', line: 8 },
    ]
  );
});

test('findWildcardMatches supports * and ? wildcards', () => {
  const matches = findWildcardMatches('file_01.md, file_02.txt, note.md', 'file_??.*', false);
  assert.equal(matches.length, 2);
  assert.equal(matches[0].text, 'file_01.md');
  assert.equal(matches[1].text, 'file_02.txt');
});

test('generateMarkdownTable, computeDocumentStats, and encodeTextForDownload work accurately', () => {
  const tbl = generateMarkdownTable(2, 3);
  assert.equal(tbl.split('\n').length, 4);

  const stats = computeDocumentStats('Ciao mondo\nSeconda riga', 14);
  assert.equal(stats.line, 2);
  assert.equal(stats.col, 4);
  assert.equal(stats.words, 4);

  const bomBytes = encodeTextForDownload('A\nB', 'UTF-8-BOM', 'CRLF');
  assert.equal(bomBytes[0], 0xef);
  assert.equal(bomBytes[1], 0xbb);
  assert.equal(bomBytes[2], 0xbf);
  assert.equal(Buffer.from(bomBytes.subarray(3)).toString('utf-8'), 'A\r\nB');
});
