import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useI18n } from '../lib/i18n/I18nContext';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { locale } = useI18n();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const isIt = locale === 'it';

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`flex items-center gap-1.5 rounded-md border font-medium whitespace-nowrap transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
          compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        }`}
        style={{
          borderColor: 'var(--md-accent)',
          color: 'var(--md-accent)',
          backgroundColor: 'var(--md-accent-soft)',
        }}
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        <span>{isIt ? 'Installa App (PWA)' : 'Install App (PWA)'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-md border font-medium whitespace-nowrap transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
            compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
          }`}
          style={{
            borderColor: 'var(--md-border)',
            color: 'var(--md-text)',
          }}
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span>{isIt ? 'Installa su iOS/iPadOS' : 'Install on iOS/iPadOS'}</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-lg border p-5 shadow-2xl"
              style={{
                backgroundColor: 'var(--md-surface)',
                borderColor: 'var(--md-border)',
                color: 'var(--md-text)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold">
                {isIt ? 'Installa MDPad su iPhone / iPad' : 'Install MDPad on iPhone / iPad'}
              </h3>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--md-text-muted)' }}>
                {isIt ? (
                  <>
                    1. Tocca il pulsante <strong>Condividi</strong> nella barra di Safari.
                    <br />
                    2. Scorri e tocca <strong>Aggiungi alla schermata Home</strong>.
                  </>
                ) : (
                  <>
                    1. Tap the <strong>Share</strong> button in Safari&apos;s toolbar.
                    <br />
                    2. Scroll down and tap <strong>Add to Home Screen</strong>.
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-md py-1.5 text-xs font-medium"
                style={{
                  backgroundColor: 'var(--md-accent)',
                  color: 'var(--md-accent-fg)',
                }}
              >
                {isIt ? 'Chiudi' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
