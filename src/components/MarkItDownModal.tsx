import React, { useEffect, useState } from 'react';
import { FileInput, Globe, Terminal, Upload, X } from 'lucide-react';
import type { ConversionResponse, ConverterMetadata } from '../lib/markitdown/types';

interface MarkItDownModalProps {
  open: boolean;
  onClose: () => void;
  onOpenConverted: (title: string, markdown: string, sourceLabel: string) => void;
}

interface SampleItem {
  filename: string;
  extension: string;
  sizeBytes: number;
}

type ModalTab = 'import' | 'samples' | 'pipeline';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const MarkItDownModal: React.FC<MarkItDownModalProps> = ({
  open,
  onClose,
  onOpenConverted,
}) => {
  const [tab, setTab] = useState<ModalTab>('import');
  const [uriInput, setUriInput] = useState('');
  const [keepDataUris, setKeepDataUris] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [converters, setConverters] = useState<ConverterMetadata[]>([]);
  const [mcpUri, setMcpUri] = useState(
    'data:text/html;base64,PGgxPk1hcmtJdERvd24gTUNQPC9oMT48cD5Db252ZXJzaW9uZSB0cmFtaXRlIEpTT04tUlBDIDIuMC48L3A+'
  );
  const [mcpOutput, setMcpOutput] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch('/api/samples')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.samples)) setSamples(d.samples);
      })
      .catch(() => {});

    fetch('/api/converters')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.converters)) setConverters(d.converters);
      })
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  const openResult = (data: ConversionResponse) => {
    const baseName = data.sourceName.replace(/\.[^.]+$/, '') || 'documento';
    onOpenConverted(
      `${baseName}.md`,
      data.markdown,
      `${data.converterUsed} · ~${data.stats.estimatedTokens} token · ${data.stats.durationMs} ms`
    );
    onClose();
  };

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('keepDataUris', String(keepDataUris));
      const res = await fetch('/api/convert/file', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversione file fallita.');
      openResult(data as ConversionResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore conversione.');
    } finally {
      setBusy(false);
    }
  };

  const handleConvertUri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uriInput.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/convert/uri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: uriInput.trim(), keepDataUris }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversione URI fallita.');
      openResult(data as ConversionResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore conversione URI.');
    } finally {
      setBusy(false);
    }
  };

  const handleConvertSample = async (filename: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/convert/sample/${encodeURIComponent(filename)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepDataUris }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversione campione fallita.');
      openResult(data as ConversionResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore conversione campione.');
    } finally {
      setBusy(false);
    }
  };

  const handleRunMcp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'convert_to_markdown',
            arguments: { uri: mcpUri.trim() },
          },
        }),
      });
      const json = await res.json();
      setMcpOutput(JSON.stringify(json, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore chiamata MCP.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="markitdown-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border shadow-2xl"
        style={{
          backgroundColor: 'var(--md-surface)',
          borderColor: 'var(--md-border)',
          color: 'var(--md-text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-3.5"
          style={{ borderColor: 'var(--md-border)', backgroundColor: 'var(--md-chrome)' }}
        >
          <div>
            <h2 id="markitdown-modal-title" className="text-base font-semibold">
              Importa e Converti con Microsoft MarkItDown
            </h2>
            <p className="text-xs" style={{ color: 'var(--md-text-muted)' }}>
              Trasforma documenti Office, PDF, HTML, EPUB, RSS, ZIP o indirizzi web direttamente in una scheda MDPad
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi finestra MarkItDown"
            className="rounded p-1.5 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div
          role="tablist"
          aria-label="Sezioni MarkItDown"
          className="flex items-center gap-1 border-b px-5 py-2"
          style={{ borderColor: 'var(--md-border)', backgroundColor: 'var(--md-surface-alt)' }}
        >
          {(
            [
              { id: 'import', label: 'File e URL' },
              { id: 'samples', label: `Campioni Reali (${samples.length})` },
              { id: 'pipeline', label: `Convertitori & MCP (${converters.length})` },
            ] as const
          ).map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setError(null);
                  setTab(item.id);
                }}
                className="rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors"
                style={{
                  backgroundColor: active ? 'var(--md-surface)' : 'transparent',
                  color: active ? 'var(--md-text)' : 'var(--md-text-muted)',
                  border: active ? '1px solid var(--md-border)' : '1px solid transparent',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
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

          {tab === 'import' && (
            <div className="space-y-5">
              {/* File upload dropzone */}
              <div
                className="rounded-md border border-dashed p-6 text-center"
                style={{
                  borderColor: 'var(--md-border-strong)',
                  backgroundColor: 'var(--md-surface-alt)',
                }}
              >
                <Upload className="mx-auto mb-2 h-6 w-6 opacity-70" />
                <p className="text-sm font-medium">Carica un documento da convertire in Markdown</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--md-text-muted)' }}>
                  Supporta PDF, DOCX, XLSX, XLS, PPTX, HTML, CSV, EPUB, RSS/Atom, IPYNB, ZIP, JSON e immagini EXIF
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                  <label
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded px-4 py-2 text-xs font-medium"
                    style={{ backgroundColor: 'var(--md-accent)', color: 'var(--md-accent-fg)' }}
                  >
                    <FileInput className="h-3.5 w-3.5" />
                    <span>{busy ? 'Conversione in corso…' : 'Scegli file dal dispositivo'}</span>
                    <input
                      type="file"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => handleFileUpload(e.target.files?.[0])}
                    />
                  </label>

                  <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--md-text-muted)' }}>
                    <input
                      type="checkbox"
                      checked={keepDataUris}
                      onChange={(e) => setKeepDataUris(e.target.checked)}
                      className="h-3.5 w-3.5"
                    />
                    <span>Mantieni data URI base64 (flag --keep-data-uris)</span>
                  </label>
                </div>
              </div>

              {/* URL / Data URI form */}
              <form onSubmit={handleConvertUri} className="space-y-2">
                <label
                  htmlFor="markitdown-uri-input"
                  className="flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: 'var(--md-text-muted)' }}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>Oppure converti un indirizzo HTTP/HTTPS o un Data URI</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="markitdown-uri-input"
                    type="text"
                    value={uriInput}
                    onChange={(e) => setUriInput(e.target.value)}
                    placeholder="https://example.com oppure data:text/html;base64,..."
                    className="min-w-0 flex-1 rounded border px-3 py-2 font-mono text-xs"
                    style={{
                      backgroundColor: 'var(--md-surface-alt)',
                      borderColor: 'var(--md-border)',
                      color: 'var(--md-text)',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={busy || !uriInput.trim()}
                    className="rounded border px-4 py-2 text-xs font-medium whitespace-nowrap disabled:opacity-50"
                    style={{ borderColor: 'var(--md-border-strong)', color: 'var(--md-text)' }}
                  >
                    Converti URI
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === 'samples' && (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'var(--md-text-muted)' }}>
                Documenti di test originali del repository Microsoft MarkItDown. Clicca su <strong>Converti</strong> per
                aprire il risultato Markdown direttamente in una scheda di MDPad.
              </p>

              <div className="overflow-auto rounded-md border" style={{ borderColor: 'var(--md-border)' }}>
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
                      <th className="px-3 py-2 font-medium">Nome file</th>
                      <th className="px-3 py-2 font-medium">Estensione</th>
                      <th className="px-3 py-2 text-right font-medium">Dimensione</th>
                      <th className="px-3 py-2 text-right font-medium">Azione</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono tabular-nums">
                    {samples.map((s) => (
                      <tr
                        key={s.filename}
                        className="border-b last:border-b-0"
                        style={{ borderColor: 'var(--md-border)' }}
                      >
                        <td className="px-3 py-2 font-sans font-medium">{s.filename}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--md-text-muted)' }}>
                          {s.extension}
                        </td>
                        <td className="px-3 py-2 text-right" style={{ color: 'var(--md-text-muted)' }}>
                          {formatBytes(s.sizeBytes)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleConvertSample(s.filename)}
                            className="rounded border px-2.5 py-1 font-sans text-xs font-medium whitespace-nowrap transition-colors hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
                            style={{ borderColor: 'var(--md-border-strong)', color: 'var(--md-text)' }}
                          >
                            Converti
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'pipeline' && (
            <div className="space-y-5">
              <div>
                <h3 className="mb-2 text-xs font-semibold">
                  Convertitori MarkItDown registrati (ordine di priorità)
                </h3>
                <div className="max-h-52 overflow-auto rounded-md border" style={{ borderColor: 'var(--md-border)' }}>
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
                        <th className="px-3 py-2 font-medium">Convertitore</th>
                        <th className="px-3 py-2 font-medium">Priorità</th>
                        <th className="px-3 py-2 font-medium">Estensioni</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono tabular-nums">
                      {converters.map((c) => (
                        <tr
                          key={c.name}
                          className="border-b last:border-b-0"
                          style={{ borderColor: 'var(--md-border)' }}
                        >
                          <td className="px-3 py-1.5 font-medium">{c.name}</td>
                          <td className="px-3 py-1.5" style={{ color: 'var(--md-text-muted)' }}>
                            {c.priority.toFixed(1)}
                          </td>
                          <td className="px-3 py-1.5" style={{ color: 'var(--md-text-muted)' }}>
                            {c.extensions.slice(0, 6).join(', ')}
                            {c.extensions.length > 6 ? ' …' : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MCP JSON-RPC live test */}
              <form onSubmit={handleRunMcp} className="space-y-2 border-t pt-4" style={{ borderColor: 'var(--md-border)' }}>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Test diretto endpoint MCP (POST /api/mcp — tool convert_to_markdown)</span>
                </div>
                <div className="flex gap-2">
                  <label htmlFor="mcp-uri-input" className="sr-only">
                    URI per test MCP
                  </label>
                  <input
                    id="mcp-uri-input"
                    type="text"
                    value={mcpUri}
                    onChange={(e) => setMcpUri(e.target.value)}
                    className="min-w-0 flex-1 rounded border px-3 py-1.5 font-mono text-xs"
                    style={{
                      backgroundColor: 'var(--md-surface-alt)',
                      borderColor: 'var(--md-border)',
                      color: 'var(--md-text)',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded px-3.5 py-1.5 text-xs font-medium whitespace-nowrap"
                    style={{ backgroundColor: 'var(--md-accent)', color: 'var(--md-accent-fg)' }}
                  >
                    Esegui MCP
                  </button>
                </div>
                {mcpOutput && (
                  <pre
                    className="max-h-40 overflow-auto rounded border p-2.5 font-mono text-xs"
                    style={{
                      backgroundColor: 'var(--md-surface-alt)',
                      borderColor: 'var(--md-border)',
                      color: 'var(--md-text)',
                    }}
                  >
                    {mcpOutput}
                  </pre>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
