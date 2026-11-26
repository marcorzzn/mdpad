import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Printer, X } from 'lucide-react';
import { useI18n } from '../lib/i18n/I18nContext';

interface PrintPreviewModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  markdown: string;
  assets: Record<string, string>;
}

type PaperSize = 'A4' | 'Letter';
type Orientation = 'portrait' | 'landscape';
type MarginPreset = 'narrow' | 'normal' | 'wide';

const MARGIN_MM: Record<MarginPreset, number> = {
  narrow: 12,
  normal: 20,
  wide: 28,
};

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  open,
  onClose,
  title,
  markdown,
  assets,
}) => {
  const { t, locale } = useI18n();
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [marginPreset, setMarginPreset] = useState<MarginPreset>('normal');
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeFooter, setIncludeFooter] = useState(true);
  const [previewScale, setPreviewScale] = useState<number>(85);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const styleId = 'mdpad-dynamic-print-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    const mm = MARGIN_MM[marginPreset];
    styleEl.textContent = `@page { size: ${paperSize} ${orientation}; margin: ${mm}mm; }`;
    return () => {
      styleEl?.remove();
    };
  }, [open, paperSize, orientation, marginPreset]);

  if (!open) return null;

  const isLandscape = orientation === 'landscape';
  const sheetWidthPx =
    paperSize === 'A4' ? (isLandscape ? 1122 : 794) : isLandscape ? 1056 : 816;
  const sheetMinHeightPx =
    paperSize === 'A4' ? (isLandscape ? 794 : 1122) : isLandscape ? 816 : 1056;
  const padPx = Math.round(MARGIN_MM[marginPreset] * 3.2);

  const dateStr = new Date().toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-preview-title"
      className="print-modal-root fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="print-modal-shell flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border shadow-2xl"
        style={{
          backgroundColor: 'var(--md-surface)',
          borderColor: 'var(--md-border)',
          color: 'var(--md-text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header (hidden in @media print) */}
        <div
          className="no-print flex items-center justify-between gap-4 border-b px-5 py-3"
          style={{ borderColor: 'var(--md-border)' }}
        >
          <div>
            <h2 id="print-preview-title" className="text-base font-semibold">
              {t.printPreviewTitle} — <span className="font-mono text-sm">{title}</span>
            </h2>
            <p className="text-xs" style={{ color: 'var(--md-text-muted)' }}>
              {t.printPreviewSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                backgroundColor: 'var(--md-accent)',
                color: 'var(--md-accent-fg)',
              }}
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{t.printNowBtn}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.closeLabel}
              className="rounded p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body: Left Controls + Right Paper Preview */}
        <div className="print-modal-body flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Controls Sidebar (hidden when printing) */}
          <aside
            className="no-print w-full shrink-0 space-y-4 overflow-y-auto border-b p-4 md:w-64 md:border-r md:border-b-0"
            style={{
              backgroundColor: 'var(--md-surface-alt)',
              borderColor: 'var(--md-border)',
            }}
          >
            <div>
              <p className="mb-1.5 text-xs font-medium" style={{ color: 'var(--md-text-muted)' }}>
                {t.printPaperSize}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {(['A4', 'Letter'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    aria-pressed={paperSize === sz}
                    onClick={() => setPaperSize(sz)}
                    className="rounded border px-2.5 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      borderColor: paperSize === sz ? 'var(--md-accent)' : 'var(--md-border)',
                      backgroundColor:
                        paperSize === sz ? 'var(--md-accent-soft)' : 'var(--md-surface)',
                      color: paperSize === sz ? 'var(--md-accent)' : 'var(--md-text)',
                    }}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium" style={{ color: 'var(--md-text-muted)' }}>
                {t.printOrientation}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'portrait', label: t.printPortrait },
                    { id: 'landscape', label: t.printLandscape },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={orientation === opt.id}
                    onClick={() => setOrientation(opt.id)}
                    className="rounded border px-2.5 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      borderColor: orientation === opt.id ? 'var(--md-accent)' : 'var(--md-border)',
                      backgroundColor:
                        orientation === opt.id ? 'var(--md-accent-soft)' : 'var(--md-surface)',
                      color: orientation === opt.id ? 'var(--md-accent)' : 'var(--md-text)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium" style={{ color: 'var(--md-text-muted)' }}>
                {t.printMargins}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'narrow', label: t.printMarginNarrow },
                    { id: 'normal', label: t.printMarginNormal },
                    { id: 'wide', label: t.printMarginWide },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={marginPreset === opt.id}
                    onClick={() => setMarginPreset(opt.id)}
                    className="rounded border px-2 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      borderColor:
                        marginPreset === opt.id ? 'var(--md-accent)' : 'var(--md-border)',
                      backgroundColor:
                        marginPreset === opt.id ? 'var(--md-accent-soft)' : 'var(--md-surface)',
                      color: marginPreset === opt.id ? 'var(--md-accent)' : 'var(--md-text)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium" style={{ color: 'var(--md-text-muted)' }}>
                {t.printScaleLabel}: {previewScale}%
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {[70, 85, 100].map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    aria-pressed={previewScale === sc}
                    onClick={() => setPreviewScale(sc)}
                    className="rounded border px-2 py-1 text-xs font-mono tabular-nums"
                    style={{
                      borderColor: previewScale === sc ? 'var(--md-accent)' : 'var(--md-border)',
                      backgroundColor:
                        previewScale === sc ? 'var(--md-accent-soft)' : 'var(--md-surface)',
                      color: previewScale === sc ? 'var(--md-accent)' : 'var(--md-text)',
                    }}
                  >
                    {sc}%
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--md-border)' }}>
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={includeHeader}
                  onChange={(e) => setIncludeHeader(e.target.checked)}
                  className="h-3.5 w-3.5 accent-blue-600"
                />
                <span>{t.printIncludeHeader}</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={includeFooter}
                  onChange={(e) => setIncludeFooter(e.target.checked)}
                  className="h-3.5 w-3.5 accent-blue-600"
                />
                <span>{t.printIncludeFooter}</span>
              </label>
            </div>
          </aside>

          {/* Paper Canvas */}
          <div
            className="print-canvas-wrap flex-1 overflow-auto p-6"
            style={{ backgroundColor: 'var(--md-bg)' }}
          >
            <div className="mx-auto flex justify-center">
              <div
                className="print-paper-sheet flex flex-col justify-between bg-white text-[#111827] shadow-lg"
                style={{
                  width: `${Math.round(sheetWidthPx * (previewScale / 100))}px`,
                  minHeight: `${Math.round(sheetMinHeightPx * (previewScale / 100))}px`,
                  padding: `${Math.round(padPx * (previewScale / 100))}px`,
                  fontSize: `${Math.round(14 * (previewScale / 100))}px`,
                  border: '1px solid #d1d5db',
                }}
              >
                <div>
                  {includeHeader && (
                    <div className="mb-4 flex items-center justify-between border-b border-[#e5e7eb] pb-2 text-[11px] text-[#6b7280]">
                      <span className="font-mono font-medium text-[#374151]">{title}</span>
                      <span>
                        {paperSize} · {isLandscape ? t.printLandscape : t.printPortrait}
                      </span>
                    </div>
                  )}

                  <article className="md-preview md-print-light">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        img(props) {
                          const rawSrc = props.src ?? '';
                          const resolved = assets[rawSrc] ?? rawSrc;
                          return (
                            <img
                              src={resolved}
                              alt={props.alt ?? 'Image'}
                              referrerPolicy="no-referrer"
                            />
                          );
                        },
                      }}
                    >
                      {markdown || t.emptyDocPreview}
                    </ReactMarkdown>
                  </article>
                </div>

                {includeFooter && (
                  <div className="mt-8 flex items-center justify-between border-t border-[#e5e7eb] pt-2 text-[11px] text-[#6b7280]">
                    <span>{t.printFooterPage}</span>
                    <span>{dateStr}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
