import React from 'react';
import { Download, Globe, X } from 'lucide-react';
import { useI18n } from '../lib/i18n/I18nContext';
import { SUPPORTED_LOCALES } from '../lib/i18n/translations';
import { buildPythonCliScript, buildWindowsRegScript } from '../lib/markitdown/postit';
import type { AppTheme, LanguagePreference } from '../lib/markitdown/types';
import { PWAInstallButton } from './PWAInstallButton';

interface CrossPlatformModalProps {
  open: boolean;
  onClose: () => void;
  theme: AppTheme;
  onChangeTheme: (t: AppTheme) => void;
  sessionRestore: boolean;
  onToggleSessionRestore: () => void;
  aiEnabled: boolean;
  onToggleAiEnabled: () => void;
  lastAutoSavedAt: string | null;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const CrossPlatformModal: React.FC<CrossPlatformModalProps> = ({
  open,
  onClose,
  theme,
  onChangeTheme,
  sessionRestore,
  onToggleSessionRestore,
  aiEnabled,
  onToggleAiEnabled,
  lastAutoSavedAt,
}) => {
  const { t, locale, languagePref, setLanguagePref } = useI18n();
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crossplatform-title"
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border shadow-2xl"
        style={{
          backgroundColor: 'var(--md-surface)',
          borderColor: 'var(--md-border)',
          color: 'var(--md-text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-3.5"
          style={{ borderColor: 'var(--md-border)' }}
        >
          <div>
            <h2 id="crossplatform-title" className="text-base font-semibold">
              {t.prefsTitle}
            </h2>
            <p className="text-xs" style={{ color: 'var(--md-text-muted)' }}>
              {t.prefsSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeLabel}
            className="rounded p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {/* Preferences */}
          <section className="space-y-3">
            <h3
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--md-text-muted)' }}
            >
              {t.prefsSectionTitle}
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Theme selector */}
              <div
                className="rounded-md border p-3"
                style={{ borderColor: 'var(--md-border)', backgroundColor: 'var(--md-surface-alt)' }}
              >
                <p className="mb-2 text-xs font-medium">{t.prefsThemeLabel}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'system', label: t.viewThemeSystem },
                      { id: 'light', label: t.viewThemeLight },
                      { id: 'dark', label: t.viewThemeDark },
                      { id: 'high-contrast', label: t.viewThemeHighContrast },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChangeTheme(opt.id)}
                      className="rounded border px-2.5 py-1 text-xs font-medium transition-colors"
                      style={{
                        borderColor: theme === opt.id ? 'var(--md-accent)' : 'var(--md-border)',
                        backgroundColor:
                          theme === opt.id ? 'var(--md-accent-soft)' : 'var(--md-surface)',
                        color: theme === opt.id ? 'var(--md-accent)' : 'var(--md-text)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language selector */}
              <div
                className="rounded-md border p-3"
                style={{ borderColor: 'var(--md-border)', backgroundColor: 'var(--md-surface-alt)' }}
              >
                <label
                  htmlFor="prefs-language-select"
                  className="mb-2 flex items-center gap-1.5 text-xs font-medium"
                >
                  <Globe className="h-3.5 w-3.5" style={{ color: 'var(--md-accent)' }} />
                  <span>{t.prefsLanguageLabel}</span>
                </label>
                <select
                  id="prefs-language-select"
                  value={languagePref}
                  onChange={(e) => setLanguagePref(e.target.value as LanguagePreference)}
                  className="w-full cursor-pointer rounded border px-2.5 py-1.5 text-xs outline-none"
                  style={{
                    backgroundColor: 'var(--md-surface)',
                    borderColor: 'var(--md-border)',
                    color: 'var(--md-text)',
                  }}
                >
                  <option value="system">
                    {t.prefsLanguageSystemOption} ({locale.toUpperCase()})
                  </option>
                  {SUPPORTED_LOCALES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.nativeName} ({lang.code.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div
                className="rounded-md border p-3"
                style={{ borderColor: 'var(--md-border)', backgroundColor: 'var(--md-surface-alt)' }}
              >
                <span className="block text-xs font-medium">{t.prefsAutoSaveTitle}</span>
                <span className="mt-0.5 block text-[11px]" style={{ color: 'var(--md-text-muted)' }}>
                  {t.prefsAutoSaveDesc}
                </span>
                {lastAutoSavedAt && (
                  <span
                    className="mt-1.5 block font-mono text-[11px]"
                    style={{ color: 'var(--md-accent)' }}
                  >
                    {t.autoSaveLabel}: {new Date(lastAutoSavedAt).toLocaleTimeString(locale)}
                  </span>
                )}
              </div>

              <label
                className="flex cursor-pointer items-start gap-2.5 rounded-md border p-3"
                style={{ borderColor: 'var(--md-border)', backgroundColor: 'var(--md-surface-alt)' }}
              >
                <input
                  type="checkbox"
                  checked={sessionRestore}
                  onChange={onToggleSessionRestore}
                  className="mt-0.5 h-4 w-4 accent-blue-600"
                />
                <div>
                  <span className="block text-xs font-medium">{t.prefsSessionRestoreTitle}</span>
                  <span className="text-[11px]" style={{ color: 'var(--md-text-muted)' }}>
                    {t.prefsSessionRestoreDesc}
                  </span>
                </div>
              </label>

              <label
                className="flex cursor-pointer items-start gap-2.5 rounded-md border p-3"
                style={{ borderColor: 'var(--md-border)', backgroundColor: 'var(--md-surface-alt)' }}
              >
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={onToggleAiEnabled}
                  className="mt-0.5 h-4 w-4 accent-blue-600"
                />
                <div>
                  <span className="block text-xs font-medium">{t.prefsAiTitle}</span>
                  <span className="text-[11px]" style={{ color: 'var(--md-text-muted)' }}>
                    {t.prefsAiDesc}
                  </span>
                </div>
              </label>
            </div>
          </section>

          {/* Cross-platform compatibility matrix */}
          <section className="space-y-2.5">
            <h3
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--md-text-muted)' }}
            >
              {t.prefsMatrixTitle}
            </h3>
            <div
              className="overflow-x-auto rounded-md border"
              style={{ borderColor: 'var(--md-border)' }}
            >
              <table className="w-full text-left text-xs">
                <thead>
                  <tr
                    className="border-b"
                    style={{
                      backgroundColor: 'var(--md-surface-alt)',
                      borderColor: 'var(--md-border)',
                    }}
                  >
                    <th className="px-3 py-2 font-semibold">OS</th>
                    <th className="px-3 py-2 font-semibold">Files</th>
                    <th className="px-3 py-2 font-semibold">Behavior</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      'Windows 7 Starter (32-bit) / 8 / 10 / 11',
                      '_POST-IT.md + desktop.ini + .bat',
                      'Native Explorer hover InfoTip + CRLF/UTF-8 text readable in Win7 Notepad.',
                    ],
                    [
                      'iPadOS / iOS (Files, iCloud, Obsidian)',
                      '_POST-IT.md (UTF-8)',
                      'Underscore prefix (_) pins the Post-it to the top of any folder.',
                    ],
                    [
                      'Android (Files, Markor, Obsidian)',
                      '_POST-IT.md',
                      'Offline plain-text Markdown readable on any Android version.',
                    ],
                    [
                      'Linux & macOS (Dolphin, Nautilus, Finder)',
                      '_POST-IT.md + .directory',
                      'Native KDE/Linux folder comment + Quick Look / Sushi preview.',
                    ],
                  ].map(([os, files, desc]) => (
                    <tr
                      key={os}
                      className="border-b last:border-b-0"
                      style={{ borderColor: 'var(--md-border)' }}
                    >
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{os}</td>
                      <td className="px-3 py-2 font-mono text-[11px]">{files}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--md-text-muted)' }}>
                        {desc}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Native Cross-OS Editions & Open-Source Code Signing Certification */}
          <section className="space-y-2.5">
            <h3
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--md-text-muted)' }}
            >
              {locale === 'it'
                ? 'Edizioni Native (Windows, Android, macOS, Linux, PWA) & Certificazione Open Source — di Marco Razzano'
                : 'Native Editions (Windows, Android, macOS, Linux, PWA) & Open-Source Certification — by Marco Razzano'}
            </h3>
            <div
              className="space-y-2.5 rounded-md border p-3.5 text-xs"
              style={{ borderColor: 'var(--md-border)', backgroundColor: 'var(--md-surface-alt)' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {locale === 'it'
                    ? 'Autore: Marco Razzano · Licenza MIT Open Source · Tutte le funzioni complete + File System nativo'
                    : 'Author: Marco Razzano · MIT Open Source License · Full UI parity + Native OS Filesystem'}
                </p>
                <PWAInstallButton compact />
              </div>
              <ul className="list-disc space-y-1 pl-4" style={{ color: 'var(--md-text-muted)' }}>
                <li>
                  {locale === 'it'
                    ? 'Desktop Windows / macOS / Linux (Tauri v2 Rust + WebView di sistema): interfaccia MDPad completa al 100% con MarkItDown offline, navigazione file/cartelle nativa, zero Electron, zero server locali, installer Inno Setup per-utente (MDPad-1.0.0-setup.exe) e ZIP portatile pulito.'
                    : 'Windows / macOS / Linux Desktop (Tauri v2 Rust + OS WebView): 100% full MDPad UI with offline MarkItDown, native OS file/folder dialogs, zero Electron, zero local servers, per-user Inno Setup installer (MDPad-1.0.0-setup.exe), and clean Portable ZIP.'}
                </li>
                <li>
                  {locale === 'it'
                    ? 'Android nativo (MDPad-1.0.0-android.apk): app predefinita per aprire, modificare e creare file .md, accesso nativo alle cartelle tramite Storage Access Framework (SAF), conversione MarkItDown offline e salvataggio diretto di _POST-IT.md nelle cartelle Android.'
                    : 'Native Android (MDPad-1.0.0-android.apk): registered default app for opening, editing, and creating .md files, native Storage Access Framework (SAF) folder browsing, offline MarkItDown conversion, and direct _POST-IT.md saving.'}
                </li>
                <li>
                  {locale === 'it'
                    ? 'Certificazione gratuita Open Source (SmartScreen): predisposto per SignPath Foundation (gratuito per progetti OSS su GitHub tramite secret SIGNPATH_API_TOKEN / SIGNPATH_ORG_ID), certificato Authenticode PFX (WIN_CSC_PFX_BASE64) e firma Android Release Keystore (vedi CODE_SIGNING_OSS.md).'
                    : 'Free Open-Source Certification (SmartScreen): pre-wired for SignPath Foundation (free for OSS GitHub repos via SIGNPATH_API_TOKEN / SIGNPATH_ORG_ID), Authenticode PFX (WIN_CSC_PFX_BASE64), and Android Release Keystore (see CODE_SIGNING_OSS.md).'}
                </li>
              </ul>
            </div>
          </section>

          {/* Downloadable Windows 7-11 & Python CLI Kit + GitHub Actions */}
          <section className="space-y-2.5">
            <h3
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--md-text-muted)' }}
            >
              {t.prefsKitTitle}
            </h3>
            <p className="text-xs" style={{ color: 'var(--md-text-muted)' }}>
              {t.prefsGhActionsNote}
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() =>
                  downloadText('MDPad_MenuContestuale_Win7_11.reg', buildWindowsRegScript())
                }
                className="flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10"
                style={{ borderColor: 'var(--md-border)', color: 'var(--md-text)' }}
              >
                <Download className="h-3.5 w-3.5" />
                <span>Windows Context Menu (.reg Win7–11)</span>
              </button>

              <button
                type="button"
                onClick={() => downloadText('mdpad_postit.py', buildPythonCliScript())}
                className="flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10"
                style={{ borderColor: 'var(--md-border)', color: 'var(--md-text)' }}
              >
                <Download className="h-3.5 w-3.5" />
                <span>MarkItDown CLI (mdpad_postit.py)</span>
              </button>
            </div>
          </section>

          {/* Keyboard shortcuts */}
          <section className="space-y-2">
            <h3
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--md-text-muted)' }}
            >
              {t.prefsShortcutsTitle}
            </h3>
            <div className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
              {[
                ['F6 / Ctrl+E', `${t.modeSourceShort} / ${t.modeSplitShort} / ${t.modePreviewShort}`],
                ['Ctrl+Shift+E', locale === 'it' ? 'Pannello Cartella' : 'Folder Pane'],
                ['Ctrl+G', locale === 'it' ? 'Vai alla riga' : 'Go to line'],
                ['Ctrl+D', locale === 'it' ? 'Duplica riga' : 'Duplicate line'],
                ['Shift+Alt+F', locale === 'it' ? 'Formatta JSON' : 'Format JSON'],
                ['Tab / Shift+Tab', locale === 'it' ? 'Indenta / Riduci rientro righe' : 'Indent / Outdent lines'],
                ['Ctrl+Shift+P', t.printPreviewTitle],
                ['Ctrl+T', t.editInsertTable],
                ['Ctrl+Shift+O', t.viewOutline],
                ['Ctrl+Space', t.editClearFormatting],
                ['Ctrl+F / Ctrl+H', t.findRegionAria],
                ['Ctrl+N / Ctrl+S', `${t.fileNewTab} / ${t.fileSaveMd}`],
                ['Ctrl + Wheel', 'Zoom 70%–200%'],
                ['F5', t.editInsertDateTime],
              ].map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 rounded border px-2.5 py-1.5"
                  style={{ borderColor: 'var(--md-border)' }}
                >
                  <span className="truncate" style={{ color: 'var(--md-text-muted)' }}>
                    {label}
                  </span>
                  <kbd
                    className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]"
                    style={{ backgroundColor: 'var(--md-code-bg)' }}
                  >
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
