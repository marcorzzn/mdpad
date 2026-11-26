import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLocale, SUPPORTED_LOCALES, TRANSLATIONS } from './translations.ts';

test('resolveLocale respects explicit preference and system navigator languages', () => {
  assert.equal(resolveLocale('it', ['en-US']), 'it');
  assert.equal(resolveLocale('de', ['it-IT']), 'de');
  assert.equal(resolveLocale('system', ['it-IT', 'en-US']), 'it');
  assert.equal(resolveLocale('system', ['fr-CA', 'en']), 'fr');
  assert.equal(resolveLocale('system', ['es-MX']), 'es');
  assert.equal(resolveLocale('system', ['de-AT']), 'de');
  assert.equal(resolveLocale('system', ['en-GB']), 'en');
  // Unsupported system locale falls back to en
  assert.equal(resolveLocale('system', ['ja-JP', 'ko-KR']), 'en');
  // Secondary supported system language matches
  assert.equal(resolveLocale('system', ['ja-JP', 'it-CH']), 'it');
});

test('all supported locales share identical non-empty translation keys', () => {
  const baseKeys = Object.keys(TRANSLATIONS.it).sort();
  for (const { code } of SUPPORTED_LOCALES) {
    const bundle = TRANSLATIONS[code];
    assert.deepEqual(Object.keys(bundle).sort(), baseKeys, `Key mismatch in locale ${code}`);
    for (const k of baseKeys) {
      const val = bundle[k as keyof typeof bundle];
      assert.equal(typeof val, 'string');
      assert.ok(val.trim().length > 0, `Empty translation ${code}.${k}`);
    }
  }
});
