import type { FileEncoding, LineEnding } from '../lib/markitdown/types';

export interface EditorTab {
  id: string;
  title: string;
  content: string;
  savedContent: string;
  encoding: FileEncoding;
  lineEnding: LineEnding;
  readOnly?: boolean;
  sourceLabel?: string;
}

export const INITIAL_TABS: EditorTab[] = [
  {
    id: 'tab-welcome',
    title: 'Benvenuto.md',
    encoding: 'UTF-8',
    lineEnding: 'CRLF',
    savedContent: `# MDPad — Blocco Note Markdown

Un editor essenziale in stile **Windows Notepad**, progettato per lavorare subito con file \`.md\`, documenti convertiti tramite **Microsoft MarkItDown** e **Post-it per cartelle** leggibili su Windows 7–11, macOS, iPadOS, Android e Linux.

## Funzionalità native pronte da provare

- [x] **Modalità di vista rapide** (\`F6\` o \`Ctrl+E\`): Solo Sorgente, Vista Divisa con scroll-sync, Solo Anteprima
- [ ] **Checkbox interattive**: clicca questa casella nella vista Anteprima per aggiornarla nel sorgente
- [ ] **Liste intelligenti**: premi \`Invio\` su una voce elenco o checklist per continuare automaticamente
- [ ] **Incolla intelligente**: seleziona una parola e incolla un URL \`https://...\` per creare un link Markdown
- [ ] **Cancella formattazione**: premi \`Ctrl+Spazio\` sul testo selezionato per ripulire i marcatori

## Navigazione Tabelle (tasto Tab)

Posiziona il cursore in una cella qui sotto e premi \`Tab\` per allineare le colonne e passare alla cella successiva (oppure \`Ctrl+T\` per inserire una nuova tabella):

| Sistema operativo | File Post-it supportato | Note di compatibilità |
| --- | --- | --- |
| Windows 7 Starter 32-bit / 10 / 11 | \`_POST-IT.md\` + \`desktop.ini\` | Tooltip nativo in Esplora File + testo UTF-8/CRLF |
| iPadOS / iOS (App File) | \`_POST-IT.md\` | Fissato in cima alla cartella grazie al prefisso \`_\` |
| Android & Linux | \`_POST-IT.md\` + \`.directory\` | Commento cartella KDE/Dolphin + anteprima Markdown |

## Generatore Post-it Cartelle (MarkItDown)

Apri **Post-it Cartelle** dalla barra superiore o dal menu \`Strumenti\` per selezionare una cartella reale dal dispositivo (o provare la cartella dimostrativa con 12 documenti Microsoft MarkItDown: PDF, DOCX, XLSX, PPTX, HTML, EPUB, RSS, ZIP) e generare il riepilogo pronto da salvare nella cartella.
`,
    content: `# MDPad — Blocco Note Markdown

Un editor essenziale in stile **Windows Notepad**, progettato per lavorare subito con file \`.md\`, documenti convertiti tramite **Microsoft MarkItDown** e **Post-it per cartelle** leggibili su Windows 7–11, macOS, iPadOS, Android e Linux.

## Funzionalità native pronte da provare

- [x] **Modalità di vista rapide** (\`F6\` o \`Ctrl+E\`): Solo Sorgente, Vista Divisa con scroll-sync, Solo Anteprima
- [ ] **Checkbox interattive**: clicca questa casella nella vista Anteprima per aggiornarla nel sorgente
- [ ] **Liste intelligenti**: premi \`Invio\` su una voce elenco o checklist per continuare automaticamente
- [ ] **Incolla intelligente**: seleziona una parola e incolla un URL \`https://...\` per creare un link Markdown
- [ ] **Cancella formattazione**: premi \`Ctrl+Spazio\` sul testo selezionato per ripulire i marcatori

## Navigazione Tabelle (tasto Tab)

Posiziona il cursore in una cella qui sotto e premi \`Tab\` per allineare le colonne e passare alla cella successiva (oppure \`Ctrl+T\` per inserire una nuova tabella):

| Sistema operativo | File Post-it supportato | Note di compatibilità |
| --- | --- | --- |
| Windows 7 Starter 32-bit / 10 / 11 | \`_POST-IT.md\` + \`desktop.ini\` | Tooltip nativo in Esplora File + testo UTF-8/CRLF |
| iPadOS / iOS (App File) | \`_POST-IT.md\` | Fissato in cima alla cartella grazie al prefisso \`_\` |
| Android & Linux | \`_POST-IT.md\` + \`.directory\` | Commento cartella KDE/Dolphin + anteprima Markdown |

## Generatore Post-it Cartelle (MarkItDown)

Apri **Post-it Cartelle** dalla barra superiore o dal menu \`Strumenti\` per selezionare una cartella reale dal dispositivo (o provare la cartella dimostrativa con 12 documenti Microsoft MarkItDown: PDF, DOCX, XLSX, PPTX, HTML, EPUB, RSS, ZIP) e generare il riepilogo pronto da salvare nella cartella.
`,
  },
  {
    id: 'tab-postit-example',
    title: '_POST-IT.md',
    encoding: 'UTF-8',
    lineEnding: 'CRLF',
    sourceLabel: 'Esempio Post-it Cartella',
    savedContent: `# Post-it Cartella: Documenti_Progetto

> **Aggiornato:** 2026-11-26 · **File analizzati:** 4 · **Motore:** MarkItDown (locale)

## Riepilogo a colpo d’occhio

- **Contratto_Fornitore.pdf**: Condizioni annuali di manutenzione e scadenze di rinnovo al 31/12.
- **Budget_2026.xlsx**: 3 fogli di calcolo con previsioni trimestrali e consuntivo spese IT.
- **Presentazione_Kickoff.pptx**: 12 slide con calendario consegne, responsabili e note del relatore.
- **Specifiche_Tecniche.docx**: Requisiti architetturali e criteri di collaudo finale.

## Promemoria rapidi

- [x] Esportato \`_POST-IT.md\` in cima alla cartella (visibile su Windows, iPadOS, Android e Linux)
- [ ] Applicare \`desktop.ini\` su Windows per vedere la descrizione al passaggio del mouse
`,
    content: `# Post-it Cartella: Documenti_Progetto

> **Aggiornato:** 2026-11-26 · **File analizzati:** 4 · **Motore:** MarkItDown (locale)

## Riepilogo a colpo d’occhio

- **Contratto_Fornitore.pdf**: Condizioni annuali di manutenzione e scadenze di rinnovo al 31/12.
- **Budget_2026.xlsx**: 3 fogli di calcolo con previsioni trimestrali e consuntivo spese IT.
- **Presentazione_Kickoff.pptx**: 12 slide con calendario consegne, responsabili e note del relatore.
- **Specifiche_Tecniche.docx**: Requisiti architetturali e criteri di collaudo finale.

## Promemoria rapidi

- [x] Esportato \`_POST-IT.md\` in cima alla cartella (visibile su Windows, iPadOS, Android e Linux)
- [ ] Applicare \`desktop.ini\` su Windows per vedere la descrizione al passaggio del mouse
`,
  },
];

export const SESSION_STORAGE_KEY = 'mdpad_session_v1';
export const PREFS_STORAGE_KEY = 'mdpad_prefs_v1';
