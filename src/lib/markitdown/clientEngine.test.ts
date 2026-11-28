import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import {
  CLIENT_CONVERTERS_METADATA,
  convertBytesClientSide,
  scanFolderLocally,
} from './clientEngine.ts';

test('clientEngine converts CSV, HTML, JSON, IPYNB, and ZIP offline without a server', async () => {
  const enc = new TextEncoder();

  // CSV
  const csv = await convertBytesClientSide(
    enc.encode('Nome,Ruolo\nMarco Razzano,Autore\nMDPad,Editor\n'),
    'team.csv'
  );
  assert.equal(csv.converterUsed, 'CsvConverter');
  assert.match(csv.markdown, /\| Nome \| Ruolo \|/);
  assert.match(csv.markdown, /Marco Razzano/);

  // HTML
  const html = await convertBytesClientSide(
    enc.encode('<html><head><title>Guida</title></head><body><h1>Ciao</h1><p>Testo</p></body></html>'),
    'guida.html'
  );
  assert.equal(html.converterUsed, 'HtmlConverter');
  assert.equal(html.title, 'Guida');
  assert.match(html.markdown, /Ciao/);

  // IPYNB
  const nb = await convertBytesClientSide(
    enc.encode(
      JSON.stringify({
        cells: [
          { cell_type: 'markdown', source: ['# Notebook'] },
          { cell_type: 'code', source: ['print("ok")'] },
        ],
      })
    ),
    'demo.ipynb'
  );
  assert.equal(nb.converterUsed, 'IpynbConverter');
  assert.match(nb.markdown, /```python/);

  // ZIP containing inner CSV
  const zip = new JSZip();
  zip.file('dati.csv', 'A,B\n1,2\n');
  const zipBytes = await zip.generateAsync({ type: 'uint8array' });
  const zipRes = await convertBytesClientSide(zipBytes, 'archivio.zip');
  assert.equal(zipRes.converterUsed, 'ZipConverter');
  assert.match(zipRes.markdown, /dati\.csv/);
  assert.ok(CLIENT_CONVERTERS_METADATA.length >= 10);
});

test('scanFolderLocally builds _POST-IT.md, desktop.ini, and .directory offline', async () => {
  const enc = new TextEncoder();
  const result = await scanFolderLocally(
    'Documenti_Android',
    [
      {
        relativePath: 'Documenti_Android/note.md',
        filename: 'note.md',
        bytes: enc.encode('# Appunti\nLista attività'),
      },
      {
        relativePath: 'Documenti_Android/spese.csv',
        filename: 'spese.csv',
        bytes: enc.encode('Voce,Euro\nHosting,10\n'),
      },
      {
        relativePath: 'Documenti_Android/_POST-IT.md',
        filename: '_POST-IT.md',
        bytes: enc.encode('# Vecchio post-it da ignorare'),
      },
    ],
    'Cartella annotata da Marco Razzano'
  );

  assert.equal(result.folderName, 'Documenti_Android');
  assert.equal(result.filesProcessed, 2);
  assert.equal(result.filesSucceeded, 2);
  assert.match(result.postItMarkdown, /Cartella annotata da Marco Razzano/);
  assert.match(result.desktopIni, /InfoTip=/);
  assert.match(result.linuxDirectory, /Comment=/);
});
