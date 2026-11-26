import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  markdown: string;
  zoom: number;
  assets: Record<string, string>;
  onToggleCheckbox: (checkboxIndex: number) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: () => void;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  markdown,
  zoom,
  assets,
  onToggleCheckbox,
  scrollRef,
  onScroll,
}) => {
  let checkboxCounter = 0;

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      aria-label="Anteprima documento Markdown"
      className="print-only-preview h-full overflow-y-auto px-6 py-5 sm:px-8"
      style={{
        backgroundColor: 'var(--md-surface)',
        fontSize: `${Math.round(15 * (zoom / 100))}px`,
      }}
    >
      <article className="md-preview mx-auto max-w-[78ch]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            input(props) {
              if (props.type === 'checkbox') {
                const idx = checkboxCounter++;
                return (
                  <input
                    type="checkbox"
                    checked={Boolean(props.checked)}
                    onChange={() => onToggleCheckbox(idx)}
                    aria-label={`Attività ${idx + 1}`}
                    className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
                  />
                );
              }
              return <input {...props} />;
            },
            img(props) {
              const rawSrc = props.src ?? '';
              const resolved = assets[rawSrc] ?? rawSrc;
              return (
                <img
                  src={resolved}
                  alt={props.alt ?? 'Immagine documento'}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              );
            },
            a(props) {
              return (
                <a
                  href={props.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {props.children}
                </a>
              );
            },
          }}
        >
          {markdown || '*Documento vuoto.*'}
        </ReactMarkdown>
      </article>
    </div>
  );
};
