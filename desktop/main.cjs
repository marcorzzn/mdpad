'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const { extractFilePathsFromArgv, isPlainTextDocumentPath } = require('./fileArgs.cjs');

// Ensure embedded server module never auto-binds to port 3000 on require
process.env.MDPAD_EMBEDDED = '1';
process.env.NODE_ENV = 'production';

let mainWindow = null;
let embeddedServer = null;
const pendingStartupFiles = [];

function resolveResourceDir(folderName) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, folderName);
  }
  return path.join(__dirname, '..', folderName);
}

async function readDiskFilePayload(rawPath) {
  try {
    const absPath = path.resolve(rawPath);
    const stat = await fs.stat(absPath);
    if (!stat.isFile()) return null;
    const name = path.basename(absPath);

    if (isPlainTextDocumentPath(absPath)) {
      const buf = await fs.readFile(absPath);
      const hasUtf8Bom =
        buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
      const text = (hasUtf8Bom ? buf.subarray(3) : buf).toString('utf8');
      const lineEnding = text.includes('\r\n') ? 'CRLF' : 'LF';
      return {
        filePath: absPath,
        name,
        isBinary: false,
        content: text.replace(/\r\n/g, '\n'),
        encoding: hasUtf8Bom ? 'UTF-8-BOM' : 'UTF-8',
        lineEnding,
      };
    }

    const buf = await fs.readFile(absPath);
    return {
      filePath: absPath,
      name,
      isBinary: true,
      base64: buf.toString('base64'),
    };
  } catch {
    return null;
  }
}

function encodeBufferForDisk(content, encoding, lineEnding) {
  const normalized = String(content ?? '').replace(/\r?\n/g, lineEnding === 'CRLF' ? '\r\n' : '\n');
  if (encoding === 'UTF-8-BOM') {
    return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(normalized, 'utf8')]);
  }
  if (encoding === 'ANSI') {
    return Buffer.from(normalized, 'latin1');
  }
  return Buffer.from(normalized, 'utf8');
}

async function queueOrDispatchPaths(pathsList) {
  for (const rawPath of pathsList) {
    const payload = await readDiskFilePayload(rawPath);
    if (!payload) continue;
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isLoading()) {
      mainWindow.webContents.send('mdpad:open-file', payload);
    } else {
      pendingStartupFiles.push(payload);
    }
  }
}

function createMainWindow(serverUrl) {
  const iconPath = path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 680,
    minHeight: 460,
    title: 'MDPad',
    icon: iconPath,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Remove default Electron chrome menu bar so MDPad's classic Notepad menu bar sits at the top edge
  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  // Open external http/https links in the system default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url) && !url.startsWith(serverUrl)) {
      shell.openExternal(url).catch(() => {});
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (/^https?:\/\//i.test(url) && !url.startsWith(serverUrl)) {
      event.preventDefault();
      shell.openExternal(url).catch(() => {});
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.loadURL(serverUrl).catch((err) => {
    dialog.showErrorBox('MDPad', `Impossibile caricare l'interfaccia: ${err.message}`);
  });
}

// Enforce single instance so double-clicking another .md file opens a new tab in the active window
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const incomingPaths = extractFilePathsFromArgv(argv, app.isPackaged);
    void queueOrDispatchPaths(incomingPaths);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    void queueOrDispatchPaths([filePath]);
  });

  ipcMain.handle('mdpad:get-initial-files', () => {
    const files = pendingStartupFiles.splice(0, pendingStartupFiles.length);
    return files;
  });

  ipcMain.handle('mdpad:open-file-dialog', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Apri documento con MDPad',
      properties: ['openFile'],
      filters: [
        { name: 'Markdown e Testo', extensions: ['md', 'markdown', 'txt', 'ini'] },
        {
          name: 'Documenti (conversione MarkItDown)',
          extensions: ['pdf', 'docx', 'xlsx', 'xls', 'pptx', 'html', 'htm', 'csv', 'json', 'xml', 'epub', 'zip'],
        },
        { name: 'Tutti i file', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePaths.length) return null;
    return readDiskFilePayload(result.filePaths[0]);
  });

  ipcMain.handle('mdpad:save-file', async (_event, payload) => {
    const { filePath, suggestedName, content, encoding, lineEnding, forceSaveAs } = payload || {};
    let targetPath = forceSaveAs ? '' : filePath;

    if (!targetPath) {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Salva documento',
        defaultPath: suggestedName || 'Documento.md',
        filters: [
          { name: 'Markdown (*.md)', extensions: ['md', 'markdown'] },
          { name: 'Testo semplice (*.txt)', extensions: ['txt'] },
          { name: 'Tutti i file', extensions: ['*'] },
        ],
      });
      if (result.canceled || !result.filePath) {
        return { canceled: true };
      }
      targetPath = result.filePath;
    }

    const buffer = encodeBufferForDisk(content, encoding, lineEnding);
    await fs.writeFile(targetPath, buffer);
    return {
      canceled: false,
      filePath: targetPath,
      name: path.basename(targetPath),
    };
  });

  ipcMain.on('mdpad:set-title', (_event, title) => {
    if (mainWindow && !mainWindow.isDestroyed() && typeof title === 'string' && title.trim()) {
      mainWindow.setTitle(title.trim());
    }
  });

  app.whenReady().then(async () => {
    const startupPaths = extractFilePathsFromArgv(process.argv, app.isPackaged);
    for (const rawPath of startupPaths) {
      const payload = await readDiskFilePayload(rawPath);
      if (payload) pendingStartupFiles.push(payload);
    }

    try {
      const { startMdPadServer } = require('./server-bundle.cjs');
      embeddedServer = await startMdPadServer({
        port: 0,
        host: '127.0.0.1',
        staticDir: resolveResourceDir('dist'),
        samplesDir: path.join(resolveResourceDir('public'), 'samples'),
        openBrowser: false,
      });

      createMainWindow(embeddedServer.url);
    } catch (err) {
      dialog.showErrorBox(
        'MDPad - Errore di avvio',
        `Impossibile avviare il motore interno di MDPad.\n\n${err && err.message ? err.message : String(err)}`
      );
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    if (embeddedServer) {
      const srv = embeddedServer;
      embeddedServer = null;
      srv.close().catch(() => {});
    }
  });
}
