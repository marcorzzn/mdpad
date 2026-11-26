import React, { useState } from 'react';
import { X } from 'lucide-react';
import { generateMarkdownTable } from '../lib/editor/markdownOps';

interface TableDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (tableMarkdown: string) => void;
}

export const TableDialog: React.FC<TableDialogProps> = ({ open, onClose, onInsert }) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  if (!open) return null;

  const preview = generateMarkdownTable(rows, cols);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInsert(preview);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="table-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border shadow-xl"
        style={{
          backgroundColor: 'var(--md-surface)',
          borderColor: 'var(--md-border)',
          color: 'var(--md-text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: 'var(--md-border)' }}
        >
          <h2 id="table-dialog-title" className="text-sm font-semibold">
            Inserisci Tabella Markdown
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi finestra tabella"
            className="rounded p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="table-rows-input"
                className="mb-1 block text-xs font-medium"
                style={{ color: 'var(--md-text-muted)' }}
              >
                Righe di dati (1–20)
              </label>
              <input
                id="table-rows-input"
                type="number"
                min={1}
                max={20}
                value={rows}
                onChange={(e) => setRows(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                className="w-full rounded border px-2.5 py-1.5 font-mono text-sm tabular-nums"
                style={{
                  backgroundColor: 'var(--md-surface-alt)',
                  borderColor: 'var(--md-border)',
                  color: 'var(--md-text)',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="table-cols-input"
                className="mb-1 block text-xs font-medium"
                style={{ color: 'var(--md-text-muted)' }}
              >
                Colonne (1–12)
              </label>
              <input
                id="table-cols-input"
                type="number"
                min={1}
                max={12}
                value={cols}
                onChange={(e) => setCols(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                className="w-full rounded border px-2.5 py-1.5 font-mono text-sm tabular-nums"
                style={{
                  backgroundColor: 'var(--md-surface-alt)',
                  borderColor: 'var(--md-border)',
                  color: 'var(--md-text)',
                }}
              />
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs" style={{ color: 'var(--md-text-muted)' }}>
              Anteprima sintassi (usa il tasto Tab tra le celle per formattare automaticamente):
            </p>
            <pre
              className="max-h-36 overflow-auto rounded border p-2.5 font-mono text-xs leading-relaxed"
              style={{
                backgroundColor: 'var(--md-surface-alt)',
                borderColor: 'var(--md-border)',
                color: 'var(--md-text)',
              }}
            >
              {preview}
            </pre>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded border px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              style={{ borderColor: 'var(--md-border)', color: 'var(--md-text)' }}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="rounded px-4 py-1.5 text-xs font-medium transition-colors"
              style={{ backgroundColor: 'var(--md-accent)', color: 'var(--md-accent-fg)' }}
            >
              Inserisci Tabella
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
