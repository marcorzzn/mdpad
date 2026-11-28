import assert from 'node:assert/strict';
import test from 'node:test';
import {
  base64ToUint8Array,
  buildWorkspaceTreeFromFlatEntries,
  detectRuntimePlatform,
  isDirectFolderWriteSupported,
  uint8ArrayToBase64,
} from './nativeFs.ts';

test('detectRuntimePlatform distinguishes Tauri, Android SAF, Browser FSA, and fallback', () => {
  assert.equal(
    detectRuntimePlatform({ __TAURI_INTERNALS__: { invoke: async <T,>() => null as unknown as T } }),
    'tauri'
  );
  assert.equal(
    detectRuntimePlatform({
      MDPadAndroid: {
        openFile: () => {},
        saveFile: () => {},
        openFolder: () => {},
        readDocumentUri: () => {},
        writeFileInFolder: () => {},
        getPendingIntentFile: () => '',
      },
    }),
    'android'
  );
  assert.equal(
    detectRuntimePlatform({
      showOpenFilePicker: async () => [],
    }),
    'browser-fsa'
  );
  assert.equal(detectRuntimePlatform({}), 'browser-fallback');
});

test('base64 helpers round-trip arbitrary UTF-8 and binary bytes cleanly', () => {
  const original = new Uint8Array([0xef, 0xbb, 0xbf, 0, 127, 128, 255, 65, 66, 67]);
  const b64 = uint8ArrayToBase64(original);
  const decoded = base64ToUint8Array(b64);
  assert.deepEqual(Array.from(decoded), Array.from(original));
});

test('buildWorkspaceTreeFromFlatEntries builds sorted folder tree with dirs before files', () => {
  const tree = buildWorkspaceTreeFromFlatEntries('Progetto', [
    { relativePath: 'Progetto/zeta.md', name: 'zeta.md', kind: 'file', nativePath: '/p/zeta.md' },
    { relativePath: 'Progetto/docs', name: 'docs', kind: 'dir' },
    {
      relativePath: 'Progetto/docs/guida.md',
      name: 'guida.md',
      kind: 'file',
      androidUri: 'content://doc/1',
    },
    { relativePath: 'Progetto/_POST-IT.md', name: '_POST-IT.md', kind: 'file' },
  ]);

  assert.equal(tree.name, 'Progetto');
  assert.equal(tree.children?.length, 3);
  assert.equal(tree.children?.[0].name, 'docs');
  assert.equal(tree.children?.[0].kind, 'dir');
  assert.equal(tree.children?.[0].children?.[0].androidUri, 'content://doc/1');
  assert.equal(tree.children?.[1].name, '_POST-IT.md');
  assert.equal(tree.children?.[2].nativePath, '/p/zeta.md');

  assert.equal(
    isDirectFolderWriteSupported({
      platform: 'android',
      folderName: 'Progetto',
      androidTreeUri: 'content://tree/1',
      tree,
    }),
    true
  );
  assert.equal(
    isDirectFolderWriteSupported({
      platform: 'browser-fallback',
      folderName: 'Progetto',
      tree,
    }),
    false
  );
});
