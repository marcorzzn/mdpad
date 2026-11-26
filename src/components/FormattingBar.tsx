import React from 'react';
import {
  Bold,
  CheckSquare,
  Code,
  Eraser,
  FileInput,
  Heading1,
  Heading2,
  Italic,
  List,
  ListTree,
  Search,
  Strikethrough,
  Table,
} from 'lucide-react';
import type { ViewMode } from '../lib/markitdown/types';

interface FormattingBarProps {
  onWrap: (before: string, after?: string, placeholder?: string) => void;
  onPrefixLine: (prefix: string) => void;
  onOpenTable: () => void;
  onClearFormatting: () => void;
  onToggleOutline: () => void;
  showOutline: boolean;
  onOpenFind: () => void;
  onOpenMarkItDown: () => void;
  viewMode: ViewMode;
  onCycleViewMode: () => void;
  aiEnabled: boolean;
  aiBusy: boolean;
  onRunAiAssist: (mode: 'write' | 'rewrite' | 'summarize') => void;
}

export const FormattingBar: React.FC<FormattingBarProps> = ({
  onWrap,
  onPrefixLine,
  onOpenTable,
  onClearFormatting,
  onToggleOutline,
  showOutline,
  onOpenFind,
  onOpenMarkItDown,
  viewMode,
  onCycleViewMode,
  aiEnabled,
  aiBusy,
  onRunAiAssist,
}) => {
  const btnClass =
    'flex h-7 items-center gap-1 rounded px-2 text-xs font-medium whitespace-nowrap transition-colors hover:bg-black/5 dark:hover:bg-white/10';

  return (
    <div
      aria-label="Barra di formattazione Markdown"
      className="no-print flex items-center gap-0.5 overflow-x-auto border-b px-2 py-1 select-none"
      style={{
        backgroundColor: 'var(--md-surface-alt)',
        borderColor: 'var(--md-border)',
        color: 'var(--md-text)',
      }}
    >
      <button
        type="button"
        onClick={onToggleOutline}
        aria-pressed={showOutline}
        aria-label="Mostra o nascondi struttura documento"
        title="Struttura documento (Ctrl+Shift+O)"
        className={btnClass}
        style={{
          backgroundColor: showOutline ? 'var(--md-accent-soft)' : undefined,
          color: showOutline ? 'var(--md-accent)' : 'var(--md-text)',
        }}
      >
        <ListTree className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Struttura</span>
      </button>

      <span className="mx-1 h-4 w-px shrink-0" style={{ backgroundColor: 'var(--md-border)' }} />

      <button
        type="button"
        onClick={() => onPrefixLine('# ')}
        aria-label="Titolo 1"
        title="Titolo 1 (#)"
        className={btnClass}
      >
        <Heading1 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onPrefixLine('## ')}
        aria-label="Titolo 2"
        title="Titolo 2 (##)"
        className={btnClass}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onWrap('**', '**', 'testo')}
        aria-label="Grassetto"
        title="Grassetto (**testo**)"
        className={btnClass}
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onWrap('*', '*', 'testo')}
        aria-label="Corsivo"
        title="Corsivo (*testo*)"
        className={btnClass}
      >
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onWrap('~~', '~~', 'testo')}
        aria-label="Barrato"
        title="Testo barrato (~~testo~~)"
        className={btnClass}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </button>

      <span className="mx-1 h-4 w-px shrink-0" style={{ backgroundColor: 'var(--md-border)' }} />

      <button
        type="button"
        onClick={() => onPrefixLine('- ')}
        aria-label="Elenco puntato"
        title="Elenco puntato (- )"
        className={btnClass}
      >
        <List className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onPrefixLine('- [ ] ')}
        aria-label="Inserisci checklist"
        title="Checklist interattiva (- [ ])"
        className={btnClass}
      >
        <CheckSquare className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onWrap('```\n', '\n```', 'codice')}
        aria-label="Blocco di codice"
        title="Blocco di codice"
        className={btnClass}
      >
        <Code className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onOpenTable}
        aria-label="Inserisci tabella"
        title="Inserisci tabella (Ctrl+T)"
        className={btnClass}
      >
        <Table className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Tabella</span>
      </button>
      <button
        type="button"
        onClick={onClearFormatting}
        aria-label="Cancella formattazione"
        title="Cancella formattazione Markdown (Ctrl+Spazio)"
        className={btnClass}
      >
        <Eraser className="h-3.5 w-3.5" />
      </button>

      <span className="mx-1 h-4 w-px shrink-0" style={{ backgroundColor: 'var(--md-border)' }} />

      <button
        type="button"
        onClick={onOpenFind}
        aria-label="Trova e sostituisci"
        title="Trova con caratteri jolly * e ? (Ctrl+F)"
        className={btnClass}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Trova</span>
      </button>

      <button
        type="button"
        onClick={onOpenMarkItDown}
        aria-label="Importa con MarkItDown"
        title="Converti PDF, DOCX, XLSX, PPTX, HTML, EPUB, ZIP o URL in Markdown"
        className={btnClass}
      >
        <FileInput className="h-3.5 w-3.5" />
        <span>Importa MarkItDown</span>
      </button>

      {/* Mobile view cycle button */}
      <button
        type="button"
        onClick={onCycleViewMode}
        className={`${btnClass} sm:hidden`}
        aria-label="Cambia modalità di vista"
      >
        <span>
          Vista: {viewMode === 'source' ? 'Sorgente' : viewMode === 'split' ? 'Divisa' : 'Anteprima'}
        </span>
      </button>

      {aiEnabled && (
        <>
          <span className="mx-1 h-4 w-px shrink-0" style={{ backgroundColor: 'var(--md-border)' }} />
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={aiBusy}
              onClick={() => onRunAiAssist('write')}
              title="Scrivi con AI (Ctrl+Q)"
              className={btnClass}
              style={{ color: 'var(--md-accent)' }}
            >
              Scrivi
            </button>
            <button
              type="button"
              disabled={aiBusy}
              onClick={() => onRunAiAssist('rewrite')}
              title="Riscrivi selezione con AI (Ctrl+D)"
              className={btnClass}
              style={{ color: 'var(--md-accent)' }}
            >
              Riscrivi
            </button>
            <button
              type="button"
              disabled={aiBusy}
              onClick={() => onRunAiAssist('summarize')}
              title="Riassumi documento con AI (Ctrl+M)"
              className={btnClass}
              style={{ color: 'var(--md-accent)' }}
            >
              {aiBusy ? 'Elaborazione…' : 'Riassumi'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
