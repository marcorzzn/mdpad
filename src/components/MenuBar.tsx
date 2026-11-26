import React, { useEffect, useRef, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import type { AppTheme, FileEncoding, LineEnding, ViewMode } from '../lib/markitdown/types';

export interface MenuActions {
  onNewTab: () => void;
  onOpenLocalFile: () => void;
  onOpenMarkItDown: () => void;
  onSaveMd: () => void;
  onExportHtml: () => void;
  onPrintPdf: () => void;
  onCloseActiveTab: () => void;
  onOpenFind: (withReplace: boolean) => void;
  onClearFormatting: () => void;
  onOpenTableDialog: () => void;
  onInsertDateTime: () => void;
  onToggleWordWrap: () => void;
  onChangeEncoding: (enc: FileEncoding) => void;
  onChangeLineEnding: (le: LineEnding) => void;
  onChangeViewMode: (mode: ViewMode) => void;
  onToggleOutline: () => void;
  onToggleStatusBar: () => void;
  onChangeTheme: (theme: AppTheme) => void;
  onOpenFolderPostIt: () => void;
  onOpenCrossPlatform: () => void;
  onToggleAiEnabled: () => void;
  onToggleSessionRestore: () => void;
}

interface MenuBarProps {
  actions: MenuActions;
  viewMode: ViewMode;
  wordWrap: boolean;
  showOutline: boolean;
  showStatusBar: boolean;
  theme: AppTheme;
  encoding: FileEncoding;
  lineEnding: LineEnding;
  aiEnabled: boolean;
  sessionRestore: boolean;
}

type MenuKey = 'file' | 'edit' | 'format' | 'view' | 'tools' | 'help';

interface MenuItem {
  label: string;
  shortcut?: string;
  checked?: boolean;
  divider?: boolean;
  onClick?: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  actions,
  viewMode,
  wordWrap,
  showOutline,
  showStatusBar,
  theme,
  encoding,
  lineEnding,
  aiEnabled,
  sessionRestore,
}) => {
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const menus: Record<MenuKey, { label: string; items: MenuItem[] }> = {
    file: {
      label: 'File',
      items: [
        { label: 'Nuova scheda', shortcut: 'Ctrl+N', onClick: actions.onNewTab },
        { label: 'Apri file .md / .txt…', shortcut: 'Ctrl+O', onClick: actions.onOpenLocalFile },
        { label: 'Importa documento con MarkItDown…', onClick: actions.onOpenMarkItDown },
        { label: '', divider: true },
        { label: 'Salva come .md', shortcut: 'Ctrl+S', onClick: actions.onSaveMd },
        { label: 'Esporta HTML pulito', onClick: actions.onExportHtml },
        { label: 'Stampa / Salva in PDF', shortcut: 'Ctrl+P', onClick: actions.onPrintPdf },
        { label: '', divider: true },
        { label: 'Chiudi scheda corrente', onClick: actions.onCloseActiveTab },
      ],
    },
    edit: {
      label: 'Modifica',
      items: [
        { label: 'Trova (supporta * e ?)', shortcut: 'Ctrl+F', onClick: () => actions.onOpenFind(false) },
        { label: 'Sostituisci…', shortcut: 'Ctrl+H', onClick: () => actions.onOpenFind(true) },
        { label: '', divider: true },
        { label: 'Inserisci Tabella…', shortcut: 'Ctrl+T', onClick: actions.onOpenTableDialog },
        { label: 'Cancella formattazione Markdown', shortcut: 'Ctrl+Spazio', onClick: actions.onClearFormatting },
        { label: 'Inserisci data e ora', shortcut: 'F5', onClick: actions.onInsertDateTime },
      ],
    },
    format: {
      label: 'Formato',
      items: [
        { label: 'A capo automatico', checked: wordWrap, onClick: actions.onToggleWordWrap },
        { label: '', divider: true },
        { label: 'Codifica: UTF-8', checked: encoding === 'UTF-8', onClick: () => actions.onChangeEncoding('UTF-8') },
        { label: 'Codifica: UTF-8 con BOM', checked: encoding === 'UTF-8-BOM', onClick: () => actions.onChangeEncoding('UTF-8-BOM') },
        { label: 'Codifica: ANSI (Windows-1252)', checked: encoding === 'ANSI', onClick: () => actions.onChangeEncoding('ANSI') },
        { label: '', divider: true },
        { label: 'Fine riga: Windows (CRLF)', checked: lineEnding === 'CRLF', onClick: () => actions.onChangeLineEnding('CRLF') },
        { label: 'Fine riga: Unix / macOS / Linux (LF)', checked: lineEnding === 'LF', onClick: () => actions.onChangeLineEnding('LF') },
      ],
    },
    view: {
      label: 'Visualizza',
      items: [
        { label: 'Solo Sorgente', shortcut: 'F6', checked: viewMode === 'source', onClick: () => actions.onChangeViewMode('source') },
        { label: 'Vista Divisa (Scroll-Sync)', shortcut: 'Ctrl+E', checked: viewMode === 'split', onClick: () => actions.onChangeViewMode('split') },
        { label: 'Solo Lettura / Anteprima', checked: viewMode === 'preview', onClick: () => actions.onChangeViewMode('preview') },
        { label: '', divider: true },
        { label: 'Struttura Documento (Outline)', shortcut: 'Ctrl+Shift+O', checked: showOutline, onClick: actions.onToggleOutline },
        { label: 'Barra di Stato', checked: showStatusBar, onClick: actions.onToggleStatusBar },
        { label: '', divider: true },
        { label: 'Tema Chiaro', checked: theme === 'light', onClick: () => actions.onChangeTheme('light') },
        { label: 'Tema Scuro', checked: theme === 'dark', onClick: () => actions.onChangeTheme('dark') },
        { label: 'Tema Contrasto Elevato (Win)', checked: theme === 'high-contrast', onClick: () => actions.onChangeTheme('high-contrast') },
      ],
    },
    tools: {
      label: 'Strumenti',
      items: [
        { label: 'Post-it Cartelle (MarkItDown)…', onClick: actions.onOpenFolderPostIt },
        { label: 'Convertitore MarkItDown (File, URL, MCP)…', onClick: actions.onOpenMarkItDown },
        { label: 'Kit Windows 7–11 & Multipiattaforma…', onClick: actions.onOpenCrossPlatform },
        { label: '', divider: true },
        { label: 'Ripristino automatico sessione', checked: sessionRestore, onClick: actions.onToggleSessionRestore },
        { label: 'Assistente AI opzionale (Ctrl+Q/D/M)', checked: aiEnabled, onClick: actions.onToggleAiEnabled },
      ],
    },
    help: {
      label: 'Aiuto',
      items: [
        { label: 'Scorciatoie, Kit Win7–11 & Guida', onClick: actions.onOpenCrossPlatform },
      ],
    },
  };

  return (
    <header
      ref={barRef}
      className="no-print flex items-center justify-between gap-4 border-b px-2 py-1 select-none"
      style={{
        backgroundColor: 'var(--md-surface)',
        borderColor: 'var(--md-border)',
      }}
    >
      {/* Classic Windows menu bar */}
      <nav aria-label="Menu principale" className="flex items-center gap-0.5 overflow-x-auto">
        {(Object.keys(menus) as MenuKey[]).map((key) => {
          const menu = menus[key];
          const isOpen = openMenu === key;
          return (
            <div key={key} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={() => setOpenMenu(isOpen ? null : key)}
                onMouseEnter={() => {
                  if (openMenu !== null) setOpenMenu(key);
                }}
                className="rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{
                  backgroundColor: isOpen ? 'var(--md-accent-soft)' : undefined,
                  color: 'var(--md-text)',
                }}
              >
                {menu.label}
              </button>

              {isOpen && (
                <div
                  role="menu"
                  className="fixed z-50 mt-1 min-w-[260px] rounded-md border py-1 shadow-lg"
                  style={{
                    backgroundColor: 'var(--md-surface)',
                    borderColor: 'var(--md-border)',
                    color: 'var(--md-text)',
                  }}
                >
                  {menu.items.map((item, idx) =>
                    item.divider ? (
                      <div
                        key={`div-${idx}`}
                        className="my-1 border-t"
                        style={{ borderColor: 'var(--md-border)' }}
                      />
                    ) : (
                      <button
                        key={item.label}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpenMenu(null);
                          item.onClick?.();
                        }}
                        className="flex w-full items-center justify-between gap-6 px-3 py-1.5 text-left text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <span className="inline-block w-3 text-center font-mono">
                            {item.checked ? '✓' : ''}
                          </span>
                          <span>{item.label}</span>
                        </span>
                        {item.shortcut && (
                          <span
                            className="font-mono text-[11px] whitespace-nowrap"
                            style={{ color: 'var(--md-text-muted)' }}
                          >
                            {item.shortcut}
                          </span>
                        )}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Right actions: view switcher + primary Folder Post-it CTA */}
      <div className="flex shrink-0 items-center gap-2">
        <div
          role="group"
          aria-label="Modalità di visualizzazione"
          className="hidden items-center rounded-md border p-0.5 sm:flex"
          style={{
            backgroundColor: 'var(--md-chrome)',
            borderColor: 'var(--md-border)',
          }}
        >
          {(
            [
              { id: 'source', label: 'Sorgente' },
              { id: 'split', label: 'Divisa' },
              { id: 'preview', label: 'Anteprima' },
            ] as const
          ).map((mode) => {
            const active = viewMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                aria-pressed={active}
                onClick={() => actions.onChangeViewMode(mode.id)}
                className="rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors"
                style={{
                  backgroundColor: active ? 'var(--md-surface)' : 'transparent',
                  color: active ? 'var(--md-text)' : 'var(--md-text-muted)',
                }}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={actions.onOpenFolderPostIt}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
          style={{
            backgroundColor: 'var(--md-accent)',
            color: 'var(--md-accent-fg)',
          }}
        >
          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
          <span>Post-it Cartelle</span>
        </button>
      </div>
    </header>
  );
};
