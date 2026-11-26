import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CrossPlatformModal } from './components/CrossPlatformModal';
import { FindReplaceBar } from './components/FindReplaceBar';
import { FolderPostItModal } from './components/FolderPostItModal';
import { FormattingBar } from './components/FormattingBar';
import { MarkdownPreview } from './components/MarkdownPreview';
import { MarkItDownModal } from './components/MarkItDownModal';
import { MenuBar } from './components/MenuBar';
import { OutlinePanel } from './components/OutlinePanel';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { StatusBar } from './components/StatusBar';
import { TableDialog } from './components/TableDialog';
import { TabStrip } from './components/TabStrip';
import {
  INITIAL_TABS,
  PREFS_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  type EditorTab,
} from './data/seedTabs';
import {
  AUTOSAVE_INTERVAL_MS,
  mergeAutoSaveIntoTabs,
  readActiveTabAutoSave,
  resolveEffectiveTheme,
  writeActiveTabAutoSave,
} from './lib/editor/autosave';
import {
  clearMarkdownFormatting,
  computeDocumentStats,
  encodeTextForDownload,
  extractOutline,
  findWildcardMatches,
  handleSmartEnter,
  handleSmartPaste,
  handleTableTab,
  toggleCheckboxAtLine,
  type OutlineHeading,
} from './lib/editor/markdownOps';
import { I18nProvider } from './lib/i18n/I18nContext';
import { resolveLocale, TRANSLATIONS } from './lib/i18n/translations';
import type {
  AppTheme,
  ConversionResponse,
  FileEncoding,
  LanguagePreference,
  LineEnding,
  ViewMode,
} from './lib/markitdown/types';

interface SavedPrefs {
  theme: AppTheme;
  language: LanguagePreference;
  viewMode: ViewMode;
  wordWrap: boolean;
  showOutline: boolean;
  showStatusBar: boolean;
  zoom: number;
  sessionRestore: boolean;
  aiEnabled: boolean;
}

const DEFAULT_PREFS: SavedPrefs = {
  theme: 'system',
  language: 'system',
  viewMode: 'split',
  wordWrap: true,
  showOutline: false,
  showStatusBar: true,
  zoom: 100,
  sessionRestore: true,
  aiEnabled: false,
};

function loadPrefs(): SavedPrefs {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<SavedPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function loadInitialTabs(restore: boolean): {
  tabs: EditorTab[];
  activeId: string;
  recoveredAutoSave: boolean;
  lastAutoSavedAt: string | null;
} {
  let baseTabs: EditorTab[] = INITIAL_TABS;
  let baseActiveId: string = INITIAL_TABS[0].id;

  if (restore) {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { tabs?: EditorTab[]; activeId?: string };
        if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
          baseTabs = parsed.tabs;
          baseActiveId = parsed.tabs.some((t) => t.id === parsed.activeId)
            ? parsed.activeId!
            : parsed.tabs[0].id;
        }
      }
    } catch {
      // Fall back to seed tabs
    }
  }

  // Merge active-tab crash-recovery auto-save snapshot if present
  const snapshot = typeof localStorage !== 'undefined' ? readActiveTabAutoSave(localStorage) : null;
  if (snapshot) {
    const merged = mergeAutoSaveIntoTabs(baseTabs, snapshot);
    return {
      tabs: merged.tabs,
      activeId: merged.recovered ? merged.activeId : baseActiveId,
      recoveredAutoSave: merged.recovered,
      lastAutoSavedAt: snapshot.savedAt,
    };
  }

  return {
    tabs: baseTabs,
    activeId: baseActiveId,
    recoveredAutoSave: false,
    lastAutoSavedAt: null,
  };
}

export default function App() {
  const initialPrefs = useMemo(() => loadPrefs(), []);
  const initialSession = useMemo(
    () => loadInitialTabs(initialPrefs.sessionRestore),
    [initialPrefs.sessionRestore]
  );

  const [tabs, setTabs] = useState<EditorTab[]>(initialSession.tabs);
  const [activeTabId, setActiveTabId] = useState<string>(initialSession.activeId);

  const [theme, setTheme] = useState<AppTheme>(initialPrefs.theme);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );
  const [languagePref, setLanguagePref] = useState<LanguagePreference>(initialPrefs.language);
  const [systemLangVersion, setSystemLangVersion] = useState<number>(0);

  const [viewMode, setViewMode] = useState<ViewMode>(initialPrefs.viewMode);
  const [wordWrap, setWordWrap] = useState<boolean>(initialPrefs.wordWrap);
  const [showOutline, setShowOutline] = useState<boolean>(initialPrefs.showOutline);
  const [showStatusBar, setShowStatusBar] = useState<boolean>(initialPrefs.showStatusBar);
  const [zoom, setZoom] = useState<number>(initialPrefs.zoom);
  const [sessionRestore, setSessionRestore] = useState<boolean>(initialPrefs.sessionRestore);
  const [aiEnabled, setAiEnabled] = useState<boolean>(initialPrefs.aiEnabled);
  const [aiBusy, setAiBusy] = useState<boolean>(false);

  const [cursorPos, setCursorPos] = useState<number>(0);
  const [pastedAssets, setPastedAssets] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<string | null>(
    initialSession.lastAutoSavedAt
  );

  // Modals & Find bar
  const [findOpen, setFindOpen] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);

  const [tableOpen, setTableOpen] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [markitdownOpen, setMarkitdownOpen] = useState(false);
  const [crossPlatformOpen, setCrossPlatformOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const openLocalInputRef = useRef<HTMLInputElement | null>(null);
  const syncingScrollRef = useRef<'editor' | 'preview' | null>(null);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? tabs[0],
    [tabs, activeTabId]
  );
  const activeTabRef = useRef<EditorTab>(activeTab);
  activeTabRef.current = activeTab;

  const locale = useMemo(() => {
    void systemLangVersion;
    return resolveLocale(languagePref);
  }, [languagePref, systemLangVersion]);
  const t = TRANSLATIONS[locale];

  const effectiveTheme = useMemo(
    () => resolveEffectiveTheme(theme, systemPrefersDark),
    [theme, systemPrefersDark]
  );

  // Sync <html lang> and document title with resolved locale
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Listen for OS/browser language changes when set to 'system'
  useEffect(() => {
    const onLanguageChange = () => setSystemLangVersion((v) => v + 1);
    window.addEventListener('languagechange', onLanguageChange);
    return () => window.removeEventListener('languagechange', onLanguageChange);
  }, []);

  // Listen for OS dark-mode changes
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (ev: MediaQueryListEvent) => setSystemPrefersDark(ev.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Apply resolved theme classes to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'high-contrast');
    if (effectiveTheme === 'dark') root.classList.add('dark');
    if (effectiveTheme === 'high-contrast') root.classList.add('high-contrast');
  }, [effectiveTheme]);

  // Notify if an auto-saved snapshot was recovered after a crash/reload
  useEffect(() => {
    if (initialSession.recoveredAutoSave) {
      setNotice(TRANSLATIONS[resolveLocale(initialPrefs.language)].noticeRecoveredAutoSave);
    }
  }, [initialSession.recoveredAutoSave, initialPrefs.language]);

  // Persist preferences
  useEffect(() => {
    try {
      const prefs: SavedPrefs = {
        theme,
        language: languagePref,
        viewMode,
        wordWrap,
        showOutline,
        showStatusBar,
        zoom,
        sessionRestore,
        aiEnabled,
      };
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage quota errors
    }
  }, [
    theme,
    languagePref,
    viewMode,
    wordWrap,
    showOutline,
    showStatusBar,
    zoom,
    sessionRestore,
    aiEnabled,
  ]);

  // Persist full session tabs to localStorage when session restore is enabled
  useEffect(() => {
    if (!sessionRestore) return;
    try {
      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ tabs, activeId: activeTabId })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [tabs, activeTabId, sessionRestore]);

  // Auto-save mechanism: serialize current active tab content to localStorage every 30 seconds
  useEffect(() => {
    const persistActiveTab = () => {
      const snap = writeActiveTabAutoSave(localStorage, activeTabRef.current);
      if (snap) {
        setLastAutoSavedAt(snap.savedAt);
      }
    };

    const timer = window.setInterval(persistActiveTab, AUTOSAVE_INTERVAL_MS);
    window.addEventListener('beforeunload', persistActiveTab);
    window.addEventListener('pagehide', persistActiveTab);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('beforeunload', persistActiveTab);
      window.removeEventListener('pagehide', persistActiveTab);
    };
  }, []);

  // Transient subtle notice banner
  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const updateActiveTab = useCallback(
    (updater: (tab: EditorTab) => EditorTab) => {
      setTabs((prev) => prev.map((t) => (t.id === activeTab.id ? updater(t) : t)));
    },
    [activeTab.id]
  );

  const setEditorTextAndSelection = useCallback(
    (nextValue: string, selStart: number, selEnd: number) => {
      updateActiveTab((tab) => ({ ...tab, content: nextValue }));
      setCursorPos(selStart);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(selStart, selEnd);
        }
      });
    },
    [updateActiveTab]
  );

  // Derived document state
  const stats = useMemo(
    () => computeDocumentStats(activeTab.content, cursorPos),
    [activeTab.content, cursorPos]
  );
  const outline = useMemo(() => extractOutline(activeTab.content), [activeTab.content]);
  const findMatches = useMemo(
    () => (findOpen ? findWildcardMatches(activeTab.content, findQuery, caseSensitive) : []),
    [findOpen, activeTab.content, findQuery, caseSensitive]
  );

  useEffect(() => {
    setActiveMatchIdx(0);
  }, [findQuery, caseSensitive, activeTab.id]);

  // Tab management
  const handleNewTab = useCallback(() => {
    const id = `tab-${Date.now()}`;
    const count = tabs.length + 1;
    const nextTab: EditorTab = {
      id,
      title: `Senza titolo ${count}.md`,
      content: '',
      savedContent: '',
      encoding: 'UTF-8',
      lineEnding: 'CRLF',
    };
    setTabs((prev) => [...prev, nextTab]);
    setActiveTabId(id);
    setCursorPos(0);
  }, [tabs.length]);

  const handleCloseTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        if (prev.length === 1) {
          const fresh: EditorTab = {
            id: `tab-${Date.now()}`,
            title: 'Senza titolo.md',
            content: '',
            savedContent: '',
            encoding: 'UTF-8',
            lineEnding: 'CRLF',
          };
          setActiveTabId(fresh.id);
          return [fresh];
        }
        const idx = prev.findIndex((t) => t.id === id);
        const filtered = prev.filter((t) => t.id !== id);
        if (id === activeTabId) {
          const nextIdx = Math.max(0, idx - 1);
          setActiveTabId(filtered[nextIdx].id);
        }
        return filtered;
      });
    },
    [activeTabId]
  );

  const openDocumentInNewTab = useCallback((title: string, markdown: string, sourceLabel?: string) => {
    const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const safeTitle = title.endsWith('.md') || title.endsWith('.txt') ? title : `${title}.md`;
    const newTab: EditorTab = {
      id,
      title: safeTitle,
      content: markdown,
      savedContent: markdown,
      encoding: 'UTF-8',
      lineEnding: 'CRLF',
      sourceLabel,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
    setCursorPos(0);
  }, []);

  const handleOpenConverted = useCallback(
    (conv: ConversionResponse) => {
      const base = conv.sourceName.replace(/\.[^.]+$/, '') || 'documento';
      openDocumentInNewTab(`${base}.md`, conv.markdown, conv.converterUsed);
      showNotice(
        `Convertito "${conv.sourceName}" con ${conv.converterUsed} (${conv.stats.estimatedTokens} token stimati)`
      );
    },
    [openDocumentInNewTab, showNotice]
  );

  // File Save / Open / Export
  const handleSaveMd = useCallback(() => {
    const bytes = encodeTextForDownload(
      activeTab.content,
      activeTab.encoding,
      activeTab.lineEnding
    );
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab.title;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    updateActiveTab((t) => ({ ...t, savedContent: t.content }));
    showNotice(`Salvato "${activeTab.title}" (${activeTab.encoding}, ${activeTab.lineEnding})`);
  }, [activeTab, updateActiveTab, showNotice]);

  const handleExportHtml = useCallback(() => {
    const escapedTitle = activeTab.title.replace(/[<>&"]/g, '');
    const previewHtml =
      previewScrollRef.current?.querySelector('.md-preview')?.innerHTML ??
      `<pre>${activeTab.content.replace(/</g, '&lt;')}</pre>`;
    const doc = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapedTitle}</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; max-width: 780px; margin: 2.5rem auto; padding: 0 1.25rem; line-height: 1.65; color: #111827; }
  pre { background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 6px; overflow-x: auto; }
  code { font-family: Consolas, ui-monospace, monospace; background: #f1f5f9; padding: 0.15em 0.35em; border-radius: 4px; }
  pre code { background: transparent; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { border: 1px solid #d1d5db; padding: 0.45rem 0.7rem; text-align: left; }
  th { background: #f8fafc; }
  blockquote { margin: 1rem 0; padding: 0.7rem 1rem; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 6px; }
</style>
</head>
<body>${previewHtml}</body>
</html>`;
    const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab.title.replace(/\.(md|txt)$/i, '') + '.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showNotice('Esportato file HTML pulito.');
  }, [activeTab.title, activeTab.content, showNotice]);

  const handleOpenLocalFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.toLowerCase();
    if (ext.endsWith('.md') || ext.endsWith('.markdown') || ext.endsWith('.txt') || ext.endsWith('.ini')) {
      const text = await file.text();
      const lineEnding: LineEnding = text.includes('\r\n') ? 'CRLF' : 'LF';
      const normalized = text.replace(/\r\n/g, '\n');
      const id = `tab-${Date.now()}`;
      setTabs((prev) => [
        ...prev,
        {
          id,
          title: file.name,
          content: normalized,
          savedContent: normalized,
          encoding: 'UTF-8',
          lineEnding,
        },
      ]);
      setActiveTabId(id);
      showNotice(`Aperto "${file.name}"`);
    } else {
      // Automatically route non-text files through MarkItDown!
      const form = new FormData();
      form.append('file', file);
      try {
        const resp = await fetch('/api/convert/file', { method: 'POST', body: form });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Formato non supportato.');
        handleOpenConverted(data as ConversionResponse);
      } catch (err) {
        showNotice(err instanceof Error ? err.message : 'Impossibile aprire il file.');
      }
    }
  }, [handleOpenConverted, showNotice]);

  // Editor formatting & commands
  const cycleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'source' ? 'split' : prev === 'split' ? 'preview' : 'source'));
  }, []);

  const handleWrapSelection = useCallback(
    (before: string, after = before, placeholder = 'testo') => {
      const el = textareaRef.current;
      const start = el ? el.selectionStart : activeTab.content.length;
      const end = el ? el.selectionEnd : activeTab.content.length;
      const selected = activeTab.content.slice(start, end) || placeholder;
      const next =
        activeTab.content.slice(0, start) + before + selected + after + activeTab.content.slice(end);
      setEditorTextAndSelection(next, start + before.length, start + before.length + selected.length);
    },
    [activeTab.content, setEditorTextAndSelection]
  );

  const handlePrefixLine = useCallback(
    (prefix: string) => {
      const el = textareaRef.current;
      const start = el ? el.selectionStart : 0;
      const lineStart = activeTab.content.lastIndexOf('\n', start - 1) + 1;
      const next =
        activeTab.content.slice(0, lineStart) + prefix + activeTab.content.slice(lineStart);
      setEditorTextAndSelection(next, start + prefix.length, start + prefix.length);
    },
    [activeTab.content, setEditorTextAndSelection]
  );

  const handleClearFormatting = useCallback(() => {
    const el = textareaRef.current;
    const start = el ? el.selectionStart : 0;
    const end = el ? el.selectionEnd : 0;
    const res = clearMarkdownFormatting(activeTab.content, start, end);
    setEditorTextAndSelection(res.value, res.selectionStart, res.selectionEnd);
  }, [activeTab.content, setEditorTextAndSelection]);

  const handleInsertAtCursor = useCallback(
    (snippet: string) => {
      const el = textareaRef.current;
      const start = el ? el.selectionStart : activeTab.content.length;
      const end = el ? el.selectionEnd : activeTab.content.length;
      const prefix = start > 0 && activeTab.content[start - 1] !== '\n' ? '\n\n' : '';
      const inserted = `${prefix}${snippet}\n`;
      const next = activeTab.content.slice(0, start) + inserted + activeTab.content.slice(end);
      const pos = start + inserted.length;
      setEditorTextAndSelection(next, pos, pos);
    },
    [activeTab.content, setEditorTextAndSelection]
  );

  const handleInsertDateTime = useCallback(() => {
    const now = new Date();
    const formatted = now.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const el = textareaRef.current;
    const start = el ? el.selectionStart : activeTab.content.length;
    const end = el ? el.selectionEnd : activeTab.content.length;
    const next = activeTab.content.slice(0, start) + formatted + activeTab.content.slice(end);
    setEditorTextAndSelection(next, start + formatted.length, start + formatted.length);
  }, [activeTab.content, setEditorTextAndSelection]);

  const handleToggleCheckboxLine = useCallback(
    (lineNumber: number) => {
      updateActiveTab((tab) => ({
        ...tab,
        content: toggleCheckboxAtLine(tab.content, lineNumber),
      }));
    },
    [updateActiveTab]
  );

  const handleJumpToHeading = useCallback(
    (heading: OutlineHeading) => {
      if (viewMode === 'preview') {
        const container = previewScrollRef.current;
        if (container) {
          const els = container.querySelectorAll('h1, h2, h3');
          for (const node of els) {
            if (node.textContent?.trim() === heading.text) {
              node.scrollIntoView({ behavior: 'smooth', block: 'start' });
              break;
            }
          }
        }
        return;
      }

      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(heading.offset, heading.offset);
      setCursorPos(heading.offset);
      const totalLines = Math.max(1, activeTab.content.split('\n').length);
      const ratio = (heading.line - 1) / totalLines;
      el.scrollTop = ratio * el.scrollHeight;
    },
    [viewMode, activeTab.content]
  );

  // Optional AI assistant (Ctrl+Q / Ctrl+D / Ctrl+M)
  const handleRunAiAssist = useCallback(
    async (mode: 'write' | 'rewrite' | 'summarize') => {
      setAiBusy(true);
      try {
        const el = textareaRef.current;
        const start = el ? el.selectionStart : 0;
        const end = el ? el.selectionEnd : 0;
        const selected = start !== end ? activeTab.content.slice(start, end) : '';
        const textToUse = selected || activeTab.content;

        const resp = await fetch('/api/ai/assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode,
            text: textToUse,
            instruction:
              mode === 'write'
                ? 'Continua o espandi questo appunto Markdown in modo chiaro ed essenziale.'
                : undefined,
          }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Assistente AI non disponibile.');

        if (mode === 'summarize') {
          openDocumentInNewTab(`Riassunto_${activeTab.title}`, data.result, 'Assistente AI');
        } else if (selected) {
          const next = activeTab.content.slice(0, start) + data.result + activeTab.content.slice(end);
          setEditorTextAndSelection(next, start, start + data.result.length);
        } else {
          handleInsertAtCursor(data.result);
        }
        showNotice('Elaborazione AI completata.');
      } catch (err) {
        showNotice(err instanceof Error ? err.message : 'Errore assistente AI.');
      } finally {
        setAiBusy(false);
      }
    },
    [activeTab, openDocumentInNewTab, setEditorTextAndSelection, handleInsertAtCursor, showNotice]
  );

  // Find / Replace actions
  const selectMatch = useCallback((idx: number, matches = findMatches) => {
    if (matches.length === 0) return;
    const safeIdx = ((idx % matches.length) + matches.length) % matches.length;
    setActiveMatchIdx(safeIdx);
    const match = matches[safeIdx];
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(match.start, match.end);
      setCursorPos(match.start);
    }
  }, [findMatches]);

  const handleReplaceOne = useCallback(() => {
    if (findMatches.length === 0) return;
    const match = findMatches[activeMatchIdx] ?? findMatches[0];
    const next =
      activeTab.content.slice(0, match.start) + replaceText + activeTab.content.slice(match.end);
    setEditorTextAndSelection(next, match.start, match.start + replaceText.length);
  }, [findMatches, activeMatchIdx, activeTab.content, replaceText, setEditorTextAndSelection]);

  const handleReplaceAll = useCallback(() => {
    if (findMatches.length === 0) return;
    let rebuilt = '';
    let last = 0;
    for (const m of findMatches) {
      rebuilt += activeTab.content.slice(last, m.start) + replaceText;
      last = m.end;
    }
    rebuilt += activeTab.content.slice(last);
    updateActiveTab((t) => ({ ...t, content: rebuilt }));
    showNotice(`Sostituite ${findMatches.length} occorrenze.`);
  }, [findMatches, activeTab.content, replaceText, updateActiveTab, showNotice]);

  // Global keyboard shortcuts (Windows Notepad & MDNote conventions)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (e.key === 'F6' || (mod && e.key.toLowerCase() === 'e')) {
        e.preventDefault();
        cycleViewMode();
      } else if (e.key === 'F5') {
        e.preventDefault();
        handleInsertDateTime();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveMd();
      } else if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewTab();
      } else if (mod && e.key.toLowerCase() === 'o' && e.shiftKey) {
        e.preventDefault();
        setShowOutline((v) => !v);
      } else if (mod && e.key.toLowerCase() === 'o' && !e.shiftKey) {
        e.preventDefault();
        openLocalInputRef.current?.click();
      } else if (mod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFindOpen(true);
        setShowReplace(false);
      } else if (mod && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setFindOpen(true);
        setShowReplace(true);
      } else if (mod && e.key.toLowerCase() === 'p' && e.shiftKey) {
        e.preventDefault();
        setPrintPreviewOpen(true);
      } else if (mod && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setTableOpen(true);
      } else if (mod && e.code === 'Space') {
        e.preventDefault();
        handleClearFormatting();
      } else if (aiEnabled && mod && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        void handleRunAiAssist('write');
      } else if (aiEnabled && mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        void handleRunAiAssist('rewrite');
      } else if (aiEnabled && mod && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        void handleRunAiAssist('summarize');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    cycleViewMode,
    handleInsertDateTime,
    handleSaveMd,
    handleNewTab,
    handleClearFormatting,
    aiEnabled,
    handleRunAiAssist,
  ]);

  // Textarea special keys: Smart Enter, Table Tab navigation, Ctrl+Wheel Zoom
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;

    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const res = handleSmartEnter(activeTab.content, el.selectionStart, el.selectionEnd);
      if (res) {
        e.preventDefault();
        setEditorTextAndSelection(res.value, res.selectionStart, res.selectionEnd);
      }
    } else if (e.key === 'Tab') {
      const res = handleTableTab(activeTab.content, el.selectionStart, e.shiftKey);
      if (res) {
        e.preventDefault();
        setEditorTextAndSelection(res.value, res.selectionStart, res.selectionEnd);
      } else {
        e.preventDefault();
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const next = activeTab.content.slice(0, start) + '  ' + activeTab.content.slice(end);
        setEditorTextAndSelection(next, start + 2, start + 2);
      }
    }
  };

  // Smart Paste: URL over selection -> [selected](url) AND Clipboard Image -> ./assets/img_NN.png
  const handleEditorPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (!blob) return;
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = String(reader.result ?? '');
            const idx = Object.keys(pastedAssets).length + 1;
            const assetPath = `./assets/img_${String(idx).padStart(2, '0')}.png`;
            setPastedAssets((prev) => ({ ...prev, [assetPath]: dataUrl }));
            const mdImg = `![immagine ${idx}](${assetPath})`;
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const next = activeTab.content.slice(0, start) + mdImg + activeTab.content.slice(end);
            setEditorTextAndSelection(next, start + mdImg.length, start + mdImg.length);
            showNotice(`Immagine incollata e collegata come ${assetPath}`);
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    }

    const pastedText = e.clipboardData.getData('text/plain');
    if (pastedText) {
      const smart = handleSmartPaste(
        activeTab.content,
        el.selectionStart,
        el.selectionEnd,
        pastedText
      );
      if (smart) {
        e.preventDefault();
        setEditorTextAndSelection(smart.value, smart.selectionStart, smart.selectionEnd);
      }
    }
  };

  const handleEditorWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => {
        const delta = e.deltaY < 0 ? 10 : -10;
        return Math.max(70, Math.min(200, z + delta));
      });
    }
  };

  // Synchronized scroll in Split View
  const handleEditorScroll = () => {
    if (viewMode !== 'split' || syncingScrollRef.current === 'preview') return;
    const ed = textareaRef.current;
    const pv = previewScrollRef.current;
    if (!ed || !pv) return;
    const maxEd = ed.scrollHeight - ed.clientHeight;
    const maxPv = pv.scrollHeight - pv.clientHeight;
    if (maxEd <= 0 || maxPv <= 0) return;
    syncingScrollRef.current = 'editor';
    pv.scrollTop = (ed.scrollTop / maxEd) * maxPv;
    requestAnimationFrame(() => {
      syncingScrollRef.current = null;
    });
  };

  const handlePreviewScroll = () => {
    if (viewMode !== 'split' || syncingScrollRef.current === 'editor') return;
    const ed = textareaRef.current;
    const pv = previewScrollRef.current;
    if (!ed || !pv) return;
    const maxEd = ed.scrollHeight - ed.clientHeight;
    const maxPv = pv.scrollHeight - pv.clientHeight;
    if (maxEd <= 0 || maxPv <= 0) return;
    syncingScrollRef.current = 'preview';
    ed.scrollTop = (pv.scrollTop / maxPv) * maxEd;
    requestAnimationFrame(() => {
      syncingScrollRef.current = null;
    });
  };

  const handleToggleNightMode = useCallback(() => {
    setTheme(effectiveTheme === 'dark' ? 'light' : 'dark');
  }, [effectiveTheme]);

  return (
    <I18nProvider
      locale={locale}
      languagePref={languagePref}
      setLanguagePref={setLanguagePref}
    >
      <div
        className="flex h-screen flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--md-bg)', color: 'var(--md-text)' }}
        onWheel={handleEditorWheel}
      >
        {/* Hidden local file input for Ctrl+O */}
        <input
          ref={openLocalInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            void handleOpenLocalFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />

        {/* Row 1: Windows 11 Notepad Tabs */}
        <TabStrip
          tabs={tabs}
          activeTabId={activeTab.id}
          onSelectTab={(id) => {
            setActiveTabId(id);
            setCursorPos(0);
          }}
          onCloseTab={handleCloseTab}
          onNewTab={handleNewTab}
        />

        {/* Row 2: Classic Windows Menu Bar + View Switch + Night Mode + Post-it Cartelle CTA */}
        <MenuBar
          viewMode={viewMode}
          wordWrap={wordWrap}
          showOutline={showOutline}
          showStatusBar={showStatusBar}
          theme={theme}
          effectiveTheme={effectiveTheme}
          encoding={activeTab.encoding}
          lineEnding={activeTab.lineEnding}
          aiEnabled={aiEnabled}
          sessionRestore={sessionRestore}
          actions={{
            onNewTab: handleNewTab,
            onOpenLocalFile: () => openLocalInputRef.current?.click(),
            onOpenMarkItDown: () => setMarkitdownOpen(true),
            onSaveMd: handleSaveMd,
            onExportHtml: handleExportHtml,
            onOpenPrintPreview: () => setPrintPreviewOpen(true),
            onPrintPdf: () => window.print(),
            onCloseActiveTab: () => handleCloseTab(activeTab.id),
            onOpenFind: (withReplace) => {
              setFindOpen(true);
              setShowReplace(withReplace);
            },
            onClearFormatting: handleClearFormatting,
            onOpenTableDialog: () => setTableOpen(true),
            onInsertDateTime: handleInsertDateTime,
            onToggleWordWrap: () => setWordWrap((w) => !w),
            onChangeEncoding: (enc) => updateActiveTab((tab) => ({ ...tab, encoding: enc })),
            onChangeLineEnding: (le) => updateActiveTab((tab) => ({ ...tab, lineEnding: le })),
            onChangeViewMode: setViewMode,
            onToggleOutline: () => setShowOutline((o) => !o),
            onToggleStatusBar: () => setShowStatusBar((s) => !s),
            onChangeTheme: setTheme,
            onToggleNightMode: handleToggleNightMode,
            onChangeLanguage: setLanguagePref,
            onOpenFolderPostIt: () => setFolderModalOpen(true),
            onOpenCrossPlatform: () => setCrossPlatformOpen(true),
            onToggleAiEnabled: () => setAiEnabled((a) => !a),
            onToggleSessionRestore: () => setSessionRestore((r) => !r),
          }}
        />

        {/* Row 3: Slim Markdown Formatting Toolbar */}
        <FormattingBar
          onWrap={handleWrapSelection}
          onPrefixLine={handlePrefixLine}
          onOpenTable={() => setTableOpen(true)}
          onClearFormatting={handleClearFormatting}
          onToggleOutline={() => setShowOutline((o) => !o)}
          showOutline={showOutline}
          onOpenFind={() => {
            setFindOpen(true);
            setShowReplace(false);
          }}
          onOpenPrintPreview={() => setPrintPreviewOpen(true)}
          onOpenMarkItDown={() => setMarkitdownOpen(true)}
          viewMode={viewMode}
          onCycleViewMode={cycleViewMode}
          aiEnabled={aiEnabled}
          aiBusy={aiBusy}
          onRunAiAssist={(m) => void handleRunAiAssist(m)}
        />

        {/* Main Workspace (hidden during print if Print Preview modal is handling the print sheet) */}
        <main
          className={`relative flex min-h-0 flex-1 overflow-hidden ${
            printPreviewOpen ? 'no-print' : ''
          }`}
        >
          {showOutline && (
            <OutlinePanel
              headings={outline}
              onJump={handleJumpToHeading}
              onClose={() => setShowOutline(false)}
            />
          )}

          <div className="relative flex min-w-0 flex-1 overflow-hidden">
            <FindReplaceBar
              open={findOpen}
              showReplace={showReplace}
              query={findQuery}
              replaceText={replaceText}
              caseSensitive={caseSensitive}
              matches={findMatches}
              activeMatchIndex={activeMatchIdx}
              onChangeQuery={setFindQuery}
              onChangeReplace={setReplaceText}
              onToggleCaseSensitive={() => setCaseSensitive((c) => !c)}
              onToggleShowReplace={() => setShowReplace((s) => !s)}
              onPrev={() => selectMatch(activeMatchIdx - 1)}
              onNext={() => selectMatch(activeMatchIdx + 1)}
              onReplaceOne={handleReplaceOne}
              onReplaceAll={handleReplaceAll}
              onClose={() => setFindOpen(false)}
            />

            {/* Source Editor Pane */}
            {(viewMode === 'source' || viewMode === 'split') && (
              <section
                aria-label={t.editorRegionAria}
                className={`no-print flex min-w-0 flex-1 flex-col ${
                  viewMode === 'split' ? 'border-r' : ''
                }`}
                style={{
                  backgroundColor: 'var(--md-surface)',
                  borderColor: 'var(--md-border)',
                }}
              >
                <label htmlFor="mdpad-editor" className="sr-only">
                  {activeTab.title}
                </label>
                <textarea
                  id="mdpad-editor"
                  ref={textareaRef}
                  value={activeTab.content}
                  readOnly={activeTab.readOnly}
                  spellCheck
                  onChange={(e) => {
                    const val = e.target.value;
                    setCursorPos(e.target.selectionStart);
                    updateActiveTab((tab) => ({ ...tab, content: val }));
                  }}
                  onSelect={(e) => setCursorPos(e.currentTarget.selectionStart)}
                  onKeyUp={(e) => setCursorPos(e.currentTarget.selectionStart)}
                  onClick={(e) => setCursorPos(e.currentTarget.selectionStart)}
                  onKeyDown={handleEditorKeyDown}
                  onPaste={handleEditorPaste}
                  onScroll={handleEditorScroll}
                  placeholder={t.editorPlaceholder}
                  className={`md-editor-textarea h-full w-full flex-1 resize-none border-0 p-5 leading-relaxed outline-none sm:px-7 ${
                    wordWrap ? 'whitespace-pre-wrap' : 'overflow-x-auto whitespace-pre'
                  }`}
                  style={{
                    backgroundColor: 'var(--md-surface)',
                    color: 'var(--md-text)',
                    fontSize: `${Math.round(14 * (zoom / 100))}px`,
                  }}
                />
              </section>
            )}

            {/* Rendered Preview Pane */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <section
                aria-label={t.previewRegionAria}
                className="min-w-0 flex-1 overflow-hidden"
              >
                <MarkdownPreview
                  markdown={activeTab.content}
                  zoom={zoom}
                  assets={pastedAssets}
                  onToggleCheckboxLine={handleToggleCheckboxLine}
                  scrollRef={previewScrollRef}
                  onScroll={handlePreviewScroll}
                />
              </section>
            )}
          </div>

          {/* Transient status notice */}
          {notice && (
            <div
              role="status"
              aria-live="polite"
              className="no-print absolute bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-md border px-3.5 py-1.5 text-xs font-medium shadow-md"
              style={{
                backgroundColor: 'var(--md-surface)',
                borderColor: 'var(--md-accent)',
                color: 'var(--md-text)',
              }}
            >
              {notice}
            </div>
          )}
        </main>

        {/* Bottom Status Bar */}
        {showStatusBar && (
          <StatusBar
            stats={stats}
            encoding={activeTab.encoding}
            lineEnding={activeTab.lineEnding}
            zoom={zoom}
            readOnly={activeTab.readOnly}
            lastAutoSavedAt={lastAutoSavedAt}
            onChangeEncoding={(enc) => updateActiveTab((tab) => ({ ...tab, encoding: enc }))}
            onChangeLineEnding={(le) => updateActiveTab((tab) => ({ ...tab, lineEnding: le }))}
            onChangeZoom={setZoom}
          />
        )}

        {/* Dialogs & Workbenches */}
        <TableDialog
          open={tableOpen}
          onClose={() => setTableOpen(false)}
          onInsert={handleInsertAtCursor}
        />

        <PrintPreviewModal
          open={printPreviewOpen}
          onClose={() => setPrintPreviewOpen(false)}
          title={activeTab.title}
          markdown={activeTab.content}
          assets={pastedAssets}
        />

        <FolderPostItModal
          open={folderModalOpen}
          onClose={() => setFolderModalOpen(false)}
          onOpenInEditor={(title, md) => {
            openDocumentInNewTab(title, md, 'Post-it');
            showNotice(`${title}`);
          }}
        />

        <MarkItDownModal
          open={markitdownOpen}
          onClose={() => setMarkitdownOpen(false)}
          onOpenConverted={handleOpenConverted}
        />

        <CrossPlatformModal
          open={crossPlatformOpen}
          onClose={() => setCrossPlatformOpen(false)}
          theme={theme}
          onChangeTheme={setTheme}
          sessionRestore={sessionRestore}
          onToggleSessionRestore={() => setSessionRestore((r) => !r)}
          aiEnabled={aiEnabled}
          onToggleAiEnabled={() => setAiEnabled((a) => !a)}
          lastAutoSavedAt={lastAutoSavedAt}
        />
      </div>
    </I18nProvider>
  );
}
