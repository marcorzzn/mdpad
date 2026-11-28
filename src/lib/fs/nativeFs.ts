import type { WorkspaceNode } from '../../components/FolderPane';

export type NativeRuntimePlatform = 'tauri' | 'android' | 'browser-fsa' | 'browser-fallback';

export interface NativeOpenedFile {
  name: string;
  bytes: Uint8Array;
  nativePath?: string;
  androidUri?: string;
  browserHandle?: FileSystemFileHandle;
}

export interface NativeFolderContext {
  platform: NativeRuntimePlatform;
  folderName: string;
  rootPath?: string;
  androidTreeUri?: string;
  browserDirHandle?: FileSystemDirectoryHandle;
  tree: WorkspaceNode;
}

export interface FlatFolderEntry {
  relativePath: string;
  name: string;
  kind: 'dir' | 'file';
  nativePath?: string;
  androidUri?: string;
  browserHandle?: FileSystemFileHandle;
  fileObj?: File;
}

export interface TauriPickedFile {
  name: string;
  path: string;
  base64: string;
}

export interface TauriFolderScan {
  folderName: string;
  rootPath: string;
  entries: Array<{
    relativePath: string;
    name: string;
    kind: 'dir' | 'file';
    path: string;
  }>;
}

export interface AndroidBridge {
  openFile: (requestId: string) => void;
  saveFile: (
    requestId: string,
    uriOrEmpty: string,
    suggestedName: string,
    base64: string,
    mimeType: string
  ) => void;
  openFolder: (requestId: string) => void;
  readDocumentUri: (requestId: string, uri: string) => void;
  writeFileInFolder: (
    requestId: string,
    treeUri: string,
    filename: string,
    base64: string,
    mimeType: string
  ) => void;
  getPendingIntentFile: () => string;
}

interface TauriInternals {
  invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
}

interface LaunchQueueConsumerParams {
  files?: FileSystemFileHandle[];
}

interface LaunchQueueLike {
  setConsumer: (consumer: (params: LaunchQueueConsumerParams) => void) => void;
}

interface GlobalEnvLike {
  __TAURI_INTERNALS__?: TauriInternals;
  MDPadAndroid?: AndroidBridge;
  showOpenFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle[]>;
  showSaveFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle>;
  showDirectoryPicker?: (options?: unknown) => Promise<FileSystemDirectoryHandle>;
  launchQueue?: LaunchQueueLike;
  __mdpadAndroidResolve?: (requestId: string, payloadJson: string) => void;
  __mdpadAndroidReject?: (requestId: string, message: string) => void;
  __mdpadAndroidOnIntentFile?: (payloadJson: string) => void;
}

export function detectRuntimePlatform(env?: Partial<GlobalEnvLike>): NativeRuntimePlatform {
  const g = env ?? (typeof window !== 'undefined' ? (window as unknown as GlobalEnvLike) : {});
  if (g.__TAURI_INTERNALS__ && typeof g.__TAURI_INTERNALS__.invoke === 'function') {
    return 'tauri';
  }
  if (g.MDPadAndroid && typeof g.MDPadAndroid.openFile === 'function') {
    return 'android';
  }
  if (
    typeof g.showOpenFilePicker === 'function' ||
    typeof g.showDirectoryPicker === 'function'
  ) {
    return 'browser-fsa';
  }
  return 'browser-fallback';
}

export function isDirectFolderWriteSupported(folder: NativeFolderContext | null): boolean {
  if (!folder) return false;
  return Boolean(folder.rootPath || folder.androidTreeUri || folder.browserDirHandle);
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  if (!base64) return new Uint8Array(0);
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export function buildWorkspaceTreeFromFlatEntries(
  rootName: string,
  entries: FlatFolderEntry[]
): WorkspaceNode {
  const root: WorkspaceNode = {
    path: rootName,
    name: rootName,
    kind: 'dir',
    children: [],
  };

  for (const entry of entries) {
    const cleanRel = entry.relativePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!cleanRel) continue;
    const parts = cleanRel.split('/').filter(Boolean);
    const startIdx = parts[0] === rootName && parts.length > 1 ? 1 : 0;

    let current = root;
    for (let i = startIdx; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const nodeKind = isLast ? entry.kind : 'dir';
      const nodePath = [rootName, ...parts.slice(startIdx, i + 1)].join('/');

      if (!current.children) current.children = [];
      let child = current.children.find((c) => c.name === part && c.kind === nodeKind);
      if (!child) {
        child =
          nodeKind === 'file'
            ? {
                path: nodePath,
                name: part,
                kind: 'file',
                nativePath: entry.nativePath,
                androidUri: entry.androidUri,
                browserHandle: entry.browserHandle,
                fileObj: entry.fileObj,
              }
            : {
                path: nodePath,
                name: part,
                kind: 'dir',
                children: [],
              };
        current.children.push(child);
      }
      current = child;
    }
  }

  const sortRec = (node: WorkspaceNode) => {
    if (!node.children) return;
    node.children.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    node.children.forEach(sortRec);
  };
  sortRec(root);

  return root;
}

// Promise bus for async Android SAF ActivityResult callbacks
const androidPending = new Map<
  string,
  { resolve: (val: unknown) => void; reject: (err: Error) => void }
>();
let androidReqSeq = 1;

function ensureAndroidBridgeBus() {
  if (typeof window === 'undefined') return;
  const w = window as unknown as GlobalEnvLike;
  if (!w.__mdpadAndroidResolve) {
    w.__mdpadAndroidResolve = (requestId: string, payloadJson: string) => {
      const pending = androidPending.get(requestId);
      if (!pending) return;
      androidPending.delete(requestId);
      try {
        pending.resolve(payloadJson ? JSON.parse(payloadJson) : null);
      } catch {
        pending.resolve(payloadJson);
      }
    };
  }
  if (!w.__mdpadAndroidReject) {
    w.__mdpadAndroidReject = (requestId: string, message: string) => {
      const pending = androidPending.get(requestId);
      if (!pending) return;
      androidPending.delete(requestId);
      pending.reject(new Error(message || 'Operazione annullata su Android.'));
    };
  }
}

function callAndroidAsync<T>(invoke: (bridge: AndroidBridge, requestId: string) => void): Promise<T> {
  ensureAndroidBridgeBus();
  const w = window as unknown as GlobalEnvLike;
  if (!w.MDPadAndroid) {
    return Promise.reject(new Error('Bridge Android non disponibile.'));
  }
  const requestId = `req_${Date.now()}_${androidReqSeq++}`;
  return new Promise<T>((resolve, reject) => {
    androidPending.set(requestId, {
      resolve: (v) => resolve(v as T),
      reject,
    });
    try {
      invoke(w.MDPadAndroid!, requestId);
    } catch (err) {
      androidPending.delete(requestId);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const w = window as unknown as GlobalEnvLike;
  if (!w.__TAURI_INTERNALS__?.invoke) {
    throw new Error('Tauri IPC non disponibile.');
  }
  return w.__TAURI_INTERNALS__.invoke<T>(cmd, args);
}

export async function openNativeFile(): Promise<NativeOpenedFile | null> {
  const platform = detectRuntimePlatform();

  if (platform === 'tauri') {
    const picked = await tauriInvoke<TauriPickedFile | null>('pick_open_file');
    if (!picked) return null;
    return {
      name: picked.name,
      bytes: base64ToUint8Array(picked.base64),
      nativePath: picked.path,
    };
  }

  if (platform === 'android') {
    try {
      const picked = await callAndroidAsync<{ name: string; uri: string; base64: string } | null>(
        (bridge, reqId) => bridge.openFile(reqId)
      );
      if (!picked) return null;
      return {
        name: picked.name,
        bytes: base64ToUint8Array(picked.base64),
        androidUri: picked.uri,
      };
    } catch {
      return null;
    }
  }

  if (platform === 'browser-fsa') {
    const w = window as unknown as GlobalEnvLike;
    try {
      const handles = await w.showOpenFilePicker!({
        multiple: false,
        types: [
          {
            description: 'Markdown, testo e documenti',
            accept: {
              'text/markdown': ['.md', '.markdown', '.mdown', '.mkd'],
              'text/plain': ['.txt', '.log', '.ini', '.cfg', '.csv', '.tsv', '.yaml', '.yml'],
              'application/json': ['.json'],
            },
          },
        ],
      });
      const handle = handles?.[0];
      if (!handle) return null;
      const file = await handle.getFile();
      const buf = new Uint8Array(await file.arrayBuffer());
      return {
        name: file.name,
        bytes: buf,
        browserHandle: handle,
      };
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return null;
      return null;
    }
  }

  return null;
}

export async function saveNativeFile(params: {
  suggestedName: string;
  bytes: Uint8Array;
  mimeType: string;
  nativePath?: string;
  androidUri?: string;
  browserHandle?: FileSystemFileHandle;
}): Promise<{
  saved: boolean;
  name: string;
  nativePath?: string;
  androidUri?: string;
  browserHandle?: FileSystemFileHandle;
}> {
  const platform = detectRuntimePlatform();

  if (platform === 'tauri') {
    const saved = await tauriInvoke<{ name: string; path: string } | null>('save_file', {
      path: params.nativePath ?? null,
      suggestedName: params.suggestedName,
      base64: uint8ArrayToBase64(params.bytes),
    });
    if (!saved) return { saved: false, name: params.suggestedName };
    return { saved: true, name: saved.name, nativePath: saved.path };
  }

  if (platform === 'android') {
    try {
      const saved = await callAndroidAsync<{ name: string; uri: string } | null>((bridge, reqId) =>
        bridge.saveFile(
          reqId,
          params.androidUri ?? '',
          params.suggestedName,
          uint8ArrayToBase64(params.bytes),
          params.mimeType
        )
      );
      if (!saved) return { saved: false, name: params.suggestedName };
      return { saved: true, name: saved.name, androidUri: saved.uri };
    } catch {
      return { saved: false, name: params.suggestedName };
    }
  }

  if (platform === 'browser-fsa') {
    const w = window as unknown as GlobalEnvLike;
    try {
      let handle = params.browserHandle;
      if (!handle && typeof w.showSaveFilePicker === 'function') {
        handle = await w.showSaveFilePicker({
          suggestedName: params.suggestedName,
          types: [
            {
              description: 'Documento Markdown / Testo',
              accept: {
                'text/markdown': ['.md', '.markdown'],
                'text/plain': ['.txt', '.log'],
                'application/json': ['.json'],
              },
            },
          ],
        });
      }
      if (handle) {
        const writable = await handle.createWritable();
        const copy = new Uint8Array(params.bytes.byteLength);
        copy.set(params.bytes);
        await writable.write(new Blob([copy], { type: params.mimeType }));
        await writable.close();
        return { saved: true, name: handle.name || params.suggestedName, browserHandle: handle };
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') {
        return { saved: false, name: params.suggestedName };
      }
      // Fall through to standard browser download
    }
  }

  // Universal fallback: trigger browser download
  const copy = new Uint8Array(params.bytes.byteLength);
  copy.set(params.bytes);
  const blob = new Blob([copy], { type: params.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = params.suggestedName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { saved: true, name: params.suggestedName };
}

async function walkBrowserDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  prefix: string,
  out: FlatFolderEntry[],
  depth = 0
): Promise<void> {
  if (depth > 4 || out.length >= 400) return;
  const iter = (
    dirHandle as unknown as {
      values: () => AsyncIterable<FileSystemHandle>;
    }
  ).values();

  for await (const entry of iter) {
    if (out.length >= 400) break;
    if (entry.name.startsWith('.') && entry.name !== '.directory') continue;
    if (entry.name === 'node_modules' || entry.name === 'target') continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === 'directory') {
      out.push({ relativePath: rel, name: entry.name, kind: 'dir' });
      await walkBrowserDirectoryHandle(entry as FileSystemDirectoryHandle, rel, out, depth + 1);
    } else {
      out.push({
        relativePath: rel,
        name: entry.name,
        kind: 'file',
        browserHandle: entry as FileSystemFileHandle,
      });
    }
  }
}

export async function openNativeFolder(): Promise<NativeFolderContext | null> {
  const platform = detectRuntimePlatform();

  if (platform === 'tauri') {
    const scan = await tauriInvoke<TauriFolderScan | null>('pick_and_scan_folder');
    if (!scan) return null;
    const flat: FlatFolderEntry[] = scan.entries.map((e) => ({
      relativePath: e.relativePath,
      name: e.name,
      kind: e.kind,
      nativePath: e.path,
    }));
    return {
      platform: 'tauri',
      folderName: scan.folderName,
      rootPath: scan.rootPath,
      tree: buildWorkspaceTreeFromFlatEntries(scan.folderName, flat),
    };
  }

  if (platform === 'android') {
    try {
      const scan = await callAndroidAsync<{
        folderName: string;
        treeUri: string;
        entries: Array<{ relativePath: string; name: string; kind: 'dir' | 'file'; uri: string }>;
      } | null>((bridge, reqId) => bridge.openFolder(reqId));
      if (!scan) return null;
      const flat: FlatFolderEntry[] = scan.entries.map((e) => ({
        relativePath: e.relativePath,
        name: e.name,
        kind: e.kind,
        androidUri: e.uri,
      }));
      return {
        platform: 'android',
        folderName: scan.folderName,
        androidTreeUri: scan.treeUri,
        tree: buildWorkspaceTreeFromFlatEntries(scan.folderName, flat),
      };
    } catch {
      return null;
    }
  }

  if (platform === 'browser-fsa') {
    const w = window as unknown as GlobalEnvLike;
    if (typeof w.showDirectoryPicker === 'function') {
      try {
        const dirHandle = await w.showDirectoryPicker({ mode: 'readwrite' });
        const flat: FlatFolderEntry[] = [];
        await walkBrowserDirectoryHandle(dirHandle, '', flat);
        return {
          platform: 'browser-fsa',
          folderName: dirHandle.name,
          browserDirHandle: dirHandle,
          tree: buildWorkspaceTreeFromFlatEntries(dirHandle.name, flat),
        };
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return null;
      }
    }
  }

  return null;
}

export async function readWorkspaceNodeBytes(node: WorkspaceNode): Promise<Uint8Array | null> {
  if (node.fileObj) {
    return new Uint8Array(await node.fileObj.arrayBuffer());
  }
  if (node.browserHandle) {
    const file = await node.browserHandle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  }
  if (node.nativePath && detectRuntimePlatform() === 'tauri') {
    const base64 = await tauriInvoke<string>('read_file_bytes', { path: node.nativePath });
    return base64ToUint8Array(base64);
  }
  if (node.androidUri && detectRuntimePlatform() === 'android') {
    const res = await callAndroidAsync<{ base64: string }>((bridge, reqId) =>
      bridge.readDocumentUri(reqId, node.androidUri!)
    );
    return base64ToUint8Array(res.base64);
  }
  if (typeof node.content === 'string') {
    return new TextEncoder().encode(node.content);
  }
  return null;
}

export async function collectFolderFilesForScan(
  folder: NativeFolderContext,
  maxFiles = 40
): Promise<Array<{ relativePath: string; filename: string; bytes: Uint8Array }>> {
  const results: Array<{ relativePath: string; filename: string; bytes: Uint8Array }> = [];
  const queue: WorkspaceNode[] = [...(folder.tree.children ?? [])];

  while (queue.length > 0 && results.length < maxFiles) {
    const node = queue.shift()!;
    if (node.kind === 'dir') {
      if (node.children) queue.push(...node.children);
      continue;
    }
    const lower = node.name.toLowerCase();
    if (lower === '_post-it.md' || lower === 'desktop.ini' || lower === '.directory') continue;
    try {
      const bytes = await readWorkspaceNodeBytes(node);
      if (bytes) {
        results.push({
          relativePath: node.path,
          filename: node.name,
          bytes,
        });
      }
    } catch {
      // Skip unreadable file
    }
  }
  return results;
}

export async function writeFilesDirectlyToFolder(
  folder: NativeFolderContext,
  files: Array<{ filename: string; content: string; mimeType: string }>
): Promise<{ written: string[] }> {
  const written: string[] = [];
  const encoder = new TextEncoder();

  if (folder.platform === 'tauri' && folder.rootPath) {
    await tauriInvoke('write_files_in_folder', {
      folderPath: folder.rootPath,
      files: files.map((f) => ({
        filename: f.filename,
        base64: uint8ArrayToBase64(encoder.encode(f.content)),
      })),
    });
    return { written: files.map((f) => f.filename) };
  }

  if (folder.platform === 'android' && folder.androidTreeUri) {
    for (const f of files) {
      await callAndroidAsync((bridge, reqId) =>
        bridge.writeFileInFolder(
          reqId,
          folder.androidTreeUri!,
          f.filename,
          uint8ArrayToBase64(encoder.encode(f.content)),
          f.mimeType
        )
      );
      written.push(f.filename);
    }
    return { written };
  }

  if (folder.browserDirHandle) {
    for (const f of files) {
      const fileHandle = await folder.browserDirHandle.getFileHandle(f.filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(f.content);
      await writable.close();
      written.push(f.filename);
    }
    return { written };
  }

  throw new Error('Scrittura diretta nella cartella non supportata da questo browser.');
}

export function subscribeIncomingLaunchFiles(
  onFile: (file: NativeOpenedFile) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const w = window as unknown as GlobalEnvLike;
  const cleanups: Array<() => void> = [];

  // 1. PWA File Handling API (Windows/macOS/Linux/ChromeOS installed PWA)
  if (w.launchQueue && typeof w.launchQueue.setConsumer === 'function') {
    w.launchQueue.setConsumer(async (params) => {
      for (const handle of params.files ?? []) {
        try {
          const f = await handle.getFile();
          const bytes = new Uint8Array(await f.arrayBuffer());
          onFile({ name: f.name, bytes, browserHandle: handle });
        } catch {
          // Ignore unreadable handle
        }
      }
    });
  }

  // 2. Tauri CLI launch files (double-click .md on Windows/macOS/Linux)
  if (detectRuntimePlatform() === 'tauri') {
    void tauriInvoke<TauriPickedFile[]>('get_launch_files')
      .then((files) => {
        for (const f of files ?? []) {
          onFile({
            name: f.name,
            bytes: base64ToUint8Array(f.base64),
            nativePath: f.path,
          });
        }
      })
      .catch(() => {});
  }

  // 3. Android Intent files (default .md editor open/edit/share)
  if (detectRuntimePlatform() === 'android' && w.MDPadAndroid) {
    const dispatchJson = (raw: string) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as { name?: string; uri?: string; base64?: string };
        if (parsed?.name && typeof parsed.base64 === 'string') {
          onFile({
            name: parsed.name,
            bytes: base64ToUint8Array(parsed.base64),
            androidUri: parsed.uri,
          });
        }
      } catch {
        // Ignore malformed intent payload
      }
    };

    try {
      const pending = w.MDPadAndroid.getPendingIntentFile();
      if (pending) dispatchJson(pending);
    } catch {
      // Ignore
    }

    w.__mdpadAndroidOnIntentFile = dispatchJson;
    cleanups.push(() => {
      delete w.__mdpadAndroidOnIntentFile;
    });
  }

  return () => {
    for (const fn of cleanups) fn();
  };
}
