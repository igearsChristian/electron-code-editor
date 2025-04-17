const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'electron',
    {
        openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
        saveFile: (data) => ipcRenderer.invoke('save-file', data),
        saveFileDialog: (data) => ipcRenderer.invoke('save-file-dialog', data)
    }
);
