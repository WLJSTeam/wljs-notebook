//@ts-check
const { contextBridge, ipcRenderer, webUtils } = require('electron')

const { webFrame } = require('electron')

ipcRenderer.on('zoomIn', () => {
  webFrame.setZoomFactor(webFrame.getZoomFactor() * 1.5)
})

ipcRenderer.on('zoomOut', () => {
  webFrame.setZoomFactor(webFrame.getZoomFactor() / 1.5)
})

ipcRenderer.on('zoomReset', () => {
  webFrame.setZoomFactor(1.0)
})

let loadingstyle = null;

ipcRenderer.on('will-navigate', () => {
  if (loadingstyle != null) return;
  loadingstyle = document.createElement('style');
  loadingstyle.textContent = `
    * {
      cursor: wait !important;
    }
  `;

  document.head.appendChild(loadingstyle);
});

ipcRenderer.on('did-finish-load', () => {
  if (loadingstyle == null) return;
  loadingstyle.remove();
  loadingstyle = null;
});

contextBridge.exposeInMainWorld('electronAPI', {
  startDrag: (fileName) => ipcRenderer.send('ondragstart', fileName),
  
  getFilePath: (file) => {
    const path = webUtils.getPathForFile(file)
    return path
  },

  onReloadFrame: (callback) => ipcRenderer.on('reload_iframe', callback),

  onfocus: (callback) =>  ipcRenderer.on('focus', callback),
  onblur: (callback) => ipcRenderer.on('blur', callback),

  contextMenu: (callback) => ipcRenderer.on('context', callback),
  call: (callback) => ipcRenderer.on('call', callback),

  devTools: () => ipcRenderer.send('open-tools',  ''),

  listener: (name, callback) => ipcRenderer.on(name, callback),

  
  cellop: (callback) => ipcRenderer.on('cellop', callback),

  pluginsMenu: (callback) => ipcRenderer.on('pluginsMenu', callback),
  
  setProgress: (p) => ipcRenderer.send('set-progress', p),

  print: (p) => ipcRenderer.send('print', p),

  changeWindowSizeBy: (p) => ipcRenderer.send('resize-window-by', p),

  blockWindow: (state, message) => {
    ipcRenderer.send('block-window', {state:state, message:message})
  },

  openFinder: (path) => {
    console.log(path);
    ipcRenderer.send('system-open',  path);
  },


  openPath: (path, opts) => {
    console.log(path);
    ipcRenderer.send('system-open-path',  path);
  },
  openExternal: (path) => {
    console.log(path);
    ipcRenderer.send('system-open-external',  path);
  }, 
  beep: () => {
    ipcRenderer.send('system-beep');
  },  
  openFolder: (path, opts) => {
    ipcRenderer.send('system-show-folder', path);
  },    

  topMenu: (name) => {
    console.log(name);
    ipcRenderer.send('system-menu',  name);
  },

  toggleWindowSize: () => {
    ipcRenderer.send('system-window-toggle',  {});
  },

  harptic: () => {
    ipcRenderer.send('system-harptic',  {});
  },

  enlargeWindowSizeIfneeded: () => {
    ipcRenderer.send('system-window-enlarge-if-needed',  {});
  },

  showOpenDialog: (params, cbk) => {
    ipcRenderer.invoke('showOpenDialog', params).then((result) => {
      cbk(result);
    });
  },

  showSaveDialog: (params, cbk) => {
    ipcRenderer.invoke('showSaveDialog', params).then((result) => {
      cbk(result);
    });
  },

  showMessageBox: (params, cbk) => {
    ipcRenderer.invoke('showMessageBox', params).then((result) => {
      cbk(result);
    });
  },

  showErrorBox: (params, cbk) => {
    ipcRenderer.invoke('showErrorBox', params).then((result) => {
      cbk(result);
    });
  }, 

  requestScreenshot: (params, cbk) => {
    ipcRenderer.invoke('capture', params).then((result) => {
      cbk(result);
    });
  },  

  binaryBlobWrite: (params, cbk) => {
    ipcRenderer.invoke('binaryBlobWrite', params).then((result) => {
      cbk(result);
    });
  },

  windowExpand: (path) => {
    console.log(path);
    ipcRenderer.send('system-window-expand',  {});
  },

  installCli: () => {
    ipcRenderer.send('install-cli',  {});
  },  

  clearCache: () => {
    ipcRenderer.send('clear-cache',  {});
  },

  uninstallCli: () => {
    ipcRenderer.send('uninstall-cli',  {});
  },

  windowShrink: (path) => {
    console.log(path);
    ipcRenderer.send('system-window-shrink',  {});
  },   

  setZoom: (val) => {
    ipcRenderer.send('system-window-zoom-set', val);
  },

  getZoom: (cbk) => {
      ipcRenderer.invoke('system-window-zoom-get', {}).then((result) => {
        cbk(result);
      });  
  },

  toPDF: (params, cbk) => {
    ipcRenderer.invoke('print-pdf', params).then((result) => {
      cbk(result);
    });
  },

  createMenu: async (params) => {
    return await ipcRenderer.invoke('createMenu', params);
  },
  
  
  searchText: (searchText, direction) => ipcRenderer.send('search-text', { searchText, direction }),
  stopSearch: () => ipcRenderer.send('stop-search')
})

ipcRenderer.on('confirm',  (ev, params) => {
  if (window.confirm(params.message)) {
    ipcRenderer.send('confirmed',  {uid: params.uid, result: true});
  } else {
    ipcRenderer.send('confirmed',  {uid: params.uid, result: false});
  }
});

function search(direction) {
  let searched = document.getElementById("searchInput").value.trim();
  if(searched.length > 0){
      window.electronAPI.searchText(searched,direction)
  }                
  document.getElementById("searchInput").focus()
}