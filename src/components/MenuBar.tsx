import React, { useEffect, useRef, useState } from 'react';
import { FolderOpen, Moon, Sun } from 'lucide-react';
import { useI18n } from '../lib/i18n/I18nContext';
import { SUPPORTED_LOCALES } from '../lib/i18n/translations';
import type {
  AppTheme,
  FileEncoding,
  LanguagePreference,
  LineEnding,
  ResolvedTheme,
  ViewMode,
} from '../lib/markitdown/types';

export interface MenuActions {
  onNewTab: () => void;
  onOpenLocalFile: () => void;
  onOpenMarkItDown: () => void;
  onSaveMd: () => void;
  onExportHtml: () => void;
  onOpenPrintPreview: () => void;
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
  onToggleNightMode: () => void;
  onChangeLanguage: (lang: LanguagePreference) => void;
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
  effectiveTheme: ResolvedTheme;
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
  effectiveTheme,
  encoding,
  lineEnding,
  aiEnabled,
  sessionRestore,
}) => {
  const { t, locale, languagePref } = useI18n();
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

  const isDarkActive = effectiveTheme === 'dark';

  const menus: Record<MenuKey, { label: string; items: MenuItem[] }> = {
    file: {
      label: t.menuFile,
      items: [
        { label: t.fileNewTab, shortcut: 'Ctrl+N', onClick: actions.onNewTab },
        { label: t.fileOpenLocal, shortcut: 'Ctrl+O', onClick: actions.onOpenLocalFile },
        { label: t.fileImportMarkItDown, onClick: actions.onOpenMarkItDown },
        { label: '', divider: true },
        { label: t.fileSaveMd, shortcut: 'Ctrl+S', onClick: actions.onSaveMd },
        { label: t.fileExportHtml, onClick: actions.onExportHtml },
        { label: t.filePrintPreview, shortcut: 'Ctrl+Shift+P', onClick: actions.onOpenPrintPreview },
        { label: t.filePrintPdf, shortcut: 'Ctrl+P', onClick: actions.onPrintPdf },
        { label: '', divider: true },
        { label: t.fileCloseTab, onClick: actions.onCloseActiveTab },
      ],
    },
    edit: {
      label: t.menuEdit,
      items: [
        { label: t.editFind, shortcut: 'Ctrl+F', onClick: () => actions.onOpenFind(false) },
        { label: t.editReplace, shortcut: 'Ctrl+H', onClick: () => actions.onOpenFind(true) },
        { label: '', divider: true },
        { label: t.editInsertTable, shortcut: 'Ctrl+T', onClick: actions.onOpenTableDialog },
        { label: t.editClearFormatting, shortcut: 'Ctrl+Space', onClick: actions.onClearFormatting },
        { label: t.editInsertDateTime, shortcut: 'F5', onClick: actions.onInsertDateTime },
      ],
    },
    format: {
      label: t.menuFormat,
      items: [
        { label: t.formatWordWrap, checked: wordWrap, onClick: actions.onToggleWordWrap },
        { label: '', divider: true },
        { label: t.formatEncodingUtf8, checked: encoding === 'UTF-8', onClick: () => actions.onChangeEncoding('UTF-8') },
        { label: t.formatEncodingUtf8Bom, checked: encoding === 'UTF-8-BOM', onClick: () => actions.onChangeEncoding('UTF-8-BOM') },
        { label: t.formatEncodingAnsi, checked: encoding === 'ANSI', onClick: () => actions.onChangeEncoding('ANSI') },
        { label: '', divider: true },
        { label: t.formatEolCrlf, checked: lineEnding === 'CRLF', onClick: () => actions.onChangeLineEnding('CRLF') },
        { label: t.formatEolLf, checked: lineEnding === 'LF', onClick: () => actions.onChangeLineEnding('LF') },
      ],
    },
    view: {
      label: t.menuView,
      items: [
        { label: t.viewSourceOnly, shortcut: 'F6', checked: viewMode === 'source', onClick: () => actions.onChangeViewMode('source') },
        { label: t.viewSplit, shortcut: 'Ctrl+E', checked: viewMode === 'split', onClick: () => actions.onChangeViewMode('split') },
        { label: t.viewPreviewOnly, checked: viewMode === 'preview', onClick: () => actions.onChangeViewMode('preview') },
        { label: '', divider: true },
        { label: t.viewOutline, shortcut: 'Ctrl+Shift+O', checked: showOutline, onClick: actions.onToggleOutline },
        { label: t.viewStatusBar, checked: showStatusBar, onClick: actions.onToggleStatusBar },
        { label: '', divider: true },
        { label: t.viewThemeSystem, checked: theme === 'system', onClick: () => actions.onChangeTheme('system') },
        { label: t.viewThemeLight, checked: theme === 'light', onClick: () => actions.onChangeTheme('light') },
        { label: t.viewThemeDark, checked: theme === 'dark', onClick: () => actions.onChangeTheme('dark') },
        { label: t.viewThemeHighContrast, checked: theme === 'high-contrast', onClick: () => actions.onChangeTheme('high-contrast') },
        { label: '', divider: true },
        {
          label: `${t.viewLanguageSystem} (${locale.toUpperCase()})`,
          checked: languagePref === 'system',
          onClick: () => actions.onChangeLanguage('system'),
        },
        ...SUPPORTED_LOCALES.map((lang) => ({
          label: lang.nativeName,
          checked: languagePref === lang.code,
          onClick: () => actions.onChangeLanguage(lang.code),
        })),
      ],
    },
    tools: {
      label: t.menuTools,
      items: [
        { label: t.toolsFolderPostIt, onClick: actions.onOpenFolderPostIt },
        { label: t.toolsMarkItDown, onClick: actions.onOpenMarkItDown },
        { label: t.toolsCrossPlatform, onClick: actions.onOpenCrossPlatform },
        { label: '', divider: true },
        { label: t.toolsSessionRestore, checked: sessionRestore, onClick: actions.onToggleSessionRestore },
        { label: t.toolsAiAssistant, checked: aiEnabled, onClick: actions.onToggleAiEnabled },
      ],
    },
    help: {
      label: t.menuHelp,
      items: [
        { label: t.helpShortcutsGuide, onClick: actions.onOpenCrossPlatform },
      ],
    },
  };

  return (
    <header
      ref={barRef}
      className="no-print flex items-center justify-between gap-3 border-b px-2 py-1 select-none"
      style={{
        backgroundColor: 'var(--md-surface)',
        borderColor: 'var(--md-border)',
      }}
    >
      {/* Classic Windows menu bar */}
      <nav aria-label={t.mainMenuAria} className="flex items-center gap-0.5 overflow-x-auto">
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
                  className="fixed z-50 mt-1 max-h-[80vh] min-w-[265px] overflow-y-auto rounded-md border py-1 shadow-lg"
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

      {/* Right actions: view switcher + Night Mode toggle + primary Folder Post-it CTA */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <div
          role="group"
          aria-label={t.viewModeGroupAria}
          className="hidden items-center rounded-md border p-0.5 sm:flex"
          style={{
            backgroundColor: 'var(--md-chrome)',
            borderColor: 'var(--md-border)',
          }}
        >
          {(
            [
              { id: 'source', label: t.modeSourceShort },
              { id: 'split', label: t.modeSplitShort },
              { id: 'preview', label: t.modePreviewShort },
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
          onClick={actions.onToggleNightMode}
          aria-pressed={isDarkActive}
          aria-label={t.toggleNightModeAria}
          title={isDarkActive ? t.nightModeTooltipOn : t.nightModeTooltipOff}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          style={{
            backgroundColor: isDarkActive ? 'var(--md-accent-soft)' : 'var(--md-chrome)',
            borderColor: isDarkActive ? 'var(--md-accent)' : 'var(--md-border)',
            color: isDarkActive ? 'var(--md-accent)' : 'var(--md-text)',
          }}
        >
          {isDarkActive ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>

        <button
          type="button"
          onClick={actions.onOpenFolderPostIt}
          className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors"
          style={{
            backgroundColor: 'var(--md-accent)',
            color: 'var(--md-accent-fg)',
          }}
        >
          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
          <span>{t.folderPostItBtn}</span>
        </button>
      </div>
    </header>
  );
};
