import React, { createContext, useContext, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { extractFrontMatter } from '../lib/editor/renotepadOps';
import { useI18n } from '../lib/i18n/I18nContext';

const TaskLineContext = createContext<number>(0);

interface MarkdownPreviewProps {
  markdown: string;
  zoom: number;
  assets: Record<string, string>;
  onToggleCheckboxLine: (lineNumber: number) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: () => void;
}

const ALERT_STYLES: Record<
  string,
  { label: string; border: string; bg: string; titleColor: string }
> = {
  NOTE: {
    label: 'Note',
    border: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.08)',
    titleColor: '#3b82f6',
  },
  TIP: {
    label: 'Tip',
    border: '#10b981',
    bg: 'rgba(16, 185, 129, 0.08)',
    titleColor: '#10b981',
  },
  IMPORTANT: {
    label: 'Important',
    border: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.08)',
    titleColor: '#8b5cf6',
  },
  WARNING: {
    label: 'Warning',
    border: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.1)',
    titleColor: '#d97706',
  },
  CAUTION: {
    label: 'Caution',
    border: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.08)',
    titleColor: '#ef4444',
  },
};

function extractPlainText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractPlainText).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(children)) {
    return extractPlainText(children.props.children);
  }
  return '';
}

const TaskCheckbox: React.FC<{
  checked: boolean;
  directLine: number;
  onToggle: (lineNumber: number) => void;
}> = ({ checked, directLine, onToggle }) => {
  const parentLine = useContext(TaskLineContext);
  const { t } = useI18n();
  const lineNum = directLine > 0 ? directLine : parentLine;
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={() => {
        if (lineNum > 0) onToggle(lineNum);
      }}
      aria-label={lineNum > 0 ? `${t.taskRowAria} ${lineNum}` : t.taskGenericAria}
      className="h-4 w-4 cursor-pointer accent-blue-600"
    />
  );
};

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  markdown,
  zoom,
  assets,
  onToggleCheckboxLine,
  scrollRef,
  onScroll,
}) => {
  const { t } = useI18n();
  const parsedFrontMatter = useMemo(() => extractFrontMatter(markdown), [markdown]);
  const lineOffset = useMemo(() => {
    if (!parsedFrontMatter) return 0;
    const bodyLines = parsedFrontMatter.body.split('\n').length;
    const totalLines = markdown.replace(/\r\n/g, '\n').split('\n').length;
    return Math.max(0, totalLines - bodyLines);
  }, [markdown, parsedFrontMatter]);

  const bodyMarkdown = parsedFrontMatter ? parsedFrontMatter.body : markdown;

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      aria-label={t.previewArticleAria}
      className="print-only-preview h-full overflow-y-auto px-6 py-5 sm:px-8"
      style={{
        backgroundColor: 'var(--md-surface)',
        fontSize: `${Math.round(15 * (zoom / 100))}px`,
      }}
    >
      <article className="md-preview mx-auto max-w-[78ch]">
        {parsedFrontMatter && parsedFrontMatter.entries.length > 0 && (
          <div
            aria-label="Front matter"
            className="mb-5 overflow-x-auto rounded-md border"
            style={{
              borderColor: 'var(--md-border)',
              backgroundColor: 'var(--md-surface-alt)',
            }}
          >
            <table className="m-0 w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--md-border)' }}>
                  {parsedFrontMatter.entries.map((entry) => (
                    <th
                      key={entry.key}
                      className="px-3 py-1.5 font-semibold"
                      style={{ color: 'var(--md-text-muted)' }}
                    >
                      {entry.key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {parsedFrontMatter.entries.map((entry) => (
                    <td key={entry.key} className="px-3 py-1.5 font-mono text-xs">
                      {entry.value || '—'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            blockquote(props) {
              const rawText = extractPlainText(props.children).trim();
              const alertMatch = rawText.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*([\s\S]*)$/i);
              if (alertMatch) {
                const kind = alertMatch[1].toUpperCase();
                const style = ALERT_STYLES[kind] ?? ALERT_STYLES.NOTE;
                return (
                  <div
                    role="note"
                    className="my-4 rounded-r-md border-l-4 px-4 py-2.5 text-sm"
                    style={{
                      borderLeftColor: style.border,
                      backgroundColor: style.bg,
                    }}
                  >
                    <p
                      className="mb-1 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: style.titleColor }}
                    >
                      {style.label}
                    </p>
                    <p className="m-0 whitespace-pre-line">{alertMatch[2].trim()}</p>
                  </div>
                );
              }
              return <blockquote>{props.children}</blockquote>;
            },
            li(props) {
              const { node, children, ...rest } = props;
              const rawLine = node?.position?.start?.line ?? 0;
              const lineNum = rawLine > 0 ? rawLine + lineOffset : 0;
              return (
                <li {...rest}>
                  <TaskLineContext.Provider value={lineNum}>
                    {children}
                  </TaskLineContext.Provider>
                </li>
              );
            },
            input(props) {
              if (props.type === 'checkbox') {
                const rawLine = props.node?.position?.start?.line ?? 0;
                const directLine = rawLine > 0 ? rawLine + lineOffset : 0;
                return (
                  <TaskCheckbox
                    checked={Boolean(props.checked)}
                    directLine={directLine}
                    onToggle={onToggleCheckboxLine}
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
                  alt={props.alt ?? 'Image'}
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
          {bodyMarkdown || t.emptyDocPreview}
        </ReactMarkdown>
      </article>
    </div>
  );
};
