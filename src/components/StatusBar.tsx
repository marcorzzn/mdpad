import React from 'react';
import type { DocumentStats } from '../lib/editor/markdownOps';
import type { FileEncoding, LineEnding } from '../lib/markitdown/types';

interface StatusBarProps {
  stats: DocumentStats;
  encoding: FileEncoding;
  lineEnding: LineEnding;
  zoom: number;
  readOnly?: boolean;
  onChangeEncoding: (enc: FileEncoding) => void;
  onChangeLineEnding: (le: LineEnding) => void;
  onChangeZoom: (nextZoom: number) => void;
}

const ENCODING_OPTIONS: Array<{ value: FileEncoding; label: string }> = [
  { value: 'UTF-8', label: 'UTF-8' },
  { value: 'UTF-8-BOM', label: 'UTF-8 con BOM' },
  { value: 'ANSI', label: 'ANSI (Win-1252)' },
];

export const StatusBar: React.FC<StatusBarProps> = ({
  stats,
  encoding,
  lineEnding,
  zoom,
  readOnly,
  onChangeEncoding,
  onChangeLineEnding,
  onChangeZoom,
}) => {
  const readingLabel = stats.words === 0 ? '0 min' : `~${stats.readingMinutes} min`;

  return (
    <footer
      aria-label="Barra di stato"
      className="no-print flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t px-3 py-1 text-xs select-none"
      style={{
        backgroundColor: 'var(--md-chrome)',
        borderColor: 'var(--md-border)',
        color: 'var(--md-text-muted)',
      }}
    >
      <div className="flex items-center gap-3 font-mono tabular-nums">
        <span>
          Ln {stats.line}, Col {stats.col}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {stats.words} parole · {readingLabel}
        </span>
        {readOnly && (
          <>
            <span aria-hidden="true">·</span>
            <span className="font-sans font-medium" style={{ color: 'var(--md-text)' }}>
              Sola lettura
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 font-mono tabular-nums">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChangeZoom(Math.max(70, zoom - 10))}
            aria-label="Riduci zoom"
            className="rounded px-1.5 py-0.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => onChangeZoom(100)}
            title="Ripristina zoom al 100%"
            aria-label={`Livello di zoom ${zoom}%`}
            className="min-w-[3.2rem] rounded px-1 py-0.5 text-center transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            {zoom}%
          </button>
          <button
            type="button"
            onClick={() => onChangeZoom(Math.min(200, zoom + 10))}
            aria-label="Aumenta zoom"
            className="rounded px-1.5 py-0.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            +
          </button>
        </div>

        <span aria-hidden="true">·</span>

        <button
          type="button"
          onClick={() => onChangeLineEnding(lineEnding === 'CRLF' ? 'LF' : 'CRLF')}
          title="Cambia terminatore di riga (Windows CRLF / Unix LF)"
          aria-label={`Terminatore di riga ${lineEnding}`}
          className="rounded px-1.5 py-0.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap"
        >
          {lineEnding === 'CRLF' ? 'Windows (CRLF)' : 'Unix/macOS (LF)'}
        </button>

        <span aria-hidden="true">·</span>

        <label className="sr-only" htmlFor="status-encoding-select">
          Codifica caratteri
        </label>
        <select
          id="status-encoding-select"
          value={encoding}
          onChange={(e) => onChangeEncoding(e.target.value as FileEncoding)}
          className="cursor-pointer rounded bg-transparent py-0.5 pr-2 pl-1 text-xs outline-none hover:bg-black/5 dark:hover:bg-white/10"
          style={{ color: 'var(--md-text-muted)' }}
        >
          {ENCODING_OPTIONS.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              style={{ backgroundColor: 'var(--md-surface)', color: 'var(--md-text)' }}
            >
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </footer>
  );
};
