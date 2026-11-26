import React, { useEffect, useRef, useState } from 'react';
import { FileUp, Globe, Play, X } from 'lucide-react';
import type { ConversionResponse, ConverterMetadata } from '../lib/markitdown/types';

interface SampleItem {
  filename: string;
  extension: string;
  sizeBytes: number;
}

interface MarkItDownModalProps {
  open: boolean;
  onClose: () => void;
  onOpenConverted: (conv: ConversionResponse) => void;
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<ModalTab>('import');
  const [uriInput, setUriInput] = useState('');
  const [keepDataUris, setKeepDataUris] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [converters, setConverters] = useState<ConverterMetadata[]>([]);
  const [converterFilter, setConverterFilter] = useState('');

  const [mcpUri, setMcpUri] = useState(
    'data:text/html;charset=utf-8,%3Ch1%3EMarkItDown%20MCP%3C%2Fh1%3E%3Cp%3ETest%20conversione%20via%20JSON-RPC%202.0.%3C%2Fp%3E'
  );
  const [mcpResponse, setMcpResponse] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    void fetch('/api/samples')
      .then((r) => r.json())
      .then((d) => setSamples(Array.isArray(d.samples) ? d.samples : []))
      .catch(() => {});
    void fetch('/api/converters')
      .then((r) => r.json())
      .then((d) => setConverters(Array.isArray(d.converters) ? d.converters : []))
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  const handleUploadFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('keepDataUris', String(keepDataUris));
      const resp = await fetch('/api/convert/file', { method: 'POST', body: form });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Conversione file fallita.');
      onOpenConverted(data as ConversionResponse);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore conversione file.');
    } finally {
      setBusy(false);
    }
  };

  const handleConvertUri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uriInput.trim()) {
      setError('Inserisci un URL http(s):// o un Data URI.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const resp = await fetch('/api/convert/uri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: uriInput.trim(), keepDataUris }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Conversione URI fallita.');
      onOpenConverted(data as ConversionResponse);
      onClose();
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
      const resp = await fetch(`/api/convert/sample/${encodeURIComponent(filename)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepDataUris }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Errore conversione campione.');
      onOpenConverted(data as ConversionResponse);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore conversione campione.');
    } finally {
      setBusy(false);
    }
  };

  const handleRunMcp = async () => {
    setBusy(true);
    setError(null);
    try {
      const resp = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'convert_to_markdown',
            arguments: { uri: mcpUri },
          },
        }),
      });
      const data = await resp.json();
      setMcpResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore richiesta MCP.');
    } finally {
      setBusy(false);
    }
  };

  const filteredConverters = converters.filter((c) => {
    const q = converterFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.extensions.some((e) => e.toLowerCase().includes(q))
    );
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="markitdown-modal-title"
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
            <h2 id="markitdown-modal-title" className="text-base font-semibold">
              Importa e Converti con Microsoft MarkItDown
            </h2>
            <p className="text-xs" style={{ color: 'var(--md-text-muted)' }}>
              Trasforma documenti Office, PDF, pagine HTML, RSS, EPUB, Notebook e archivi ZIP in
              schede Markdown modificabili in MDPad.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi finestra MarkItDown"
            className="rounded p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal tabs */}
        <div
          className="flex items-center gap-1 border-b px-5 py-2"
          style={{
            backgroundColor: 'var(--md-surface-alt)',
            borderColor: 'var(--md-border)',
          }}
          role="tablist"
        >
          {(
            [
              { id: 'import', label: 'Importa File o URL' },
              { id: 'samples', label: `Campioni Reali (${samples.length})` },
              { id: 'pipeline', label: `Convertitori (${converters.length}) & MCP` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className="rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                backgroundColor: tab === t.id ? 'var(--md-accent)' : 'transparent',
                color: tab === t.id ? 'var(--md-accent-fg)' : 'var(--md-text-muted)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {error && (
            <div
              role="alert"
              className="rounded-md border px-3.5 py-2.5 text-xs"
              style={{
                borderColor: '#dc2626',
                backgroundColor: 'rgba(220, 38, 38, 0.08)',
              }}
            >
              {error}
            </div>
          )}

          {tab === 'import' && (
            <div className="space-y-5">
              <div
                className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 text-center"
                style={{
                  borderColor: 'var(--md-border-strong)',
                  backgroundColor: 'var(--md-surface-alt)',
                }}
              >
                <FileUp className="mb-2 h-6 w-6" style={{ color: 'var(--md-accent)' }} />
                <p className="text-sm font-medium">
                  Carica qualsiasi documento da convertire in Markdown
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--md-text-muted)' }}>
                  PDF · DOCX · XLSX / XLS · PPTX · HTML · CSV · IPYNB · RSS / Atom · EPUB · ZIP ·
                  Immagini EXIF · JSON / TXT
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    void handleUploadFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                  className="mt-4 rounded-md px-4 py-2 text-xs font-medium disabled:opacity-50"
                  style={{ backgroundColor: 'var(--md-accent)', color: 'var(--md-accent-fg)' }}
                >
                  {busy ? 'Conversione in corso…' : 'Seleziona File dal Dispositivo'}
                </button>
              </div>

              <form onSubmit={handleConvertUri} className="space-y-2.5">
                <label htmlFor="markitdown-uri-input" className="block text-xs font-semibold">
                  Oppure converti un URL (http/https) o un Data URI
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="markitdown-uri-input"
                    type="text"
                    value={uriInput}
                    onChange={(e) => setUriInput(e.target.value)}
                    placeholder="https://example.com/articolo  oppure  data:text/html;base64,..."
                    className="flex-1 rounded-md border px-3 py-2 font-mono text-xs"
                    style={{
                      backgroundColor: 'var(--md-surface-alt)',
                      borderColor: 'var(--md-border)',
                      color: 'var(--md-text)',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex items-center justify-center gap-1.5 rounded-md border px-4 py-2 text-xs font-medium whitespace-nowrap hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
                    style={{ borderColor: 'var(--md-border)', color: 'var(--md-text)' }}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>Converti URI</span>
                  </button>
                </div>

                <label className="flex items-center gap-2 pt-1 text-xs" style={{ color: 'var(--md-text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={keepDataUris}
                    onChange={(e) => setKeepDataUris(e.target.checked)}
                    className="h-3.5 w-3.5"
                  />
                  <span>Mantieni i Data URI completi nell’output (--keep-data-uris)</span>
                </label>
              </form>
            </div>
          )}

          {tab === 'samples' && (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'var(--md-text-muted)' }}>
                Documenti reali tratti dalla suite di test ufficiale di Microsoft MarkItDown. Clicca
                su qualsiasi file per convertirlo sul server e aprirlo come nuova scheda in MDPad.
              </p>
              <div
                className="overflow-hidden rounded-md border"
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
                      <th className="px-3 py-2 font-semibold">Documento</th>
                      <th className="px-3 py-2 font-semibold">Formato</th>
                      <th className="px-3 py-2 text-right font-semibold">Dimensione</th>
                      <th className="px-3 py-2 text-right font-semibold">Azione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {samples.map((s) => (
                      <tr
                        key={s.filename}
                        className="border-b last:border-b-0"
                        style={{ borderColor: 'var(--md-border)' }}
                      >
                        <td className="px-3 py-2 font-mono">{s.filename}</td>
                        <td
                          className="px-3 py-2 font-mono uppercase"
                          style={{ color: 'var(--md-text-muted)' }}
                        >
                          {s.extension.replace('.', '')}
                        </td>
                        <td
                          className="px-3 py-2 text-right font-mono tabular-nums"
                          style={{ color: 'var(--md-text-muted)' }}
                        >
                          {formatBytes(s.sizeBytes)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleConvertSample(s.filename)}
                            className="rounded border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
                            style={{ borderColor: 'var(--md-border)', color: 'var(--md-accent)' }}
                          >
                            Converti in MDPad
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
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold">
                    Convertitori registrati (ordine di priorità MarkItDown)
                  </h3>
                  <input
                    type="search"
                    value={converterFilter}
                    onChange={(e) => setConverterFilter(e.target.value)}
                    placeholder="Filtra per formato (.pdf, .docx…)"
                    aria-label="Filtra convertitori"
                    className="rounded border px-2.5 py-1 text-xs"
                    style={{
                      backgroundColor: 'var(--md-surface-alt)',
                      borderColor: 'var(--md-border)',
                      color: 'var(--md-text)',
                    }}
                  />
                </div>
                <div
                  className="max-h-56 overflow-y-auto rounded-md border"
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
                        <th className="px-3 py-2 font-semibold">Convertitore</th>
                        <th className="px-3 py-2 font-semibold">Priorità</th>
                        <th className="px-3 py-2 font-semibold">Estensioni</th>
                        <th className="px-3 py-2 font-semibold">Descrizione</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredConverters.map((c) => (
                        <tr
                          key={c.name}
                          className="border-b last:border-b-0"
                          style={{ borderColor: 'var(--md-border)' }}
                        >
                          <td className="px-3 py-1.5 font-mono font-medium">{c.name}</td>
                          <td
                            className="px-3 py-1.5 font-mono tabular-nums"
                            style={{ color: 'var(--md-text-muted)' }}
                          >
                            {c.priority.toFixed(1)}
                          </td>
                          <td
                            className="px-3 py-1.5 font-mono text-[11px]"
                            style={{ color: 'var(--md-text-muted)' }}
                          >
                            {c.extensions.slice(0, 5).join(', ')}
                          </td>
                          <td
                            className="px-3 py-1.5 text-[11px]"
                            style={{ color: 'var(--md-text-muted)' }}
                          >
                            {c.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MCP JSON-RPC 2.0 Tester */}
              <div
                className="space-y-2.5 rounded-md border p-3.5"
                style={{
                  backgroundColor: 'var(--md-surface-alt)',
                  borderColor: 'var(--md-border)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold">
                      Endpoint MCP (POST /api/mcp — tool convert_to_markdown)
                    </h3>
                    <p className="text-[11px]" style={{ color: 'var(--md-text-muted)' }}>
                      Compatibile con markitdown-mcp via JSON-RPC 2.0 Streamable HTTP.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleRunMcp}
                    className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap"
                    style={{ backgroundColor: 'var(--md-accent)', color: 'var(--md-accent-fg)' }}
                  >
                    <Play className="h-3 w-3" />
                    <span>Esegui chiamata MCP</span>
                  </button>
                </div>

                <label htmlFor="mcp-uri-input" className="sr-only">
                  URI per test MCP
                </label>
                <input
                  id="mcp-uri-input"
                  type="text"
                  value={mcpUri}
                  onChange={(e) => setMcpUri(e.target.value)}
                  className="w-full rounded border px-2.5 py-1.5 font-mono text-xs"
                  style={{
                    backgroundColor: 'var(--md-surface)',
                    borderColor: 'var(--md-border)',
                    color: 'var(--md-text)',
                  }}
                />

                {mcpResponse && (
                  <pre
                    className="max-h-40 overflow-auto rounded border p-2.5 font-mono text-[11px]"
                    style={{
                      backgroundColor: 'var(--md-surface)',
                      borderColor: 'var(--md-border)',
                      color: 'var(--md-text)',
                    }}
                  >
                    {mcpResponse}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
