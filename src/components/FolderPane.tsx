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
import { useI18n } from '../lib/i18n/I18nContext';

export interface WorkspaceNode {
  path: string;
  name: string;
  kind: 'dir' | 'file';
  content?: string;
  fileObj?: File;
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
motore: Rust + Win32 (RE:Notepad)
stato: Pronto per distribuzione
---

# 📌 Post-it Cartella: Progetto_MDPad

> [!NOTE]
> Questa cartella contiene i documenti principali del progetto, la configurazione JSON e il diario operativo \`.LOG\`.

## Contenuto rapido
- **README.md**: Specifiche architetturali native (eseguibile singolo ~700 KB)
- **config.json**: Configurazione minificata (si formatta automaticamente all'apertura!)
- **diary.log**: Diario Notepad classico con timestamp automatico ad ogni apertura
- **docs/architettura.md**: Guida anti-falso positivo Antivirus e packaging Inno Setup
`,
    },
    {
      path: 'Progetto_MDPad/README.md',
      name: 'README.md',
      kind: 'file',
      content: `---
title: MDPad Native Win32
version: 1.0.0
architecture: Rust + Pure Win32/GDI
tags: [notepad, markdown, win32, zero-telemetry]
---

# MDPad — Blocco Note Markdown Nativo

> [!TIP]
> Premi **Ctrl+Shift+E** per mostrare o nascondere il Pannello Cartella, **Ctrl+D** per duplicare una riga, **Ctrl+G** per andare a una riga specifica e **Shift+Alt+F** per formattare JSON.

## Logiche integrate da RE:Notepad
1. **Rilevamento codifica Windows 10** (UTF-8, UTF-8 BOM, UTF-16 LE/BE, ANSI) con protezione *Bush hid the facts*.
2. **Terminatori di riga preservati** (CRLF, LF, CR).
3. **File \`.LOG\`** con timestamp automatico all'apertura.
4. **Tab / Shift+Tab intelligente** con rilevamento automatico dell'indentazione e **matching parentesi** \`() [] {}\`.
5. **Eseguibile nativo Rust + Win32** (~700 KB) con manifest \`asInvoker\`, \`VERSIONINFO\`, installer **Inno Setup** per-utente e **ZIP portatile pulito** + \`SHA256SUMS.txt\`.
`,
    },
    {
      path: 'Progetto_MDPad/config.json',
      name: 'config.json',
      kind: 'file',
      content:
        '{"app":"MDPad","engine":"rust-win32","darkByDefault":true,"autoFormatMinifiedJson":true,"encodings":["UTF-8","UTF-8-BOM","UTF-16 LE","UTF-16 BE","ANSI"],"telemetry":false}',
    },
    {
      path: 'Progetto_MDPad/diary.log',
      name: 'diary.log',
      kind: 'file',
      content: `.LOG
09:15 28/11/2026
Architettura nativa Rust + Win32 configurata secondo RE:Notepad.
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
documento: Sicurezza e Packaging Antivirus-Friendly
target: Windows 10 / 11 x64
installer: Inno Setup 7 (per-utente)
---

# Perché MDPad Nativo evita i blocchi Antivirus

> [!IMPORTANT]
> Gli eseguibili portatili auto-estraenti (come NSIS portable di Electron) scompattano file in \`%TEMP%\` ad ogni avvio e avviano un server locale: è il principale fattore di falsi positivi euristici sugli antivirus.

## Scelte tecniche adottate (stile RE:Notepad)
- **Binario nativo puro Rust + Win32 MSVC** (\`MDPad.exe\`, ~700 KB), compilato senza packer (no UPX) né estrattori temporanei.
- **Manifest Windows completo** (\`asInvoker\`, \`PerMonitorV2\`, \`Common-Controls 6.0\`) e risorsa \`VERSIONINFO\` completa.
- **Zero chiamate di rete all'avvio** e **zero server locali**.
- **Distribuzione trasparente**: Installer **Inno Setup** per-utente (\`MDPad-1.0.0-setup.exe\`), **ZIP portatile pulito** (\`MDPad-1.0.0-portable.zip\`), checksum **\`SHA256SUMS.txt\`** e supporto opzionale alla firma **Authenticode** via GitHub Actions.
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
      let child = current.children.find((c) => c.name === part && c.kind === (isLast ? 'file' : 'dir'));
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
  onOpenWorkspaceNode: (node: WorkspaceNode) => void;
  onOpenFolderPostIt: () => void;
  onClose: () => void;
}

export const FolderPane: React.FC<FolderPaneProps> = ({
  activeFileTitle,
  onOpenWorkspaceNode,
  onOpenFolderPostIt,
  onClose,
}) => {
  const { locale } = useI18n();
  const [tree, setTree] = useState<WorkspaceNode>(DEMO_WORKSPACE_TREE);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Progetto_MDPad: true,
    'Progetto_MDPad/docs': true,
  });
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const isIt = locale === 'it';
  const labels = useMemo(
    () => ({
      title: isIt ? 'Pannello Cartella' : 'Folder Pane',
      openLocal: isIt ? 'Apri cartella...' : 'Open folder...',
      postIt: isIt ? 'Post-it Cartella' : 'Folder Post-it',
      close: isIt ? 'Chiudi pannello cartella' : 'Close folder pane',
    }),
    [isIt]
  );

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
              setTree(built);
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
            onClick={() => folderInputRef.current?.click()}
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

      <div className="flex-1 overflow-y-auto p-1.5">{renderNode(tree, 0)}</div>

      <div
        className="border-t p-2"
        style={{ borderColor: 'var(--md-border)' }}
      >
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
          <span>{labels.postIt}</span>
        </button>
      </div>
    </aside>
  );
};
