import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';
import JSZip from 'jszip';
import { GoogleGenAI } from '@google/genai';
import { markItDown } from './src/lib/markitdown/engine.ts';
import {
  buildAiFolderPostItDocument,
  buildLocalFolderPostIt,
  extractMarkdownHeadings,
} from './src/lib/markitdown/postit.ts';
import type { ConversionResponse, FolderFileSummary } from './src/lib/markitdown/types.ts';

function detectStandaloneSea(): boolean {
  if (process.env.MDPAD_STANDALONE === '1') return true;
  try {
    const req = createRequire(process.execPath);
    const sea = req('node:sea') as { isSea?: () => boolean };
    return Boolean(sea?.isSea?.());
  } catch {
    return false;
  }
}

const IS_STANDALONE_EXE = detectStandaloneSea();
const RUNTIME_DIR = IS_STANDALONE_EXE
  ? path.dirname(process.execPath)
  : process.env.MDPAD_RUNTIME_DIR || path.dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = path.join(RUNTIME_DIR, 'public', 'samples');
const PORT = Number(process.env.PORT || 3000);
const HOST = IS_STANDALONE_EXE ? '127.0.0.1' : '0.0.0.0';

const app = express();
app.use(express.json({ limit: '15mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 40 },
});

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Chiave GEMINI_API_KEY non configurata sul server. Usa la modalità Locale (Offline) oppure configura la chiave nelle impostazioni del progetto.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildConversionResponse(
  sourceName: string,
  markdown: string,
  title: string | null,
  converterUsed: string,
  streamInfo: Record<string, unknown>,
  inputBytes: number,
  durationMs: number
): ConversionResponse {
  const outputChars = markdown.length;
  const outputLines = markdown ? markdown.split(/\r?\n/).length : 0;
  const estimatedTokens = Math.max(1, Math.ceil(outputChars / 4));
  return {
    id: crypto.randomUUID(),
    sourceName,
    title,
    markdown,
    converterUsed,
    streamInfo,
    stats: {
      inputBytes,
      outputChars,
      outputLines,
      estimatedTokens,
      durationMs,
    },
    createdAt: new Date().toISOString(),
  };
}

// Health & metadata
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'MDPad + MarkItDown',
    converters: markItDown.listConverters().length,
    aiAvailable: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.get('/api/converters', (_req, res) => {
  res.json({ converters: markItDown.listConverters() });
});

app.get('/api/samples', async (_req, res) => {
  try {
    const entries = await fs.readdir(SAMPLES_DIR, { withFileTypes: true });
    const samples = await Promise.all(
      entries
        .filter((e) => e.isFile())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(async (e) => {
          const stat = await fs.stat(path.join(SAMPLES_DIR, e.name));
          return {
            filename: e.name,
            extension: path.extname(e.name).toLowerCase(),
            sizeBytes: stat.size,
          };
        })
    );
    res.json({ samples });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Errore lettura campioni.' });
  }
});

// Single file conversion via MarkItDown
app.post('/api/convert/file', upload.single('file'), async (req, res) => {
  const started = Date.now();
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Nessun file ricevuto.' });
      return;
    }
    const keepDataUris = req.body?.keepDataUris === 'true' || req.body?.keepDataUris === true;
    const extensionHint =
      typeof req.body?.extensionHint === 'string' && req.body.extensionHint.trim()
        ? req.body.extensionHint.trim()
        : undefined;

    const out = await markItDown.convertBuffer(
      req.file.buffer,
      {
        filename: req.file.originalname,
        extension: extensionHint || path.extname(req.file.originalname).toLowerCase() || undefined,
        mimetype: req.file.mimetype || undefined,
      },
      { keepDataUris }
    );

    res.json(
      buildConversionResponse(
        req.file.originalname,
        out.result.markdown,
        out.result.title ?? null,
        out.converterUsed,
        out.streamInfo as Record<string, unknown>,
        req.file.size,
        Date.now() - started
      )
    );
  } catch (err) {
    res.status(422).json({
      error: err instanceof Error ? err.message : 'Errore durante la conversione del file.',
    });
  }
});

// URI conversion (http:, https:, data:)
app.post('/api/convert/uri', async (req, res) => {
  const started = Date.now();
  try {
    const uri = typeof req.body?.uri === 'string' ? req.body.uri.trim() : '';
    if (!uri) {
      res.status(400).json({ error: 'Inserisci un indirizzo URL o Data URI valido.' });
      return;
    }
    const keepDataUris = Boolean(req.body?.keepDataUris);
    const out = await markItDown.convertUri(uri, { keepDataUris });
    const sourceName =
      out.streamInfo.filename || (uri.startsWith('data:') ? 'data-uri.md' : uri.slice(0, 60));

    res.json(
      buildConversionResponse(
        sourceName,
        out.result.markdown,
        out.result.title ?? null,
        out.converterUsed,
        out.streamInfo as Record<string, unknown>,
        out.sizeBytes,
        Date.now() - started
      )
    );
  } catch (err) {
    res.status(422).json({
      error: err instanceof Error ? err.message : 'Impossibile convertire l’URI indicato.',
    });
  }
});

// Sample file conversion
app.post('/api/convert/sample/:filename', async (req, res) => {
  const started = Date.now();
  try {
    const safeName = path.basename(req.params.filename || '');
    const fullPath = path.join(SAMPLES_DIR, safeName);
    await fs.access(fullPath);

    const keepDataUris = Boolean(req.body?.keepDataUris);
    const out = await markItDown.convertLocal(fullPath, { keepDataUris });

    res.json(
      buildConversionResponse(
        safeName,
        out.result.markdown,
        out.result.title ?? null,
        out.converterUsed,
        out.streamInfo as Record<string, unknown>,
        out.sizeBytes,
        Date.now() - started
      )
    );
  } catch (err) {
    res.status(404).json({
      error: err instanceof Error ? err.message : 'File campione non trovato.',
    });
  }
});

// Scan uploaded folder/files and build local MarkItDown Post-it
app.post('/api/folder/scan', upload.array('files', 40), async (req, res) => {
  try {
    const uploaded = (req.files as Express.Multer.File[]) ?? [];
    if (uploaded.length === 0) {
      res.status(400).json({ error: 'Seleziona una cartella o almeno un file da analizzare.' });
      return;
    }

    let relativePaths: string[] = [];
    if (typeof req.body?.relativePaths === 'string') {
      try {
        const parsed = JSON.parse(req.body.relativePaths);
        if (Array.isArray(parsed)) relativePaths = parsed.map(String);
      } catch {
        // ignore
      }
    }

    const folderName =
      typeof req.body?.folderName === 'string' && req.body.folderName.trim()
        ? req.body.folderName.trim()
        : 'Cartella_Selezionata';
    const customNote = typeof req.body?.customNote === 'string' ? req.body.customNote : undefined;

    const summaries: FolderFileSummary[] = [];

    for (let i = 0; i < uploaded.length; i++) {
      const f = uploaded[i];
      const base = path.basename(f.originalname);
      if (base.startsWith('_POST-IT') || base.toLowerCase() === 'desktop.ini' || base === '.directory') {
        continue;
      }
      const rel = relativePaths[i] || base;
      try {
        const out = await markItDown.convertBuffer(f.buffer, {
          filename: base,
          extension: path.extname(base).toLowerCase() || undefined,
          mimetype: f.mimetype || undefined,
        });
        const md = out.result.markdown;
        summaries.push({
          filename: base,
          relativePath: rel,
          sizeBytes: f.size,
          converterUsed: out.converterUsed,
          title: out.result.title ?? null,
          excerpt: md.slice(0, 1500),
          headings: extractMarkdownHeadings(md, 4),
          markdown: md.slice(0, 4000),
          status: 'ok',
        });
      } catch (err) {
        summaries.push({
          filename: base,
          relativePath: rel,
          sizeBytes: f.size,
          converterUsed: 'N/D',
          title: null,
          excerpt: '',
          headings: [],
          markdown: '',
          status: 'error',
          error: err instanceof Error ? err.message : 'Formato non supportato',
        });
      }
    }

    const postIt = buildLocalFolderPostIt(folderName, summaries, customNote);
    res.json(postIt);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Errore durante la scansione della cartella.',
    });
  }
});

// Scan bundled MarkItDown sample folder as instant demo
app.post('/api/folder/scan-demo', async (req, res) => {
  try {
    const customNote = typeof req.body?.customNote === 'string' ? req.body.customNote : undefined;
    const entries = await fs.readdir(SAMPLES_DIR, { withFileTypes: true });
    const fileNames = entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b));

    const summaries: FolderFileSummary[] = [];
    for (const name of fileNames) {
      const fullPath = path.join(SAMPLES_DIR, name);
      const stat = await fs.stat(fullPath);
      try {
        const out = await markItDown.convertLocal(fullPath);
        const md = out.result.markdown;
        summaries.push({
          filename: name,
          relativePath: name,
          sizeBytes: stat.size,
          converterUsed: out.converterUsed,
          title: out.result.title ?? null,
          excerpt: md.slice(0, 1500),
          headings: extractMarkdownHeadings(md, 4),
          markdown: md.slice(0, 4000),
          status: 'ok',
        });
      } catch (err) {
        summaries.push({
          filename: name,
          relativePath: name,
          sizeBytes: stat.size,
          converterUsed: 'N/D',
          title: null,
          excerpt: '',
          headings: [],
          markdown: '',
          status: 'error',
          error: err instanceof Error ? err.message : 'Errore conversione',
        });
      }
    }

    const postIt = buildLocalFolderPostIt('Cartella_Demo_MarkItDown', summaries, customNote);
    res.json(postIt);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Errore scansione cartella dimostrativa.',
    });
  }
});

// Optional AI synthesis of folder Post-it using server-side Gemini
app.post('/api/ai/folder-postit', async (req, res) => {
  try {
    const folderName =
      typeof req.body?.folderName === 'string' && req.body.folderName.trim()
        ? req.body.folderName.trim()
        : 'Cartella';
    const files = Array.isArray(req.body?.files) ? (req.body.files as FolderFileSummary[]) : [];
    const customNote = typeof req.body?.customNote === 'string' ? req.body.customNote : undefined;

    if (files.length === 0) {
      res.status(400).json({ error: 'Scansiona prima una cartella con MarkItDown.' });
      return;
    }

    const ai = getGeminiClient();
    const contextBlocks = files.slice(0, 20).map((f) => {
      if (f.status !== 'ok') {
        return `File: ${f.relativePath} (non leggibile: ${f.error ?? 'binario'})`;
      }
      return `File: ${f.relativePath} (${f.converterUsed})\nEstratto:\n${f.excerpt.slice(0, 900)}`;
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Cartella: ${folderName}\n\n${contextBlocks.join('\n\n---\n\n')}`,
      config: {
        systemInstruction:
          'Sei un assistente che crea post-it ultra-sintetici in italiano per cartelle di documenti. Rispondi SOLO con 4-6 punti elenco Markdown (- **Nome/Tema**: descrizione sintetica) che permettano di capire a colpo d’occhio cosa contiene la cartella. Niente preamboli.',
      },
    });

    const summaryMd = (response.text ?? '').trim();
    if (!summaryMd) {
      res.status(502).json({ error: 'Il modello AI non ha restituito testo.' });
      return;
    }

    const result = buildAiFolderPostItDocument(folderName, files, summaryMd, customNote);
    res.json(result);
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Errore durante la sintesi AI.',
    });
  }
});

// Optional AI Text Assistant (Ctrl+Q Write, Ctrl+D Rewrite, Ctrl+M Summarize)
app.post('/api/ai/assist', async (req, res) => {
  try {
    const mode = req.body?.mode as 'write' | 'rewrite' | 'summarize';
    const text = typeof req.body?.text === 'string' ? req.body.text : '';
    const instruction = typeof req.body?.instruction === 'string' ? req.body.instruction.trim() : '';

    if (!['write', 'rewrite', 'summarize'].includes(mode)) {
      res.status(400).json({ error: 'Modalità AI non valida.' });
      return;
    }
    if (!text.trim() && !instruction) {
      res.status(400).json({ error: 'Inserisci testo o una breve istruzione.' });
      return;
    }

    const prompts: Record<'write' | 'rewrite' | 'summarize', string> = {
      write:
        'Scrivi un testo Markdown pulito, chiaro e ben strutturato (titoli, elenchi puntati se utili) in italiano seguendo l’istruzione dell’utente. Restituisci solo il Markdown.',
      rewrite:
        'Riscrivi il seguente testo Markdown rendendolo più chiaro, scorrevole e conciso, preservando la formattazione Markdown. Restituisci solo il testo riscritto.',
      summarize:
        'Riassumi il seguente documento Markdown in un post-it sintetico con 3-5 punti elenco chiari in italiano. Restituisci solo il riassunto Markdown.',
    };

    const ai = getGeminiClient();
    const userPrompt = instruction
      ? `Istruzione: ${instruction}\n\nTesto di riferimento:\n${text.slice(0, 8000)}`
      : text.slice(0, 8000);

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: userPrompt,
      config: {
        systemInstruction: prompts[mode],
      },
    });

    const output = (response.text ?? '').trim();
    if (!output) {
      res.status(502).json({ error: 'Risposta AI vuota.' });
      return;
    }

    res.json({ result: output, mode });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Errore assistente AI.',
    });
  }
});

// Export cross-platform Folder Post-it Bundle ZIP (_POST-IT.md + desktop.ini + .bat + .directory)
app.post('/api/folder/export-zip', async (req, res) => {
  try {
    const folderName =
      typeof req.body?.folderName === 'string' && req.body.folderName.trim()
        ? req.body.folderName.trim().replace(/[^a-zA-Z0-9._-]/g, '_')
        : 'Cartella';
    const postItMarkdown = String(req.body?.postItMarkdown ?? '');
    const desktopIni = String(req.body?.desktopIni ?? '');
    const linuxDirectory = String(req.body?.linuxDirectory ?? '');
    const applyBat = String(req.body?.applyBat ?? '');

    const zip = new JSZip();
    zip.file('_POST-IT.md', postItMarkdown);
    zip.file('desktop.ini', desktopIni);
    zip.file('Applica_PostIt_Windows.bat', applyBat);
    zip.file('.directory', linuxDirectory);

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${folderName}_postit_bundle.zip"`);
    res.send(zipBuffer);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Errore creazione archivio ZIP.',
    });
  }
});

// MarkItDown MCP Streamable HTTP JSON-RPC 2.0 endpoint
app.post('/api/mcp', async (req, res) => {
  const body = req.body ?? {};
  const id = body.id ?? null;
  const method = body.method;

  if (method === 'initialize') {
    res.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2025-03-26',
        serverInfo: { name: 'markitdown-mcp', version: '1.0.0' },
        capabilities: { tools: {} },
      },
    });
    return;
  }

  if (method === 'tools/list') {
    res.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'convert_to_markdown',
            description: 'Convert a resource described by an http:, https:, or data: URI to markdown',
            inputSchema: {
              type: 'object',
              properties: { uri: { type: 'string' } },
              required: ['uri'],
            },
          },
        ],
      },
    });
    return;
  }

  if (method === 'tools/call') {
    const toolName = body.params?.name;
    const uri = body.params?.arguments?.uri;
    if (toolName !== 'convert_to_markdown' || typeof uri !== 'string') {
      res.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: 'Parametri non validi: atteso tool convert_to_markdown con uri.' },
      });
      return;
    }

    try {
      const out = await markItDown.convertUri(uri);
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: out.result.markdown }],
          isError: false,
        },
      });
    } catch (err) {
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: err instanceof Error ? err.message : 'Conversione fallita.' }],
          isError: true,
        },
      });
    }
    return;
  }

  res.status(400).json({
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Metodo MCP non supportato: ${String(method)}` },
  });
});

// Frontend serving (Vite dev middleware in development, static dist/ in production or standalone .exe)
async function startServer(): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production' || IS_STANDALONE_EXE;

  if (isProd) {
    const distDir = path.join(RUNTIME_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`MDPad + MarkItDown server attivo su http://${HOST}:${PORT}`);
    if (IS_STANDALONE_EXE && process.env.MDPAD_NO_BROWSER !== '1') {
      if (process.platform === 'win32') {
        execFile('cmd', ['/c', 'start', '', url], () => {});
      } else if (process.platform === 'darwin') {
        execFile('open', [url], () => {});
      } else {
        execFile('xdg-open', [url], () => {});
      }
    }
  });
}

startServer().catch((err) => {
  console.error('Errore avvio server:', err);
  process.exit(1);
});
