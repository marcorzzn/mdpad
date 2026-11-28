'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mdpadDesktop', {
  isDesktop: true,
  platform: process.platform,
  getInitialFiles: () => ipcRenderer.invoke('mdpad:get-initial-files'),
  openFileDialog: () => ipcRenderer.invoke('mdpad:open-file-dialog'),
  saveFile: (payload) => ipcRenderer.invoke('mdpad:save-file', payload),
  setWindowTitle: (title) => ipcRenderer.send('mdpad:set-title', title),
  onOpenFile: (callback) => {
    const handler = (_event, filePayload) => callback(filePayload);
    ipcRenderer.on('mdpad:open-file', handler);
    return () => ipcRenderer.removeListener('mdpad:open-file', handler);
  },
});
