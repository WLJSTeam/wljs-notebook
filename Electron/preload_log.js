//@ts-check
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  handleLogs: (callback) => ipcRenderer.on('push-logs', callback),
  addPromt: (callback) => ipcRenderer.on('promt', callback),
  updateInfo: (callback) => ipcRenderer.on('info', callback),
  updateVersion: (callback) => ipcRenderer.on('version', callback),
  handleNews: (callback) => ipcRenderer.on('news-items', callback),
  addDialog: (callback) => ipcRenderer.on('yesorno', callback),
  clear: (callback) => ipcRenderer.on('clear', callback),
  locateLogFile: () => {
    ipcRenderer.send('locate-logfile', {})
  },
  reinstall: () => {
    ipcRenderer.send('reinstall', {})
  },
  debug: () => {
    ipcRenderer.send('debug', {})
  },  
  update: () => {
    ipcRenderer.send('update', {})
  },
  resolveInput: (id, data) => {
    // Send IPC event to main process to read the file.
    ipcRenderer.send('promt-resolve', id, data)
  }
})
