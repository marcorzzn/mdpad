import type { FileEncoding, LineEnding } from '../markitdown/types.ts';

export interface EditResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface OutlineHeading {
  level: 1 | 2 | 3;
  text: string;
  line: number;
  offset: number;
}

export interface WildcardMatch {
  start: number;
  end: number;
  text: string;
}

export interface DocumentStats {
  line: number;
  col: number;
  words: number;
  chars: number;
  readingMinutes: number;
}

/**
 * Smart Enter for Markdown lists:
 * Continues -, *, 1., - [ ], - [x] (preserving indentation).
 * Breaks out cleanly if pressing Enter on an empty list marker.
 */
export function handleSmartEnter(
  text: string,
  selectionStart: number,
  selectionEnd: number
): EditResult | null {
  if (selectionStart !== selectionEnd) {
    return null;
  }

  const lineStart = text.lastIndexOf('\n', selectionStart - 1) + 1;
  const lineEndRaw = text.indexOf('\n', selectionStart);
  const lineEnd = lineEndRaw === -1 ? text.length : lineEndRaw;
  const currentLine = text.slice(lineStart, lineEnd);
  const beforeCursorOnLine = text.slice(lineStart, selectionStart);

  // Checklist: - [ ] or - [x] or * [ ]
  const taskMatch = currentLine.match(/^(\s*)([-*+])\s+\[([ xX])\]\s+(.*)$/);
  if (taskMatch) {
    const [, indent, bullet, , body] = taskMatch;
    if (body.trim() === '' && beforeCursorOnLine.trim().length <= 5) {
      const nextValue = text.slice(0, lineStart) + text.slice(lineEnd);
      return { value: nextValue, selectionStart: lineStart, selectionEnd: lineStart };
    }
    const insertion = `\n${indent}${bullet} [ ] `;
    const nextValue = text.slice(0, selectionStart) + insertion + text.slice(selectionStart);
    const pos = selectionStart + insertion.length;
    return { value: nextValue, selectionStart: pos, selectionEnd: pos };
  }

  // Ordered list: 1. item
  const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
  if (orderedMatch) {
    const [, indent, numStr, body] = orderedMatch;
    if (body.trim() === '') {
      const nextValue = text.slice(0, lineStart) + text.slice(lineEnd);
      return { value: nextValue, selectionStart: lineStart, selectionEnd: lineStart };
    }
    const nextNum = Number(numStr) + 1;
    const insertion = `\n${indent}${nextNum}. `;
    const nextValue = text.slice(0, selectionStart) + insertion + text.slice(selectionStart);
    const pos = selectionStart + insertion.length;
    return { value: nextValue, selectionStart: pos, selectionEnd: pos };
  }

  // Unordered list: - item or * item
  const bulletMatch = currentLine.match(/^(\s*)([-*+])\s+(.*)$/);
  if (bulletMatch) {
    const [, indent, bullet, body] = bulletMatch;
    if (body.trim() === '') {
      const nextValue = text.slice(0, lineStart) + text.slice(lineEnd);
      return { value: nextValue, selectionStart: lineStart, selectionEnd: lineStart };
    }
    const insertion = `\n${indent}${bullet} `;
    const nextValue = text.slice(0, selectionStart) + insertion + text.slice(selectionStart);
    const pos = selectionStart + insertion.length;
    return { value: nextValue, selectionStart: pos, selectionEnd: pos };
  }

  return null;
}

/**
 * Format a contiguous Markdown table block and move cursor to next/prev cell on Tab.
 */
export function handleTableTab(
  text: string,
  selectionStart: number,
  shiftKey = false
): EditResult | null {
  const lines = text.split('\n');
  let offset = 0;
  let lineIdx = 0;
  let colInLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const nextOffset = offset + lines[i].length + 1;
    if (selectionStart <= offset + lines[i].length) {
      lineIdx = i;
      colInLine = selectionStart - offset;
      break;
    }
    offset = nextOffset;
  }

  const isTableRow = (line: string) => {
    const t = line.trim();
    return t.startsWith('|') && t.endsWith('|') && t.length >= 3;
  };

  if (!isTableRow(lines[lineIdx])) {
    return null;
  }

  let tableStart = lineIdx;
  while (tableStart > 0 && isTableRow(lines[tableStart - 1])) tableStart--;
  let tableEnd = lineIdx;
  while (tableEnd < lines.length - 1 && isTableRow(lines[tableEnd + 1])) tableEnd++;

  // Determine current cell index on lineIdx
  const beforeCursor = lines[lineIdx].slice(0, colInLine);
  const pipesBefore = (beforeCursor.match(/(?<!\\)\|/g) ?? []).length;
  const currentCell = Math.max(0, pipesBefore - 1);

  // Parse all rows in table block
  const splitCells = (row: string) => {
    const inner = row.trim().slice(1, -1);
    return inner.split(/(?<!\\)\|/).map((c) => c.trim());
  };

  const parsedRows = lines.slice(tableStart, tableEnd + 1).map(splitCells);
  const colCount = Math.max(...parsedRows.map((r) => r.length), 1);
  for (const row of parsedRows) {
    while (row.length < colCount) row.push('');
  }

  const isSeparatorRow = (row: string[]) =>
    row.every((cell) => /^:?-{2,}:?$/.test(cell) || cell === '');

  // Compute column widths for neat alignment
  const widths = new Array<number>(colCount).fill(3);
  for (const row of parsedRows) {
    if (isSeparatorRow(row)) continue;
    row.forEach((cell, idx) => {
      widths[idx] = Math.max(widths[idx], cell.length);
    });
  }

  const formattedRows = parsedRows.map((row) => {
    if (isSeparatorRow(row)) {
      return '| ' + widths.map((w) => '-'.repeat(w)).join(' | ') + ' |';
    }
    return '| ' + row.map((cell, idx) => cell.padEnd(widths[idx], ' ')).join(' | ') + ' |';
  });

  // Find target row and cell
  let targetRowRel = lineIdx - tableStart;
  let targetCell = shiftKey ? currentCell - 1 : currentCell + 1;

  if (targetCell >= colCount) {
    targetCell = 0;
    targetRowRel++;
    if (targetRowRel < parsedRows.length && isSeparatorRow(parsedRows[targetRowRel])) {
      targetRowRel++;
    }
    if (targetRowRel >= parsedRows.length) {
      // Append a new empty row to the table!
      const newRow = '| ' + widths.map((w) => ' '.repeat(w)).join(' | ') + ' |';
      formattedRows.push(newRow);
    }
  } else if (targetCell < 0) {
    targetCell = colCount - 1;
    targetRowRel--;
    if (targetRowRel >= 0 && isSeparatorRow(parsedRows[targetRowRel])) {
      targetRowRel--;
    }
    if (targetRowRel < 0) {
      targetRowRel = 0;
      targetCell = 0;
    }
  }

  const newLines = [
    ...lines.slice(0, tableStart),
    ...formattedRows,
    ...lines.slice(tableEnd + 1),
  ];
  const newValue = newLines.join('\n');

  // Compute cursor selection inside target cell
  let lineStartOffset = 0;
  const targetAbsRow = tableStart + targetRowRel;
  for (let i = 0; i < targetAbsRow; i++) {
    lineStartOffset += newLines[i].length + 1;
  }

  const targetLine = newLines[targetAbsRow];
  let pipePos = -1;
  for (let p = 0; p <= targetCell; p++) {
    pipePos = targetLine.indexOf('|', pipePos + 1);
  }
  const nextPipePos = targetLine.indexOf('|', pipePos + 1);
  const rawCell = targetLine.slice(pipePos + 1, nextPipePos === -1 ? targetLine.length : nextPipePos);
  const trimmed = rawCell.trim();
  const cellStart = lineStartOffset + pipePos + 2;
  const cellEnd = trimmed.length > 0 ? cellStart + trimmed.length : cellStart;

  return {
    value: newValue,
    selectionStart: cellStart,
    selectionEnd: cellEnd,
  };
}

/**
 * Smart Paste: pasting an http(s) URL over selected text creates [selected](url).
 */
export function handleSmartPaste(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  pastedText: string
): EditResult | null {
  if (selectionStart === selectionEnd) return null;
  const trimmed = pastedText.trim();
  if (!/^https?:\/\/\S+$/i.test(trimmed)) return null;

  const selected = text.slice(selectionStart, selectionEnd);
  if (selected.includes('\n')) return null;

  const replacement = `[${selected}](${trimmed})`;
  const value = text.slice(0, selectionStart) + replacement + text.slice(selectionEnd);
  const endPos = selectionStart + replacement.length;
  return { value, selectionStart: endPos, selectionEnd: endPos };
}

/**
 * Clear Markdown formatting (Ctrl+Space) on selection or current line.
 */
export function clearMarkdownFormatting(
  text: string,
  selectionStart: number,
  selectionEnd: number
): EditResult {
  let start = selectionStart;
  let end = selectionEnd;

  if (start === end) {
    start = text.lastIndexOf('\n', selectionStart - 1) + 1;
    const nextNl = text.indexOf('\n', selectionStart);
    end = nextNl === -1 ? text.length : nextNl;
  }

  const segment = text.slice(start, end);
  const cleaned = segment
    .replace(/^(\s*)#{1,6}\s+/gm, '$1')
    .replace(/^(\s*)>\s?/gm, '$1')
    .replace(/^(\s*)[-*+]\s+\[[ xX]\]\s+/gm, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1');

  const value = text.slice(0, start) + cleaned + text.slice(end);
  return {
    value,
    selectionStart: start,
    selectionEnd: start + cleaned.length,
  };
}

/**
 * Toggle a Markdown task checkbox on a specific 1-based source line number.
 */
export function toggleCheckboxAtLine(markdown: string, lineNumber: number): string {
  const lines = markdown.split('\n');
  const idx = lineNumber - 1;
  if (idx < 0 || idx >= lines.length) return markdown;
  const match = lines[idx].match(/^(\s*[-*+]\s+\[)([ xX])(\]\s+.*)$/);
  if (!match) return markdown;
  const nextMark = match[2].toLowerCase() === 'x' ? ' ' : 'x';
  lines[idx] = `${match[1]}${nextMark}${match[3]}`;
  return lines.join('\n');
}

/**
 * Toggle the N-th interactive Markdown task checkbox (- [ ] <-> - [x]), skipping fenced code blocks.
 */
export function toggleCheckboxAtIndex(markdown: string, checkboxIndex: number): string {
  const lines = markdown.split('\n');
  let inFence = false;
  let seen = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = lines[i].match(/^(\s*[-*+]\s+\[)([ xX])(\]\s+.*)$/);
    if (match) {
      if (seen === checkboxIndex) {
        const nextMark = match[2].toLowerCase() === 'x' ? ' ' : 'x';
        lines[i] = `${match[1]}${nextMark}${match[3]}`;
        break;
      }
      seen++;
    }
  }

  return lines.join('\n');
}

/**
 * Extract document outline (H1, H2, H3) ignoring fenced code blocks.
 */
export function extractOutline(markdown: string): OutlineHeading[] {
  const lines = markdown.split('\n');
  const outline: OutlineHeading[] = [];
  let inFence = false;
  let offset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inFence = !inFence;
    } else if (!inFence) {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length as 1 | 2 | 3;
        const text = match[2].replace(/\s+#+\s*$/, '').replace(/[*_`]/g, '').trim();
        if (text) {
          outline.push({ level, text, line: i + 1, offset });
        }
      }
    }
    offset += line.length + 1;
  }

  return outline;
}

/**
 * Find matches using Notepad-style wildcards (* and ?).
 */
export function findWildcardMatches(
  text: string,
  query: string,
  caseSensitive = false
): WildcardMatch[] {
  if (!query) return [];
  const escaped = query.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  let pattern = escaped.replace(/\?/g, '[^\\n]');
  // Trailing wildcard matches token characters; internal wildcards match non-greedily within a line
  if (pattern.endsWith('*')) {
    pattern = pattern.slice(0, -1).replace(/\*/g, '[^\\n]*?') + '[^\\s,;)"\'<>\\]]*';
  } else {
    pattern = pattern.replace(/\*/g, '[^\\n]*?');
  }
  const flags = caseSensitive ? 'g' : 'gi';

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch {
    return [];
  }

  const matches: WildcardMatch[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[0].length === 0) {
      regex.lastIndex++;
      continue;
    }
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
    });
    if (matches.length >= 2000) break;
  }

  return matches;
}

export function generateMarkdownTable(rows: number, cols: number): string {
  const safeRows = Math.max(1, Math.min(20, Math.floor(rows)));
  const safeCols = Math.max(1, Math.min(12, Math.floor(cols)));

  const header = '| ' + Array.from({ length: safeCols }, (_, i) => `Colonna ${i + 1}`).join(' | ') + ' |';
  const separator = '| ' + Array.from({ length: safeCols }, () => '---------').join(' | ') + ' |';
  const body = Array.from({ length: safeRows }, (_, r) =>
    '| ' + Array.from({ length: safeCols }, (_, c) => `Valore ${r + 1}.${c + 1}`).join(' | ') + ' |'
  );

  return [header, separator, ...body].join('\n');
}

export function computeDocumentStats(text: string, cursorOffset: number): DocumentStats {
  const clamped = Math.max(0, Math.min(cursorOffset, text.length));
  const before = text.slice(0, clamped);
  const linesBefore = before.split('\n');
  const line = linesBefore.length;
  const col = linesBefore[linesBefore.length - 1].length + 1;

  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const readingMinutes = words === 0 ? 0 : Math.max(1, Math.round(words / 200));

  return {
    line,
    col,
    words,
    chars: text.length,
    readingMinutes,
  };
}

export function normalizeLineEndings(text: string, lineEnding: LineEnding): string {
  const lf = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (lineEnding === 'CRLF') return lf.replace(/\n/g, '\r\n');
  if (lineEnding === 'CR') return lf.replace(/\n/g, '\r');
  return lf;
}

export function encodeTextForDownload(
  text: string,
  encoding: FileEncoding,
  lineEnding: LineEnding
): Uint8Array {
  const normalized = normalizeLineEndings(text, lineEnding);

  if (encoding === 'ANSI') {
    const bytes = new Uint8Array(normalized.length);
    for (let i = 0; i < normalized.length; i++) {
      const code = normalized.charCodeAt(i);
      bytes[i] = code <= 0xff ? code : 0x3f; // '?' fallback for non-Latin1
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

  const encoder = new TextEncoder();
  const utf8 = encoder.encode(normalized);

  if (encoding === 'UTF-8-BOM') {
    const out = new Uint8Array(utf8.length + 3);
    out[0] = 0xef;
    out[1] = 0xbb;
    out[2] = 0xbf;
    out.set(utf8, 3);
    return out;
  }

  return utf8;
}
