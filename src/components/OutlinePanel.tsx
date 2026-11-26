import React from 'react';
import { X } from 'lucide-react';
import type { OutlineHeading } from '../lib/editor/markdownOps';

interface OutlinePanelProps {
  headings: OutlineHeading[];
  onJump: (heading: OutlineHeading) => void;
  onClose: () => void;
}

export const OutlinePanel: React.FC<OutlinePanelProps> = ({ headings, onJump, onClose }) => {
  return (
    <aside
      aria-label="Struttura documento"
      className="no-print flex h-full w-60 shrink-0 flex-col border-r"
      style={{
        backgroundColor: 'var(--md-surface-alt)',
        borderColor: 'var(--md-border)',
      }}
    >
      <div
        className="flex items-center justify-between border-b px-3 py-2"
        style={{ borderColor: 'var(--md-border)' }}
      >
        <span className="text-xs font-semibold tracking-tight" style={{ color: 'var(--md-text)' }}>
          Struttura documento
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi pannello struttura"
          className="rounded p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          style={{ color: 'var(--md-text-muted)' }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {headings.length === 0 ? (
          <p className="px-2 py-4 text-xs" style={{ color: 'var(--md-text-muted)' }}>
            Nessun titolo trovato. Usa <code className="font-mono">#</code>,{' '}
            <code className="font-mono">##</code> o <code className="font-mono">###</code> per
            creare una struttura navigabile.
          </p>
        ) : (
          <nav aria-label="Indice dei titoli" className="space-y-0.5">
            {headings.map((h) => (
              <button
                key={`${h.line}-${h.offset}`}
                type="button"
                onClick={() => onJump(h)}
                className="flex w-full items-baseline justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{
                  paddingLeft: `${(h.level - 1) * 12 + 8}px`,
                  color: h.level === 1 ? 'var(--md-text)' : 'var(--md-text-muted)',
                  fontWeight: h.level === 1 ? 600 : 400,
                }}
              >
                <span className="truncate">{h.text}</span>
                <span className="shrink-0 font-mono text-[11px] opacity-70 tabular-nums">
                  L{h.line}
                </span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </aside>
  );
};
