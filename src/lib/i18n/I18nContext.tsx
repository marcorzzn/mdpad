import React, { createContext, useContext } from 'react';
import type { LanguagePreference, SupportedLocale } from '../markitdown/types';
import { TRANSLATIONS, type TranslationBundle } from './translations';

export interface I18nContextValue {
  locale: SupportedLocale;
  languagePref: LanguagePreference;
  setLanguagePref: (pref: LanguagePreference) => void;
  t: TranslationBundle;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'it',
  languagePref: 'system',
  setLanguagePref: () => {},
  t: TRANSLATIONS.it,
});

export const I18nProvider: React.FC<{
  locale: SupportedLocale;
  languagePref: LanguagePreference;
  setLanguagePref: (pref: LanguagePreference) => void;
  children: React.ReactNode;
}> = ({ locale, languagePref, setLanguagePref, children }) => {
  return (
    <I18nContext.Provider
      value={{
        locale,
        languagePref,
        setLanguagePref,
        t: TRANSLATIONS[locale],
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
