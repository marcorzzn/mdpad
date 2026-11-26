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
  Printer,
  Search,
  Strikethrough,
  Table,
} from 'lucide-react';
import { useI18n } from '../lib/i18n/I18nContext';
import type { ViewMode } from '../lib/markitdown/types';

interface FormattingBarProps {
  onWrap: (before: string, after?: string, placeholder?: string) => void;
  onPrefixLine: (prefix: string) => void;
  onOpenTable: () => void;
  onClearFormatting: () => void;
  onToggleOutline: () => void;
  showOutline: boolean;
  onOpenFind: () => void;
  onOpenPrintPreview: () => void;
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
  onOpenPrintPreview,
  onOpenMarkItDown,
  viewMode,
  onCycleViewMode,
  aiEnabled,
  aiBusy,
  onRunAiAssist,
}) => {
  const { t } = useI18n();
  const btnClass =
    'flex h-7 items-center gap-1 rounded px-2 text-xs font-medium whitespace-nowrap transition-colors hover:bg-black/5 dark:hover:bg-white/10';

  return (
    <div
      aria-label={t.formattingBarAria}
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
        aria-label={t.outlineAria}
        title={t.outlineTooltip}
        className={btnClass}
        style={{
          backgroundColor: showOutline ? 'var(--md-accent-soft)' : undefined,
          color: showOutline ? 'var(--md-accent)' : 'var(--md-text)',
        }}
      >
        <ListTree className="h-3.5 w-3.5" />
        <span className="hidden md:inline">{t.outlineBtn}</span>
      </button>

      <span className="mx-1 h-4 w-px shrink-0" style={{ backgroundColor: 'var(--md-border)' }} />

      <button
        type="button"
        onClick={() => onPrefixLine('# ')}
        aria-label={t.h1Label}
        title={`${t.h1Label} (#)`}
        className={btnClass}
      >
        <Heading1 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onPrefixLine('## ')}
        aria-label={t.h2Label}
        title={`${t.h2Label} (##)`}
        className={btnClass}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onWrap('**', '**', 'text')}
        aria-label={t.boldLabel}
        title={`${t.boldLabel} (**...**)`}
        className={btnClass}
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onWrap('*', '*', 'text')}
        aria-label={t.italicLabel}
        title={`${t.italicLabel} (*...*)`}
        className={btnClass}
      >
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onWrap('~~', '~~', 'text')}
        aria-label={t.strikeLabel}
        title={`${t.strikeLabel} (~~...~~)`}
        className={btnClass}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </button>

      <span className="mx-1 h-4 w-px shrink-0" style={{ backgroundColor: 'var(--md-border)' }} />

      <button
        type="button"
        onClick={() => onPrefixLine('- ')}
        aria-label={t.bulletListLabel}
        title={`${t.bulletListLabel} (- )`}
        className={btnClass}
      >
        <List className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onPrefixLine('- [ ] ')}
        aria-label={t.checklistLabel}
        title={`${t.checklistLabel} (- [ ])`}
        className={btnClass}
      >
        <CheckSquare className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onWrap('```\n', '\n```', 'code')}
        aria-label={t.codeBlockLabel}
        title={t.codeBlockLabel}
        className={btnClass}
      >
        <Code className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onOpenTable}
        aria-label={t.tableAria}
        title={`${t.tableAria} (Ctrl+T)`}
        className={btnClass}
      >
        <Table className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">{t.tableBtn}</span>
      </button>
      <button
        type="button"
        onClick={onClearFormatting}
        aria-label={t.clearFmtLabel}
        title={`${t.clearFmtLabel} (Ctrl+Space)`}
        className={btnClass}
      >
        <Eraser className="h-3.5 w-3.5" />
      </button>

      <span className="mx-1 h-4 w-px shrink-0" style={{ backgroundColor: 'var(--md-border)' }} />

      <button
        type="button"
        onClick={onOpenFind}
        aria-label={t.findAria}
        title={`${t.findAria} (Ctrl+F)`}
        className={btnClass}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">{t.findBtn}</span>
      </button>

      <button
        type="button"
        onClick={onOpenPrintPreview}
        aria-label={t.printPreviewTitle}
        title={t.printPreviewTooltip}
        className={btnClass}
      >
        <Printer className="h-3.5 w-3.5" />
        <span className="hidden xl:inline">{t.printPreviewBtn}</span>
      </button>

      <button
        type="button"
        onClick={onOpenMarkItDown}
        aria-label={t.importMarkItDownAria}
        title={t.importMarkItDownAria}
        className={btnClass}
      >
        <FileInput className="h-3.5 w-3.5" />
        <span>{t.importMarkItDownBtn}</span>
      </button>

      {/* Mobile view cycle button */}
      <button
        type="button"
        onClick={onCycleViewMode}
        className={`${btnClass} sm:hidden`}
        aria-label={t.viewModeGroupAria}
      >
        <span>
          {t.mobileViewPrefix}:{' '}
          {viewMode === 'source'
            ? t.modeSourceShort
            : viewMode === 'split'
              ? t.modeSplitShort
              : t.modePreviewShort}
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
              title={`${t.aiWrite} (Ctrl+Q)`}
              className={btnClass}
              style={{ color: 'var(--md-accent)' }}
            >
              {t.aiWrite}
            </button>
            <button
              type="button"
              disabled={aiBusy}
              onClick={() => onRunAiAssist('rewrite')}
              title={`${t.aiRewrite} (Ctrl+D)`}
              className={btnClass}
              style={{ color: 'var(--md-accent)' }}
            >
              {t.aiRewrite}
            </button>
            <button
              type="button"
              disabled={aiBusy}
              onClick={() => onRunAiAssist('summarize')}
              title={`${t.aiSummarize} (Ctrl+M)`}
              className={btnClass}
              style={{ color: 'var(--md-accent)' }}
            >
              {aiBusy ? t.aiWorking : t.aiSummarize}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
