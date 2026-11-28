declare module 'turndown-plugin-gfm' {
  import type TurndownService from 'turndown';
  export const gfm: TurndownService.Plugin;
  export const tables: TurndownService.Plugin;
  export const strikethrough: TurndownService.Plugin;
  export const taskListItems: TurndownService.Plugin;
}

declare module 'pdfjs-dist/legacy/build/pdf.mjs' {
  export function getDocument(src: Record<string, unknown>): {
    promise: Promise<{
      numPages: number;
      getMetadata: () => Promise<{ info?: Record<string, unknown> }>;
      getPage: (pageNumber: number) => Promise<{
        getTextContent: () => Promise<{
          items: Array<{ str?: string; hasEOL?: boolean; transform?: number[] }>;
        }>;
      }>;
      destroy: () => Promise<void>;
    }>;
  };
}

declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs' {
  export const WorkerMessageHandler: unknown;
}
