import React from 'react';
import { Plus, X } from 'lucide-react';
import type { EditorTab } from '../data/seedTabs';
import { useI18n } from '../lib/i18n/I18nContext';

interface TabStripProps {
  tabs: EditorTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
}

export const TabStrip: React.FC<TabStripProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}) => {
  const { t } = useI18n();

  return (
    <div
      className="no-print flex items-end gap-1 overflow-x-auto border-b px-2 pt-1.5 select-none"
      style={{
        backgroundColor: 'var(--md-chrome)',
        borderColor: 'var(--md-border)',
      }}
      role="tablist"
      aria-label={t.tabsAriaLabel}
    >
      <div className="mr-2 flex shrink-0 items-center pb-1.5 pl-1">
        <span
          className="font-display text-sm font-bold tracking-tight whitespace-nowrap"
          style={{ color: 'var(--md-text)' }}
        >
          MDPad
        </span>
      </div>

      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isDirty = tab.content !== tab.savedContent;

        return (
          <div
            key={tab.id}
            role="presentation"
            className="group flex max-w-[220px] min-w-[120px] shrink-0 items-center rounded-t-md border-x border-t transition-colors"
            style={{
              backgroundColor: isActive ? 'var(--md-surface)' : 'transparent',
              borderColor: isActive ? 'var(--md-border)' : 'transparent',
              marginBottom: isActive ? '-1px' : '0px',
              paddingBottom: isActive ? '1px' : '0px',
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectTab(tab.id)}
              className="flex min-w-0 flex-1 items-center gap-1.5 px-3 py-1.5 text-left text-xs font-medium whitespace-nowrap"
              style={{
                color: isActive ? 'var(--md-text)' : 'var(--md-text-muted)',
              }}
            >
              <span className="truncate">{tab.title}</span>
              {isDirty && (
                <span
                  aria-label={t.tabModified}
                  title={t.tabUnsavedChanges}
                  className="shrink-0 font-mono text-xs font-bold"
                  style={{ color: 'var(--md-accent)' }}
                >
                  *
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              aria-label={`${t.closeTabLabel} ${tab.title}`}
              className="mr-1 rounded p-1 opacity-70 transition-opacity hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
              style={{ color: 'var(--md-text-muted)' }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onNewTab}
        aria-label={t.newTabLabel}
        title={t.newTabTitle}
        className="mb-1 ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10"
        style={{ color: 'var(--md-text-muted)' }}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
};
