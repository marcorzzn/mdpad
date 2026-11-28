import React, { useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  StickyNote,
  X,
} from 'lucide-react';
import {
  detectRuntimePlatform,
  openNativeFolder,
  type NativeFolderContext,
} from '../lib/fs/nativeFs';
import { useI18n } from '../lib/i18n/I18nContext';

export interface WorkspaceNode {
  path: string;
  name: string;
  kind: 'dir' | 'file';
  content?: string;
  fileObj?: File;
  nativePath?: string;
  androidUri?: string;
  browserHandle?: FileSystemFileHandle;
  children?: WorkspaceNode[];
}

export const DEMO_WORKSPACE_TREE: WorkspaceNode = {
  path: 'Progetto_MDPad',
  name: 'Progetto_MDPad',
  kind: 'dir',
  children: [
    {
      path: 'Progetto_MDPad/_POST-IT.md',
      name: '_POST-IT.md',
      kind: 'file',
      content: `---
cartella: Progetto_MDPad
autore: Marco Razzano
piattaforme: Windows, macOS, Linux, Android, PWA
stato: Pronto per distribuzione Open Source
---

# Post-it Cartella: Progetto_MDPad

> [!NOTE]
> Questa cartella contiene i documenti principali di **MDPad** di Marco Razzano, la configurazione JSON e il diario operativo \`.LOG\`.

## Contenuto rapido
- **README.md**: Architettura cross-platform (Desktop nativo Rust + WebView2, Android APK predefinito per \`.md\`, PWA offline)
- **config.json**: Configurazione minificata (si formatta automaticamente all'apertura!)
- **diary.log**: Diario Notepad classico con timestamp automatico ad ogni apertura
- **docs/architettura.md**: Guida anti-falso positivo Antivirus e certificazione Open Source SignPath
`,
    },
    {
      path: 'Progetto_MDPad/README.md',
      name: 'README.md',
      kind: 'file',
      content: `---
title: MDPad — Blocco Note Markdown
author: Marco Razzano
version: 1.0.0
license: MIT
platforms: [Windows, macOS, Linux, Android, PWA]
---

# MDPad — Blocco Note Markdown (di Marco Razzano)

> [!TIP]
> Premi **Ctrl+Shift+E** per mostrare o nascondere il Pannello Cartella, **Ctrl+D** per duplicare una riga, **Ctrl+G** per andare a una riga specifica e **Shift+Alt+F** per formattare JSON.

## Funzionalità complete su tutti i sistemi operativi
1. **Navigazione File System nativa**: Apri e salva file e cartelle reali su Windows, macOS, Linux, Android (Storage Access Framework) e browser moderni.
2. **Motore MarkItDown 100% offline**: Converte DOCX, XLSX, PPTX, PDF, HTML, EPUB, RSS, CSV, IPYNB e ZIP anche senza server locale.
3. **Post-it per cartelle**: Genera e salva direttamente \`_POST-IT.md\`, \`desktop.ini\` e \`.directory\` nella cartella selezionata.
4. **App Android dedicata**: Registrata come editor predefinito per aprire, modificare e creare file \`.md\`.
5. **Logiche RE:Notepad**: 5 codifiche Windows, \`CRLF/LF/CR\`, diario \`.LOG\`, JSON auto-format, YAML Front Matter e Alert GitHub.
`,
    },
    {
      path: 'Progetto_MDPad/config.json',
      name: 'config.json',
      kind: 'file',
      content:
        '{"app":"MDPad","author":"Marco Razzano","platforms":["windows","macos","linux","android","pwa"],"autoFormatMinifiedJson":true,"encodings":["UTF-8","UTF-8-BOM","UTF-16 LE","UTF-16 BE","ANSI"],"telemetry":false}',
    },
    {
      path: 'Progetto_MDPad/diary.log',
      name: 'diary.log',
      kind: 'file',
      content: `.LOG
09:15 28/11/2026
MDPad di Marco Razzano configurato per Windows, macOS, Linux e Android con MarkItDown offline.
`,
    },
    {
      path: 'Progetto_MDPad/docs',
      name: 'docs',
      kind: 'dir',
      children: [
        {
          path: 'Progetto_MDPad/docs/architettura.md',
          name: 'architettura.md',
          kind: 'file',
          content: `---
documento: Sicurezza, Antivirus & Certificazione Open Source
autore: Marco Razzano
target: Windows, macOS, Linux, Android
certificazione: SignPath Foundation (gratuito OSS)
---

# Perché MDPad evita i blocchi Antivirus ed è certificabile gratis (Open Source)

> [!IMPORTANT]
> Gli eseguibili portatili auto-estraenti (come NSIS portable di Electron) scompattano file in \`%TEMP%\` ad ogni avvio e avviano un server locale: è il principale fattore di falsi positivi euristici sugli antivirus.

## Scelte tecniche adottate
- **Desktop Nativo Rust + WebView di sistema (Tauri v2)** con tutta l'interfaccia MDPad completa: nessun Electron, nessun Node.js, nessun server locale.
- **Installer Inno Setup per-utente** (\`MDPad-1.0.0-setup.exe\`) con autore **Marco Razzano**, **ZIP portatile pulito** e **\`SHA256SUMS.txt\`**.
- **Versione Android nativa (APK)** con Intent Filter per diventare app predefinita per \`.md\` e accesso diretto alle cartelle via Storage Access Framework.
- **Certificazione gratuita Open Source**: integrazione pronta per **SignPath Foundation** (\`SIGNPATH_API_TOKEN\`) o certificato Authenticode / Azure Trusted Signing.
`,
        },
      ],
    },
  ],
};

function buildTreeFromFileList(files: FileList): WorkspaceNode | null {
  if (!files || files.length === 0) return null;
  const firstRel = files[0].webkitRelativePath || files[0].name;
  const rootName = firstRel.includes('/') ? firstRel.split('/')[0] : 'Cartella Locale';
  const root: WorkspaceNode = {
    path: rootName,
    name: rootName,
    kind: 'dir',
    children: [],
  };

  const maxFiles = Math.min(files.length, 500);
  for (let i = 0; i < maxFiles; i++) {
    const f = files[i];
    const rel = f.webkitRelativePath || `${rootName}/${f.name}`;
    const parts = rel.split('/').filter(Boolean);
    let current = root;
    for (let p = 1; p < parts.length; p++) {
      const part = parts[p];
      const isLast = p === parts.length - 1;
      const nodePath = parts.slice(0, p + 1).join('/');
      if (!current.children) current.children = [];
      let child = current.children.find(
        (c) => c.name === part && c.kind === (isLast ? 'file' : 'dir')
      );
      if (!child) {
        child = isLast
          ? { path: nodePath, name: part, kind: 'file', fileObj: f }
          : { path: nodePath, name: part, kind: 'dir', children: [] };
        current.children.push(child);
      }
      current = child;
    }
  }

  const sortTree = (node: WorkspaceNode) => {
    if (!node.children) return;
    node.children.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    node.children.forEach(sortTree);
  };
  sortTree(root);
  return root;
}

interface FolderPaneProps {
  activeFileTitle: string;
  activeFolder: NativeFolderContext | null;
  onFolderChange: (folder: NativeFolderContext | null) => void;
  onOpenWorkspaceNode: (node: WorkspaceNode) => void;
  onOpenFolderPostIt: () => void;
  onClose: () => void;
}

export const FolderPane: React.FC<FolderPaneProps> = ({
  activeFileTitle,
  activeFolder,
  onFolderChange,
  onOpenWorkspaceNode,
  onOpenFolderPostIt,
  onClose,
}) => {
  const { locale } = useI18n();
  const [fallbackTree, setFallbackTree] = useState<WorkspaceNode>(DEMO_WORKSPACE_TREE);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Progetto_MDPad: true,
    'Progetto_MDPad/docs': true,
  });
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const tree = activeFolder?.tree ?? fallbackTree;
  const isIt = locale === 'it';
  const labels = useMemo(
    () => ({
      title: isIt ? 'Pannello Cartella' : 'Folder Pane',
      openLocal: isIt ? 'Apri cartella dal dispositivo…' : 'Open device folder…',
      postIt: activeFolder
        ? isIt
          ? `Annota "${activeFolder.folderName}"`
          : `Annotate "${activeFolder.folderName}"`
        : isIt
          ? 'Post-it Cartella'
          : 'Folder Post-it',
      close: isIt ? 'Chiudi pannello cartella' : 'Close folder pane',
      nativeHint:
        activeFolder && activeFolder.platform !== 'browser-fallback'
          ? isIt
            ? 'Accesso filesystem nativo attivo'
            : 'Native filesystem access active'
          : null,
    }),
    [isIt, activeFolder]
  );

  const handleOpenFolderClick = async () => {
    const platform = detectRuntimePlatform();
    if (platform !== 'browser-fallback') {
      const picked = await openNativeFolder();
      if (picked) {
        onFolderChange(picked);
        setExpanded({ [picked.tree.path]: true });
        return;
      }
      // On Tauri or Android, null means the user cancelled the native dialog
      if (platform === 'tauri' || platform === 'android') {
        return;
      }
    }
    folderInputRef.current?.click();
  };

  const toggleDir = (dirPath: string) => {
    setExpanded((prev) => ({ ...prev, [dirPath]: !prev[dirPath] }));
  };

  const renderIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === '_post-it.md') return <StickyNote className="h-3.5 w-3.5 shrink-0 text-amber-500" />;
    if (lower.endsWith('.json')) return <FileJson className="h-3.5 w-3.5 shrink-0 text-sky-500" />;
    if (lower.endsWith('.md') || lower.endsWith('.markdown'))
      return <FileCode2 className="h-3.5 w-3.5 shrink-0 text-blue-500" />;
    return <FileText className="h-3.5 w-3.5 shrink-0 opacity-70" />;
  };

  const renderNode = (node: WorkspaceNode, depth: number): React.ReactNode => {
    const isDir = node.kind === 'dir';
    const isOpen = Boolean(expanded[node.path]);
    const isActive = !isDir && node.name.toLowerCase() === activeFileTitle.toLowerCase();

    return (
      <div key={node.path}>
        <button
          type="button"
          onClick={() => {
            if (isDir) toggleDir(node.path);
            else onOpenWorkspaceNode(node);
          }}
          className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          style={{
            paddingLeft: `${depth * 14 + 8}px`,
            fontWeight: isActive ? 700 : 400,
            backgroundColor: isActive ? 'var(--md-accent-soft)' : undefined,
            color: isActive ? 'var(--md-accent)' : 'var(--md-text)',
          }}
        >
          {isDir ? (
            <>
              {isOpen ? (
                <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0 opacity-70" />
              )}
              {isOpen ? (
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              ) : (
                <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              )}
            </>
          ) : (
            <>
              <span className="inline-block w-3 shrink-0" />
              {renderIcon(node.name)}
            </>
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {isDir && isOpen && node.children?.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <aside
      aria-label={labels.title}
      className="no-print flex w-60 shrink-0 flex-col border-r select-none"
      style={{
        backgroundColor: 'var(--md-surface-alt)',
        borderColor: 'var(--md-border)',
      }}
    >
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        webkitdirectory=""
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const built = buildTreeFromFileList(e.target.files);
            if (built) {
              setFallbackTree(built);
              onFolderChange({
                platform: 'browser-fallback',
                folderName: built.name,
                tree: built,
              });
              setExpanded({ [built.path]: true });
            }
          }
          e.target.value = '';
        }}
      />

      <div
        className="flex items-center justify-between border-b px-3 py-2"
        style={{ borderColor: 'var(--md-border)' }}
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <FolderOpen className="h-3.5 w-3.5" style={{ color: 'var(--md-accent)' }} />
          <span>{labels.title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void handleOpenFolderClick()}
            title={labels.openLocal}
            aria-label={labels.openLocal}
            className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {labels.nativeHint && (
        <div
          className="border-b px-3 py-1 text-[10px]"
          style={{
            borderColor: 'var(--md-border)',
            color: 'var(--md-accent)',
            backgroundColor: 'var(--md-accent-soft)',
          }}
        >
          {labels.nativeHint}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-1.5">{renderNode(tree, 0)}</div>

      <div className="border-t p-2" style={{ borderColor: 'var(--md-border)' }}>
        <button
          type="button"
          onClick={onOpenFolderPostIt}
          className="flex w-full items-center justify-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          style={{
            borderColor: 'var(--md-border)',
            backgroundColor: 'var(--md-surface)',
            color: 'var(--md-text)',
          }}
        >
          <StickyNote className="h-3.5 w-3.5 text-amber-500" />
          <span className="truncate">{labels.postIt}</span>
        </button>
      </div>
    </aside>
  );
};
