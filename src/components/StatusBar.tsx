import React from 'react';
import { useI18n } from '../lib/i18n/I18nContext';
import type { DocumentStats } from '../lib/editor/markdownOps';
import type { FileEncoding, LineEnding } from '../lib/markitdown/types';

interface StatusBarProps {
  stats: DocumentStats;
  selectedChars: number;
  matchedBracketPair: { chars: string; partnerOffset: number } | null;
  encoding: FileEncoding;
  lineEnding: LineEnding;
  zoom: number;
  readOnly?: boolean;
  lastAutoSavedAt: string | null;
  onJumpToOffset: (offset: number) => void;
  onChangeEncoding: (enc: FileEncoding) => void;
  onChangeLineEnding: (le: LineEnding) => void;
  onChangeZoom: (nextZoom: number) => void;
}

const ENCODING_OPTIONS: Array<{ value: FileEncoding; label: string }> = [
  { value: 'UTF-8', label: 'UTF-8' },
  { value: 'UTF-8-BOM', label: 'UTF-8 with BOM' },
  { value: 'UTF-16 LE', label: 'UTF-16 LE' },
  { value: 'UTF-16 BE', label: 'UTF-16 BE' },
  { value: 'ANSI', label: 'ANSI' },
];

const NEXT_LINE_ENDING: Record<LineEnding, LineEnding> = {
  CRLF: 'LF',
  LF: 'CR',
  CR: 'CRLF',
};

const LINE_ENDING_LABEL: Record<LineEnding, string> = {
  CRLF: 'Windows (CRLF)',
  LF: 'Unix (LF)',
  CR: 'Macintosh (CR)',
};

export const StatusBar: React.FC<StatusBarProps> = ({
  stats,
  selectedChars,
  matchedBracketPair,
  encoding,
  lineEnding,
  zoom,
  readOnly,
  lastAutoSavedAt,
  onJumpToOffset,
  onChangeEncoding,
  onChangeLineEnding,
  onChangeZoom,
}) => {
  const { t, locale } = useI18n();
  const readingLabel = stats.words === 0 ? '0 min' : `~${stats.readingMinutes} min`;
  const isIt = locale === 'it';

  const charCountLabel =
    selectedChars > 0
      ? isIt
        ? `${selectedChars} di ${stats.chars} car.`
        : `${selectedChars} of ${stats.chars} chars`
      : isIt
        ? `${stats.chars} car.`
        : `${stats.chars} chars`;

  const formattedAutoSave = lastAutoSavedAt
    ? new Date(lastAutoSavedAt).toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <footer
      aria-label={t.statusBarAria}
      className="no-print flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t px-3 py-1 text-xs select-none"
      style={{
        backgroundColor: 'var(--md-chrome)',
        borderColor: 'var(--md-border)',
        color: 'var(--md-text-muted)',
      }}
    >
      <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
        <span>
          Ln {stats.line}, Col {stats.col}
        </span>
        <span aria-hidden="true">·</span>
        <span>{charCountLabel}</span>
        <span aria-hidden="true" className="hidden md:inline">
          ·
        </span>
        <span className="hidden md:inline">
          {stats.words} {t.wordsLabel} · {readingLabel}
        </span>
        {matchedBracketPair && (
          <>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onJumpToOffset(matchedBracketPair.partnerOffset)}
              title={isIt ? 'Vai alla parentesi corrispondente' : 'Jump to matching bracket'}
              className="rounded border px-1.5 py-0 text-[11px] font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              style={{
                borderColor: 'var(--md-accent)',
                color: 'var(--md-accent)',
              }}
            >
              {matchedBracketPair.chars} ↔
            </button>
          </>
        )}
        <span aria-hidden="true" className="hidden lg:inline">
          ·
        </span>
        <span className="hidden lg:inline" title={t.prefsAutoSaveDesc}>
          {formattedAutoSave ? `${t.autoSaveLabel} ${formattedAutoSave}` : t.autoSaveReady}
        </span>
        {readOnly && (
          <>
            <span aria-hidden="true">·</span>
            <span className="font-sans font-medium" style={{ color: 'var(--md-text)' }}>
              {t.readOnlyLabel}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 font-mono tabular-nums">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChangeZoom(Math.max(70, zoom - 10))}
            aria-label={t.zoomOutAria}
            className="rounded px-1.5 py-0.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => onChangeZoom(100)}
            title={t.zoomResetTitle}
            aria-label={`${zoom}%`}
            className="min-w-[3.2rem] rounded px-1 py-0.5 text-center transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            {zoom}%
          </button>
          <button
            type="button"
            onClick={() => onChangeZoom(Math.min(200, zoom + 10))}
            aria-label={t.zoomInAria}
            className="rounded px-1.5 py-0.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            +
          </button>
        </div>

        <span aria-hidden="true">·</span>

        <button
          type="button"
          onClick={() => onChangeLineEnding(NEXT_LINE_ENDING[lineEnding])}
          title={t.eolToggleTitle}
          aria-label={`EOL ${lineEnding}`}
          className="rounded px-1.5 py-0.5 whitespace-nowrap transition-colors hover:bg-black/5 dark:hover:bg-white/10"
        >
          {LINE_ENDING_LABEL[lineEnding]}
        </button>

        <span aria-hidden="true">·</span>

        <label className="sr-only" htmlFor="status-encoding-select">
          {t.encodingAria}
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
