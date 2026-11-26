import fs from 'node:fs/promises';
import path from 'node:path';
import {
  CsvConverter,
  DocxConverter,
  EpubConverter,
  HtmlConverter,
  ImageConverter,
  IpynbConverter,
  PdfConverter,
  PlainTextConverter,
  PptxConverter,
  RssConverter,
  WikipediaConverter,
  XlsxConverter,
  ZipConverter,
} from './converters.ts';
import type {
  ConverterMetadata,
  ConvertOptions,
  DocumentConverter,
  DocumentConverterResult,
  StreamInfo,
} from './types.ts';
import { parseDataUri, validateRemoteUrl } from './uri.ts';

export const PRIORITY_SPECIFIC_FILE_FORMAT = 0.0;
export const PRIORITY_GENERIC_FILE_FORMAT = 10.0;

interface ConverterRegistration {
  converter: DocumentConverter;
  priority: number;
}

const EXTENSION_MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.csv': 'text/csv',
  '.ipynb': 'application/x-ipynb+json',
  '.rss': 'application/rss+xml',
  '.atom': 'application/atom+xml',
  '.xml': 'application/xml',
  '.epub': 'application/epub+zip',
  '.zip': 'application/zip',
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

function normalizeMarkdown(text: string): string {
  const trimmedLines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n');
  return trimmedLines.replace(/\n{3,}/g, '\n\n').trim();
}

export class MarkItDownEngine {
  private readonly registrations: ConverterRegistration[] = [];

  constructor() {
    // Register generic converters first (later registrations take higher priority)
    this.registerConverter(new PlainTextConverter(), PRIORITY_GENERIC_FILE_FORMAT);
    this.registerConverter(
      new ZipConverter((buf, info, opts) => this.convertBuffer(buf, info, opts)),
      PRIORITY_GENERIC_FILE_FORMAT
    );
    this.registerConverter(new HtmlConverter(), PRIORITY_GENERIC_FILE_FORMAT);

    // Specific converters
    this.registerConverter(new RssConverter(), PRIORITY_SPECIFIC_FILE_FORMAT);
    this.registerConverter(new WikipediaConverter(), PRIORITY_SPECIFIC_FILE_FORMAT);
    this.registerConverter(new DocxConverter(), PRIORITY_SPECIFIC_FILE_FORMAT);
    this.registerConverter(new XlsxConverter(), PRIORITY_SPECIFIC_FILE_FORMAT);
    this.registerConverter(new PptxConverter(), PRIORITY_SPECIFIC_FILE_FORMAT);
    this.registerConverter(new ImageConverter(), PRIORITY_SPECIFIC_FILE_FORMAT);
    this.registerConverter(new IpynbConverter(), PRIORITY_SPECIFIC_FILE_FORMAT);
    this.registerConverter(new PdfConverter(), PRIORITY_SPECIFIC_FILE_FORMAT);
    this.registerConverter(new EpubConverter(), PRIORITY_SPECIFIC_FILE_FORMAT);
    this.registerConverter(new CsvConverter(), PRIORITY_SPECIFIC_FILE_FORMAT);
  }

  registerConverter(
    converter: DocumentConverter,
    priority = PRIORITY_SPECIFIC_FILE_FORMAT
  ): void {
    this.registrations.unshift({ converter, priority });
  }

  listConverters(): ConverterMetadata[] {
    return [...this.registrations]
      .sort((a, b) => a.priority - b.priority)
      .map((reg) => ({
        name: reg.converter.name,
        priority: reg.priority,
        extensions: reg.converter.extensions,
        mimeTypes: reg.converter.mimeTypes,
        description: reg.converter.description,
      }));
  }

  private enhanceStreamInfo(buffer: Buffer, base: StreamInfo): StreamInfo {
    const info: StreamInfo = { ...base };
    if (!info.extension && info.filename) {
      const ext = path.extname(info.filename).toLowerCase();
      if (ext) info.extension = ext;
    }
    if (info.extension && !info.extension.startsWith('.')) {
      info.extension = `.${info.extension.toLowerCase()}`;
    } else if (info.extension) {
      info.extension = info.extension.toLowerCase();
    }

    if (!info.mimetype && info.extension && EXTENSION_MIME_MAP[info.extension]) {
      info.mimetype = EXTENSION_MIME_MAP[info.extension];
    }

    // Magic byte fallback for PDF / ZIP / PNG / JPEG
    if (!info.extension && !info.mimetype && buffer.length >= 4) {
      if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
        info.extension = '.pdf';
        info.mimetype = 'application/pdf';
      } else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        info.extension = '.png';
        info.mimetype = 'image/png';
      } else if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        info.extension = '.jpg';
        info.mimetype = 'image/jpeg';
      } else if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
        info.extension = '.zip';
        info.mimetype = 'application/zip';
      }
    }

    return info;
  }

  async convertBuffer(
    buffer: Buffer,
    streamInfo: StreamInfo = {},
    options: ConvertOptions = {}
  ): Promise<{ result: DocumentConverterResult; converterUsed: string; streamInfo: StreamInfo }> {
    const enhanced = this.enhanceStreamInfo(buffer, streamInfo);
    const sorted = [...this.registrations].sort((a, b) => a.priority - b.priority);
    const errors: string[] = [];

    for (const reg of sorted) {
      let accepted = false;
      try {
        accepted = reg.converter.accepts(buffer, enhanced);
      } catch {
        accepted = false;
      }

      if (!accepted) continue;

      try {
        const res = await reg.converter.convert(buffer, enhanced, options);
        return {
          result: {
            markdown: normalizeMarkdown(res.markdown),
            title: res.title ?? null,
          },
          converterUsed: reg.converter.name,
          streamInfo: enhanced,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${reg.converter.name}: ${msg}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Conversione fallita (${errors.join('; ')})`);
    }
    throw new Error(
      `Formato non supportato (${enhanced.extension || enhanced.mimetype || 'sconosciuto'}).`
    );
  }

  async convertLocal(
    filePath: string,
    options: ConvertOptions = {}
  ): Promise<{ result: DocumentConverterResult; converterUsed: string; streamInfo: StreamInfo; sizeBytes: number }> {
    const buffer = await fs.readFile(filePath);
    const filename = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const out = await this.convertBuffer(
      buffer,
      { localPath: filePath, filename, extension },
      options
    );
    return { ...out, sizeBytes: buffer.length };
  }

  async convertUri(
    uri: string,
    options: ConvertOptions = {}
  ): Promise<{ result: DocumentConverterResult; converterUsed: string; streamInfo: StreamInfo; sizeBytes: number }> {
    const trimmed = uri.trim();
    if (trimmed.toLowerCase().startsWith('data:')) {
      const parsed = parseDataUri(trimmed);
      const out = await this.convertBuffer(
        parsed.buffer,
        {
          mimetype: parsed.mimetype,
          charset: parsed.charset,
          filename: 'data-uri',
        },
        options
      );
      return { ...out, sizeBytes: parsed.buffer.length };
    }

    const validated = validateRemoteUrl(trimmed);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(validated.toString(), {
        signal: controller.signal,
        headers: {
          Accept: 'text/markdown, text/html;q=0.9, text/plain;q=0.8, */*;q=0.1',
          'User-Agent': 'MarkItDown-MDPad/1.0',
        },
      });
      if (!response.ok) {
        throw new Error(`Download risorsa fallito con stato HTTP ${response.status}.`);
      }
      const contentType = response.headers.get('content-type') ?? '';
      const [mimeRaw, ...params] = contentType.split(';');
      const mimetype = mimeRaw?.trim().toLowerCase() || undefined;
      const charsetParam = params.find((p) => p.trim().toLowerCase().startsWith('charset='));
      const charset = charsetParam ? charsetParam.split('=')[1]?.trim() : undefined;

      const pathname = validated.pathname;
      const filename = path.basename(pathname) || validated.hostname;
      const extension = path.extname(pathname).toLowerCase() || undefined;

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const out = await this.convertBuffer(
        buffer,
        {
          url: validated.toString(),
          mimetype,
          charset,
          filename,
          extension,
        },
        options
      );
      return { ...out, sizeBytes: buffer.length };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const markItDown = new MarkItDownEngine();
