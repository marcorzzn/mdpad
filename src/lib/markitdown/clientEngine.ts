import exifr from 'exifr';
import { XMLParser } from 'fast-xml-parser';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import * as turndownPluginGfm from 'turndown-plugin-gfm';
import * as XLSX from 'xlsx';
import { buildLocalFolderPostIt, extractMarkdownHeadings } from './postit';
import type {
  ConversionResponse,
  ConverterMetadata,
  ConvertOptions,
  FolderFileSummary,
  FolderPostItResult,
} from './types';

export const CLIENT_CONVERTERS_METADATA: ConverterMetadata[] = [
  {
    name: 'DocxConverter',
    priority: 0,
    extensions: ['.docx'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    description: 'Word DOCX → Markdown (offline)',
  },
  {
    name: 'XlsxConverter',
    priority: 0,
    extensions: ['.xlsx', '.xls'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    description: 'Excel XLSX/XLS → tabelle Markdown (offline)',
  },
  {
    name: 'PptxConverter',
    priority: 0,
    extensions: ['.pptx'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    description: 'PowerPoint PPTX → slide Markdown (offline)',
  },
  {
    name: 'PdfConverter',
    priority: 0,
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
    description: 'PDF → testo Markdown (offline)',
  },
  {
    name: 'EpubConverter',
    priority: 0,
    extensions: ['.epub'],
    mimeTypes: ['application/epub+zip'],
    description: 'EPUB eBook → Markdown (offline)',
  },
  {
    name: 'CsvConverter',
    priority: 0,
    extensions: ['.csv', '.tsv'],
    mimeTypes: ['text/csv', 'text/tab-separated-values'],
    description: 'CSV / TSV → tabella Markdown GFM (offline)',
  },
  {
    name: 'IpynbConverter',
    priority: 0,
    extensions: ['.ipynb'],
    mimeTypes: ['application/x-ipynb+json'],
    description: 'Jupyter Notebook → Markdown + blocchi codice (offline)',
  },
  {
    name: 'RssConverter',
    priority: 0,
    extensions: ['.rss', '.atom', '.xml'],
    mimeTypes: ['application/rss+xml', 'application/atom+xml', 'application/xml'],
    description: 'RSS / Atom / XML → Markdown (offline)',
  },
  {
    name: 'ImageConverter',
    priority: 0,
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    description: 'Immagini → metadati EXIF Markdown (offline)',
  },
  {
    name: 'HtmlConverter',
    priority: 10,
    extensions: ['.html', '.htm'],
    mimeTypes: ['text/html'],
    description: 'HTML → Markdown GFM (offline)',
  },
  {
    name: 'ZipConverter',
    priority: 10,
    extensions: ['.zip'],
    mimeTypes: ['application/zip'],
    description: 'Archivi ZIP → indice e contenuti convertiti (offline)',
  },
  {
    name: 'PlainTextConverter',
    priority: 10,
    extensions: ['.md', '.markdown', '.txt', '.log', '.json', '.yaml', '.yml', '.ini', '.toml'],
    mimeTypes: ['text/markdown', 'text/plain', 'application/json'],
    description: 'Testo, Markdown, JSON, YAML, INI (offline)',
  },
];

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

function stripHtmlTagsFallback(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

export function clientHtmlToMarkdown(html: string, options?: ConvertOptions): string {
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, noscript, iframe').forEach((n) => n.remove());
    const bodyHtml = doc.body?.innerHTML || html;
    try {
      return createTurndown(options).turndown(bodyHtml).trim();
    } catch {
      return (doc.body?.textContent ?? '').trim();
    }
  }
  return stripHtmlTagsFallback(html);
}

function normalizeMarkdown(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot !== -1 ? filename.slice(dot).toLowerCase() : '';
}

function escapeCell(value: string): string {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim();
}

function parseDelimitedRows(text: string, delimiter: ',' | '\t'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
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
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
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
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function rowsToMarkdownTable(rows: string[][]): string {
  if (rows.length === 0) return '';
  const width = Math.max(...rows.map((r) => r.length));
  const padded = rows.map((r) => [...r, ...Array(Math.max(0, width - r.length)).fill('')]);
  const header = `| ${padded[0].map(escapeCell).join(' | ')} |`;
  const sep = `| ${Array(width).fill('---').join(' | ')} |`;
  const body = padded.slice(1).map((r) => `| ${r.map(escapeCell).join(' | ')} |`);
  return [header, sep, ...body].join('\n');
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/^\uFEFF/, '');
}

async function convertPptxBytes(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const slidePaths = Object.keys(zip.files)
    .filter((k) => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/i)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)/i)?.[1] ?? 0);
      return na - nb;
    });

  const sections: string[] = [];
  for (let i = 0; i < slidePaths.length; i++) {
    const xml = await zip.files[slidePaths[i]].async('string');
    const matches = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
      .map((m) =>
        m[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim()
      )
      .filter(Boolean);
    if (matches.length > 0) {
      sections.push(`<!-- Slide ${i + 1} -->\n## Slide ${i + 1}\n\n${matches.join('\n\n')}`);
    }
  }
  return sections.join('\n\n') || '*Presentazione senza testo estraibile.*';
}

async function convertEpubBytes(bytes: Uint8Array, options?: ConvertOptions): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const htmlFiles = Object.keys(zip.files)
    .filter((k) => /\.(xhtml|html|htm)$/i.test(k) && !k.toLowerCase().includes('nav'))
    .sort();
  const parts: string[] = [];
  for (const name of htmlFiles.slice(0, 40)) {
    const html = await zip.files[name].async('string');
    const md = clientHtmlToMarkdown(html, options);
    if (md) parts.push(md);
  }
  return parts.join('\n\n---\n\n') || '*EPUB senza contenuti testuali.*';
}

async function convertPdfBytes(bytes: Uint8Array): Promise<string> {
  try {
    const pdfjs = await import('pdfjs-dist');
    const loadingTask = pdfjs.getDocument({
      data: bytes,
      useWorkerFetch: false,
      isEvalSupported: false,
    });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    const maxPages = Math.min(pdf.numPages, 60);
    for (let p = 1; p <= maxPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const text = content.items
        .map((it) => ('str' in it ? it.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) pages.push(`## Pagina ${p}\n\n${text}`);
    }
    return pages.join('\n\n') || '*PDF senza testo estraibile (possibile scansione immagine).*';
  } catch {
    // Graceful lightweight text stream extraction fallback when worker is unavailable
    const raw = new TextDecoder('latin1').decode(bytes);
    const literals = [...raw.matchAll(/\(([^()\\]{3,160})\)/g)]
      .map((m) => m[1].trim())
      .filter((s) => /[A-Za-z0-9]/.test(s))
      .slice(0, 120);
    return literals.length > 0
      ? literals.join(' ')
      : '*PDF binario rilevato: apri con backend MarkItDown o verifica il testo incorporato.*';
  }
}

export async function convertBytesClientSide(
  bytes: Uint8Array,
  filename: string,
  options?: ConvertOptions,
  depth = 0
): Promise<ConversionResponse> {
  const started = performance.now();
  const ext = extOf(filename);
  let converterUsed = 'PlainTextConverter';
  let title: string | undefined;
  let markdown = '';

  if (ext === '.docx') {
    converterUsed = 'DocxConverter';
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const arrayBuffer: ArrayBuffer = copy.buffer;
    const res = await mammoth.convertToHtml({ arrayBuffer });
    markdown = clientHtmlToMarkdown(res.value, options);
  } else if (ext === '.xlsx' || ext === '.xls') {
    converterUsed = 'XlsxConverter';
    const wb = XLSX.read(bytes, { type: 'array' });
    const sheets: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][];
      const table = rowsToMarkdownTable(rows.map((r) => r.map((v) => String(v ?? ''))));
      if (table) sheets.push(`## ${sheetName}\n\n${table}`);
    }
    markdown = sheets.join('\n\n') || '*Foglio vuoto.*';
  } else if (ext === '.pptx') {
    converterUsed = 'PptxConverter';
    markdown = await convertPptxBytes(bytes);
  } else if (ext === '.pdf') {
    converterUsed = 'PdfConverter';
    markdown = await convertPdfBytes(bytes);
  } else if (ext === '.epub') {
    converterUsed = 'EpubConverter';
    markdown = await convertEpubBytes(bytes, options);
  } else if (ext === '.csv' || ext === '.tsv') {
    converterUsed = 'CsvConverter';
    const rows = parseDelimitedRows(decodeUtf8(bytes), ext === '.tsv' ? '\t' : ',');
    markdown = rowsToMarkdownTable(rows);
  } else if (ext === '.ipynb') {
    converterUsed = 'IpynbConverter';
    const nb = JSON.parse(decodeUtf8(bytes)) as {
      cells?: Array<{ cell_type?: string; source?: string[] | string }>;
    };
    const blocks: string[] = [];
    for (const cell of nb.cells ?? []) {
      const src = Array.isArray(cell.source) ? cell.source.join('') : String(cell.source ?? '');
      if (!src.trim()) continue;
      if (cell.cell_type === 'code') {
        blocks.push(`\`\`\`python\n${src.trimEnd()}\n\`\`\``);
      } else {
        blocks.push(src.trim());
      }
    }
    markdown = blocks.join('\n\n');
  } else if (ext === '.rss' || ext === '.atom' || ext === '.xml') {
    converterUsed = 'RssConverter';
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(decodeUtf8(bytes)) as Record<string, unknown>;
    const channel = (parsed.rss as { channel?: Record<string, unknown> } | undefined)?.channel;
    const feed = parsed.feed as Record<string, unknown> | undefined;
    if (channel) {
      title = String(channel.title ?? filename);
      const rawItems = Array.isArray(channel.item)
        ? channel.item
        : channel.item
          ? [channel.item]
          : [];
      const lines = [`# ${title}`, ''];
      for (const item of rawItems.slice(0, 30) as Array<Record<string, unknown>>) {
        lines.push(`## ${String(item.title ?? 'Elemento')}`);
        if (item.description) lines.push(clientHtmlToMarkdown(String(item.description), options));
        if (item.link) lines.push(`[Link](${String(item.link)})`);
        lines.push('');
      }
      markdown = lines.join('\n');
    } else if (feed) {
      title = String(feed.title ?? filename);
      const rawEntries = Array.isArray(feed.entry)
        ? feed.entry
        : feed.entry
          ? [feed.entry]
          : [];
      const lines = [`# ${title}`, ''];
      for (const entry of rawEntries.slice(0, 30) as Array<Record<string, unknown>>) {
        lines.push(`## ${String(entry.title ?? 'Voce')}`);
        if (entry.summary) lines.push(clientHtmlToMarkdown(String(entry.summary), options));
        lines.push('');
      }
      markdown = lines.join('\n');
    } else {
      markdown = `\`\`\`xml\n${decodeUtf8(bytes).slice(0, 20000)}\n\`\`\``;
    }
  } else if (ext === '.html' || ext === '.htm') {
    converterUsed = 'HtmlConverter';
    const rawHtml = decodeUtf8(bytes);
    const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) title = titleMatch[1].trim();
    markdown = clientHtmlToMarkdown(rawHtml, options);
  } else if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp' || ext === '.gif') {
    converterUsed = 'ImageConverter';
    let exifLines: string[] = [];
    try {
      const exif = await exifr.parse(bytes);
      if (exif && typeof exif === 'object') {
        exifLines = Object.entries(exif)
          .filter(([, v]) => v !== undefined && v !== null && typeof v !== 'object')
          .slice(0, 15)
          .map(([k, v]) => `- **${k}**: ${String(v)}`);
      }
    } catch {
      // No EXIF available
    }
    markdown = [
      `# Immagine: ${filename}`,
      '',
      `- **Dimensione**: ${(bytes.byteLength / 1024).toFixed(1)} KB`,
      ...(exifLines.length > 0 ? ['', '## Metadati EXIF', ...exifLines] : []),
    ].join('\n');
  } else if (ext === '.zip' && depth < 2) {
    converterUsed = 'ZipConverter';
    const zip = await JSZip.loadAsync(bytes);
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
    const sections: string[] = [`# Archivio ZIP: ${filename}`, '', `Contiene ${names.length} file:`];
    for (const inner of names.slice(0, 15)) {
      const innerBytes = await zip.files[inner].async('uint8array');
      try {
        const sub = await convertBytesClientSide(innerBytes, inner, options, depth + 1);
        sections.push(`\n## ${inner}\n\n${sub.markdown.slice(0, 1200)}`);
      } catch {
        sections.push(`\n- \`${inner}\` (${innerBytes.byteLength} B)`);
      }
    }
    markdown = sections.join('\n');
  } else {
    converterUsed = 'PlainTextConverter';
    const text = decodeUtf8(bytes);
    if (ext === '.json') {
      try {
        markdown = `\`\`\`json\n${JSON.stringify(JSON.parse(text), null, 2)}\n\`\`\``;
      } catch {
        markdown = text;
      }
    } else {
      markdown = text;
    }
  }

  const normalized = normalizeMarkdown(markdown);
  const linesCount = normalized ? normalized.split('\n').length : 0;

  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sourceName: filename,
    title: title ?? null,
    markdown: normalized,
    converterUsed,
    streamInfo: {
      filename,
      extension: ext || undefined,
    },
    stats: {
      inputBytes: bytes.byteLength,
      outputChars: normalized.length,
      outputLines: linesCount,
      estimatedTokens: Math.max(1, Math.ceil(normalized.length / 4)),
      durationMs: Math.max(1, Math.round(performance.now() - started)),
    },
    createdAt: new Date().toISOString(),
  };
}

export interface LocalFolderScanInput {
  relativePath: string;
  filename: string;
  bytes: Uint8Array;
}

export async function scanFolderLocally(
  folderName: string,
  entries: LocalFolderScanInput[],
  customNote?: string
): Promise<FolderPostItResult> {
  const summaries: FolderFileSummary[] = [];

  for (const entry of entries.slice(0, 40)) {
    const lower = entry.filename.toLowerCase();
    if (lower === '_post-it.md' || lower === 'desktop.ini' || lower === '.directory') {
      continue;
    }
    try {
      const converted = await convertBytesClientSide(entry.bytes, entry.filename);
      const headings = extractMarkdownHeadings(converted.markdown, 4);
      summaries.push({
        relativePath: entry.relativePath,
        filename: entry.filename,
        sizeBytes: entry.bytes.byteLength,
        converterUsed: converted.converterUsed,
        status: 'ok',
        title: converted.title ?? headings[0] ?? null,
        headings,
        excerpt: converted.markdown.slice(0, 260),
        markdown: converted.markdown,
      });
    } catch (err) {
      summaries.push({
        relativePath: entry.relativePath,
        filename: entry.filename,
        sizeBytes: entry.bytes.byteLength,
        converterUsed: 'Skipped',
        status: 'error',
        title: null,
        headings: [],
        excerpt: '',
        markdown: '',
        error: err instanceof Error ? err.message : 'Formato non supportato',
      });
    }
  }

  return buildLocalFolderPostIt(folderName, summaries, customNote);
}

export async function buildFolderPostItZipBlob(result: FolderPostItResult): Promise<Blob> {
  const zip = new JSZip();
  zip.file('_POST-IT.md', result.postItMarkdown);
  zip.file('desktop.ini', result.desktopIni);
  zip.file('.directory', result.linuxDirectory);
  zip.file('Applica_PostIt_Windows.bat', result.applyBat);
  return zip.generateAsync({ type: 'blob' });
}
