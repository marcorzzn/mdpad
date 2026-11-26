import type { FileEncoding, LineEnding } from '../lib/markitdown/types';

export interface EditorTab {
  id: string;
  title: string;
  content: string;
  dirty: boolean;
  encoding: FileEncoding;
  lineEnding: LineEnding;
  sourceLabel?: string;
}

export const INITIAL_TABS: EditorTab[] = [
  {
    id: 'tab-welcome',
    title: 'Benvenuto.md',
    dirty: false,
    encoding: 'UTF-8',
    lineEnding: 'CRLF',
    sourceLabel: 'Documento locale',
    content: `# MDPad — Blocco Note Markdown + MarkItDown

Un editor essenziale in stile **Windows Blocco Note**, con supporto nativo per i file \`.md\`, motore **Microsoft MarkItDown** integrato e compatibilità completa con Windows 7–11, macOS, iPadOS, Android e Linux.

## Funzioni rapide da provare subito

- [x] **Modalità di visualizzazione**: premi \`F6\` o \`Ctrl+E\` per alternare *Sorgente*, *Vista Divisa* e *Anteprima*
- [ ] **Checkbox interattive**: clicca questa casella nella vista Anteprima per aggiornare subito il testo sorgente
- [ ] **Liste intelligenti**: premi \`Invio\` su un elenco puntato, numerato o checklist per continuare automaticamente
- [ ] **Navigazione tabelle**: premi \`Tab\` all’interno della tabella qui sotto per passare alla cella successiva e allineare le colonne
- [ ] **Post-it per cartelle**: apri la scheda **Post-it Cartelle** in alto per scansionare file con MarkItDown e generare \`_POST-IT.md\` + \`desktop.ini\`

## Tabella di compatibilità multipiattaforma

| Sistema Operativo | Apertura note .md | Post-it Cartella | Fine riga consigliato |
| ----------------- | ----------------- | ---------------- | --------------------- |
| Windows 7 Starter (32-bit) – 11 | MDPad / Blocco Note | _POST-IT.md + desktop.ini | CRLF (Windows) |
| iPadOS / iOS (App File) | File / Obsidian / iA Writer | _POST-IT.md in cima alla cartella | LF (Unix) |
| Android | File Manager / Markor | _POST-IT.md in cima alla cartella | LF (Unix) |
| Linux (Dolphin / Nautilus) | Editor testo / MDPad | _POST-IT.md + .directory | LF (Unix) |

## Scorciatoie principali

- \`Ctrl+T\` — Inserisci una nuova tabella Markdown scegliendo righe e colonne
- \`Ctrl+F\` / \`Ctrl+H\` — Trova e sostituisci con caratteri jolly (\`*\` e \`?\`)
- \`Ctrl+Spazio\` — Cancella formattazione Markdown dalla selezione o dalla riga corrente
- \`Ctrl+Shift+O\` — Mostra o nascondi la Struttura Documento (Outline)
- \`Ctrl+V\` su testo selezionato con un URL — Crea automaticamente \`[testo](url)\`

\`\`\`text
Suggerimento: puoi anche trascinare file PDF, Word (.docx), Excel (.xlsx),
PowerPoint (.pptx), EPUB o ZIP nell’area MarkItDown per convertirli subito in Markdown.
\`\`\`
`,
  },
  {
    id: 'tab-postit-example',
    title: '_POST-IT.md',
    dirty: false,
    encoding: 'UTF-8',
    lineEnding: 'CRLF',
    sourceLabel: 'Esempio Post-it Cartella',
    content: `# Post-it Cartella: Documenti_Progetto

> **Aggiornato:** 2026-11-26 · **File analizzati:** 4 (.pdf, .docx, .xlsx, .pptx) · **Motore:** MarkItDown (locale)

## Riepilogo a colpo d’occhio

- **Specifiche_Tecniche.docx**: Architettura Win32/Markdown, requisiti di leggerezza e formati supportati.
- **Budget_Q4.xlsx**: Foglio preventivo costi licenze, hardware test Windows 7 32-bit e stime trimestrali.
- **Presentazione_Demo.pptx**: 8 slide di panoramica su conversione documenti MarkItDown e flussi offline.
- **Manuale_Utente.pdf**: Guida rapida all’installazione di \`_POST-IT.md\` e \`desktop.ini\` nelle cartelle locali.

## Promemoria rapidi

- [x] Verificare apertura di \`_POST-IT.md\` su Windows Explorer, iPadOS File e Android
- [ ] Esportare il pacchetto ZIP con \`desktop.ini\` e \`Applica_PostIt_Windows.bat\`
- [ ] Aggiornare il riepilogo dopo il prossimo caricamento di documenti

## Indice completo dei file

| File | Convertitore | Dimensione | Contenuto principale |
| --- | --- | --- | --- |
| \`Specifiche_Tecniche.docx\` | DocxConverter | 133.0 KB | Requisiti funzionali e UI |
| \`Budget_Q4.xlsx\` | XlsxConverter | 12.4 KB | Tabella costi trimestrali |
| \`Presentazione_Demo.pptx\` | PptxConverter | 272.0 KB | Slide introduttive |
| \`Manuale_Utente.pdf\` | PdfConverter | 91.2 KB | Guida rapida multipiattaforma |
`,
  },
];
