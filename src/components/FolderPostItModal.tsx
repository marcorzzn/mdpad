import React, { useRef, useState } from 'react';
import { Download, FileText, FolderOpen, Package, Sparkles, Upload, X } from 'lucide-react';
import type { FolderPostItResult } from '../lib/markitdown/types';

interface FolderPostItModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInEditor: (title: string, content: string, sourceLabel: string) => void;
}

type ArtifactTab = 'postit' | 'desktop_ini' | 'linux_dir' | 'win_bat';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

      const formData = new FormData();
      formData.append('folderName', inferredFolder);
      if (customNote.trim()) formData.append('customNote', customNote.trim());

      const relPaths: string[] = [];
      for (const file of files) {
        const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
        relPaths.push(rel);
        formData.append('files', file, file.name);
      }
      formData.append('relativePaths', JSON.stringify(relPaths));

      const res = await fetch('/api/folder/scan', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scansione cartella fallita.');
      setResult(data as FolderPostItResult);
      setArtifactTab('postit');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la scansione.');
    } finally {
      setLoading(false);
      if (folderInputRef.current) folderInputRef.current.value = '';
      if (filesInputRef.current) filesInputRef.current.value = '';
    }
  };

  const handleScanDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/folder/scan-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customNote: customNote.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scansione demo fallita.');
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
      const res = await fetch('/api/ai/folder-postit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderName: result.folderName,
          files: result.files,
          customNote: customNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sintesi AI non disponibile.');
      setResult(data as FolderPostItResult);
      setArtifactTab('postit');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sintesi AI.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!result) return;
    setError(null);
    try {
      const res = await fetch('/api/folder/export-zip', {
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
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Impossibile creare il pacchetto ZIP.');
      }
      const blob = await res.blob();
      downloadBlob(blob, `${result.folderName}_postit_bundle.zip`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore download ZIP.');
    }
  };

  const activeArtifactContent = result
    ? artifactTab === 'postit'
      ? result.postItMarkdown
      : artifactTab === 'desktop_ini'
        ? result.desktopIni
        : artifactTab === 'linux_dir'
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
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border shadow-2xl"
        style={{
          backgroundColor: 'var(--md-surface)',
          borderColor: 'var(--md-border)',
          color: 'var(--md-text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-5 py-3.5"
          style={{ borderColor: 'var(--md-border)', backgroundColor: 'var(--md-chrome)' }}
        >
          <div>
            <h2 id="folder-postit-title" className="text-base font-semibold">
              Post-it Cartelle con Microsoft MarkItDown
            </h2>
            <p className="text-xs" style={{ color: 'var(--md-text-muted)' }}>
              Scansiona una cartella, estrai i contenuti con MarkItDown e crea _POST-IT.md + desktop.ini (Windows 7–11) + .directory (Linux)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi finestra Post-it Cartelle"
            className="rounded p-1.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Controls row */}
          <div className="grid gap-4 md:grid-cols-12">
            <div className="space-y-2 md:col-span-7">
              <label
                htmlFor="folder-custom-note"
                className="block text-xs font-medium"
                style={{ color: 'var(--md-text-muted)' }}
              >
                Didascalia o nota personale opzionale per la cartella
              </label>
              <input
                id="folder-custom-note"
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Es. Documenti fiscali Q1 da consegnare entro venerdì…"
                className="w-full rounded border px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'var(--md-surface-alt)',
                  borderColor: 'var(--md-border)',
                  color: 'var(--md-text)',
                }}
              />
            </div>

            <div className="flex flex-wrap items-end gap-2 md:col-span-5">
              <input
                ref={folderInputRef}
                type="file"
                multiple
                // @ts-expect-error webkitdirectory is supported across Chromium, Edge, Firefox, Safari
                webkitdirectory=""
                className="hidden"
                onChange={(e) => handleScanFiles(e.target.files)}
              />
              <input
                ref={filesInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleScanFiles(e.target.files)}
              />

              <button
                type="button"
                disabled={loading}
                onClick={() => folderInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded border px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{ borderColor: 'var(--md-border-strong)', color: 'var(--md-text)' }}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span>Seleziona Cartella</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => filesInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded border px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{ borderColor: 'var(--md-border)', color: 'var(--md-text)' }}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Scegli File</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleScanDemo}
                className="flex items-center gap-1.5 rounded px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-60"
                style={{ backgroundColor: 'var(--md-accent)', color: 'var(--md-accent-fg)' }}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{loading ? 'Scansione…' : 'Scansiona Cartella Demo (12 file)'}</span>
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded border px-3.5 py-2.5 text-xs"
              style={{
                borderColor: '#dc2626',
                backgroundColor: 'rgba(220, 38, 38, 0.08)',
                color: '#dc2626',
              }}
            >
              {error}
            </div>
          )}

          {!result && !loading && (
            <div
              className="rounded-md border border-dashed px-6 py-10 text-center"
              style={{
                borderColor: 'var(--md-border-strong)',
                backgroundColor: 'var(--md-surface-alt)',
              }}
            >
              <p className="text-sm font-medium">
                Nessuna cartella ancora analizzata
              </p>
              <p className="mx-auto mt-1.5 max-w-xl text-xs leading-relaxed" style={{ color: 'var(--md-text-muted)' }}>
                Seleziona una cartella dal tuo PC, iPad o dispositivo, oppure premi{' '}
                <strong>Scansiona Cartella Demo (12 file)</strong> per convertire in locale i documenti reali
                del repository MarkItDown (PDF, Word, Excel, PowerPoint, HTML, Wikipedia, RSS, EPUB, Jupyter Notebook, ZIP, JSON e immagini) e creare il post-it pronto da esportare.
              </p>
            </div>
          )}

          {loading && (
            <div
              className="rounded-md border px-5 py-8 text-center text-xs"
              style={{ borderColor: 'var(--md-border)', color: 'var(--md-text-muted)' }}
            >
              Conversione dei documenti con il motore MarkItDown in corso…
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              {/* Summary metadata line (unboxed, typographic separators) */}
              <div
                className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 text-xs"
                style={{ borderColor: 'var(--md-border)' }}
              >
                <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums" style={{ color: 'var(--md-text-muted)' }}>
                  <span className="font-sans font-semibold" style={{ color: 'var(--md-text)' }}>
                    {result.folderName}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{result.filesSucceeded}/{result.filesProcessed} file convertiti</span>
                  <span aria-hidden="true">·</span>
                  <span>Modalità: {result.mode === 'ai' ? 'Sintesi AI (Gemini)' : 'Locale Offline (MarkItDown)'}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={handleSynthesizeAi}
                    className="flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors hover:bg-black/5 disabled:opacity-60 dark:hover:bg-white/10"
                    style={{ borderColor: 'var(--md-border-strong)', color: 'var(--md-text)' }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{aiLoading ? 'Sintesi AI…' : 'Sintetizza con AI (Opzionale)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenInEditor(
                        '_POST-IT.md',
                        result.postItMarkdown,
                        `Post-it: ${result.folderName}`
                      );
                      onClose();
                    }}
                    className="flex items-center gap-1.5 rounded px-3.5 py-1.5 text-xs font-medium whitespace-nowrap"
                    style={{ backgroundColor: 'var(--md-accent)', color: 'var(--md-accent-fg)' }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Apri _POST-IT.md in MDPad</span>
                  </button>
                </div>
              </div>

              {/* Artifacts switcher */}
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div
                    role="tablist"
                    aria-label="File generati per la cartella"
                    className="flex flex-wrap items-center gap-1 rounded-md border p-0.5"
                    style={{ backgroundColor: 'var(--md-chrome)', borderColor: 'var(--md-border)' }}
                  >
                    {(
                      [
                        { id: 'postit', label: '_POST-IT.md (Universale)' },
                        { id: 'desktop_ini', label: 'desktop.ini (Win 7–11)' },
                        { id: 'win_bat', label: 'Applica_Windows.bat' },
                        { id: 'linux_dir', label: '.directory (Linux)' },
                      ] as const
                    ).map((t) => {
                      const active = artifactTab === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setArtifactTab(t.id)}
                          className="rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors"
                          style={{
                            backgroundColor: active ? 'var(--md-surface)' : 'transparent',
                            color: active ? 'var(--md-text)' : 'var(--md-text-muted)',
                          }}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        downloadBlob(
                          new Blob([result.postItMarkdown], { type: 'text/markdown;charset=utf-8' }),
                          '_POST-IT.md'
                        )
                      }
                      className="flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-medium whitespace-nowrap hover:bg-black/5 dark:hover:bg-white/10"
                      style={{ borderColor: 'var(--md-border)', color: 'var(--md-text)' }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Scarica _POST-IT.md</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadZip}
                      className="flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-medium whitespace-nowrap hover:bg-black/5 dark:hover:bg-white/10"
                      style={{ borderColor: 'var(--md-border-strong)', color: 'var(--md-text)' }}
                    >
                      <Package className="h-3.5 w-3.5" />
                      <span>Pacchetto ZIP (Win/Linux/Mobile)</span>
                    </button>
                  </div>
                </div>

                <pre
                  className="max-h-60 overflow-auto rounded-md border p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap"
                  style={{
                    backgroundColor: 'var(--md-surface-alt)',
                    borderColor: 'var(--md-border)',
                    color: 'var(--md-text)',
                  }}
                >
                  {activeArtifactContent}
                </pre>
              </div>

              {/* Per-file MarkItDown inspection table */}
              <div>
                <h3 className="mb-2 text-xs font-semibold">
                  File analizzati dal motore MarkItDown ({result.files.length})
                </h3>
                <div
                  className="max-h-48 overflow-auto rounded-md border"
                  style={{ borderColor: 'var(--md-border)' }}
                >
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr
                        className="border-b"
                        style={{
                          backgroundColor: 'var(--md-surface-alt)',
                          borderColor: 'var(--md-border)',
                          color: 'var(--md-text-muted)',
                        }}
                      >
                        <th className="px-3 py-2 font-medium">File</th>
                        <th className="px-3 py-2 font-medium">Convertitore</th>
                        <th className="px-3 py-2 text-right font-medium">Dimensione</th>
                        <th className="px-3 py-2 font-medium">Esito</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono tabular-nums">
                      {result.files.map((f) => (
                        <tr
                          key={f.relativePath}
                          className="border-b last:border-b-0"
                          style={{ borderColor: 'var(--md-border)' }}
                        >
                          <td className="px-3 py-1.5 font-sans font-medium">{f.relativePath}</td>
                          <td className="px-3 py-1.5" style={{ color: 'var(--md-text-muted)' }}>
                            {f.converterUsed}
                          </td>
                          <td className="px-3 py-1.5 text-right" style={{ color: 'var(--md-text-muted)' }}>
                            {formatBytes(f.sizeBytes)}
                          </td>
                          <td className="px-3 py-1.5 font-sans">
                            {f.status === 'ok' ? 'Convertito' : f.error || 'Saltato'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
