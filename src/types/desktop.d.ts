import type { FileEncoding, LineEnding } from '../lib/markitdown/types';

export interface DesktopFilePayload {
  filePath: string;
  name: string;
  isBinary: boolean;
  content?: string;
  encoding?: FileEncoding;
  lineEnding?: LineEnding;
  base64?: string;
}

export interface DesktopSaveRequest {
  filePath?: string;
  suggestedName: string;
  content: string;
  encoding: FileEncoding;
  lineEnding: LineEnding;
  forceSaveAs?: boolean;
}

export interface DesktopSaveResponse {
  canceled: boolean;
  filePath?: string;
  name?: string;
}

export interface MdPadDesktopBridge {
  isDesktop: boolean;
  platform: string;
  getInitialFiles: () => Promise<DesktopFilePayload[]>;
  openFileDialog: () => Promise<DesktopFilePayload | null>;
  saveFile: (payload: DesktopSaveRequest) => Promise<DesktopSaveResponse>;
  setWindowTitle: (title: string) => void;
  onOpenFile: (callback: (payload: DesktopFilePayload) => void) => () => void;
}

declare global {
  interface Window {
    mdpadDesktop?: MdPadDesktopBridge;
  }
}

export {};
