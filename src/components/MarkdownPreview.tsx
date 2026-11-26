import React, { createContext, useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            li(props) {
              const { node, children, ...rest } = props;
              const lineNum = node?.position?.start?.line ?? 0;
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
                const directLine = props.node?.position?.start?.line ?? 0;
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
          {markdown || t.emptyDocPreview}
        </ReactMarkdown>
      </article>
    </div>
  );
};
