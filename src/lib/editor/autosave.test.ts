import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTOSAVE_ACTIVE_TAB_KEY,
  AUTOSAVE_INTERVAL_MS,
  mergeAutoSaveIntoTabs,
  parseActiveTabSnapshot,
  readActiveTabAutoSave,
  resolveEffectiveTheme,
  serializeActiveTabSnapshot,
  writeActiveTabAutoSave,
  type StorageLike,
} from './autosave.ts';
import type { EditorTab } from '../../data/seedTabs.ts';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

const sampleTab: EditorTab = {
  id: 'tab-1',
  title: 'Appunti.md',
  content: '# Titolo\nContenuto non ancora salvato',
  savedContent: '# Titolo\n',
  encoding: 'UTF-8',
  lineEnding: 'CRLF',
};

test('AUTOSAVE_INTERVAL_MS is strictly 30 seconds', () => {
  assert.equal(AUTOSAVE_INTERVAL_MS, 30_000);
});

test('serialize/write/read round-trips active tab snapshot accurately', () => {
  const storage = createMemoryStorage();
  const iso = '2026-11-26T20:00:00.000Z';
  const written = writeActiveTabAutoSave(storage, sampleTab, iso);
  assert.ok(written);
  assert.equal(written.tabId, 'tab-1');
  assert.equal(written.savedAt, iso);

  const raw = storage.getItem(AUTOSAVE_ACTIVE_TAB_KEY);
  assert.equal(raw, serializeActiveTabSnapshot(sampleTab, iso));

  const read = readActiveTabAutoSave(storage);
  assert.deepEqual(read, written);
});

test('parseActiveTabSnapshot safely rejects corrupt or invalid payloads', () => {
  assert.equal(parseActiveTabSnapshot(null), null);
  assert.equal(parseActiveTabSnapshot('{invalid json'), null);
  assert.equal(parseActiveTabSnapshot(JSON.stringify({ version: 2, tabId: 'x' })), null);
  assert.equal(
    parseActiveTabSnapshot(
      JSON.stringify({
        version: 1,
        tabId: 'tab-1',
        title: 'a.md',
        content: 'hi',
        encoding: 'BAD',
        lineEnding: 'LF',
        savedAt: '2026-01-01T00:00:00Z',
      })
    ),
    null
  );
});

test('mergeAutoSaveIntoTabs restores newer unsaved content without clobbering savedContent', () => {
  const baseTabs: EditorTab[] = [
    {
      id: 'tab-1',
      title: 'Appunti.md',
      content: '# Vecchio contenuto',
      savedContent: '# Vecchio contenuto',
      encoding: 'UTF-8',
      lineEnding: 'CRLF',
    },
  ];
  const snapshot = parseActiveTabSnapshot(serializeActiveTabSnapshot(sampleTab));
  const merged = mergeAutoSaveIntoTabs(baseTabs, snapshot);
  assert.equal(merged.recovered, true);
  assert.equal(merged.activeId, 'tab-1');
  assert.equal(merged.tabs[0].content, sampleTab.content);
  assert.equal(merged.tabs[0].savedContent, '# Vecchio contenuto');
});

test('mergeAutoSaveIntoTabs appends tab if missing from session after crash', () => {
  const baseTabs: EditorTab[] = [
    {
      id: 'tab-other',
      title: 'Altro.md',
      content: 'ok',
      savedContent: 'ok',
      encoding: 'UTF-8',
      lineEnding: 'LF',
    },
  ];
  const snapshot = parseActiveTabSnapshot(serializeActiveTabSnapshot(sampleTab));
  const merged = mergeAutoSaveIntoTabs(baseTabs, snapshot);
  assert.equal(merged.recovered, true);
  assert.equal(merged.tabs.length, 2);
  assert.equal(merged.activeId, 'tab-1');
  assert.equal(merged.tabs[1].content, sampleTab.content);
});

test('resolveEffectiveTheme handles system, light, dark, and high-contrast', () => {
  assert.equal(resolveEffectiveTheme('system', true), 'dark');
  assert.equal(resolveEffectiveTheme('system', false), 'light');
  assert.equal(resolveEffectiveTheme('dark', false), 'dark');
  assert.equal(resolveEffectiveTheme('light', true), 'light');
  assert.equal(resolveEffectiveTheme('high-contrast', false), 'high-contrast');
});
