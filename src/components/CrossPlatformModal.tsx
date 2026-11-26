import React from 'react';
import { Download, X } from 'lucide-react';
import { buildPythonCliScript, buildWindowsRegScript } from '../lib/markitdown/postit';
import type { AppTheme } from '../lib/markitdown/types';

interface CrossPlatformModalProps {
  open: boolean;
  onClose: () => void;
  theme: AppTheme;
  onChangeTheme: (t: AppTheme) => void;
  sessionRestore: boolean;
  onToggleSessionRestore: () => void;
  aiEnabled: boolean;
  onToggleAiEnabled: () => void;
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
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crossplatform-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-6"
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
              Compatibilità Windows 7–11, iPadOS, Android, Linux & Preferenze
            </h2>
            <p className="text-xs" style={{ color: 'var(--md-text-muted)' }}>
              Strumenti di integrazione nativa per Esplora File, script MarkItDown offline e
              scorciatoie stile Blocco Note.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi finestra compatibilità e preferenze"
            className="rounded p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {/* Preferences */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--md-text-muted)' }}>
              Impostazioni MDPad (tutto locale, zero telemetria)
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div
                className="rounded-md border p-3"
                style={{ borderColor: 'var(--md-border)', backgroundColor: 'var(--md-surface-alt)' }}
              >
                <p className="mb-2 text-xs font-medium">Tema interfaccia</p>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'light', label: 'Chiaro' },
                      { id: 'dark', label: 'Scuro' },
                      { id: 'high-contrast', label: 'Contrasto Elevato' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChangeTheme(opt.id)}
                      className="rounded border px-2.5 py-1 text-xs font-medium"
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

              <label
                className="flex cursor-pointer items-start gap-2.5 rounded-md border p-3"
                style={{ borderColor: 'var(--md-border)', backgroundColor: 'var(--md-surface-alt)' }}
              >
                <input
                  type="checkbox"
                  checked={sessionRestore}
                  onChange={onToggleSessionRestore}
                  className="mt-0.5 h-4 w-4"
                />
                <div>
                  <span className="block text-xs font-medium">Ripristino automatico sessione</span>
                  <span className="text-[11px]" style={{ color: 'var(--md-text-muted)' }}>
                    Salva le schede aperte localmente nel browser per riaprirle al prossimo avvio.
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
                  className="mt-0.5 h-4 w-4"
                />
                <div>
                  <span className="block text-xs font-medium">Assistente AI opzionale</span>
                  <span className="text-[11px]" style={{ color: 'var(--md-text-muted)' }}>
                    Disattivato di default. Abilita Scrivi (Ctrl+Q), Riscrivi (Ctrl+D) e Riassumi
                    (Ctrl+M).
                  </span>
                </div>
              </label>
            </div>
          </section>

          {/* Cross-platform compatibility matrix */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--md-text-muted)' }}>
              Compatibilità universale delle note e dei Post-it cartella
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
                    <th className="px-3 py-2 font-semibold">Sistema</th>
                    <th className="px-3 py-2 font-semibold">File utilizzati</th>
                    <th className="px-3 py-2 font-semibold">Comportamento</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      'Windows 7 Starter (32-bit) / 8 / 10 / 11',
                      '_POST-IT.md + desktop.ini + .bat',
                      'Tooltip nativo al passaggio del mouse in Esplora File + testo CRLF/UTF-8 leggibile anche dal Blocco Note Win7.',
                    ],
                    [
                      'iPadOS / iOS (App File, iCloud, Obsidian)',
                      '_POST-IT.md (UTF-8 / LF o CRLF)',
                      'Il prefisso underscore (_) fissa sempre la nota in cima alla cartella; Markdown standard senza formati proprietari.',
                    ],
                    [
                      'Android (Gestore file, Markor, Obsidian)',
                      '_POST-IT.md',
                      'Leggibile e modificabile offline su qualsiasi versione Android anche datata come file di testo puro.',
                    ],
                    [
                      'Linux & macOS (Dolphin, Nautilus, Finder)',
                      '_POST-IT.md + .directory',
                      'Commento cartella nativo su KDE/Linux + anteprima rapida (Quick Look / Sushi) sul file Markdown.',
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

          {/* Downloadable Windows 7-11 & Python CLI Kit */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--md-text-muted)' }}>
              Kit di integrazione Windows & CLI MarkItDown
            </h3>
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
                <span>Scarica Menu Contestuale Windows (.reg Win7–11)</span>
              </button>

              <button
                type="button"
                onClick={() => downloadText('mdpad_postit.py', buildPythonCliScript())}
                className="flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10"
                style={{ borderColor: 'var(--md-border)', color: 'var(--md-text)' }}
              >
                <Download className="h-3.5 w-3.5" />
                <span>Scarica Script CLI MarkItDown (mdpad_postit.py)</span>
              </button>
            </div>
          </section>

          {/* Keyboard shortcuts */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--md-text-muted)' }}>
              Scorciatoie da tastiera (stile Blocco Note)
            </h3>
            <div className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
              {[
                ['F6 / Ctrl+E', 'Cambia vista (Sorgente / Divisa / Anteprima)'],
                ['Ctrl+T', 'Inserisci tabella Markdown'],
                ['Tab (in tabella)', 'Allinea colonne e passa alla cella successiva'],
                ['Ctrl+Shift+O', 'Mostra / nascondi Struttura Documento'],
                ['Ctrl+Spazio', 'Cancella formattazione Markdown'],
                ['Ctrl+F / Ctrl+H', 'Trova e Sostituisci con wildcard (* e ?)'],
                ['Ctrl+N / Ctrl+S', 'Nuova scheda / Salva file .md'],
                ['Ctrl + Rotellina', 'Zoom istantaneo editor e anteprima'],
                ['F5', 'Inserisci data e ora corrente'],
                ['Ctrl+V (su selezione)', 'Incolla URL come link [testo](url) o immagine'],
              ].map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 rounded border px-2.5 py-1.5"
                  style={{ borderColor: 'var(--md-border)' }}
                >
                  <span style={{ color: 'var(--md-text-muted)' }}>{label}</span>
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
