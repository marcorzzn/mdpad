import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../lib/i18n/I18nContext';

interface GoToLineModalProps {
  open: boolean;
  currentLine: number;
  maxLine: number;
  onJump: (lineNumber: number) => void;
  onClose: () => void;
}

export const GoToLineModal: React.FC<GoToLineModalProps> = ({
  open,
  currentLine,
  maxLine,
  onJump,
  onClose,
}) => {
  const { locale } = useI18n();
  const isIt = locale === 'it';
  const [value, setValue] = useState(String(currentLine));
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setValue(String(currentLine));
      setError(null);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [open, currentLine]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number.parseInt(value.trim(), 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > maxLine) {
      setError(
        isIt
          ? `Il numero di riga deve essere compreso tra 1 e ${maxLine}.`
          : `The line number must be between 1 and ${maxLine}.`
      );
      return;
    }
    onJump(parsed);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="goto-line-title"
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs overflow-hidden rounded-lg border shadow-2xl"
        style={{
          backgroundColor: 'var(--md-surface)',
          borderColor: 'var(--md-border)',
          color: 'var(--md-text)',
        }}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: 'var(--md-border)' }}
        >
          <h2 id="goto-line-title" className="text-sm font-semibold">
            {isIt ? 'Vai alla riga' : 'Go to line'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={isIt ? 'Chiudi' : 'Close'}
            className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="space-y-1.5">
            <label htmlFor="goto-line-input" className="block text-xs font-medium">
              {isIt ? `Numero riga (1–${maxLine})` : `Line number (1–${maxLine})`}
            </label>
            <input
              id="goto-line-input"
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              className="w-full rounded border px-2.5 py-1.5 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
              style={{
                backgroundColor: 'var(--md-surface-alt)',
                borderColor: error ? '#ef4444' : 'var(--md-border)',
                color: 'var(--md-text)',
              }}
            />
            {error && (
              <p role="alert" className="text-xs text-red-500">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded border px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10"
              style={{ borderColor: 'var(--md-border)' }}
            >
              {isIt ? 'Annulla' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="rounded px-3.5 py-1.5 text-xs font-medium"
              style={{
                backgroundColor: 'var(--md-accent)',
                color: 'var(--md-accent-fg)',
              }}
            >
              {isIt ? 'Vai' : 'Go to'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
