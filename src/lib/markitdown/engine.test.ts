import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { markItDown } from './engine';
import { buildLocalFolderPostIt, buildWindowsDesktopIni } from './postit';
import { parseDataUri, validateRemoteUrl } from './uri';

const SAMPLES_DIR = path.resolve(process.cwd(), 'public/samples');

test('CsvConverter strips BOM, escapes pipes, flattens newlines, and pads ragged rows', async () => {
  const csv = '\uFEFFName,Notes\r\n\r\nAlice,"a|b\nline2"\r\nBob,ok,extra\r\n\r\n';
  const out = await markItDown.convertBuffer(Buffer.from(csv, 'utf-8'), {
    extension: '.csv',
    filename: 'data.csv',
  });
  assert.equal(out.converterUsed, 'CsvConverter');
  assert.equal(
    out.result.markdown,
    '| Name | Notes |  |\n| --- | --- | --- |\n| Alice | a\\|b line2 |  |\n| Bob | ok | extra |'
  );
});

test('HtmlConverter strips scripts and truncates data URIs unless keepDataUris=true', async () => {
  const html = '<html><head><title>Demo</title><script>alert(1)</script></head><body><h1>Ciao</h1><img alt="pic" src="data:image/png;base64,AAAA12345" /></body></html>';
  const truncated = await markItDown.convertBuffer(Buffer.from(html, 'utf-8'), {
    extension: '.html',
  });
  assert.equal(truncated.result.title, 'Demo');
  assert.ok(!truncated.result.markdown.includes('alert(1)'));
  assert.ok(truncated.result.markdown.includes('data:image/png;base64...'));

  const kept = await markItDown.convertBuffer(
    Buffer.from(html, 'utf-8'),
    { extension: '.html' },
    { keepDataUris: true }
  );
  assert.ok(kept.result.markdown.includes('AAAA12345'));
});

test('Data URI parsing and SSRF URL protection work reliably', async () => {
  const uri = 'data:text/html;base64,' + Buffer.from('<h2>Salve</h2><p>Mondo</p>').toString('base64');
  const parsed = parseDataUri(uri);
  assert.equal(parsed.mimetype, 'text/html');

  const out = await markItDown.convertUri(uri);
  assert.ok(out.result.markdown.includes('## Salve'));

  assert.throws(() => validateRemoteUrl('http://127.0.0.1:8080/admin'));
  assert.throws(() => validateRemoteUrl('http://localhost/secret'));
  assert.throws(() => validateRemoteUrl('http://169.254.169.254/latest/meta-data/'));
  assert.throws(() => validateRemoteUrl('file:///etc/passwd'));
});

test('Real bundled MarkItDown fixtures convert cleanly (DOCX, XLSX, PPTX, PDF, IPYNB, RSS, EPUB, ZIP, Wikipedia)', async () => {
  const docx = await markItDown.convertLocal(path.join(SAMPLES_DIR, 'test.docx'));
  assert.equal(docx.converterUsed, 'DocxConverter');
  assert.ok(docx.result.markdown.length > 50);

  const xlsx = await markItDown.convertLocal(path.join(SAMPLES_DIR, 'test.xlsx'));
  assert.equal(xlsx.converterUsed, 'XlsxConverter');
  assert.ok(xlsx.result.markdown.includes('| --- |'));

  const pptx = await markItDown.convertLocal(path.join(SAMPLES_DIR, 'test.pptx'));
  assert.equal(pptx.converterUsed, 'PptxConverter');
  assert.ok(pptx.result.markdown.includes('Slide number: 1'));

  const pdf = await markItDown.convertLocal(path.join(SAMPLES_DIR, 'test.pdf'));
  assert.equal(pdf.converterUsed, 'PdfConverter');
  assert.ok(pdf.result.markdown.length > 50);

  const ipynb = await markItDown.convertLocal(path.join(SAMPLES_DIR, 'test_notebook.ipynb'));
  assert.equal(ipynb.converterUsed, 'IpynbConverter');
  assert.ok(ipynb.result.markdown.includes('```python'));

  const rss = await markItDown.convertLocal(path.join(SAMPLES_DIR, 'test_rss.xml'));
  assert.equal(rss.converterUsed, 'RssConverter');
  assert.ok(rss.result.markdown.includes('# '));

  const epub = await markItDown.convertLocal(path.join(SAMPLES_DIR, 'test.epub'));
  assert.equal(epub.converterUsed, 'EpubConverter');
  assert.ok(epub.result.markdown.length > 30);

  const zip = await markItDown.convertLocal(path.join(SAMPLES_DIR, 'test_files.zip'));
  assert.equal(zip.converterUsed, 'ZipConverter');
  assert.ok(zip.result.markdown.includes('## File:'));

  const wiki = await markItDown.convertLocal(path.join(SAMPLES_DIR, 'test_wikipedia.html'));
  assert.equal(wiki.converterUsed, 'WikipediaConverter');
  assert.ok(wiki.result.markdown.length > 100);
});

test('buildLocalFolderPostIt generates _POST-IT.md, desktop.ini, and Linux .directory', () => {
  const result = buildLocalFolderPostIt('Fatture_2026', [
    {
      filename: 'fattura.pdf',
      relativePath: 'fattura.pdf',
      sizeBytes: 24000,
      converterUsed: 'PdfConverter',
      title: 'Fattura Q1',
      excerpt: 'Totale 1.250 EUR scadenza marzo.',
      headings: ['Dettaglio voci'],
      markdown: '# Fattura Q1\nTotale 1.250 EUR.',
      status: 'ok',
    },
  ]);

  assert.ok(result.postItMarkdown.includes('# Post-it Cartella: Fatture_2026'));
  assert.ok(result.postItMarkdown.includes('fattura.pdf'));
  assert.ok(result.desktopIni.includes('[.ShellClassInfo]'));
  assert.ok(result.desktopIni.includes('InfoTip='));
  assert.ok(result.linuxDirectory.includes('[Desktop Entry]'));
  assert.ok(result.applyBat.includes('attrib +h +s desktop.ini'));
  assert.ok(buildWindowsDesktopIni('Test tip').includes('InfoTip=Test tip'));
});
