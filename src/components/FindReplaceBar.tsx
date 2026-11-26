import React from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import type { WildcardMatch } from '../lib/editor/markdownOps';

interface FindReplaceBarProps {
  open: boolean;
  showReplace: boolean;
  query: string;
  replaceText: string;
  caseSensitive: boolean;
  matches: WildcardMatch[];
  activeMatchIndex: number;
  onChangeQuery: (q: string) => void;
  onChangeReplace: (r: string) => void;
  onToggleCaseSensitive: () => void;
  onToggleShowReplace: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReplaceOne: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

export const FindReplaceBar: React.FC<FindReplaceBarProps> = ({
  open,
  showReplace,
  query,
  replaceText,
  caseSensitive,
  matches,
  activeMatchIndex,
  onChangeQuery,
  onChangeReplace,
  onToggleCaseSensitive,
  onToggleShowReplace,
  onPrev,
  onNext,
  onReplaceOne,
  onReplaceAll,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      role="region"
      aria-label="Trova e sostituisci"
      className="no-print absolute top-2 right-3 z-30 w-[340px] max-w-[calc(100%-1.5rem)] rounded-lg border p-2.5 shadow-lg"
      style={{
        backgroundColor: 'var(--md-surface)',
        borderColor: 'var(--md-border-strong)',
        color: 'var(--md-text)',
      }}
    >
      <div className="flex items-center gap-1.5">
        <label htmlFor="find-query-input" className="sr-only">
          Cerca nel documento (supporta caratteri jolly * e ?)
        </label>
        <input
          id="find-query-input"
          type="text"
          value={query}
          autoFocus
          onChange={(e) => onChangeQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (e.shiftKey) onPrev();
              else onNext();
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
          placeholder="Trova (* e ? supportati)…"
          className="min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs"
          style={{
            backgroundColor: 'var(--md-surface-alt)',
            borderColor: 'var(--md-border)',
            color: 'var(--md-text)',
          }}
        />

        <span
          className="min-w-[3.4rem] text-right font-mono text-[11px] tabular-nums"
          style={{ color: 'var(--md-text-muted)' }}
        >
          {matches.length === 0 ? '0/0' : `${activeMatchIndex + 1}/${matches.length}`}
        </span>

        <button
          type="button"
          onClick={onToggleCaseSensitive}
          aria-pressed={caseSensitive}
          aria-label="Maiuscole/minuscole"
          title="Distingui maiuscole e minuscole"
          className="rounded border px-1.5 py-1 font-mono text-[11px]"
          style={{
            borderColor: caseSensitive ? 'var(--md-accent)' : 'var(--md-border)',
            backgroundColor: caseSensitive ? 'var(--md-accent-soft)' : 'transparent',
            color: caseSensitive ? 'var(--md-accent)' : 'var(--md-text-muted)',
          }}
        >
          Aa
        </button>

        <button
          type="button"
          onClick={onPrev}
          disabled={matches.length === 0}
          aria-label="Risultato precedente"
          className="rounded p-1 transition-colors hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={matches.length === 0}
          aria-label="Risultato successivo"
          className="rounded p-1 transition-colors hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi barra ricerca"
          className="rounded p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <button
          type="button"
          onClick={onToggleShowReplace}
          className="text-[11px] underline underline-offset-2"
          style={{ color: 'var(--md-text-muted)' }}
        >
          {showReplace ? 'Nascondi sostituzione' : 'Mostra sostituisci'}
        </button>
        <span className="text-[11px]" style={{ color: 'var(--md-text-muted)' }}>
          Wildcard: * (qualsiasi) · ? (1 carattere)
        </span>
      </div>

      {showReplace && (
        <div className="mt-2 flex items-center gap-1.5">
          <label htmlFor="replace-text-input" className="sr-only">
            Sostituisci con
          </label>
          <input
            id="replace-text-input"
            type="text"
            value={replaceText}
            onChange={(e) => onChangeReplace(e.target.value)}
            placeholder="Sostituisci con…"
            className="min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs"
            style={{
              backgroundColor: 'var(--md-surface-alt)',
              borderColor: 'var(--md-border)',
              color: 'var(--md-text)',
            }}
          />
          <button
            type="button"
            onClick={onReplaceOne}
            disabled={matches.length === 0}
            className="rounded border px-2 py-1 text-xs font-medium whitespace-nowrap disabled:opacity-40"
            style={{ borderColor: 'var(--md-border)', color: 'var(--md-text)' }}
          >
            Sostituisci
          </button>
          <button
            type="button"
            onClick={onReplaceAll}
            disabled={matches.length === 0}
            className="rounded px-2 py-1 text-xs font-medium whitespace-nowrap disabled:opacity-40"
            style={{ backgroundColor: 'var(--md-accent)', color: 'var(--md-accent-fg)' }}
          >
            Tutti
          </button>
        </div>
      )}
    </div>
  );
};
