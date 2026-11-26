import * as cheerio from 'cheerio';
import exifr from 'exifr';
import { XMLParser } from 'fast-xml-parser';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import * as turndownPluginGfm from 'turndown-plugin-gfm';
import * as XLSX from 'xlsx';
import type {
  ConvertOptions,
  DocumentConverter,
  DocumentConverterResult,
  StreamInfo,
} from './types.ts';

function createTurndown(options?: ConvertOptions): TurndownService {
  const service = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
  });

  const gfmPlugin =
    (turndownPluginGfm as unknown as { gfm?: TurndownService.Plugin; default?: { gfm?: TurndownService.Plugin } })
      .gfm ??
    (turndownPluginGfm as unknown as { default?: { gfm?: TurndownService.Plugin } }).default?.gfm;
  if (gfmPlugin) {
    service.use(gfmPlugin);
  }

  service.remove(['script', 'style', 'noscript', 'iframe']);

  if (!options?.keepDataUris) {
    service.addRule('truncateDataUriImages', {
      filter: 'img',
      replacement: (_content, node) => {
        const el = node as unknown as { getAttribute?: (k: string) => string | null };
        const alt = (el.getAttribute?.('alt') ?? '').replace(/\s+/g, ' ').trim();
        let src = (el.getAttribute?.('src') ?? '').trim();
        if (!src) return alt ? `![${alt}]()` : '';
        if (src.startsWith('data:')) {
          const comma = src.indexOf(',');
          const header = comma !== -1 ? src.slice(0, comma) : src.slice(0, 40);
          src = `${header}...`;
        }
        return `![${alt}](${src})`;
      },
    });
  }

  return service;
}

export function htmlStringToMarkdown(html: string, options?: ConvertOptions): string {
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();
  const bodyHtml = $('body').length ? $('body').html() ?? '' : $.html();
  const turndown = createTurndown(options);
  return turndown.turndown(bodyHtml).trim();
}

function escapeTableCell(value: string): string {
  const escapedPipes = value.replace(/(?<!\\)(\\*)\|/g, (_m, slashes: string) => `${slashes}${slashes}\\|`);
  return escapedPipes.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');
}

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\r') {
      if (input[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function isRowEmpty(row: string[]): boolean {
  return row.length === 0 || row.every((c) => c === '');
}

function rowsToMarkdownTable(rawRows: string[][]): string {
  const rows = rawRows.map((r) => [...r]);

  let start = 0;
  while (start < rows.length && isRowEmpty(rows[start])) start++;
  if (start === rows.length) return '';

  const headerIndex = start;
  let dataStart = headerIndex + 1;
  while (dataStart < rows.length && isRowEmpty(rows[dataStart])) dataStart++;

  let end = rows.length;
  while (end > dataStart && isRowEmpty(rows[end - 1])) end--;

  const trimmed = [rows[headerIndex], ...rows.slice(dataStart, end)];
  const colCount = Math.max(...trimmed.map((r) => r.length), 1);

  for (const r of trimmed) {
    while (r.length < colCount) r.push('');
  }

  const lines: string[] = [];
  lines.push('| ' + trimmed[0].map(escapeTableCell).join(' | ') + ' |');
  lines.push('| ' + new Array<string>(colCount).fill('---').join(' | ') + ' |');
  for (const r of trimmed.slice(1)) {
    lines.push('| ' + r.map(escapeTableCell).join(' | ') + ' |');
  }
  return lines.join('\n');
}

export class CsvConverter implements DocumentConverter {
  readonly name = 'CsvConverter';
  readonly description = 'Converte file CSV in tabelle Markdown GFM con gestione BOM, celle multilinea ed escape pipe.';
  readonly extensions = ['.csv'];
  readonly mimeTypes = ['text/csv', 'application/csv'];

  accepts(_buffer: Buffer, streamInfo: StreamInfo): boolean {
    const ext = (streamInfo.extension ?? '').toLowerCase();
    const mime = (streamInfo.mimetype ?? '').toLowerCase();
    return ext === '.csv' || this.mimeTypes.some((m) => mime.startsWith(m));
  }

  async convert(buffer: Buffer): Promise<DocumentConverterResult> {
    const content = buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const rows = parseCsvRows(content);
    return { markdown: rowsToMarkdownTable(rows), title: null };
  }
}

export class WikipediaConverter implements DocumentConverter {
  readonly name = 'WikipediaConverter';
  readonly description = 'Estrae articolo principale e titolo da pagine Wikipedia rimuovendo barra laterale e chrome.';
  readonly extensions = ['.html', '.htm'];
  readonly mimeTypes = ['text/html', 'application/xhtml+xml'];

  accepts(buffer: Buffer, streamInfo: StreamInfo): boolean {
    const url = (streamInfo.url ?? '').toLowerCase();
    const filename = (streamInfo.filename ?? '').toLowerCase();
    if (url.includes('wikipedia.org/wiki/')) return true;
    const ext = (streamInfo.extension ?? '').toLowerCase();
    if ((ext === '.html' || ext === '.htm' || filename.includes('wikipedia')) && buffer.length < 5_000_000) {
      const sample = buffer.subarray(0, 65536).toString('utf-8');
      return sample.includes('mw-content-text') || sample.includes('Wikipedia, the free encyclopedia');
    }
    return false;
  }

  async convert(
    buffer: Buffer,
    _streamInfo: StreamInfo,
    options?: ConvertOptions
  ): Promise<DocumentConverterResult> {
    const html = buffer.toString('utf-8');
    const $ = cheerio.load(html);
    $('script, style, .mw-editsection, .navbox, .reflist').remove();

    const heading = $('#firstHeading').text().trim() || $('title').text().trim() || null;
    const contentEl = $('#mw-content-text').first();
    const turndown = createTurndown(options);
    const bodyMd = contentEl.length
      ? turndown.turndown(contentEl.html() ?? '').trim()
      : htmlStringToMarkdown(html, options);

    const markdown = heading ? `# ${heading}\n\n${bodyMd}` : bodyMd;
    return { markdown, title: heading };
  }
}

export class HtmlConverter implements DocumentConverter {
  readonly name = 'HtmlConverter';
  readonly description = 'Converte documenti HTML e pagine web in Markdown strutturato rimuovendo script e stili.';
  readonly extensions = ['.html', '.htm', '.xhtml'];
  readonly mimeTypes = ['text/html', 'application/xhtml'];

  accepts(_buffer: Buffer, streamInfo: StreamInfo): boolean {
    const ext = (streamInfo.extension ?? '').toLowerCase();
    const mime = (streamInfo.mimetype ?? '').toLowerCase();
    return this.extensions.includes(ext) || this.mimeTypes.some((m) => mime.startsWith(m));
  }

  async convert(
    buffer: Buffer,
    _streamInfo: StreamInfo,
    options?: ConvertOptions
  ): Promise<DocumentConverterResult> {
    const html = buffer.toString('utf-8');
    const $ = cheerio.load(html);
    const title = $('title').first().text().trim() || null;
    const markdown = htmlStringToMarkdown(html, options);
    return { markdown, title };
  }
}

export class IpynbConverter implements DocumentConverter {
  readonly name = 'IpynbConverter';
  readonly description = 'Converte Jupyter Notebook (.ipynb) preservando celle Markdown, codice Python e blocchi raw.';
  readonly extensions = ['.ipynb'];
  readonly mimeTypes = ['application/x-ipynb+json'];

  accepts(buffer: Buffer, streamInfo: StreamInfo): boolean {
    const ext = (streamInfo.extension ?? '').toLowerCase();
    if (ext === '.ipynb') return true;
    const mime = (streamInfo.mimetype ?? '').toLowerCase();
    if (mime.startsWith('application/json')) {
      const text = buffer.subarray(0, 65536).toString('utf-8');
      return text.includes('"nbformat"') && text.includes('"nbformat_minor"');
    }
    return false;
  }

  async convert(buffer: Buffer): Promise<DocumentConverterResult> {
    const raw = buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const notebook = JSON.parse(raw) as {
      metadata?: { title?: string; kernelspec?: { language?: string } };
      cells?: Array<{ cell_type?: string; source?: string[] | string }>;
    };

    const lang = notebook.metadata?.kernelspec?.language || 'python';
    const blocks: string[] = [];
    let title: string | null = null;

    for (const cell of notebook.cells ?? []) {
      const sourceText = Array.isArray(cell.source)
        ? cell.source.join('')
        : typeof cell.source === 'string'
          ? cell.source
          : '';

      if (cell.cell_type === 'markdown') {
        blocks.push(sourceText);
        if (!title) {
          for (const line of sourceText.split(/\r?\n/)) {
            if (line.startsWith('# ')) {
              title = line.slice(2).trim();
              break;
            }
          }
        }
      } else if (cell.cell_type === 'code') {
        blocks.push(`\`\`\`${lang}\n${sourceText}\n\`\`\``);
      } else if (cell.cell_type === 'raw') {
        blocks.push(`\`\`\`\n${sourceText}\n\`\`\``);
      }
    }

    const finalTitle = notebook.metadata?.title ?? title;
    return { markdown: blocks.join('\n\n'), title: finalTitle };
  }
}

export class RssConverter implements DocumentConverter {
  readonly name = 'RssConverter';
  readonly description = 'Converte feed RSS 2.0 e Atom XML in articoli Markdown con titoli, date e contenuti.';
  readonly extensions = ['.rss', '.atom', '.xml'];
  readonly mimeTypes = ['application/rss+xml', 'application/atom+xml', 'application/rss', 'application/atom'];

  accepts(buffer: Buffer, streamInfo: StreamInfo): boolean {
    const ext = (streamInfo.extension ?? '').toLowerCase();
    const mime = (streamInfo.mimetype ?? '').toLowerCase();
    if (ext === '.rss' || ext === '.atom' || this.mimeTypes.some((m) => mime.startsWith(m))) {
      return true;
    }
    if (ext === '.xml' || mime.includes('xml')) {
      const sample = buffer.subarray(0, 4096).toString('utf-8');
      return /<rss[\s>]/i.test(sample) || /<feed[\s>]/i.test(sample);
    }
    return false;
  }

  async convert(
    buffer: Buffer,
    _streamInfo: StreamInfo,
    options?: ConvertOptions
  ): Promise<DocumentConverterResult> {
    const xml = buffer.toString('utf-8');
    const $ = cheerio.load(xml, { xmlMode: true });

    // RSS 2.0
    const channel = $('rss > channel').first();
    if (channel.length > 0) {
      const channelTitle = channel.children('title').first().text().trim();
      const channelDesc = channel.children('description').first().text().trim();
      const parts: string[] = [];
      if (channelTitle) parts.push(`# ${channelTitle}`);
      if (channelDesc) parts.push(channelDesc);

      channel.children('item').each((_idx, el) => {
        const $item = $(el);
        const title = $item.children('title').first().text().trim();
        const pubDate = $item.children('pubDate').first().text().trim();
        const desc = $item.children('description').first().text().trim();
        let encoded = '';
        $item.children().each((_ci, child) => {
          const tag = (child as { tagName?: string }).tagName ?? '';
          if (tag === 'content:encoded' || tag.endsWith(':encoded')) {
            encoded = $(child).text().trim();
          }
        });

        const itemLines: string[] = [];
        if (title) itemLines.push(`## ${title}`);
        if (pubDate) itemLines.push(`Published on: ${pubDate}`);
        const bodyRaw = [desc, encoded].filter(Boolean).join('\n\n');
        if (bodyRaw) {
          itemLines.push(htmlStringToMarkdown(bodyRaw, options));
        }
        if (itemLines.length > 0) {
          parts.push(itemLines.join('\n\n'));
        }
      });

      return { markdown: parts.join('\n\n'), title: channelTitle || null };
    }

    // Atom
    const feed = $('feed').first();
    if (feed.length > 0) {
      const feedTitle = feed.children('title').first().text().trim();
      const subtitle = feed.children('subtitle').first().text().trim();
      const parts: string[] = [];
      if (feedTitle) parts.push(`# ${feedTitle}`);
      if (subtitle) parts.push(subtitle);

      feed.children('entry').each((_idx, el) => {
        const $entry = $(el);
        const title = $entry.children('title').first().text().trim();
        const updated = $entry.children('updated').first().text().trim();
        const summary = $entry.children('summary').first().text().trim();
        const content = $entry.children('content').first().text().trim();

        const entryLines: string[] = [];
        if (title) entryLines.push(`## ${title}`);
        if (updated) entryLines.push(`Updated on: ${updated}`);
        const bodyRaw = [summary, content].filter(Boolean).join('\n\n');
        if (bodyRaw) {
          entryLines.push(htmlStringToMarkdown(bodyRaw, options));
        }
        if (entryLines.length > 0) {
          parts.push(entryLines.join('\n\n'));
        }
      });

      return { markdown: parts.join('\n\n'), title: feedTitle || null };
    }

    throw new Error('Formato XML non riconosciuto come RSS o Atom.');
  }
}

export class DocxConverter implements DocumentConverter {
  readonly name = 'DocxConverter';
  readonly description = 'Converte documenti Microsoft Word (.docx) in Markdown tramite mammoth + Turndown GFM.';
  readonly extensions = ['.docx'];
  readonly mimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  accepts(_buffer: Buffer, streamInfo: StreamInfo): boolean {
    const ext = (streamInfo.extension ?? '').toLowerCase();
    const mime = (streamInfo.mimetype ?? '').toLowerCase();
    return ext === '.docx' || this.mimeTypes.some((m) => mime.startsWith(m));
  }

  async convert(
    buffer: Buffer,
    _streamInfo: StreamInfo,
    options?: ConvertOptions
  ): Promise<DocumentConverterResult> {
    const { value: html } = await mammoth.convertToHtml({ buffer });
    const markdown = htmlStringToMarkdown(html, options);
    const firstHeading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? null;
    return { markdown, title: firstHeading };
  }
}

export class XlsxConverter implements DocumentConverter {
  readonly name = 'XlsxConverter';
  readonly description = 'Converte cartelle Excel (.xlsx, .xls) in tabelle Markdown organizzate per foglio.';
  readonly extensions = ['.xlsx', '.xls'];
  readonly mimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  accepts(_buffer: Buffer, streamInfo: StreamInfo): boolean {
    const ext = (streamInfo.extension ?? '').toLowerCase();
    const mime = (streamInfo.mimetype ?? '').toLowerCase();
    return this.extensions.includes(ext) || this.mimeTypes.some((m) => mime.startsWith(m));
  }

  async convert(buffer: Buffer): Promise<DocumentConverterResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sections: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
      const stringRows = rows.map((row) =>
        (Array.isArray(row) ? row : []).map((cell) =>
          cell === null || cell === undefined ? '' : String(cell)
        )
      );
      const table = rowsToMarkdownTable(stringRows);
      sections.push(`## ${sheetName}\n\n${table || '*Foglio vuoto*'}`);
    }

    return {
      markdown: sections.join('\n\n'),
      title: workbook.SheetNames[0] ?? null,
    };
  }
}

export class PptxConverter implements DocumentConverter {
  readonly name = 'PptxConverter';
  readonly description = 'Estrae slide, titoli, elenchi, tabelle e note del relatore da PowerPoint (.pptx).';
  readonly extensions = ['.pptx'];
  readonly mimeTypes = [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];

  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    trimValues: false,
  });

  accepts(_buffer: Buffer, streamInfo: StreamInfo): boolean {
    const ext = (streamInfo.extension ?? '').toLowerCase();
    const mime = (streamInfo.mimetype ?? '').toLowerCase();
    return ext === '.pptx' || this.mimeTypes.some((m) => mime.startsWith(m));
  }

  private collectText(node: unknown, out: string[]): void {
    if (node === null || node === undefined) return;
    if (typeof node === 'string' || typeof node === 'number') {
      const s = String(node).trim();
      if (s) out.push(s);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) this.collectText(item, out);
      return;
    }
    if (typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      if ('t' in obj) {
        this.collectText(obj.t, out);
        return;
      }
      if ('p' in obj) {
        const paragraphs = Array.isArray(obj.p) ? obj.p : [obj.p];
        for (const p of paragraphs) {
          const lineParts: string[] = [];
          this.collectText(p, lineParts);
          const line = lineParts.join('').trim();
          if (line) out.push(line);
        }
        return;
      }
      for (const [k, v] of Object.entries(obj)) {
        if (k.startsWith('@_')) continue;
        this.collectText(v, out);
      }
    }
  }

  async convert(buffer: Buffer): Promise<DocumentConverterResult> {
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => {
        const na = Number(a.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
        const nb = Number(b.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
        return na - nb;
      });

    const slidesMd: string[] = [];
    let firstTitle: string | null = null;

    for (let i = 0; i < slideFiles.length; i++) {
      const slideNum = i + 1;
      const slideXml = await zip.files[slideFiles[i]].async('string');
      const parsed = this.parser.parse(slideXml) as Record<string, unknown>;
      const lines: string[] = [];
      this.collectText(parsed, lines);

      const section: string[] = [`<!-- Slide number: ${slideNum} -->`];
      if (lines.length > 0) {
        const [title, ...rest] = lines;
        if (!firstTitle) firstTitle = title;
        section.push(`# ${title}`);
        for (const line of rest) {
          section.push(line);
        }
      }

      const notesPath = `ppt/notesSlides/notesSlide${slideNum}.xml`;
      if (zip.files[notesPath]) {
        const notesXml = await zip.files[notesPath].async('string');
        const notesParsed = this.parser.parse(notesXml) as Record<string, unknown>;
        const notesLines: string[] = [];
        this.collectText(notesParsed, notesLines);
        const cleanedNotes = notesLines.filter((l) => l !== String(slideNum));
        if (cleanedNotes.length > 0) {
          section.push('\n### Notes:\n' + cleanedNotes.join('\n'));
        }
      }

      slidesMd.push(section.join('\n\n'));
    }

    return {
      markdown: slidesMd.join('\n\n---\n\n'),
      title: firstTitle,
    };
  }
}

export class PdfConverter implements DocumentConverter {
  readonly name = 'PdfConverter';
  readonly description = 'Estrae testo strutturato pagina per pagina da file PDF tramite pdf.js (pure JavaScript).';
  readonly extensions = ['.pdf'];
  readonly mimeTypes = ['application/pdf', 'application/x-pdf'];

  accepts(buffer: Buffer, streamInfo: StreamInfo): boolean {
    const ext = (streamInfo.extension ?? '').toLowerCase();
    const mime = (streamInfo.mimetype ?? '').toLowerCase();
    if (ext === '.pdf' || this.mimeTypes.some((m) => mime.startsWith(m))) return true;
    return buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  }

  async convert(buffer: Buffer): Promise<DocumentConverterResult> {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
      verbosity: 0,
    });
    const doc = await loadingTask.promise;
    try {
      const meta = await doc.getMetadata().catch(() => ({ info: undefined }));
      const rawTitle = meta?.info?.Title;
      const title = typeof rawTitle === 'string' && rawTitle.trim() ? rawTitle.trim() : null;

      const pages: string[] = [];
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const textContent = await page.getTextContent();
        const lines: string[] = [];
        let currentLine = '';

        for (const item of textContent.items) {
          const text = item.str ?? '';
          if (text) {
            currentLine += currentLine && !currentLine.endsWith(' ') && !text.startsWith(' ')
              ? ` ${text}`
              : text;
          }
          if (item.hasEOL) {
            lines.push(currentLine.trim());
            currentLine = '';
          }
        }
        if (currentLine.trim()) lines.push(currentLine.trim());

        const pageText = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
        if (pageText) {
          pages.push(doc.numPages > 1 ? `<!-- Page ${p} -->\n\n${pageText}` : pageText);
        }
      }

      return { markdown: pages.join('\n\n'), title };
    } finally {
      await doc.destroy();
    }
  }
}

export class EpubConverter implements DocumentConverter {
  readonly name = 'EpubConverter';
  readonly description = 'Estrae metadati editoriali e capitoli in ordine di lettura da libri EPUB (.epub).';
  readonly extensions = ['.epub'];
  readonly mimeTypes = ['application/epub', 'application/epub+zip'];

  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true,
  });

  accepts(_buffer: Buffer, streamInfo: StreamInfo): boolean {
    const ext = (streamInfo.extension ?? '').toLowerCase();
    const mime = (streamInfo.mimetype ?? '').toLowerCase();
    return ext === '.epub' || this.mimeTypes.some((m) => mime.startsWith(m));
  }

  async convert(
    buffer: Buffer,
    _streamInfo: StreamInfo,
    options?: ConvertOptions
  ): Promise<DocumentConverterResult> {
    const zip = await JSZip.loadAsync(buffer);
    const containerFile = zip.files['META-INF/container.xml'];
    if (!containerFile) {
      throw new Error('File EPUB non valido: META-INF/container.xml mancante.');
    }

    const containerXml = await containerFile.async('string');
    const container = this.parser.parse(containerXml) as Record<string, unknown>;
    const rootfiles = (container.container as Record<string, unknown>)?.rootfiles as Record<string, unknown>;
    const rootfileRaw = rootfiles?.rootfile;
    const rootfile = Array.isArray(rootfileRaw) ? rootfileRaw[0] : rootfileRaw;
    const opfPath = String((rootfile as Record<string, unknown>)?.['@_full-path'] ?? '');
    if (!opfPath || !zip.files[opfPath]) {
      throw new Error('Manifest OPF non trovato nell’archivio EPUB.');
    }

    const baseDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
    const opfXml = await zip.files[opfPath].async('string');
    const opf = this.parser.parse(opfXml) as Record<string, unknown>;
    const pkg = opf.package as Record<string, unknown>;
    const metadata = (pkg?.metadata ?? {}) as Record<string, unknown>;

    const extractMeta = (val: unknown): string => {
      if (typeof val === 'string') return val.trim();
      if (Array.isArray(val)) return val.map(extractMeta).filter(Boolean).join(', ');
      if (val && typeof val === 'object' && '#text' in val) {
        return String((val as Record<string, unknown>)['#text'] ?? '').trim();
      }
      return '';
    };

    const title = extractMeta(metadata.title) || null;
    const creator = extractMeta(metadata.creator);
    const language = extractMeta(metadata.language);

    const manifestItemsRaw = (pkg?.manifest as Record<string, unknown>)?.item;
    const manifestItems = Array.isArray(manifestItemsRaw)
      ? manifestItemsRaw
      : manifestItemsRaw
        ? [manifestItemsRaw]
        : [];
    const manifestMap = new Map<string, string>();
    for (const item of manifestItems) {
      const rec = item as Record<string, unknown>;
      if (rec['@_id'] && rec['@_href']) {
        manifestMap.set(String(rec['@_id']), String(rec['@_href']));
      }
    }

    const spineRaw = (pkg?.spine as Record<string, unknown>)?.itemref;
    const spineRefs = Array.isArray(spineRaw) ? spineRaw : spineRaw ? [spineRaw] : [];

    const out: string[] = [];
    const headerMeta: string[] = [];
    if (title) headerMeta.push(`**Title:** ${title}`);
    if (creator) headerMeta.push(`**Authors:** ${creator}`);
    if (language) headerMeta.push(`**Language:** ${language}`);
    if (headerMeta.length > 0) out.push(headerMeta.join('\n'));

    for (const ref of spineRefs) {
      const idref = String((ref as Record<string, unknown>)['@_idref'] ?? '');
      const href = manifestMap.get(idref);
      if (!href) continue;
      const entryPath = `${baseDir}${href}`;
      const entry = zip.files[entryPath];
      if (!entry) continue;
      const chapterHtml = await entry.async('string');
      const chapterMd = htmlStringToMarkdown(chapterHtml, options);
      if (chapterMd) out.push(chapterMd);
    }

    return { markdown: out.join('\n\n'), title };
  }
}

export class ImageConverter implements DocumentConverter {
  readonly name = 'ImageConverter';
  readonly description = 'Ispeziona intestazioni e metadati EXIF di immagini JPEG, PNG, GIF e WebP.';
  readonly extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  readonly mimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  accepts(_buffer: Buffer, streamInfo: StreamInfo): boolean {
    const ext = (streamInfo.extension ?? '').toLowerCase();
    const mime = (streamInfo.mimetype ?? '').toLowerCase();
    return this.extensions.includes(ext) || this.mimeTypes.some((m) => mime.startsWith(m));
  }

  private readPngDimensions(buffer: Buffer): { width: number; height: number } | null {
    if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
      };
    }
    return null;
  }

  async convert(buffer: Buffer, streamInfo: StreamInfo): Promise<DocumentConverterResult> {
    const lines: string[] = [];
    const name = streamInfo.filename ?? 'Immagine';
    lines.push(`# ${name}`);
    lines.push('');

    const pngDims = this.readPngDimensions(buffer);
    if (pngDims) {
      lines.push(`ImageSize: ${pngDims.width}x${pngDims.height}`);
    }

    try {
      const exif = (await exifr.parse(buffer)) as Record<string, unknown> | undefined;
      if (exif && typeof exif === 'object') {
        const fields = [
          'Make',
          'Model',
          'DateTimeOriginal',
          'ImageWidth',
          'ImageHeight',
          'ExifImageWidth',
          'ExifImageHeight',
          'ExposureTime',
          'FNumber',
          'ISO',
          'FocalLength',
          'Artist',
          'Copyright',
          'ImageDescription',
        ];
        for (const key of fields) {
          const val = exif[key];
          if (val !== undefined && val !== null && val !== '') {
            lines.push(`${key}: ${val instanceof Date ? val.toISOString() : String(val)}`);
          }
        }
      }
    } catch {
      // No EXIF tags present
    }

    lines.push(`FileSize: ${buffer.length} bytes`);
    if (streamInfo.mimetype) {
      lines.push(`MimeType: ${streamInfo.mimetype}`);
    }

    return { markdown: lines.join('\n'), title: name };
  }
}

export class PlainTextConverter implements DocumentConverter {
  readonly name = 'PlainTextConverter';
  readonly description = 'Converte file di testo, Markdown, JSON, XML, YAML e codice sorgente in formato Markdown.';
  readonly extensions = [
    '.txt',
    '.md',
    '.markdown',
    '.json',
    '.xml',
    '.yaml',
    '.yml',
    '.log',
    '.ini',
    '.cfg',
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.py',
    '.css',
    '.sql',
    '.sh',
    '.bat',
  ];
  readonly mimeTypes = ['text/', 'application/json', 'application/xml', 'application/javascript'];

  accepts(_buffer: Buffer, streamInfo: StreamInfo): boolean {
    const ext = (streamInfo.extension ?? '').toLowerCase();
    const mime = (streamInfo.mimetype ?? '').toLowerCase();
    return this.extensions.includes(ext) || this.mimeTypes.some((m) => mime.startsWith(m));
  }

  async convert(buffer: Buffer, streamInfo: StreamInfo): Promise<DocumentConverterResult> {
    const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const ext = (streamInfo.extension ?? '').toLowerCase();

    if (ext === '.json') {
      try {
        const formatted = JSON.stringify(JSON.parse(text), null, 2);
        return { markdown: `\`\`\`json\n${formatted}\n\`\`\``, title: streamInfo.filename ?? null };
      } catch {
        return { markdown: text, title: streamInfo.filename ?? null };
      }
    }

    return { markdown: text, title: streamInfo.filename ?? null };
  }
}

export class ZipConverter implements DocumentConverter {
  readonly name = 'ZipConverter';
  readonly description = 'Itera ricorsivamente sui file contenuti in un archivio .zip convertendo ogni documento.';
  readonly extensions = ['.zip'];
  readonly mimeTypes = ['application/zip', 'application/x-zip-compressed'];

  private readonly convertNested: (
    buffer: Buffer,
    streamInfo: StreamInfo,
    options?: ConvertOptions
  ) => Promise<{ result: DocumentConverterResult; converterUsed: string }>;

  constructor(
    convertNested: (
      buffer: Buffer,
      streamInfo: StreamInfo,
      options?: ConvertOptions
    ) => Promise<{ result: DocumentConverterResult; converterUsed: string }>
  ) {
    this.convertNested = convertNested;
  }

  accepts(_buffer: Buffer, streamInfo: StreamInfo): boolean {
    const ext = (streamInfo.extension ?? '').toLowerCase();
    const mime = (streamInfo.mimetype ?? '').toLowerCase();
    return ext === '.zip' || this.mimeTypes.some((m) => mime.startsWith(m));
  }

  async convert(
    buffer: Buffer,
    streamInfo: StreamInfo,
    options?: ConvertOptions
  ): Promise<DocumentConverterResult> {
    const depth = options?.maxDepth ?? 2;
    if (depth <= 0) {
      return { markdown: '*Archivio annidato saltato (profondità massima raggiunta).*', title: streamInfo.filename ?? null };
    }

    const zip = await JSZip.loadAsync(buffer);
    const sections: string[] = [
      `Content from the zip file ${streamInfo.filename ?? 'archive.zip'}`,
    ];

    const entries = Object.values(zip.files)
      .filter((entry) => !entry.dir && !entry.name.startsWith('__MACOSX/'))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 30);

    for (const entry of entries) {
      const entryBuf = await entry.async('nodebuffer');
      const dot = entry.name.lastIndexOf('.');
      const ext = dot !== -1 ? entry.name.slice(dot).toLowerCase() : undefined;
      try {
        const nested = await this.convertNested(
          entryBuf,
          { filename: entry.name, extension: ext },
          { ...options, maxDepth: depth - 1 }
        );
        sections.push(`## File: ${entry.name}\n\n${nested.result.markdown}`);
      } catch {
        sections.push(`## File: ${entry.name}\n\n*Formato non supportato o binario.*`);
      }
    }

    return {
      markdown: sections.join('\n\n'),
      title: streamInfo.filename ?? 'Archive',
    };
  }
}
