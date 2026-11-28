import type { FileEncoding, LineEnding } from '../markitdown/types';
import type { EditResult } from './markdownOps';

export interface FrontMatterEntry {
  key: string;
  value: string;
}

export interface ParsedFrontMatter {
  entries: FrontMatterEntry[];
  body: string;
}

export type JsonFormatResult =
  | { ok: true; formatted: string }
  | { ok: false; line: number; col: number; offset: number; message: string };

/**
 * Windows 10 Notepad / RE:Notepad encoding detection order:
 * 1. Explicit BOM (UTF-8 BOM, UTF-16 LE, UTF-16 BE)
 * 2. Empty -> UTF-8
 * 3. BOMless UTF-16 LE heuristic with the classic < 100 byte "Bush hid the facts" guard
 * 4. Strict UTF-8 validation -> UTF-8
 * 5. Fallback -> ANSI
 */
export function detectEncoding(bytes: Uint8Array): FileEncoding {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return 'UTF-8-BOM';
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return 'UTF-16 LE';
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return 'UTF-16 BE';
  }
  if (bytes.length === 0) {
    return 'UTF-8';
  }
  if (isLikelyBomlessUtf16Le(bytes)) {
    return 'UTF-16 LE';
  }
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return 'UTF-8';
  } catch {
    return 'ANSI';
  }
}

/**
 * Mirrors Windows' IsTextUnicode guard from RE:Notepad encoding.rs:
 * Rejects purely statistical verdicts on files under 100 bytes ("Bush hid the facts").
 */
function isLikelyBomlessUtf16Le(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes.length % 2 !== 0) return false;

  const samplePairs = Math.min(bytes.length / 2, 512);
  let nullOdd = 0;
  let nullEven = 0;
  let asciiOddZero = 0;

  for (let i = 0; i < samplePairs; i++) {
    const lo = bytes[i * 2];
    const hi = bytes[i * 2 + 1];
    if (lo === 0) nullEven++;
    if (hi === 0) {
      nullOdd++;
      if ((lo >= 0x20 && lo <= 0x7e) || lo === 0x09 || lo === 0x0a || lo === 0x0d) {
        asciiOddZero++;
      }
    }
  }

  // Genuine UTF-16 LE text has NUL high bytes on ASCII code points
  if (nullOdd > 0 && nullEven === 0 && asciiOddZero / samplePairs >= 0.7) {
    return true;
  }

  // Statistical-only fallback is explicitly rejected on < 100 bytes (Windows 10 Notepad fix)
  if (bytes.length < 100) {
    return false;
  }

  return nullOdd >= samplePairs * 0.5 && nullEven === 0;
}

/**
 * Decode raw file bytes into JS UTF-16 string using the detected/selected encoding.
 * Strips BOMs cleanly.
 */
export function decodeBytes(bytes: Uint8Array, encoding: FileEncoding): string {
  switch (encoding) {
    case 'UTF-8-BOM': {
      const payload =
        bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
          ? bytes.subarray(3)
          : bytes;
      return new TextDecoder('utf-8').decode(payload);
    }
    case 'UTF-8':
      return new TextDecoder('utf-8').decode(bytes);
    case 'UTF-16 LE': {
      const payload =
        bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe ? bytes.subarray(2) : bytes;
      return new TextDecoder('utf-16le').decode(payload);
    }
    case 'UTF-16 BE': {
      const payload =
        bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff ? bytes.subarray(2) : bytes;
      const units = new Uint16Array(Math.floor(payload.length / 2));
      for (let i = 0; i < units.length; i++) {
        units[i] = (payload[i * 2] << 8) | payload[i * 2 + 1];
      }
      return Array.from(units, (u) => String.fromCharCode(u)).join('');
    }
    case 'ANSI': {
      let out = '';
      for (let i = 0; i < bytes.length; i++) {
        out += String.fromCharCode(bytes[i]);
      }
      return out;
    }
  }
}

/**
 * Detect the first line break style present in text (CRLF, LF, or CR).
 * Defaults to CRLF when the file has no line breaks, matching Windows Notepad / json.rs.
 */
export function detectLineEnding(text: string): LineEnding {
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\r') {
      return text[i + 1] === '\n' ? 'CRLF' : 'CR';
    }
    if (ch === '\n') {
      return 'LF';
    }
  }
  return 'CRLF';
}

export function normalizeLineEndingsAll(text: string, lineEnding: LineEnding): string {
  const lf = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (lineEnding === 'CRLF') return lf.replace(/\n/g, '\r\n');
  if (lineEnding === 'CR') return lf.replace(/\n/g, '\r');
  return lf;
}

/**
 * Encode document text to bytes for all 5 Windows 10 Notepad / RE:Notepad encodings.
 */
export function encodeTextFull(
  text: string,
  encoding: FileEncoding,
  lineEnding: LineEnding
): Uint8Array {
  const normalized = normalizeLineEndingsAll(text, lineEnding);

  if (encoding === 'ANSI') {
    const bytes = new Uint8Array(normalized.length);
    for (let i = 0; i < normalized.length; i++) {
      const code = normalized.charCodeAt(i);
      bytes[i] = code <= 0xff ? code : 0x3f;
    }
    return bytes;
  }

  if (encoding === 'UTF-16 LE') {
    const out = new Uint8Array(2 + normalized.length * 2);
    out[0] = 0xff;
    out[1] = 0xfe;
    for (let i = 0; i < normalized.length; i++) {
      const code = normalized.charCodeAt(i);
      out[2 + i * 2] = code & 0xff;
      out[2 + i * 2 + 1] = (code >> 8) & 0xff;
    }
    return out;
  }

  if (encoding === 'UTF-16 BE') {
    const out = new Uint8Array(2 + normalized.length * 2);
    out[0] = 0xfe;
    out[1] = 0xff;
    for (let i = 0; i < normalized.length; i++) {
      const code = normalized.charCodeAt(i);
      out[2 + i * 2] = (code >> 8) & 0xff;
      out[2 + i * 2 + 1] = code & 0xff;
    }
    return out;
  }

  const utf8 = new TextEncoder().encode(normalized);
  if (encoding === 'UTF-8-BOM') {
    const out = new Uint8Array(3 + utf8.length);
    out[0] = 0xef;
    out[1] = 0xbb;
    out[2] = 0xbf;
    out.set(utf8, 3);
    return out;
  }

  return utf8;
}

/**
 * Classic Windows Notepad `.LOG` diary rule (RE:Notepad text.rs):
 * Exact case-sensitive prefix ".LOG" at the very start of the file.
 */
export function isLogFile(text: string): boolean {
  return text.startsWith('.LOG');
}

/**
 * Locale-formatted timestamp without seconds (F5 bare, .LOG wrapped in newlines).
 */
export function formatNotepadTimestamp(
  date: Date = new Date(),
  locale: string = 'it-IT',
  forLog = false
): string {
  const timeStr = date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = date.toLocaleDateString(locale);
  const stamp = `${timeStr} ${dateStr}`;
  return forLog ? `\n${stamp}\n` : stamp;
}

// ---------------------------------------------------------------------------
// Line commands (exact port of RE:Notepad lines.rs)
// ---------------------------------------------------------------------------

function lineStart(text: string, idx: number): number {
  const nl = text.lastIndexOf('\n', idx - 1);
  return nl === -1 ? 0 : nl + 1;
}

function lineEnd(text: string, idx: number): number {
  const nl = text.indexOf('\n', idx);
  return nl === -1 ? text.length : nl;
}

function touchedBlock(text: string, selStart: number, selEnd: number): [number, number] {
  const start = lineStart(text, selStart);
  let j = selEnd;
  if (selEnd > selStart && lineStart(text, selEnd) === selEnd) {
    if (text[j - 1] === '\n') j -= 1;
  }
  j = Math.max(j, start);
  return [start, lineEnd(text, lineStart(text, j))];
}

/**
 * Detect the indentation unit of a file (exact port of RE:Notepad lines.rs::indent_unit).
 * Scans up to 10,000 lines; returns spaces of most common step (2..=8) or "\t".
 */
export function detectIndentUnit(text: string): string {
  let tabs = 0;
  let spaced = 0;
  const steps = new Array<number>(9).fill(0);
  let prev: number | null = null;

  const lines = text.split('\n');
  const limit = Math.min(lines.length, 10_000);
  for (let i = 0; i < limit; i++) {
    const line = lines[i].endsWith('\r') ? lines[i].slice(0, -1) : lines[i];
    if (/^[ \t]*$/.test(line)) continue;
    if (line[0] === '\t') {
      tabs++;
      prev = null;
    } else {
      let n = 0;
      while (n < line.length && line[n] === ' ') n++;
      if (n > 0) spaced++;
      if (prev !== null) {
        const step = Math.abs(n - prev);
        if (step >= 2 && step <= 8) steps[step]++;
      }
      prev = n;
    }
  }

  if (spaced > tabs) {
    let bestWidth = 0;
    let bestCount = 0;
    for (let k = 2; k <= 8; k++) {
      if (steps[k] > bestCount) {
        bestCount = steps[k];
        bestWidth = k;
      }
    }
    return ' '.repeat(bestCount > 0 ? bestWidth : 4);
  }
  return '\t';
}

/**
 * Number of spaces Tab inserts at `col` for a space-indented file (to next tab stop),
 * or null if the file uses literal tab characters.
 */
export function spacesForTab(unit: string, col: number): number | null {
  if (unit.startsWith(' ') && unit.length > 0) {
    return unit.length - (col % unit.length);
  }
  return null;
}

/**
 * Tab / Shift+Tab on selected lines (or single line on Shift+Tab), skipping empty lines on indent.
 */
export function indentLines(
  text: string,
  selStart: number,
  selEnd: number,
  unit: string,
  outdent: boolean
): EditResult | null {
  const [start, end] = touchedBlock(text, selStart, selEnd);
  const width = unit.startsWith(' ') && unit.length > 0 ? unit.length : 4;
  const lineDeltas: Array<{ ls: number; le: number; n: number }> = [];
  let rebuilt = '';
  let i = start;

  while (true) {
    const le = lineEnd(text, i);
    const line = text.slice(i, le);
    let n = 0;
    if (outdent) {
      if (line.startsWith('\t')) {
        n = 1;
      } else {
        while (n < width && n < line.length && line[n] === ' ') n++;
      }
      rebuilt += line.slice(n);
    } else if (line.length === 0) {
      n = 0;
    } else {
      n = unit.length;
      rebuilt += unit + line;
    }

    lineDeltas.push({ ls: i, le, n });
    if (le >= end) break;
    rebuilt += '\n';
    i = le + 1;
  }

  if (lineDeltas.every((d) => d.n === 0)) {
    return null;
  }

  const mapPos = (p: number): number => {
    let shift = 0;
    for (const { ls, le, n } of lineDeltas) {
      if (p < ls) break;
      const own = outdent ? -Math.min(n, p - ls) : p > ls ? n : 0;
      const full = outdent ? -n : n;
      shift += p > le ? full : own;
    }
    return p + shift;
  };

  return {
    value: text.slice(0, start) + rebuilt + text.slice(end),
    selectionStart: mapPos(selStart),
    selectionEnd: mapPos(selEnd),
  };
}

/**
 * Ctrl+D: Duplicate the current line or all lines touched by selection right below them,
 * moving the caret/selection into the newly inserted copy (RE:Notepad lines.rs::duplicate).
 */
export function duplicateLines(text: string, selStart: number, selEnd: number): EditResult {
  const [start, end] = touchedBlock(text, selStart, selEnd);
  const blockText = text.slice(start, end);
  const inserted = `\n${blockText}`;
  const shift = inserted.length;
  return {
    value: text.slice(0, end) + inserted + text.slice(end),
    selectionStart: selStart + shift,
    selectionEnd: selEnd + shift,
  };
}

/**
 * Matching bracket at caret: checks the character immediately before the caret first,
 * then the character at the caret, for (), [], {} (RE:Notepad lines.rs::match_bracket).
 */
export function matchBracket(text: string, caret: number): [number, number] | null {
  const LIMIT = 1 << 20;
  const pairs: Record<string, { open: string; close: string; forward: boolean }> = {
    '(': { open: '(', close: ')', forward: true },
    '[': { open: '[', close: ']', forward: true },
    '{': { open: '{', close: '}', forward: true },
    ')': { open: '(', close: ')', forward: false },
    ']': { open: '[', close: ']', forward: false },
    '}': { open: '{', close: '}', forward: false },
  };

  const candidates = caret > 0 ? [caret - 1, caret] : [caret];
  for (const idx of candidates) {
    const ch = text[idx];
    const info = ch ? pairs[ch] : undefined;
    if (!info) continue;

    let depth = 0;
    if (info.forward) {
      const max = Math.min(text.length, idx + 1 + LIMIT);
      for (let k = idx + 1; k < max; k++) {
        if (text[k] === info.open) depth++;
        else if (text[k] === info.close) {
          if (depth === 0) return [idx, k];
          depth--;
        }
      }
    } else {
      const min = Math.max(0, idx - LIMIT);
      for (let k = idx - 1; k >= min; k--) {
        if (text[k] === info.close) depth++;
        else if (text[k] === info.open) {
          if (depth === 0) return [idx, k];
          depth--;
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// JSON formatting (RE:Notepad json.rs)
// ---------------------------------------------------------------------------

/** Only `.json` files (never `.jsonl` or `.ndjson`, which keep one record per line). */
export function isJsonFilename(filename: string): boolean {
  return /\.json$/i.test(filename.trim());
}

/** True when JSON text has no line break before trailing whitespace (minified file). */
export function isOneLineJson(text: string): boolean {
  const trimmedEnd = text.replace(/[ \t\r\n]+$/, '');
  return trimmedEnd.length > 0 && !trimmedEnd.includes('\n') && !trimmedEnd.includes('\r');
}

export function offsetToLineCol(text: string, offset: number): { line: number; col: number } {
  const clamped = Math.max(0, Math.min(offset, text.length));
  let line = 1;
  let lineStartIdx = 0;
  for (let i = 0; i < clamped; i++) {
    if (text[i] === '\n') {
      line++;
      lineStartIdx = i + 1;
    }
  }
  return { line, col: clamped - lineStartIdx + 1 };
}

/**
 * Format JSON with 2-space indent (Shift+Alt+F & auto-format minified `.json` on open).
 * Preserves final trailing newline if present; reports 1-based line/column on error.
 */
export function formatJsonStrict(text: string): JsonFormatResult {
  if (!text.trim()) {
    return { ok: false, line: 1, col: 1, offset: 0, message: 'Empty JSON document' };
  }
  try {
    const parsed = JSON.parse(text);
    const hasTrailingNewline = text.endsWith('\n') || text.endsWith('\r');
    const formatted = JSON.stringify(parsed, null, 2) + (hasTrailingNewline ? '\n' : '');
    return { ok: true, formatted };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid JSON';
    const posMatch = msg.match(/position\s+(\d+)/i);
    const offset = posMatch ? Number(posMatch[1]) : 0;
    const { line, col } = offsetToLineCol(text, offset);
    return { ok: false, line, col, offset, message: msg };
  }
}

// ---------------------------------------------------------------------------
// YAML Front Matter table extraction (RE:Notepad frontmatter.rs + markdown.rs)
// ---------------------------------------------------------------------------

/**
 * Extracts GitHub-style YAML front matter (`---` at line 1 ... closing `---`)
 * into clean key/value rows for rendering as a table above the Markdown body.
 * Returns null if dashes are not valid front matter (so `---` stays an <hr>).
 */
export function extractFrontMatter(markdown: string): ParsedFrontMatter | null {
  const normalized = markdown.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return null;

  const lines = normalized.split('\n');
  let closeIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closeIdx = i;
      break;
    }
  }
  if (closeIdx <= 1) return null;

  const fmLines = lines.slice(1, closeIdx);
  // Reject blank first line (RE:Notepad markdown.rs rule: `---\n\ntitle: x\n---` stays horizontal rules)
  if (!fmLines[0].trim() || fmLines[0].startsWith('\t')) return null;

  const entries: FrontMatterEntry[] = [];
  let i = 0;
  while (i < fmLines.length) {
    const raw = fmLines[i];
    if (!raw.trim() || raw.trim().startsWith('#')) {
      i++;
      continue;
    }
    if (raw.startsWith('\t')) return null;

    const match = raw.match(/^([A-Za-z0-9_.\- ]+?)\s*:\s*(.*)$/);
    if (!match) return null;

    const key = match[1].trim().replace(/^['"]|['"]$/g, '');
    let rest = match[2].replace(/\s+#.*$/, '').trim();
    if (rest.startsWith('&') || rest.startsWith('*') || rest.startsWith('!')) {
      return null;
    }

    if (rest === '' || rest === '|' || rest === '>') {
      // Collect indented block items / nested keys
      const subItems: string[] = [];
      i++;
      while (i < fmLines.length && (fmLines[i].startsWith('  ') || fmLines[i].startsWith('- ') || fmLines[i].trim() === '')) {
        const sub = fmLines[i].trim();
        if (sub && !sub.startsWith('#')) {
          subItems.push(sub.replace(/^-\s+/, ''));
        }
        i++;
      }
      entries.push({ key, value: subItems.join(rest === '|' ? '\n' : ', ') });
      continue;
    }

    // Flow array `[a, b]` -> clean comma-separated display
    if (rest.startsWith('[') && rest.endsWith(']')) {
      rest = rest
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
        .join(', ');
    } else if (
      (rest.startsWith('"') && rest.endsWith('"')) ||
      (rest.startsWith("'") && rest.endsWith("'"))
    ) {
      rest = rest.slice(1, -1);
    } else if (rest === '~' || rest === 'null') {
      rest = '';
    }

    entries.push({ key, value: rest });
    i++;
  }

  if (entries.length === 0) return null;
  const body = lines.slice(closeIdx + 1).join('\n').replace(/^\n+/, '');
  return { entries, body };
}
