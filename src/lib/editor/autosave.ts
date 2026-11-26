import type { EditorTab } from '../../data/seedTabs';
import type { AppTheme, FileEncoding, LineEnding, ResolvedTheme } from '../markitdown/types';

export const AUTOSAVE_ACTIVE_TAB_KEY = 'mdpad_autosave_active_v1';
export const AUTOSAVE_INTERVAL_MS = 30_000;

export interface ActiveTabAutoSaveSnapshot {
  version: 1;
  tabId: string;
  title: string;
  content: string;
  encoding: FileEncoding;
  lineEnding: LineEnding;
  savedAt: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

const VALID_ENCODINGS: ReadonlySet<string> = new Set(['UTF-8', 'UTF-8-BOM', 'ANSI']);
const VALID_LINE_ENDINGS: ReadonlySet<string> = new Set(['CRLF', 'LF']);

export function buildActiveTabSnapshot(
  tab: EditorTab,
  nowIso: string = new Date().toISOString()
): ActiveTabAutoSaveSnapshot {
  return {
    version: 1,
    tabId: tab.id,
    title: tab.title,
    content: tab.content,
    encoding: tab.encoding,
    lineEnding: tab.lineEnding,
    savedAt: nowIso,
  };
}

export function serializeActiveTabSnapshot(
  tab: EditorTab,
  nowIso: string = new Date().toISOString()
): string {
  return JSON.stringify(buildActiveTabSnapshot(tab, nowIso));
}

export function parseActiveTabSnapshot(raw: string | null): ActiveTabAutoSaveSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ActiveTabAutoSaveSnapshot>;
    if (
      parsed.version !== 1 ||
      typeof parsed.tabId !== 'string' ||
      !parsed.tabId ||
      typeof parsed.title !== 'string' ||
      typeof parsed.content !== 'string' ||
      typeof parsed.savedAt !== 'string' ||
      !VALID_ENCODINGS.has(String(parsed.encoding)) ||
      !VALID_LINE_ENDINGS.has(String(parsed.lineEnding))
    ) {
      return null;
    }
    return {
      version: 1,
      tabId: parsed.tabId,
      title: parsed.title,
      content: parsed.content,
      encoding: parsed.encoding as FileEncoding,
      lineEnding: parsed.lineEnding as LineEnding,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function writeActiveTabAutoSave(
  storage: StorageLike,
  tab: EditorTab,
  nowIso: string = new Date().toISOString()
): ActiveTabAutoSaveSnapshot | null {
  try {
    const snapshot = buildActiveTabSnapshot(tab, nowIso);
    storage.setItem(AUTOSAVE_ACTIVE_TAB_KEY, JSON.stringify(snapshot));
    return snapshot;
  } catch {
    return null;
  }
}

export function readActiveTabAutoSave(storage: StorageLike): ActiveTabAutoSaveSnapshot | null {
  try {
    return parseActiveTabSnapshot(storage.getItem(AUTOSAVE_ACTIVE_TAB_KEY));
  } catch {
    return null;
  }
}

/**
 * Merges a recovered active-tab autosave snapshot into loaded session tabs.
 * Preserves existing savedContent so unsaved crash-recovered changes display
 * the dirty (*) indicator accurately.
 */
export function mergeAutoSaveIntoTabs(
  tabs: EditorTab[],
  snapshot: ActiveTabAutoSaveSnapshot | null
): { tabs: EditorTab[]; activeId: string; recovered: boolean } {
  if (!snapshot) {
    return { tabs, activeId: tabs[0]?.id ?? '', recovered: false };
  }

  const existingIndex = tabs.findIndex((t) => t.id === snapshot.tabId);
  if (existingIndex !== -1) {
    const existing = tabs[existingIndex];
    if (
      existing.content === snapshot.content &&
      existing.title === snapshot.title &&
      existing.encoding === snapshot.encoding &&
      existing.lineEnding === snapshot.lineEnding
    ) {
      return { tabs, activeId: existing.id, recovered: false };
    }
    const nextTabs = tabs.map((t, idx) =>
      idx === existingIndex
        ? {
            ...t,
            title: snapshot.title || t.title,
            content: snapshot.content,
            encoding: snapshot.encoding,
            lineEnding: snapshot.lineEnding,
          }
        : t
    );
    return { tabs: nextTabs, activeId: snapshot.tabId, recovered: true };
  }

  // Tab no longer present in session (e.g. crash before session save): restore it
  const recoveredTab: EditorTab = {
    id: snapshot.tabId,
    title: snapshot.title || 'Recovered.md',
    content: snapshot.content,
    savedContent: '',
    encoding: snapshot.encoding,
    lineEnding: snapshot.lineEnding,
  };
  return {
    tabs: [...tabs, recoveredTab],
    activeId: recoveredTab.id,
    recovered: true,
  };
}

export function resolveEffectiveTheme(
  theme: AppTheme,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (theme === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  return theme;
}
