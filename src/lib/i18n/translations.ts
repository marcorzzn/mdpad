import type { LanguagePreference, SupportedLocale } from '../markitdown/types';

export const SUPPORTED_LOCALES: ReadonlyArray<{
  code: SupportedLocale;
  nativeName: string;
}> = [
  { code: 'it', nativeName: 'Italiano' },
  { code: 'en', nativeName: 'English' },
  { code: 'es', nativeName: 'Español' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'de', nativeName: 'Deutsch' },
];

const SUPPORTED_SET: ReadonlySet<string> = new Set(SUPPORTED_LOCALES.map((l) => l.code));

export function resolveLocale(
  pref: LanguagePreference,
  navigatorLanguages?: readonly string[]
): SupportedLocale {
  if (pref !== 'system' && SUPPORTED_SET.has(pref)) {
    return pref;
  }
  const candidates =
    navigatorLanguages && navigatorLanguages.length > 0
      ? navigatorLanguages
      : typeof navigator !== 'undefined'
        ? navigator.languages && navigator.languages.length > 0
          ? navigator.languages
          : [navigator.language]
        : ['it'];

  for (const raw of candidates) {
    if (!raw) continue;
    const base = raw.toLowerCase().split(/[-_]/)[0];
    if (SUPPORTED_SET.has(base)) {
      return base as SupportedLocale;
    }
  }
  return 'en';
}

export interface TranslationBundle {
  // General & Tabs
  appTitle: string;
  untitledPrefix: string;
  untitledSingle: string;
  tabsAriaLabel: string;
  tabModified: string;
  tabUnsavedChanges: string;
  closeTabLabel: string;
  newTabLabel: string;
  newTabTitle: string;
  closeLabel: string;
  cancelLabel: string;

  // Menu headers
  menuFile: string;
  menuEdit: string;
  menuFormat: string;
  menuView: string;
  menuTools: string;
  menuHelp: string;
  mainMenuAria: string;

  // File menu
  fileNewTab: string;
  fileOpenLocal: string;
  fileImportMarkItDown: string;
  fileSaveMd: string;
  fileExportHtml: string;
  filePrintPreview: string;
  filePrintPdf: string;
  fileCloseTab: string;

  // Edit menu
  editFind: string;
  editReplace: string;
  editInsertTable: string;
  editClearFormatting: string;
  editInsertDateTime: string;

  // Format menu
  formatWordWrap: string;
  formatEncodingUtf8: string;
  formatEncodingUtf8Bom: string;
  formatEncodingAnsi: string;
  formatEolCrlf: string;
  formatEolLf: string;

  // View menu
  viewSourceOnly: string;
  viewSplit: string;
  viewPreviewOnly: string;
  viewOutline: string;
  viewStatusBar: string;
  viewThemeSystem: string;
  viewThemeLight: string;
  viewThemeDark: string;
  viewThemeHighContrast: string;
  viewLanguageSystem: string;

  // Tools & Help menu
  toolsFolderPostIt: string;
  toolsMarkItDown: string;
  toolsCrossPlatform: string;
  toolsSessionRestore: string;
  toolsAiAssistant: string;
  helpShortcutsGuide: string;

  // Top bar right controls
  viewModeGroupAria: string;
  modeSourceShort: string;
  modeSplitShort: string;
  modePreviewShort: string;
  toggleNightModeAria: string;
  nightModeTooltipOn: string;
  nightModeTooltipOff: string;
  folderPostItBtn: string;

  // Formatting bar
  formattingBarAria: string;
  outlineBtn: string;
  outlineAria: string;
  outlineTooltip: string;
  h1Label: string;
  h2Label: string;
  boldLabel: string;
  italicLabel: string;
  strikeLabel: string;
  bulletListLabel: string;
  checklistLabel: string;
  codeBlockLabel: string;
  tableBtn: string;
  tableAria: string;
  clearFmtLabel: string;
  findBtn: string;
  findAria: string;
  printPreviewBtn: string;
  printPreviewTooltip: string;
  importMarkItDownBtn: string;
  importMarkItDownAria: string;
  mobileViewPrefix: string;
  aiWrite: string;
  aiRewrite: string;
  aiSummarize: string;
  aiWorking: string;

  // Editor & Preview
  editorRegionAria: string;
  previewRegionAria: string;
  previewArticleAria: string;
  editorPlaceholder: string;
  emptyDocPreview: string;
  taskRowAria: string;
  taskGenericAria: string;

  // Status bar
  statusBarAria: string;
  wordsLabel: string;
  readOnlyLabel: string;
  autoSaveLabel: string;
  autoSaveReady: string;
  zoomOutAria: string;
  zoomInAria: string;
  zoomResetTitle: string;
  eolToggleTitle: string;
  encodingAria: string;

  // Outline panel
  outlineTitle: string;
  outlineCloseAria: string;
  outlineEmpty: string;
  outlineNavAria: string;

  // Find & Replace
  findRegionAria: string;
  findPlaceholder: string;
  findCaseSensitive: string;
  findPrevAria: string;
  findNextAria: string;
  findCloseAria: string;
  findShowReplace: string;
  findHideReplace: string;
  findWildcardHint: string;
  replacePlaceholder: string;
  replaceOneBtn: string;
  replaceAllBtn: string;

  // Table dialog
  tableDialogTitle: string;
  tableRowsLabel: string;
  tableColsLabel: string;
  tablePreviewHint: string;
  tableInsertBtn: string;

  // Print Preview modal
  printPreviewTitle: string;
  printPreviewSubtitle: string;
  printPaperSize: string;
  printOrientation: string;
  printPortrait: string;
  printLandscape: string;
  printMargins: string;
  printMarginNarrow: string;
  printMarginNormal: string;
  printMarginWide: string;
  printIncludeHeader: string;
  printIncludeFooter: string;
  printScaleLabel: string;
  printNowBtn: string;
  printFooterPage: string;

  // CrossPlatform & Preferences modal
  prefsTitle: string;
  prefsSubtitle: string;
  prefsSectionTitle: string;
  prefsThemeLabel: string;
  prefsLanguageLabel: string;
  prefsLanguageSystemOption: string;
  prefsAutoSaveTitle: string;
  prefsAutoSaveDesc: string;
  prefsSessionRestoreTitle: string;
  prefsSessionRestoreDesc: string;
  prefsAiTitle: string;
  prefsAiDesc: string;
  prefsMatrixTitle: string;
  prefsKitTitle: string;
  prefsGhActionsNote: string;
  prefsShortcutsTitle: string;

  // Notices
  noticeSaved: string;
  noticeExportedHtml: string;
  noticeAutoSaved: string;
  noticeRecoveredAutoSave: string;
  noticeReplacedCount: string;
}

export const TRANSLATIONS: Record<SupportedLocale, TranslationBundle> = {
  it: {
    appTitle: 'MDPad — Blocco Note Markdown',
    untitledPrefix: 'Senza titolo',
    untitledSingle: 'Senza titolo.md',
    tabsAriaLabel: 'Schede documenti aperti',
    tabModified: 'Modificato',
    tabUnsavedChanges: 'Modifiche non salvate',
    closeTabLabel: 'Chiudi scheda',
    newTabLabel: 'Nuova scheda',
    newTabTitle: 'Nuova scheda (Ctrl+N)',
    closeLabel: 'Chiudi',
    cancelLabel: 'Annulla',

    menuFile: 'File',
    menuEdit: 'Modifica',
    menuFormat: 'Formato',
    menuView: 'Visualizza',
    menuTools: 'Strumenti',
    menuHelp: 'Aiuto',
    mainMenuAria: 'Menu principale',

    fileNewTab: 'Nuova scheda',
    fileOpenLocal: 'Apri file .md / .txt…',
    fileImportMarkItDown: 'Importa documento con MarkItDown…',
    fileSaveMd: 'Salva come .md',
    fileExportHtml: 'Esporta HTML pulito',
    filePrintPreview: 'Anteprima di stampa…',
    filePrintPdf: 'Stampa / Salva in PDF',
    fileCloseTab: 'Chiudi scheda corrente',

    editFind: 'Trova (supporta * e ?)',
    editReplace: 'Sostituisci…',
    editInsertTable: 'Inserisci Tabella…',
    editClearFormatting: 'Cancella formattazione Markdown',
    editInsertDateTime: 'Inserisci data e ora',

    formatWordWrap: 'A capo automatico',
    formatEncodingUtf8: 'Codifica: UTF-8',
    formatEncodingUtf8Bom: 'Codifica: UTF-8 con BOM',
    formatEncodingAnsi: 'Codifica: ANSI (Windows-1252)',
    formatEolCrlf: 'Fine riga: Windows (CRLF)',
    formatEolLf: 'Fine riga: Unix / macOS / Linux (LF)',

    viewSourceOnly: 'Solo Sorgente',
    viewSplit: 'Vista Divisa (Scroll-Sync)',
    viewPreviewOnly: 'Solo Lettura / Anteprima',
    viewOutline: 'Struttura Documento (Outline)',
    viewStatusBar: 'Barra di Stato',
    viewThemeSystem: 'Tema: Segui sistema',
    viewThemeLight: 'Tema Chiaro',
    viewThemeDark: 'Modalità notturna (Scuro)',
    viewThemeHighContrast: 'Tema Contrasto Elevato (Win)',
    viewLanguageSystem: 'Lingua: Segui sistema',

    toolsFolderPostIt: 'Post-it Cartelle (MarkItDown)…',
    toolsMarkItDown: 'Convertitore MarkItDown (File, URL, MCP)…',
    toolsCrossPlatform: 'Preferenze, Lingua & Kit Windows/GitHub…',
    toolsSessionRestore: 'Ripristino automatico sessione',
    toolsAiAssistant: 'Assistente AI opzionale (Ctrl+Q/D/M)',
    helpShortcutsGuide: 'Scorciatoie, Kit Win7–11 & GitHub Actions',

    viewModeGroupAria: 'Modalità di visualizzazione',
    modeSourceShort: 'Sorgente',
    modeSplitShort: 'Divisa',
    modePreviewShort: 'Anteprima',
    toggleNightModeAria: 'Attiva o disattiva modalità notturna',
    nightModeTooltipOn: 'Passa al tema chiaro',
    nightModeTooltipOff: 'Attiva modalità notturna',
    folderPostItBtn: 'Post-it Cartelle',

    formattingBarAria: 'Barra di formattazione Markdown',
    outlineBtn: 'Struttura',
    outlineAria: 'Mostra o nascondi struttura documento',
    outlineTooltip: 'Struttura documento (Ctrl+Shift+O)',
    h1Label: 'Titolo 1',
    h2Label: 'Titolo 2',
    boldLabel: 'Grassetto',
    italicLabel: 'Corsivo',
    strikeLabel: 'Barrato',
    bulletListLabel: 'Elenco puntato',
    checklistLabel: 'Inserisci checklist',
    codeBlockLabel: 'Blocco di codice',
    tableBtn: 'Tabella',
    tableAria: 'Inserisci tabella',
    clearFmtLabel: 'Cancella formattazione',
    findBtn: 'Trova',
    findAria: 'Trova e sostituisci',
    printPreviewBtn: 'Stampa',
    printPreviewTooltip: 'Anteprima di stampa e PDF (Ctrl+Shift+P)',
    importMarkItDownBtn: 'Importa MarkItDown',
    importMarkItDownAria: 'Importa con MarkItDown',
    mobileViewPrefix: 'Vista',
    aiWrite: 'Scrivi',
    aiRewrite: 'Riscrivi',
    aiSummarize: 'Riassumi',
    aiWorking: 'Elaborazione…',

    editorRegionAria: 'Editor sorgente Markdown',
    previewRegionAria: 'Anteprima renderizzata',
    previewArticleAria: 'Anteprima documento Markdown',
    editorPlaceholder:
      'Inizia a scrivere in Markdown… (premi F6 per cambiare vista, Ctrl+T per una tabella, Ctrl+Shift+P per anteprima di stampa)',
    emptyDocPreview: '*Documento vuoto.*',
    taskRowAria: 'Attività riga',
    taskGenericAria: 'Attività',

    statusBarAria: 'Barra di stato',
    wordsLabel: 'parole',
    readOnlyLabel: 'Sola lettura',
    autoSaveLabel: 'Auto-salvataggio',
    autoSaveReady: 'Auto-save 30s',
    zoomOutAria: 'Riduci zoom',
    zoomInAria: 'Aumenta zoom',
    zoomResetTitle: 'Ripristina zoom al 100%',
    eolToggleTitle: 'Cambia terminatore di riga (Windows CRLF / Unix LF)',
    encodingAria: 'Codifica caratteri',

    outlineTitle: 'Struttura documento',
    outlineCloseAria: 'Chiudi pannello struttura',
    outlineEmpty: 'Nessun titolo trovato. Usa #, ## o ### per creare una struttura navigabile.',
    outlineNavAria: 'Indice dei titoli',

    findRegionAria: 'Trova e sostituisci',
    findPlaceholder: 'Trova (* e ? supportati)…',
    findCaseSensitive: 'Distingui maiuscole e minuscole',
    findPrevAria: 'Risultato precedente',
    findNextAria: 'Risultato successivo',
    findCloseAria: 'Chiudi barra ricerca',
    findShowReplace: 'Mostra sostituisci',
    findHideReplace: 'Nascondi sostituzione',
    findWildcardHint: 'Wildcard: * (qualsiasi) · ? (1 carattere)',
    replacePlaceholder: 'Sostituisci con…',
    replaceOneBtn: 'Sostituisci',
    replaceAllBtn: 'Tutti',

    tableDialogTitle: 'Inserisci Tabella Markdown',
    tableRowsLabel: 'Righe di dati (1–20)',
    tableColsLabel: 'Colonne (1–12)',
    tablePreviewHint: 'Anteprima sintassi (usa il tasto Tab tra le celle per formattare automaticamente):',
    tableInsertBtn: 'Inserisci Tabella',

    printPreviewTitle: 'Anteprima di stampa',
    printPreviewSubtitle: 'Verifica impaginazione, margini e orientamento prima di stampare o salvare in PDF.',
    printPaperSize: 'Formato carta',
    printOrientation: 'Orientamento',
    printPortrait: 'Verticale',
    printLandscape: 'Orizzontale',
    printMargins: 'Margini',
    printMarginNarrow: 'Stretti',
    printMarginNormal: 'Normali',
    printMarginWide: 'Ampi',
    printIncludeHeader: 'Mostra intestazione (nome file)',
    printIncludeFooter: 'Mostra piè di pagina (data)',
    printScaleLabel: 'Scala anteprima',
    printNowBtn: 'Stampa / Salva PDF',
    printFooterPage: 'MDPad — Documento Markdown',

    prefsTitle: 'Preferenze, Lingua, Compatibilità & Build GitHub Actions',
    prefsSubtitle: 'Impostazioni locali, multilingue con rilevamento sistema, modalità notturna e pacchetti ZIP / EXE.',
    prefsSectionTitle: 'Impostazioni MDPad (tutto locale, zero telemetria)',
    prefsThemeLabel: 'Tema e Modalità notturna',
    prefsLanguageLabel: 'Lingua interfaccia',
    prefsLanguageSystemOption: 'Segui lingua di sistema',
    prefsAutoSaveTitle: 'Auto-salvataggio attivo (ogni 30s)',
    prefsAutoSaveDesc: 'Serializza automaticamente la scheda attiva in localStorage ogni 30 secondi contro crash o blackout.',
    prefsSessionRestoreTitle: 'Ripristino automatico sessione',
    prefsSessionRestoreDesc: 'Salva le schede aperte localmente nel browser per riaprirle al prossimo avvio.',
    prefsAiTitle: 'Assistente AI opzionale',
    prefsAiDesc: 'Disattivato di default. Abilita Scrivi (Ctrl+Q), Riscrivi (Ctrl+D) e Riassumi (Ctrl+M).',
    prefsMatrixTitle: 'Compatibilità universale delle note e dei Post-it cartella',
    prefsKitTitle: 'Kit Windows, CLI MarkItDown & Build GitHub Actions (ZIP / .EXE)',
    prefsGhActionsNote:
      'GitHub Actions compila l’app desktop Windows autonoma: MDPad-Setup.exe (installer 1 clic con associazione file .md), MDPad-Portable.exe (eseguibile singolo) e MDPad-Windows-x64.zip. Nessun server o Node.js richiesto: apri e lavori come Blocco Note.',
    prefsShortcutsTitle: 'Scorciatoie da tastiera (stile Blocco Note)',

    noticeSaved: 'Salvato',
    noticeExportedHtml: 'Esportato file HTML pulito.',
    noticeAutoSaved: 'Auto-salvato alle',
    noticeRecoveredAutoSave: 'Ripristinato auto-salvataggio della scheda attiva.',
    noticeReplacedCount: 'occorrenze sostituite.',
  },

  en: {
    appTitle: 'MDPad — Markdown Notepad',
    untitledPrefix: 'Untitled',
    untitledSingle: 'Untitled.md',
    tabsAriaLabel: 'Open document tabs',
    tabModified: 'Modified',
    tabUnsavedChanges: 'Unsaved changes',
    closeTabLabel: 'Close tab',
    newTabLabel: 'New tab',
    newTabTitle: 'New tab (Ctrl+N)',
    closeLabel: 'Close',
    cancelLabel: 'Cancel',

    menuFile: 'File',
    menuEdit: 'Edit',
    menuFormat: 'Format',
    menuView: 'View',
    menuTools: 'Tools',
    menuHelp: 'Help',
    mainMenuAria: 'Main menu',

    fileNewTab: 'New tab',
    fileOpenLocal: 'Open .md / .txt file…',
    fileImportMarkItDown: 'Import document with MarkItDown…',
    fileSaveMd: 'Save as .md',
    fileExportHtml: 'Export clean HTML',
    filePrintPreview: 'Print Preview…',
    filePrintPdf: 'Print / Save as PDF',
    fileCloseTab: 'Close current tab',

    editFind: 'Find (supports * and ?)',
    editReplace: 'Replace…',
    editInsertTable: 'Insert Table…',
    editClearFormatting: 'Clear Markdown formatting',
    editInsertDateTime: 'Insert date and time',

    formatWordWrap: 'Word wrap',
    formatEncodingUtf8: 'Encoding: UTF-8',
    formatEncodingUtf8Bom: 'Encoding: UTF-8 with BOM',
    formatEncodingAnsi: 'Encoding: ANSI (Windows-1252)',
    formatEolCrlf: 'Line ending: Windows (CRLF)',
    formatEolLf: 'Line ending: Unix / macOS / Linux (LF)',

    viewSourceOnly: 'Source Only',
    viewSplit: 'Split View (Scroll-Sync)',
    viewPreviewOnly: 'Read Only / Preview',
    viewOutline: 'Document Outline',
    viewStatusBar: 'Status Bar',
    viewThemeSystem: 'Theme: Follow System',
    viewThemeLight: 'Light Theme',
    viewThemeDark: 'Night Mode (Dark)',
    viewThemeHighContrast: 'High Contrast Theme (Win)',
    viewLanguageSystem: 'Language: Follow System',

    toolsFolderPostIt: 'Folder Post-it (MarkItDown)…',
    toolsMarkItDown: 'MarkItDown Converter (File, URL, MCP)…',
    toolsCrossPlatform: 'Preferences, Language & Windows/GitHub Kit…',
    toolsSessionRestore: 'Automatic session restore',
    toolsAiAssistant: 'Optional AI Assistant (Ctrl+Q/D/M)',
    helpShortcutsGuide: 'Shortcuts, Win7–11 Kit & GitHub Actions',

    viewModeGroupAria: 'View mode',
    modeSourceShort: 'Source',
    modeSplitShort: 'Split',
    modePreviewShort: 'Preview',
    toggleNightModeAria: 'Toggle night mode',
    nightModeTooltipOn: 'Switch to light theme',
    nightModeTooltipOff: 'Enable night mode',
    folderPostItBtn: 'Folder Post-it',

    formattingBarAria: 'Markdown formatting toolbar',
    outlineBtn: 'Outline',
    outlineAria: 'Toggle document outline',
    outlineTooltip: 'Document outline (Ctrl+Shift+O)',
    h1Label: 'Heading 1',
    h2Label: 'Heading 2',
    boldLabel: 'Bold',
    italicLabel: 'Italic',
    strikeLabel: 'Strikethrough',
    bulletListLabel: 'Bullet list',
    checklistLabel: 'Insert checklist',
    codeBlockLabel: 'Code block',
    tableBtn: 'Table',
    tableAria: 'Insert table',
    clearFmtLabel: 'Clear formatting',
    findBtn: 'Find',
    findAria: 'Find and replace',
    printPreviewBtn: 'Print',
    printPreviewTooltip: 'Print preview & PDF (Ctrl+Shift+P)',
    importMarkItDownBtn: 'Import MarkItDown',
    importMarkItDownAria: 'Import with MarkItDown',
    mobileViewPrefix: 'View',
    aiWrite: 'Write',
    aiRewrite: 'Rewrite',
    aiSummarize: 'Summarize',
    aiWorking: 'Working…',

    editorRegionAria: 'Markdown source editor',
    previewRegionAria: 'Rendered preview',
    previewArticleAria: 'Markdown document preview',
    editorPlaceholder:
      'Start writing in Markdown… (press F6 to switch views, Ctrl+T for a table, Ctrl+Shift+P for print preview)',
    emptyDocPreview: '*Empty document.*',
    taskRowAria: 'Task line',
    taskGenericAria: 'Task',

    statusBarAria: 'Status bar',
    wordsLabel: 'words',
    readOnlyLabel: 'Read-only',
    autoSaveLabel: 'Auto-saved',
    autoSaveReady: 'Auto-save 30s',
    zoomOutAria: 'Zoom out',
    zoomInAria: 'Zoom in',
    zoomResetTitle: 'Reset zoom to 100%',
    eolToggleTitle: 'Switch line ending (Windows CRLF / Unix LF)',
    encodingAria: 'Character encoding',

    outlineTitle: 'Document outline',
    outlineCloseAria: 'Close outline panel',
    outlineEmpty: 'No headings found. Use #, ## or ### to create a navigable outline.',
    outlineNavAria: 'Heading index',

    findRegionAria: 'Find and replace',
    findPlaceholder: 'Find (* and ? supported)…',
    findCaseSensitive: 'Match case',
    findPrevAria: 'Previous match',
    findNextAria: 'Next match',
    findCloseAria: 'Close find bar',
    findShowReplace: 'Show replace',
    findHideReplace: 'Hide replace',
    findWildcardHint: 'Wildcards: * (any) · ? (1 char)',
    replacePlaceholder: 'Replace with…',
    replaceOneBtn: 'Replace',
    replaceAllBtn: 'All',

    tableDialogTitle: 'Insert Markdown Table',
    tableRowsLabel: 'Data rows (1–20)',
    tableColsLabel: 'Columns (1–12)',
    tablePreviewHint: 'Syntax preview (press Tab between cells to auto-align columns):',
    tableInsertBtn: 'Insert Table',

    printPreviewTitle: 'Print Preview',
    printPreviewSubtitle: 'Inspect layout, margins, and orientation before printing or saving to PDF.',
    printPaperSize: 'Paper size',
    printOrientation: 'Orientation',
    printPortrait: 'Portrait',
    printLandscape: 'Landscape',
    printMargins: 'Margins',
    printMarginNarrow: 'Narrow',
    printMarginNormal: 'Normal',
    printMarginWide: 'Wide',
    printIncludeHeader: 'Show header (file name)',
    printIncludeFooter: 'Show footer (date)',
    printScaleLabel: 'Preview scale',
    printNowBtn: 'Print / Save PDF',
    printFooterPage: 'MDPad — Markdown Document',

    prefsTitle: 'Preferences, Language, Compatibility & GitHub Actions',
    prefsSubtitle: 'Local settings, multilingual with system detection, night mode, and ZIP / EXE release builds.',
    prefsSectionTitle: 'MDPad Settings (100% local, zero telemetry)',
    prefsThemeLabel: 'Theme & Night Mode',
    prefsLanguageLabel: 'Interface language',
    prefsLanguageSystemOption: 'Follow system language',
    prefsAutoSaveTitle: 'Active tab auto-save (every 30s)',
    prefsAutoSaveDesc: 'Serializes the active tab content to localStorage every 30 seconds to prevent data loss.',
    prefsSessionRestoreTitle: 'Automatic session restore',
    prefsSessionRestoreDesc: 'Saves open tabs locally in the browser to restore on next launch.',
    prefsAiTitle: 'Optional AI Assistant',
    prefsAiDesc: 'Disabled by default. Enables Write (Ctrl+Q), Rewrite (Ctrl+D), and Summarize (Ctrl+M).',
    prefsMatrixTitle: 'Cross-platform compatibility for notes and folder Post-its',
    prefsKitTitle: 'Windows Kit, MarkItDown CLI & GitHub Actions (ZIP / .EXE)',
    prefsGhActionsNote:
      'GitHub Actions builds the standalone Windows desktop app: MDPad-Setup.exe (one-click installer with .md association), MDPad-Portable.exe (single executable), and MDPad-Windows-x64.zip. Zero server or Node.js required — just open and write like Notepad.',
    prefsShortcutsTitle: 'Keyboard shortcuts (Notepad style)',

    noticeSaved: 'Saved',
    noticeExportedHtml: 'Exported clean HTML file.',
    noticeAutoSaved: 'Auto-saved at',
    noticeRecoveredAutoSave: 'Recovered auto-saved active tab.',
    noticeReplacedCount: 'occurrences replaced.',
  },

  es: {
    appTitle: 'MDPad — Bloc de Notas Markdown',
    untitledPrefix: 'Sin título',
    untitledSingle: 'Sin título.md',
    tabsAriaLabel: 'Pestañas de documentos abiertos',
    tabModified: 'Modificado',
    tabUnsavedChanges: 'Cambios sin guardar',
    closeTabLabel: 'Cerrar pestaña',
    newTabLabel: 'Nueva pestaña',
    newTabTitle: 'Nueva pestaña (Ctrl+N)',
    closeLabel: 'Cerrar',
    cancelLabel: 'Cancelar',

    menuFile: 'Archivo',
    menuEdit: 'Editar',
    menuFormat: 'Formato',
    menuView: 'Ver',
    menuTools: 'Herramientas',
    menuHelp: 'Ayuda',
    mainMenuAria: 'Menú principal',

    fileNewTab: 'Nueva pestaña',
    fileOpenLocal: 'Abrir archivo .md / .txt…',
    fileImportMarkItDown: 'Importar documento con MarkItDown…',
    fileSaveMd: 'Guardar como .md',
    fileExportHtml: 'Exportar HTML limpio',
    filePrintPreview: 'Vista previa de impresión…',
    filePrintPdf: 'Imprimir / Guardar PDF',
    fileCloseTab: 'Cerrar pestaña actual',

    editFind: 'Buscar (admite * y ?)',
    editReplace: 'Reemplazar…',
    editInsertTable: 'Insertar tabla…',
    editClearFormatting: 'Borrar formato Markdown',
    editInsertDateTime: 'Insertar fecha y hora',

    formatWordWrap: 'Ajuste de línea',
    formatEncodingUtf8: 'Codificación: UTF-8',
    formatEncodingUtf8Bom: 'Codificación: UTF-8 con BOM',
    formatEncodingAnsi: 'Codificación: ANSI (Windows-1252)',
    formatEolCrlf: 'Fin de línea: Windows (CRLF)',
    formatEolLf: 'Fin de línea: Unix / macOS / Linux (LF)',

    viewSourceOnly: 'Solo código fuente',
    viewSplit: 'Vista dividida (Scroll-Sync)',
    viewPreviewOnly: 'Solo lectura / Vista previa',
    viewOutline: 'Esquema del documento',
    viewStatusBar: 'Barra de estado',
    viewThemeSystem: 'Tema: Seguir sistema',
    viewThemeLight: 'Tema claro',
    viewThemeDark: 'Modo nocturno (Oscuro)',
    viewThemeHighContrast: 'Alto contraste (Win)',
    viewLanguageSystem: 'Idioma: Seguir sistema',

    toolsFolderPostIt: 'Post-it de carpetas (MarkItDown)…',
    toolsMarkItDown: 'Convertidor MarkItDown (Archivo, URL, MCP)…',
    toolsCrossPlatform: 'Preferencias, Idioma y Kit Windows/GitHub…',
    toolsSessionRestore: 'Restauración automática de sesión',
    toolsAiAssistant: 'Asistente IA opcional (Ctrl+Q/D/M)',
    helpShortcutsGuide: 'Atajos, Kit Win7–11 y GitHub Actions',

    viewModeGroupAria: 'Modo de visualización',
    modeSourceShort: 'Fuente',
    modeSplitShort: 'Dividida',
    modePreviewShort: 'Vista previa',
    toggleNightModeAria: 'Alternar modo nocturno',
    nightModeTooltipOn: 'Cambiar a tema claro',
    nightModeTooltipOff: 'Activar modo nocturno',
    folderPostItBtn: 'Post-it Carpetas',

    formattingBarAria: 'Barra de formato Markdown',
    outlineBtn: 'Esquema',
    outlineAria: 'Mostrar u ocultar esquema',
    outlineTooltip: 'Esquema del documento (Ctrl+Shift+O)',
    h1Label: 'Título 1',
    h2Label: 'Título 2',
    boldLabel: 'Negrita',
    italicLabel: 'Cursiva',
    strikeLabel: 'Tachado',
    bulletListLabel: 'Lista con viñetas',
    checklistLabel: 'Insertar lista de tareas',
    codeBlockLabel: 'Bloque de código',
    tableBtn: 'Tabla',
    tableAria: 'Insertar tabla',
    clearFmtLabel: 'Borrar formato',
    findBtn: 'Buscar',
    findAria: 'Buscar y reemplazar',
    printPreviewBtn: 'Imprimir',
    printPreviewTooltip: 'Vista previa de impresión y PDF (Ctrl+Shift+P)',
    importMarkItDownBtn: 'Importar MarkItDown',
    importMarkItDownAria: 'Importar con MarkItDown',
    mobileViewPrefix: 'Vista',
    aiWrite: 'Escribir',
    aiRewrite: 'Reescribir',
    aiSummarize: 'Resumir',
    aiWorking: 'Procesando…',

    editorRegionAria: 'Editor fuente Markdown',
    previewRegionAria: 'Vista previa renderizada',
    previewArticleAria: 'Vista previa del documento Markdown',
    editorPlaceholder:
      'Empieza a escribir en Markdown… (pulsa F6 para cambiar vista, Ctrl+T para tabla, Ctrl+Shift+P para imprimir)',
    emptyDocPreview: '*Documento vacío.*',
    taskRowAria: 'Tarea línea',
    taskGenericAria: 'Tarea',

    statusBarAria: 'Barra de estado',
    wordsLabel: 'palabras',
    readOnlyLabel: 'Solo lectura',
    autoSaveLabel: 'Autoguardado',
    autoSaveReady: 'Auto-save 30s',
    zoomOutAria: 'Alejar zoom',
    zoomInAria: 'Acercar zoom',
    zoomResetTitle: 'Restablecer zoom al 100%',
    eolToggleTitle: 'Cambiar fin de línea (Windows CRLF / Unix LF)',
    encodingAria: 'Codificación de caracteres',

    outlineTitle: 'Esquema del documento',
    outlineCloseAria: 'Cerrar panel de esquema',
    outlineEmpty: 'No se encontraron títulos. Usa #, ## o ### para crear un esquema navegable.',
    outlineNavAria: 'Índice de títulos',

    findRegionAria: 'Buscar y reemplazar',
    findPlaceholder: 'Buscar (* y ? admitidos)…',
    findCaseSensitive: 'Coincidir mayúsculas/minúsculas',
    findPrevAria: 'Resultado anterior',
    findNextAria: 'Siguiente resultado',
    findCloseAria: 'Cerrar búsqueda',
    findShowReplace: 'Mostrar reemplazar',
    findHideReplace: 'Ocultar reemplazar',
    findWildcardHint: 'Comodines: * (cualquiera) · ? (1 carácter)',
    replacePlaceholder: 'Reemplazar con…',
    replaceOneBtn: 'Reemplazar',
    replaceAllBtn: 'Todos',

    tableDialogTitle: 'Insertar tabla Markdown',
    tableRowsLabel: 'Filas de datos (1–20)',
    tableColsLabel: 'Columnas (1–12)',
    tablePreviewHint: 'Vista previa (pulsa Tab entre celdas para alinear columnas):',
    tableInsertBtn: 'Insertar tabla',

    printPreviewTitle: 'Vista previa de impresión',
    printPreviewSubtitle: 'Comprueba márgenes, tamaño de papel y orientación antes de imprimir o guardar PDF.',
    printPaperSize: 'Tamaño de papel',
    printOrientation: 'Orientación',
    printPortrait: 'Vertical',
    printLandscape: 'Horizontal',
    printMargins: 'Márgenes',
    printMarginNarrow: 'Estrechos',
    printMarginNormal: 'Normales',
    printMarginWide: 'Amplios',
    printIncludeHeader: 'Mostrar encabezado (archivo)',
    printIncludeFooter: 'Mostrar pie de página (fecha)',
    printScaleLabel: 'Escala',
    printNowBtn: 'Imprimir / Guardar PDF',
    printFooterPage: 'MDPad — Documento Markdown',

    prefsTitle: 'Preferencias, Idioma, Compatibilidad y GitHub Actions',
    prefsSubtitle: 'Ajustes locales, multilingüe con idioma del sistema, modo nocturno y compilación ZIP / EXE.',
    prefsSectionTitle: 'Ajustes de MDPad (100% local, cero telemetría)',
    prefsThemeLabel: 'Tema y Modo nocturno',
    prefsLanguageLabel: 'Idioma de la interfaz',
    prefsLanguageSystemOption: 'Seguir idioma del sistema',
    prefsAutoSaveTitle: 'Autoguardado activo (cada 30s)',
    prefsAutoSaveDesc: 'Guarda la pestaña activa en localStorage cada 30 segundos frente a cierres o cortes eléctricos.',
    prefsSessionRestoreTitle: 'Restauración automática de sesión',
    prefsSessionRestoreDesc: 'Guarda las pestañas abiertas en el navegador para el próximo inicio.',
    prefsAiTitle: 'Asistente IA opcional',
    prefsAiDesc: 'Desactivado por defecto. Activa Escribir (Ctrl+Q), Reescribir (Ctrl+D) y Resumir (Ctrl+M).',
    prefsMatrixTitle: 'Compatibilidad universal de notas y Post-its de carpeta',
    prefsKitTitle: 'Kit Windows, CLI MarkItDown y GitHub Actions (ZIP / .EXE)',
    prefsGhActionsNote:
      'GitHub Actions compila la app de escritorio Windows autónoma: MDPad-Setup.exe (instalador en 1 clic con asociación .md), MDPad-Portable.exe y MDPad-Windows-x64.zip. Sin servidor ni Node.js: abre y escribe como el Bloc de notas.',
    prefsShortcutsTitle: 'Atajos de teclado (estilo Bloc de notas)',

    noticeSaved: 'Guardado',
    noticeExportedHtml: 'Archivo HTML limpio exportado.',
    noticeAutoSaved: 'Autoguardado a las',
    noticeRecoveredAutoSave: 'Pestaña activa recuperada del autoguardado.',
    noticeReplacedCount: 'coincidencias reemplazadas.',
  },

  fr: {
    appTitle: 'MDPad — Bloc-notes Markdown',
    untitledPrefix: 'Sans titre',
    untitledSingle: 'Sans titre.md',
    tabsAriaLabel: 'Onglets de documents ouverts',
    tabModified: 'Modifié',
    tabUnsavedChanges: 'Modifications non enregistrées',
    closeTabLabel: 'Fermer l’onglet',
    newTabLabel: 'Nouvel onglet',
    newTabTitle: 'Nouvel onglet (Ctrl+N)',
    closeLabel: 'Fermer',
    cancelLabel: 'Annuler',

    menuFile: 'Fichier',
    menuEdit: 'Édition',
    menuFormat: 'Format',
    menuView: 'Affichage',
    menuTools: 'Outils',
    menuHelp: 'Aide',
    mainMenuAria: 'Menu principal',

    fileNewTab: 'Nouvel onglet',
    fileOpenLocal: 'Ouvrir un fichier .md / .txt…',
    fileImportMarkItDown: 'Importer un document avec MarkItDown…',
    fileSaveMd: 'Enregistrer en .md',
    fileExportHtml: 'Exporter en HTML propre',
    filePrintPreview: 'Aperçu avant impression…',
    filePrintPdf: 'Imprimer / Enregistrer en PDF',
    fileCloseTab: 'Fermer l’onglet actif',

    editFind: 'Rechercher (gère * et ?)',
    editReplace: 'Remplacer…',
    editInsertTable: 'Insérer un tableau…',
    editClearFormatting: 'Effacer le formatage Markdown',
    editInsertDateTime: 'Insérer la date et l’heure',

    formatWordWrap: 'Retour automatique à la ligne',
    formatEncodingUtf8: 'Encodage : UTF-8',
    formatEncodingUtf8Bom: 'Encodage : UTF-8 avec BOM',
    formatEncodingAnsi: 'Encodage : ANSI (Windows-1252)',
    formatEolCrlf: 'Fin de ligne : Windows (CRLF)',
    formatEolLf: 'Fin de ligne : Unix / macOS / Linux (LF)',

    viewSourceOnly: 'Source uniquement',
    viewSplit: 'Vue partagée (Scroll-Sync)',
    viewPreviewOnly: 'Lecture seule / Aperçu',
    viewOutline: 'Plan du document',
    viewStatusBar: 'Barre d’état',
    viewThemeSystem: 'Thème : Système',
    viewThemeLight: 'Thème clair',
    viewThemeDark: 'Mode nuit (Sombre)',
    viewThemeHighContrast: 'Contraste élevé (Win)',
    viewLanguageSystem: 'Langue : Système',

    toolsFolderPostIt: 'Post-it de dossiers (MarkItDown)…',
    toolsMarkItDown: 'Convertisseur MarkItDown (Fichier, URL, MCP)…',
    toolsCrossPlatform: 'Préférences, Langue & Kit Windows/GitHub…',
    toolsSessionRestore: 'Restauration automatique de session',
    toolsAiAssistant: 'Assistant IA optionnel (Ctrl+Q/D/M)',
    helpShortcutsGuide: 'Raccourcis, Kit Win7–11 & GitHub Actions',

    viewModeGroupAria: 'Mode d’affichage',
    modeSourceShort: 'Source',
    modeSplitShort: 'Partagée',
    modePreviewShort: 'Aperçu',
    toggleNightModeAria: 'Basculer le mode nuit',
    nightModeTooltipOn: 'Passer au thème clair',
    nightModeTooltipOff: 'Activer le mode nuit',
    folderPostItBtn: 'Post-it Dossiers',

    formattingBarAria: 'Barre de mise en forme Markdown',
    outlineBtn: 'Plan',
    outlineAria: 'Afficher ou masquer le plan',
    outlineTooltip: 'Plan du document (Ctrl+Shift+O)',
    h1Label: 'Titre 1',
    h2Label: 'Titre 2',
    boldLabel: 'Gras',
    italicLabel: 'Italique',
    strikeLabel: 'Barré',
    bulletListLabel: 'Liste à puces',
    checklistLabel: 'Insérer une liste de tâches',
    codeBlockLabel: 'Bloc de code',
    tableBtn: 'Tableau',
    tableAria: 'Insérer un tableau',
    clearFmtLabel: 'Effacer le formatage',
    findBtn: 'Chercher',
    findAria: 'Rechercher et remplacer',
    printPreviewBtn: 'Imprimer',
    printPreviewTooltip: 'Aperçu avant impression et PDF (Ctrl+Shift+P)',
    importMarkItDownBtn: 'Importer MarkItDown',
    importMarkItDownAria: 'Importer avec MarkItDown',
    mobileViewPrefix: 'Vue',
    aiWrite: 'Rédiger',
    aiRewrite: 'Réécrire',
    aiSummarize: 'Résumer',
    aiWorking: 'Traitement…',

    editorRegionAria: 'Éditeur source Markdown',
    previewRegionAria: 'Aperçu rendu',
    previewArticleAria: 'Aperçu du document Markdown',
    editorPlaceholder:
      'Commencez à écrire en Markdown… (F6 pour changer de vue, Ctrl+T pour un tableau, Ctrl+Shift+P pour l’aperçu)',
    emptyDocPreview: '*Document vide.*',
    taskRowAria: 'Tâche ligne',
    taskGenericAria: 'Tâche',

    statusBarAria: 'Barre d’état',
    wordsLabel: 'mots',
    readOnlyLabel: 'Lecture seule',
    autoSaveLabel: 'Sauvegarde auto',
    autoSaveReady: 'Auto-save 30s',
    zoomOutAria: 'Zoom arrière',
    zoomInAria: 'Zoom avant',
    zoomResetTitle: 'Réinitialiser le zoom à 100%',
    eolToggleTitle: 'Changer la fin de ligne (Windows CRLF / Unix LF)',
    encodingAria: 'Encodage des caractères',

    outlineTitle: 'Plan du document',
    outlineCloseAria: 'Fermer le panneau du plan',
    outlineEmpty: 'Aucun titre trouvé. Utilisez #, ## ou ### pour structurer le document.',
    outlineNavAria: 'Index des titres',

    findRegionAria: 'Rechercher et remplacer',
    findPlaceholder: 'Rechercher (* et ? pris en charge)…',
    findCaseSensitive: 'Respecter la casse',
    findPrevAria: 'Résultat précédent',
    findNextAria: 'Résultat suivant',
    findCloseAria: 'Fermer la recherche',
    findShowReplace: 'Afficher remplacer',
    findHideReplace: 'Masquer remplacer',
    findWildcardHint: 'Jokers : * (tout) · ? (1 caractère)',
    replacePlaceholder: 'Remplacer par…',
    replaceOneBtn: 'Remplacer',
    replaceAllBtn: 'Tout',

    tableDialogTitle: 'Insérer un tableau Markdown',
    tableRowsLabel: 'Lignes de données (1–20)',
    tableColsLabel: 'Colonnes (1–12)',
    tablePreviewHint: 'Aperçu syntaxe (Tab entre cellules pour aligner les colonnes) :',
    tableInsertBtn: 'Insérer le tableau',

    printPreviewTitle: 'Aperçu avant impression',
    printPreviewSubtitle: 'Vérifiez la mise en page, les marges et l’orientation avant d’imprimer ou d’exporter en PDF.',
    printPaperSize: 'Format papier',
    printOrientation: 'Orientation',
    printPortrait: 'Portrait',
    printLandscape: 'Paysage',
    printMargins: 'Marges',
    printMarginNarrow: 'Étroites',
    printMarginNormal: 'Normales',
    printMarginWide: 'Larges',
    printIncludeHeader: 'Afficher l’en-tête (fichier)',
    printIncludeFooter: 'Afficher le pied de page (date)',
    printScaleLabel: 'Échelle',
    printNowBtn: 'Imprimer / Enregistrer PDF',
    printFooterPage: 'MDPad — Document Markdown',

    prefsTitle: 'Préférences, Langue, Compatibilité & GitHub Actions',
    prefsSubtitle: 'Paramètres locaux, multilingue selon le système, mode nuit et paquets ZIP / EXE.',
    prefsSectionTitle: 'Paramètres MDPad (100% local, zéro télémétrie)',
    prefsThemeLabel: 'Thème et Mode nuit',
    prefsLanguageLabel: 'Langue de l’interface',
    prefsLanguageSystemOption: 'Suivre la langue du système',
    prefsAutoSaveTitle: 'Sauvegarde automatique (toutes les 30s)',
    prefsAutoSaveDesc: 'Sérialise l’onglet actif dans localStorage toutes les 30 secondes contre les pannes.',
    prefsSessionRestoreTitle: 'Restauration automatique de session',
    prefsSessionRestoreDesc: 'Enregistre les onglets ouverts localement dans le navigateur.',
    prefsAiTitle: 'Assistant IA optionnel',
    prefsAiDesc: 'Désactivé par défaut. Active Rédiger (Ctrl+Q), Réécrire (Ctrl+D) et Résumer (Ctrl+M).',
    prefsMatrixTitle: 'Compatibilité universelle des notes et Post-its de dossier',
    prefsKitTitle: 'Kit Windows, CLI MarkItDown & GitHub Actions (ZIP / .EXE)',
    prefsGhActionsNote:
      'GitHub Actions compile l’application de bureau Windows autonome : MDPad-Setup.exe (installeur en 1 clic avec association .md), MDPad-Portable.exe et MDPad-Windows-x64.zip. Aucun serveur ni Node.js requis : ouvrez et écrivez comme dans le Bloc-notes.',
    prefsShortcutsTitle: 'Raccourcis clavier (style Bloc-notes)',

    noticeSaved: 'Enregistré',
    noticeExportedHtml: 'Fichier HTML propre exporté.',
    noticeAutoSaved: 'Sauvegardé automatiquement à',
    noticeRecoveredAutoSave: 'Onglet actif restauré depuis la sauvegarde auto.',
    noticeReplacedCount: 'occurrences remplacées.',
  },

  de: {
    appTitle: 'MDPad — Markdown-Editor',
    untitledPrefix: 'Unbenannt',
    untitledSingle: 'Unbenannt.md',
    tabsAriaLabel: 'Geöffnete Dokument-Tabs',
    tabModified: 'Geändert',
    tabUnsavedChanges: 'Ungespeicherte Änderungen',
    closeTabLabel: 'Tab schließen',
    newTabLabel: 'Neuer Tab',
    newTabTitle: 'Neuer Tab (Ctrl+N)',
    closeLabel: 'Schließen',
    cancelLabel: 'Abbrechen',

    menuFile: 'Datei',
    menuEdit: 'Bearbeiten',
    menuFormat: 'Format',
    menuView: 'Ansicht',
    menuTools: 'Werkzeuge',
    menuHelp: 'Hilfe',
    mainMenuAria: 'Hauptmenü',

    fileNewTab: 'Neuer Tab',
    fileOpenLocal: 'Datei .md / .txt öffnen…',
    fileImportMarkItDown: 'Dokument mit MarkItDown importieren…',
    fileSaveMd: 'Als .md speichern',
    fileExportHtml: 'Sauberes HTML exportieren',
    filePrintPreview: 'Druckvorschau…',
    filePrintPdf: 'Drucken / Als PDF speichern',
    fileCloseTab: 'Aktuellen Tab schließen',

    editFind: 'Suchen (mit * und ?)',
    editReplace: 'Ersetzen…',
    editInsertTable: 'Tabelle einfügen…',
    editClearFormatting: 'Markdown-Formatierung entfernen',
    editInsertDateTime: 'Datum und Uhrzeit einfügen',

    formatWordWrap: 'Zeilenumbruch',
    formatEncodingUtf8: 'Kodierung: UTF-8',
    formatEncodingUtf8Bom: 'Kodierung: UTF-8 mit BOM',
    formatEncodingAnsi: 'Kodierung: ANSI (Windows-1252)',
    formatEolCrlf: 'Zeilenende: Windows (CRLF)',
    formatEolLf: 'Zeilenende: Unix / macOS / Linux (LF)',

    viewSourceOnly: 'Nur Quelltext',
    viewSplit: 'Geteilte Ansicht (Scroll-Sync)',
    viewPreviewOnly: 'Leseansicht / Vorschau',
    viewOutline: 'Dokumentgliederung',
    viewStatusBar: 'Statusleiste',
    viewThemeSystem: 'Design: System',
    viewThemeLight: 'Helles Design',
    viewThemeDark: 'Nachtmodus (Dunkel)',
    viewThemeHighContrast: 'Hoher Kontrast (Win)',
    viewLanguageSystem: 'Sprache: System',

    toolsFolderPostIt: 'Ordner-Post-it (MarkItDown)…',
    toolsMarkItDown: 'MarkItDown-Konverter (Datei, URL, MCP)…',
    toolsCrossPlatform: 'Einstellungen, Sprache & Windows/GitHub-Kit…',
    toolsSessionRestore: 'Automatische Sitzungswiederherstellung',
    toolsAiAssistant: 'Optionaler KI-Assistent (Ctrl+Q/D/M)',
    helpShortcutsGuide: 'Tastenkürzel, Win7–11-Kit & GitHub Actions',

    viewModeGroupAria: 'Ansichtsmodus',
    modeSourceShort: 'Quelltext',
    modeSplitShort: 'Geteilt',
    modePreviewShort: 'Vorschau',
    toggleNightModeAria: 'Nachtmodus umschalten',
    nightModeTooltipOn: 'Zum hellen Design wechseln',
    nightModeTooltipOff: 'Nachtmodus aktivieren',
    folderPostItBtn: 'Ordner-Post-it',

    formattingBarAria: 'Markdown-Formatierungsleiste',
    outlineBtn: 'Gliederung',
    outlineAria: 'Gliederung ein- oder ausblenden',
    outlineTooltip: 'Dokumentgliederung (Ctrl+Shift+O)',
    h1Label: 'Überschrift 1',
    h2Label: 'Überschrift 2',
    boldLabel: 'Fett',
    italicLabel: 'Kursiv',
    strikeLabel: 'Durchgestrichen',
    bulletListLabel: 'Aufzählung',
    checklistLabel: 'Checkliste einfügen',
    codeBlockLabel: 'Codeblock',
    tableBtn: 'Tabelle',
    tableAria: 'Tabelle einfügen',
    clearFmtLabel: 'Formatierung löschen',
    findBtn: 'Suchen',
    findAria: 'Suchen und Ersetzen',
    printPreviewBtn: 'Drucken',
    printPreviewTooltip: 'Druckvorschau & PDF (Ctrl+Shift+P)',
    importMarkItDownBtn: 'MarkItDown Import',
    importMarkItDownAria: 'Mit MarkItDown importieren',
    mobileViewPrefix: 'Ansicht',
    aiWrite: 'Schreiben',
    aiRewrite: 'Umschreiben',
    aiSummarize: 'Zusammenfassen',
    aiWorking: 'Arbeite…',

    editorRegionAria: 'Markdown-Quelltexteditor',
    previewRegionAria: 'Gerenderte Vorschau',
    previewArticleAria: 'Markdown-Dokumentvorschau',
    editorPlaceholder:
      'Schreibe in Markdown… (F6 wechselt die Ansicht, Ctrl+T für Tabelle, Ctrl+Shift+P für Druckvorschau)',
    emptyDocPreview: '*Leeres Dokument.*',
    taskRowAria: 'Aufgabe Zeile',
    taskGenericAria: 'Aufgabe',

    statusBarAria: 'Statusleiste',
    wordsLabel: 'Wörter',
    readOnlyLabel: 'Schreibgeschützt',
    autoSaveLabel: 'Auto-Speichern',
    autoSaveReady: 'Auto-Save 30s',
    zoomOutAria: 'Verkleinern',
    zoomInAria: 'Vergrößern',
    zoomResetTitle: 'Zoom auf 100% zurücksetzen',
    eolToggleTitle: 'Zeilenende wechseln (Windows CRLF / Unix LF)',
    encodingAria: 'Zeichenkodierung',

    outlineTitle: 'Dokumentgliederung',
    outlineCloseAria: 'Gliederung schließen',
    outlineEmpty: 'Keine Überschriften gefunden. Verwende #, ## oder ### für eine Gliederung.',
    outlineNavAria: 'Überschriftenindex',

    findRegionAria: 'Suchen und Ersetzen',
    findPlaceholder: 'Suchen (* und ? unterstützt)…',
    findCaseSensitive: 'Groß-/Kleinschreibung beachten',
    findPrevAria: 'Vorheriger Treffer',
    findNextAria: 'Nächster Treffer',
    findCloseAria: 'Suchleiste schließen',
    findShowReplace: 'Ersetzen anzeigen',
    findHideReplace: 'Ersetzen ausblenden',
    findWildcardHint: 'Platzhalter: * (beliebig) · ? (1 Zeichen)',
    replacePlaceholder: 'Ersetzen durch…',
    replaceOneBtn: 'Ersetzen',
    replaceAllBtn: 'Alle',

    tableDialogTitle: 'Markdown-Tabelle einfügen',
    tableRowsLabel: 'Datenzeilen (1–20)',
    tableColsLabel: 'Spalten (1–12)',
    tablePreviewHint: 'Syntaxvorschau (Tab zwischen Zellen richtet Spalten automatisch aus):',
    tableInsertBtn: 'Tabelle einfügen',

    printPreviewTitle: 'Druckvorschau',
    printPreviewSubtitle: 'Prüfe Seitenlayout, Ränder und Ausrichtung vor dem Drucken oder PDF-Export.',
    printPaperSize: 'Papierformat',
    printOrientation: 'Ausrichtung',
    printPortrait: 'Hochformat',
    printLandscape: 'Querformat',
    printMargins: 'Seitenränder',
    printMarginNarrow: 'Schmal',
    printMarginNormal: 'Normal',
    printMarginWide: 'Breit',
    printIncludeHeader: 'Kopfzeile anzeigen (Dateiname)',
    printIncludeFooter: 'Fußzeile anzeigen (Datum)',
    printScaleLabel: 'Vorschau-Skala',
    printNowBtn: 'Drucken / Als PDF speichern',
    printFooterPage: 'MDPad — Markdown-Dokument',

    prefsTitle: 'Einstellungen, Sprache, Kompatibilität & GitHub Actions',
    prefsSubtitle: 'Lokale Einstellungen, Mehrsprachigkeit nach System, Nachtmodus und ZIP / EXE-Pakete.',
    prefsSectionTitle: 'MDPad-Einstellungen (100% lokal, keine Telemetrie)',
    prefsThemeLabel: 'Design & Nachtmodus',
    prefsLanguageLabel: 'Oberflächensprache',
    prefsLanguageSystemOption: 'Systemsprache folgen',
    prefsAutoSaveTitle: 'Automatisches Speichern (alle 30s)',
    prefsAutoSaveDesc: 'Speichert den aktiven Tab alle 30 Sekunden in localStorage gegen Abstürze oder Stromausfall.',
    prefsSessionRestoreTitle: 'Automatische Sitzungswiederherstellung',
    prefsSessionRestoreDesc: 'Speichert offene Tabs lokal im Browser für den nächsten Start.',
    prefsAiTitle: 'Optionaler KI-Assistent',
    prefsAiDesc: 'Standardmäßig aus. Aktiviert Schreiben (Ctrl+Q), Umschreiben (Ctrl+D) und Zusammenfassen (Ctrl+M).',
    prefsMatrixTitle: 'Plattformübergreifende Kompatibilität für Notizen & Ordner-Post-its',
    prefsKitTitle: 'Windows-Kit, MarkItDown CLI & GitHub Actions (ZIP / .EXE)',
    prefsGhActionsNote:
      'GitHub Actions erstellt die eigenständige Windows-Desktop-App: MDPad-Setup.exe (1-Klick-Installer mit .md-Verknüpfung), MDPad-Portable.exe und MDPad-Windows-x64.zip. Kein Server oder Node.js nötig — einfach öffnen und schreiben wie im Editor.',
    prefsShortcutsTitle: 'Tastenkürzel (Editor-Stil)',

    noticeSaved: 'Gespeichert',
    noticeExportedHtml: 'Saubere HTML-Datei exportiert.',
    noticeAutoSaved: 'Automatisch gespeichert um',
    noticeRecoveredAutoSave: 'Aktiver Tab aus Auto-Speicherung wiederhergestellt.',
    noticeReplacedCount: 'Treffer ersetzt.',
  },
};
