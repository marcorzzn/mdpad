export interface StreamInfo {
  mimetype?: string;
  extension?: string;
  charset?: string;
  filename?: string;
  localPath?: string;
  url?: string;
}

export interface DocumentConverterResult {
  markdown: string;
  title?: string | null;
}

export interface ConvertOptions {
  keepDataUris?: boolean;
  maxDepth?: number;
}

export interface ConverterMetadata {
  name: string;
  priority: number;
  extensions: string[];
  mimeTypes: string[];
  description: string;
}

export interface DocumentConverter {
  readonly name: string;
  readonly description: string;
  readonly extensions: string[];
  readonly mimeTypes: string[];
  accepts(buffer: Buffer, streamInfo: StreamInfo): boolean;
  convert(
    buffer: Buffer,
    streamInfo: StreamInfo,
    options?: ConvertOptions
  ): Promise<DocumentConverterResult>;
}

export interface ConversionStats {
  inputBytes: number;
  outputChars: number;
  outputLines: number;
  estimatedTokens: number;
  durationMs: number;
}

export interface ConversionResponse {
  id: string;
  sourceName: string;
  title: string | null;
  markdown: string;
  converterUsed: string;
  streamInfo: StreamInfo;
  stats: ConversionStats;
  createdAt: string;
}

export interface FolderFileSummary {
  filename: string;
  relativePath: string;
  sizeBytes: number;
  converterUsed: string;
  title: string | null;
  excerpt: string;
  headings: string[];
  markdown: string;
  status: 'ok' | 'error';
  error?: string;
}

export interface FolderPostItResult {
  folderName: string;
  filesProcessed: number;
  filesSucceeded: number;
  filesFailed: number;
  mode: 'local' | 'ai';
  postItMarkdown: string;
  desktopIni: string;
  linuxDirectory: string;
  applyBat: string;
  infoTip: string;
  files: FolderFileSummary[];
}

export type LineEnding = 'CRLF' | 'LF';
export type FileEncoding = 'UTF-8' | 'UTF-8-BOM' | 'ANSI';
export type ViewMode = 'source' | 'split' | 'preview';
export type AppTheme = 'system' | 'light' | 'dark' | 'high-contrast';
export type ResolvedTheme = 'light' | 'dark' | 'high-contrast';
export type SupportedLocale = 'it' | 'en' | 'es' | 'fr' | 'de';
export type LanguagePreference = 'system' | SupportedLocale;
