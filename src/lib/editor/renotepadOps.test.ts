import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeBytes,
  detectEncoding,
  detectIndentUnit,
  detectLineEnding,
  duplicateLines,
  encodeTextFull,
  extractFrontMatter,
  formatJsonStrict,
  formatNotepadTimestamp,
  indentLines,
  isJsonFilename,
  isLogFile,
  isOneLineJson,
  matchBracket,
  spacesForTab,
} from './renotepadOps';

test('encoding detection follows Windows 10 Notepad & RE:Notepad rules', () => {
  assert.equal(detectEncoding(new Uint8Array([0xef, 0xbb, 0xbf, 0x68, 0x69])), 'UTF-8-BOM');
  assert.equal(detectEncoding(new Uint8Array([0xff, 0xfe, 0x68, 0x00, 0x69, 0x00])), 'UTF-16 LE');
  assert.equal(detectEncoding(new Uint8Array([0xfe, 0xff, 0x00, 0x68, 0x00, 0x69])), 'UTF-16 BE');
  assert.equal(detectEncoding(new Uint8Array([])), 'UTF-8');

  // Classic "Bush hid the facts" guard (< 100 bytes plain ASCII stays UTF-8)
  const bush = new TextEncoder().encode('Bush hid the facts');
  assert.equal(detectEncoding(bush), 'UTF-8');

  // Invalid UTF-8 byte sequence falls back to ANSI
  const ansi = new Uint8Array([0x63, 0x61, 0x66, 0xe9]); // "café" in Windows-1252
  assert.equal(detectEncoding(ansi), 'ANSI');

  // BOMless UTF-16 LE text is detected accurately
  const longText = 'The quick brown fox jumps over the lazy dog. '.repeat(4);
  const utf16LeBytes = new Uint8Array(longText.length * 2);
  for (let i = 0; i < longText.length; i++) {
    utf16LeBytes[i * 2] = longText.charCodeAt(i) & 0xff;
    utf16LeBytes[i * 2 + 1] = (longText.charCodeAt(i) >> 8) & 0xff;
  }
  assert.equal(detectEncoding(utf16LeBytes), 'UTF-16 LE');
});

test('all 5 Unicode/ANSI encodings round-trip cleanly with CRLF/LF/CR', () => {
  const sample = 'Riga uno\nλ → ✓\nFine';
  for (const enc of ['UTF-8', 'UTF-8-BOM', 'UTF-16 LE', 'UTF-16 BE'] as const) {
    const bytes = encodeTextFull(sample, enc, 'CRLF');
    assert.equal(detectEncoding(bytes), enc);
    assert.equal(decodeBytes(bytes, enc), 'Riga uno\r\nλ → ✓\r\nFine');
  }
  assert.equal(detectLineEnding('a\r\nb'), 'CRLF');
  assert.equal(detectLineEnding('a\nb'), 'LF');
  assert.equal(detectLineEnding('a\rb'), 'CR');
  assert.equal(detectLineEnding('single line'), 'CRLF');
});

test('.LOG exact prefix detection and timestamp formatting', () => {
  assert.equal(isLogFile('.LOG\nfirst entry'), true);
  assert.equal(isLogFile('.log\nlowercase'), false);
  assert.equal(isLogFile(' .LOG'), false);
  const logStamp = formatNotepadTimestamp(new Date(2026, 10, 28, 14, 30), 'it-IT', true);
  assert.equal(logStamp.startsWith('\n') && logStamp.endsWith('\n'), true);
  const bareStamp = formatNotepadTimestamp(new Date(2026, 10, 28, 14, 30), 'it-IT', false);
  assert.equal(bareStamp.includes('\n'), false);
});

test('detectIndentUnit, spacesForTab, and indentLines match RE:Notepad lines.rs', () => {
  assert.equal(detectIndentUnit('{\n  "a": {\n    "b": 1\n  }\n}'), '  ');
  assert.equal(detectIndentUnit('{\n    "a": 1,\n    "b": 2\n}'), '    ');
  assert.equal(detectIndentUnit('{\n\t"a": 1\n}'), '\t');
  assert.equal(detectIndentUnit('KEY=1\nOTHER=2'), '\t');

  assert.equal(spacesForTab('    ', 0), 4);
  assert.equal(spacesForTab('    ', 5), 3);
  assert.equal(spacesForTab('\t', 3), null);

  // Indent skips empty lines and shifts selection cleanly
  const ind = indentLines('a\n\nb\nc', 1, 5, '  ', false);
  assert.ok(ind);
  assert.equal(ind.value, '  a\n\n  b\nc');
  assert.equal(ind.selectionStart, 3);
  assert.equal(ind.selectionEnd, 9);

  // Outdent removes a tab or up to one indent unit of spaces
  const out = indentLines('\ta\n      b\n c\nd', 0, 14, '    ', true);
  assert.ok(out);
  assert.equal(out.value, 'a\n  b\nc\nd');
});

test('duplicateLines (Ctrl+D) and matchBracket match RE:Notepad lines.rs', () => {
  const dup = duplicateLines('one\ntwo\nthree', 5, 5);
  assert.equal(dup.value, 'one\ntwo\ntwo\nthree');
  assert.equal(dup.selectionStart, 9);
  assert.equal(dup.selectionEnd, 9);

  const json = '{"a": [1, (2)], "b": {}}';
  assert.deepEqual(matchBracket(json, 0), [0, 23]);
  assert.deepEqual(matchBracket(json, 24), [23, 0]);
  assert.deepEqual(matchBracket(json, 6), [6, 13]);
  assert.deepEqual(matchBracket(json, 14), [13, 6]);
  assert.equal(matchBracket(json, 3), null);
  assert.equal(matchBracket('(()', 0), null);
});

test('formatJsonStrict handles minified JSON and rejects JSONL / invalid JSON', () => {
  assert.equal(isJsonFilename('config.json'), true);
  assert.equal(isJsonFilename('events.jsonl'), false);
  assert.equal(isJsonFilename('stream.ndjson'), false);

  assert.equal(isOneLineJson('{"a":1,"b":[2,3]}'), true);
  assert.equal(isOneLineJson('{\n  "a": 1\n}'), false);

  const ok = formatJsonStrict('{"a":1,"b":[true,null]}');
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.formatted, '{\n  "a": 1,\n  "b": [\n    true,\n    null\n  ]\n}');
  }

  const bad = formatJsonStrict('{"a":1,}');
  assert.equal(bad.ok, false);
  if (!bad.ok) {
    assert.equal(bad.line, 1);
  }
});

test('extractFrontMatter parses YAML front matter at line 1 and ignores mid-doc rules', () => {
  const md = '---\ntitle: Notes\ntags: [rust, win32]\nauthor: Marco\n---\n\n# Heading';
  const parsed = extractFrontMatter(md);
  assert.ok(parsed);
  assert.deepEqual(parsed.entries, [
    { key: 'title', value: 'Notes' },
    { key: 'tags', value: 'rust, win32' },
    { key: 'author', value: 'Marco' },
  ]);
  assert.equal(parsed.body, '# Heading');

  // Horizontal rule mid-doc is NOT front matter
  assert.equal(extractFrontMatter('Intro\n\n---\nnot: meta\n---\n'), null);
  // Blank line after opening --- is NOT front matter
  assert.equal(extractFrontMatter('---\n\ntitle: x\n---\n'), null);
});
