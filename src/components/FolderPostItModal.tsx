import React, { useRef, useState } from 'react';
import { Download, FileArchive, FileText, FolderOpen, Sparkles, X } from 'lucide-react';
import type { FolderPostItResult } from '../lib/markitdown/types';

interface FolderPostItModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInEditor: (title: string, markdown: string) => void;
}

type ArtifactTab = 'postit' | 'desktopIni' | 'linuxDir' | 'bat';

function triggerDownload(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const FolderPostItModal: React.FC<FolderPostItModalProps> = ({
  open,
  onClose,
  onOpenInEditor,
}) => {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const [customNote, setCustomNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FolderPostItResult | null>(null);
  const [artifactTab, setArtifactTab] = useState<ArtifactTab>('postit');

  if (!open) return null;

  const handleScanFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const files = Array.from(fileList).slice(0, 40);
      const firstRel = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath || '';
      const inferredFolder = firstRel.includes('/') ? firstRel.split('/')[0] : 'Cartella_Selezionata';
      const relativePaths = files.map(
        (f) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name
      );

      const form = new FormData();
      form.append('folderName', inferredFolder);
      form.append('customNote', customNote);
      form.append('relativePaths', JSON.stringify(relativePaths));
      for (const file of files) {
        form.append('files', file, file.name);
      }

      const resp = await fetch('/api/folder/scan', { method: 'POST', body: form });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Scansione fallita.');
      setResult(data as FolderPostItResult);
      setArtifactTab('postit');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la scansione.');
    } finally {
      setLoading(false);
    }
  };

  const handleScanDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/folder/scan-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customNote }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Errore scansione demo.');
      setResult(data as FolderPostItResult);
      setArtifactTab('postit');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore scansione demo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSynthesizeAi = async () => {
    if (!result) return;
    setAiLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/ai/folder-postit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderName: result.folderName,
          files: result.files,
          customNote,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Sintesi AI non disponibile.');
      setResult(data as FolderPostItResult);
      setArtifactTab('postit');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la sintesi AI.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!result) return;
    setZipLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/folder/export-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderName: result.folderName,
          postItMarkdown: result.postItMarkdown,
          desktopIni: result.desktopIni,
          linuxDirectory: result.linuxDirectory,
          applyBat: result.applyBat,
        }),
      });
      if (!resp.ok) throw new Error('Impossibile creare il pacchetto ZIP.');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.folderName}_postit_bundle.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore download ZIP.');
    } finally {
      setZipLoading(false);
    }
  };

  const currentArtifactText = result
    ? artifactTab === 'postit'
      ? result.postItMarkdown
      : artifactTab === 'desktopIni'
        ? result.desktopIni
        : artifactTab === 'linuxDir'
          ? result.linuxDirectory
          : result.applyBat
    : '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-postit-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border shadow-2xl"
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
            <h2 id="folder-postit-title" className="text-base font-semibold">
              Post-it Cartelle con Microsoft MarkItDown
            </h2>
            <p className="text-xs" style={{ color: 'var(--md-text-muted)' }}>
              Analizza tutti i documenti di una cartella (PDF, Word, Excel, PowerPoint, HTML, EPUB,
              ZIP) e genera _POST-IT.md, desktop.ini (Windows 7–11) e .directory (Linux).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi Post-it Cartelle"
            className="rounded p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Step 1: Select folder / files / demo */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label
                htmlFor="postit-custom-note"
                className="mb-1 block text-xs font-medium"
                style={{ color: 'var(--md-text-muted)' }}
              >
                Nota personale facoltativa (inserita in cima al post-it)
              </label>
              <input
                id="postit-custom-note"
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Es. Documenti fiscali 2026 da inviare al commercialista entro venerdì…"
                className="w-full rounded-md border px-3 py-2 text-xs"
                style={{
                  backgroundColor: 'var(--md-surface-alt)',
                  borderColor: 'var(--md-border)',
                  color: 'var(--md-text)',
                }}
              />
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <input
                ref={folderInputRef}
                type="file"
                webkitdirectory=""
                multiple
                className="hidden"
                onChange={(e) => {
                  void handleScanFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <input
                ref={filesInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  void handleScanFiles(e.target.files);
                  e.target.value = '';
                }}
              />

              <button
                type="button"
                disabled={loading}
                onClick={() => folderInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{ borderColor: 'var(--md-border)', color: 'var(--md-text)' }}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span>Scegli cartella…</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => filesInputRef.current?.click()}
                className="rounded-md border px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{ borderColor: 'var(--md-border)', color: 'var(--md-text)' }}
              >
                Scegli file…
              </button>
            </div>
          </div>

          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3"
            style={{
              backgroundColor: 'var(--md-surface-alt)',
              borderColor: 'var(--md-border)',
            }}
          >
            <div className="text-xs" style={{ color: 'var(--md-text-muted)' }}>
              Vuoi provare subito il motore MarkItDown su una cartella reale con 12 documenti misti
              (PDF, DOCX, XLSX, PPTX, HTML, Wikipedia, RSS, EPUB, IPYNB, ZIP, JSON, JPG)?
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleScanDemo}
              className="rounded-md px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--md-accent)',
                color: 'var(--md-accent-fg)',
              }}
            >
              {loading ? 'Conversione con MarkItDown…' : 'Scansiona Cartella Demo (12 file)'}
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border px-3.5 py-2.5 text-xs"
              style={{
                borderColor: '#dc2626',
                backgroundColor: 'rgba(220, 38, 38, 0.08)',
                color: 'var(--md-text)',
              }}
            >
              <strong>Attenzione:</strong> {error}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Summary strip (unboxed typographic metadata) */}
              <div
                className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 text-xs"
                style={{ borderColor: 'var(--md-border)' }}
              >
                <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
                  <span className="font-sans font-semibold" style={{ color: 'var(--md-text)' }}>
                    {result.folderName}
                  </span>
                  <span style={{ color: 'var(--md-text-muted)' }}>·</span>
                  <span style={{ color: 'var(--md-text-muted)' }}>
                    {result.filesSucceeded}/{result.filesProcessed} file convertiti
                  </span>
                  <span style={{ color: 'var(--md-text-muted)' }}>·</span>
                  <span style={{ color: 'var(--md-text-muted)' }}>
                    Modalità: {result.mode === 'ai' ? 'Sintesi AI (Gemini)' : 'Locale (Offline)'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={handleSynthesizeAi}
                    className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
                    style={{ borderColor: 'var(--md-border)', color: 'var(--md-text)' }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{aiLoading ? 'Sintesi AI in corso…' : 'Sintetizza in 5 punti (AI)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenInEditor('_POST-IT.md', result.postItMarkdown);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap"
                    style={{ backgroundColor: 'var(--md-accent)', color: 'var(--md-accent-fg)' }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Apri _POST-IT.md in MDPad</span>
                  </button>
                </div>
              </div>

              {/* Artifacts selector & preview */}
              <div className="grid gap-4 lg:grid-cols-5">
                <div className="space-y-2 lg:col-span-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div
                      role="tablist"
                      aria-label="File generati per la cartella"
                      className="flex items-center gap-1 rounded-md border p-0.5"
                      style={{
                        backgroundColor: 'var(--md-chrome)',
                        borderColor: 'var(--md-border)',
                      }}
                    >
                      {(
                        [
                          { id: 'postit', label: '_POST-IT.md' },
                          { id: 'desktopIni', label: 'desktop.ini (Win7–11)' },
                          { id: 'bat', label: 'Applica_Win.bat' },
                          { id: 'linuxDir', label: '.directory (Linux)' },
                        ] as const
                      ).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          role="tab"
                          aria-selected={artifactTab === t.id}
                          onClick={() => setArtifactTab(t.id)}
                          className="rounded px-2.5 py-1 font-mono text-[11px] font-medium whitespace-nowrap transition-colors"
                          style={{
                            backgroundColor:
                              artifactTab === t.id ? 'var(--md-surface)' : 'transparent',
                            color:
                              artifactTab === t.id ? 'var(--md-text)' : 'var(--md-text-muted)',
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <pre
                    className="max-h-72 overflow-auto rounded-md border p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap"
                    style={{
                      backgroundColor: 'var(--md-surface-alt)',
                      borderColor: 'var(--md-border)',
                      color: 'var(--md-text)',
                    }}
                  >
                    {currentArtifactText}
                  </pre>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        triggerDownload('_POST-IT.md', result.postItMarkdown, 'text/markdown;charset=utf-8')
                      }
                      className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium whitespace-nowrap hover:bg-black/5 dark:hover:bg-white/10"
                      style={{ borderColor: 'var(--md-border)', color: 'var(--md-text)' }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Scarica _POST-IT.md</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        triggerDownload('desktop.ini', result.desktopIni, 'text/plain;charset=utf-8')
                      }
                      className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium whitespace-nowrap hover:bg-black/5 dark:hover:bg-white/10"
                      style={{ borderColor: 'var(--md-border)', color: 'var(--md-text)' }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Scarica desktop.ini</span>
                    </button>

                    <button
                      type="button"
                      disabled={zipLoading}
                      onClick={handleDownloadZip}
                      className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium whitespace-nowrap hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
                      style={{ borderColor: 'var(--md-accent)', color: 'var(--md-accent)' }}
                    >
                      <FileArchive className="h-3.5 w-3.5" />
                      <span>
                        {zipLoading ? 'Creazione ZIP…' : 'Pacchetto ZIP Universale (Win/Linux/iPad)'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Extracted files inventory */}
                <div className="space-y-2 lg:col-span-2">
                  <h3 className="text-xs font-semibold">File analizzati da MarkItDown</h3>
                  <div
                    className="max-h-[340px] overflow-y-auto rounded-md border"
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
                          <th className="px-2.5 py-2 font-medium">File</th>
                          <th className="px-2.5 py-2 font-medium">Convertitore</th>
                          <th className="px-2.5 py-2 text-right font-medium">Dim.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.files.map((f) => (
                          <tr
                            key={f.relativePath}
                            className="border-b last:border-b-0"
                            style={{ borderColor: 'var(--md-border)' }}
                          >
                            <td className="max-w-[140px] truncate px-2.5 py-1.5 font-mono text-[11px]">
                              {f.filename}
                            </td>
                            <td
                              className="px-2.5 py-1.5 text-[11px]"
                              style={{ color: 'var(--md-text-muted)' }}
                            >
                              {f.status === 'ok' ? f.converterUsed : 'Errore'}
                            </td>
                            <td
                              className="px-2.5 py-1.5 text-right font-mono text-[11px] tabular-nums"
                              style={{ color: 'var(--md-text-muted)' }}
                            >
                              {formatBytes(f.sizeBytes)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
