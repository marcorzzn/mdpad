# MDPad — Blocco Note Markdown & Post-it Cartelle (Microsoft MarkItDown)

MDPad è un editor leggero in stile **Windows Notepad** con supporto nativo per file `.md`, integrato al 100% con il motore di conversione **Microsoft MarkItDown** (portato in Node.js/TypeScript) e dotato di un generatore di **Post-it per cartelle** compatibile con **Windows 7 Starter (32-bit)–Windows 11, macOS, iPadOS, Android e Linux**.

## Funzionalità principali

- **Interfaccia stile Blocco Note Windows**: schede multiple con indicatore di modifica (`*`), ripristino automatico della sessione locale, barra dei menu classica (`File`, `Modifica`, `Formato`, `Visualizza`, `Strumenti`, `Aiuto`), barra di stato con riga/colonna, parole, tempo di lettura, zoom (`Ctrl + Rotellina`), fine riga (`CRLF`/`LF`) e codifica (`UTF-8`, `UTF-8 con BOM`, `ANSI`).
- **Temi di sistema**: Chiaro, Scuro e Contrasto Elevato (stile Windows High Contrast).
- **Editing Markdown nativo**:
  - Switch rapido tra **Solo Sorgente**, **Vista Divisa con scroll-sync** e **Solo Anteprima** (`F6` o `Ctrl+E`).
  - Auto-completamento intelligente di liste (`-`, `*`, `1.`, `- [ ]`), interruzione su riga vuota.
  - Checkbox interattive cliccabili direttamente in Anteprima.
  - Inserimento tabelle (`Ctrl+T`) e navigazione/allineamento automatico celle con `Tab`.
  - Incolla intelligente (`Ctrl+V`) per URL su testo selezionato (`[testo](url)`) e immagini dagli appunti (`./assets/img_NN.png`).
  - Struttura Documento (`Ctrl+Shift+O`), Trova e Sostituisci con wildcard (`*` e `?`), Cancella Formattazione (`Ctrl+Spazio`), esportazione HTML pulito e stampa PDF.
- **Motore Microsoft MarkItDown integrato**:
  - Converte `.pdf`, `.docx`, `.xlsx`/`.xls`, `.pptx`, `.html`, pagine Wikipedia, `.csv`, `.ipynb`, feed RSS/Atom, `.epub`, archivi `.zip`, immagini EXIF, `.json`, testo e URI (`http:`, `https:`, `data:`).
  - Include 12 documenti di test reali da `microsoft/markitdown` e un endpoint MCP JSON-RPC 2.0 (`POST /api/mcp`).
- **Post-it Cartelle Multipiattaforma**:
  - Scansiona cartelle reali dal dispositivo o la cartella dimostrativa e genera `_POST-IT.md` (fissato in cima su Windows, iPadOS, Android, macOS, Linux), `desktop.ini` (`InfoTip` per Esplora File Windows 7–11), `Applica_PostIt_Windows.bat` e `.directory` (Linux/KDE), scaricabili singolarmente o come pacchetto ZIP completo.
  - Modalità **Locale (Offline)** predefinita + sintesi **AI opzionale** disattivabile.

## Avvio locale

```bash
npm install
npm run dev
```

Il server ascolta su `http://0.0.0.0:3000`. Per i test unitari:

```bash
npm test
```
