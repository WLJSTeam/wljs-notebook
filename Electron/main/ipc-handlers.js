function registerIpcHandlers({
    BrowserWindow,
    Deferred,
    Menu,
    appDataFolder,
    blockedWindows,
    blockedWindowMessages,
    callFakeMenu,
    createWindow,
    cropPdfBuffer,
    dialog,
    fs,
    globalShortcut,
    ipcMain,
    isMac,
    mkdir,
    path,
    screen,
    server,
    session,
    shell,
    shortcut,
    trackpadUtils,
    uuid4,
    windows,
    wolframRuntime,
    writeFile
}) {
    const blocked_windows = blockedWindows;
    const blocked_windows_messages = blockedWindowMessages;
    const create_window = createWindow;
    ipcMain.on('system-harptic', () => {
        trackpadUtils.triggerFeedback();
    });

    ipcMain.on('system-window-zoom-set', (e, value) => {
        e.sender.setZoomLevel(value-1);
    });

    ipcMain.handle('system-window-zoom-get', async (e) => {
        return e.sender.getZoomLevel()+1;
    });

    ipcMain.on('print', (e, opts) => {
        e.sender.print({printBackground: true})
    });

    ipcMain.handle('print-pdf', async (e, opts) => {
        const promiseBuf = await e.sender.printToPDF({
            printBackground:false,
            ...opts
        });

        const margin = opts.margin || 10;

        if (opts.crop) {
            console.log('Cropping...');
            const cropped = await cropPdfBuffer(promiseBuf, margin)
            return cropped
        }

        return promiseBuf
    });


    ipcMain.handle('createMenu', async (e, args) => {
        //const w = BrowserWindow.fromWebContents(e.sender);
        const p = new Deferred();
        let closedQ = false;

        const menu = Menu.buildFromTemplate(args.map((assoc) => {
            const ref = assoc.ref;
            if (!ref) {
                return assoc;
            }
            const copy = {...assoc};
            if (Array.isArray(copy.accelerator)) {
                copy.accelerator = isMac ? copy.accelerator[1] : copy.accelerator[0];
            }
            return {
                ...copy,
                click: () => {
                    p.resolve(ref);
                    closedQ = true;
                }
            }
        }));

        menu.popup({callback: () => {
            if (!closedQ) p.resolve(false);
        }});

        return await p.promise;
    })

    const savedBlobs = new Map();

    async function writeOneBlob({ uid, filePath }) {
      const blob = savedBlobs.get(uid);
      if (!blob) return false;

      const data = blob.toPNG();

      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, data); // overwrites by default

      savedBlobs.delete(uid);
      return true;
    }

    async function writeManyBlobs(
      items,
      concurrency = 1,
    ) {
      let index = 0;
      const results = new Array(items.length);

      async function worker() {
        while (index < items.length) {
          const currentIndex = index++;
          results[currentIndex] = await writeOneBlob(items[currentIndex]);
        }
      }

      await Promise.all(
        Array.from(
          { length: Math.min(concurrency, items.length) },
          worker,
        ),
      );

      return results;
    }

    ipcMain.handle(
      'binaryBlobWrite',
      async (e, payload) => {
        if (Array.isArray(payload)) {
          return writeManyBlobs(payload);
        }

        return writeOneBlob(payload);
      },
    );

    function trimTransparent(nativeImage) {
      const { width, height } = nativeImage.getSize();
      const bitmap = nativeImage.toBitmap(); // BGRA on Electron

      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const offset = (y * width + x) * 4;
          const alpha = bitmap[offset + 3];

          if (alpha !== 0) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX === -1) {
        return nativeImage; // fully transparent
      }

      return nativeImage.crop({
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      });
    }

    ipcMain.handle('capture', async (e, area) => {
        let zoom = e.sender.zoomFactor;
        const windowId = e.sender.id;

        if (area) {
          area.x = Math.round(area.x * zoom);
          area.y = Math.round(area.y * zoom);
          area.width = Math.round(area.width * zoom);
          area.height = Math.round(area.height * zoom);
          //a bug. it always adds transparent region on the right side
          //it only occurs for offscreen window
          const img = trimTransparent(await e.sender.capturePage(area));
          if (area.toBlob) {
            const uid = uuid4();
            savedBlobs.set(uid, img);
            return uid;
          }

          return img.toDataURL();
        } else {
          const img = await e.sender.capturePage(area)
          return img.toDataURL();
        }
    });

    ipcMain.on('set-progress', (e, p) => {
        const senderWindow = BrowserWindow.fromWebContents(e.sender); // BrowserWindow or null
        if (senderWindow)
            senderWindow.setProgressBar(p);
    });

    ipcMain.on('confirmed', (e, p) => {
        if (blocked_windows_messages[p.uid]) {
            blocked_windows_messages[p.uid](p.result);
            delete blocked_windows_messages[p.uid];
        }
    });


    ipcMain.on('block-window', (e, p) => {
        const senderWindow = BrowserWindow.fromWebContents(e.sender); // BrowserWindow or null
        if (senderWindow) {
            if (p.state) {
                if (!blocked_windows[senderWindow.id]) {
                    blocked_windows[senderWindow.id] = {window: senderWindow, message:p.message};
                }
            } else {
                if (blocked_windows[senderWindow.id]) {
                    delete blocked_windows[senderWindow.id];
                }
            }
        }
    });

    ipcMain.on('system-window-enlarge-if-needed', (e, p) => {
        const bonds = windows.focused.win.getBounds();
        if (bonds.width < 800) {
            windows.focused.win.setBounds({ width: 800 , animate: true}, true);
        }
    });

    ipcMain.on('clear-cache', (e) => {
        const senderWindow = BrowserWindow.fromWebContents(e.sender); // BrowserWindow or null
        windows.log.print('Cache reset');

        session.defaultSession.clearStorageData();
        session.defaultSession.clearCache();

        if (senderWindow) {
            const ses = senderWindow.webContents.session;
            ses.clearCache();
        }
    });

    ipcMain.on('resize-window-by', (e, delta) => {
        const senderWindow = BrowserWindow.fromWebContents(e.sender); // BrowserWindow or null
        if (senderWindow) {
            const bonds = senderWindow.getBounds();
            const pos = senderWindow.getPosition();
            const dims = senderWindow.getSize();

            const primaryDisplay = screen.getPrimaryDisplay();
            const { width, height } = primaryDisplay.workAreaSize;

            if (delta[0] === 0) {
                if (bonds.height + delta[1] > height*0.5) {
                    console.log('Large resize. Adjusting...');
                    let mid = height/2.0 - ((bonds.height + delta[1])/2.0);
                    if (mid < 0)
                        mid = 100;

                    let wheight = bonds.height + delta[1];
                    if (wheight + mid > height) {
                        console.log('OVERLOFW!');
                        wheight = height - mid - 100;
                    }
                    console.log({ y: mid, height: wheight, animate: true});
                    senderWindow.setBounds({  height: wheight, animate: true}, true);
                    if (wheight > height / 1.45) senderWindow.center();
                } else {
                    console.log('Not too big');
                    let mid = bonds.y;
                    let wheight = bonds.height + delta[1];
                    if (wheight + mid > height) wheight = height - mid - 100;

                    console.log({ height: wheight, animate: true});
                    senderWindow.setBounds({ height: wheight, animate: true}, true);
                    if (wheight > height / 1.45) senderWindow.center();
                }
                //senderWindow.center();
            } else {
                let wwidth = bonds.width + delta[0];
                if (bonds.height + delta[1] > height*0.5) {
                    console.log('Large resize. Adjusting...');
                    let mid = height/2.0 - ((bonds.height + delta[1])/2.0);
                    if (mid < 0)
                        mid = 100;

                    let wheight = bonds.height + delta[1];
                    if (wheight + mid > height) {
                        console.log('OVERLOFW!');
                        wheight = height - mid - 100;
                    }

                    senderWindow.setBounds({  width: wwidth, height: wheight, animate: true}, true);
                    if (wheight > height / 1.45) senderWindow.center();
                } else {
                    console.log('Not too big');
                    let mid = bonds.y;
                    let wheight = bonds.height + delta[1];
                    if (wheight + mid > height) wheight = height - mid - 100;

                    senderWindow.setBounds({ width: wwidth, height: wheight, animate: true}, true);
                    if (wheight > height / 1.45) senderWindow.center();
                }

                //senderWindow.center();
            }

        }
    })

    ipcMain.on('set-min-size', (e, minWidth, minHeight) => {
        const senderWindow = BrowserWindow.fromWebContents(e.sender); // BrowserWindow or null
        if (
            senderWindow &&
            Number.isFinite(minWidth) && minWidth >= 0 &&
            Number.isFinite(minHeight) && minHeight >= 0
        ) {
            senderWindow.setMinimumSize(Math.round(minWidth), Math.round(minHeight));
        }
    });

    ipcMain.on('system-window-toggle', (e, p) => {
        const bonds = windows.focused.win.getBounds();
        if (bonds.width < 800) {
            if (windows.focused.win.previousWidth) {
                windows.focused.win.setBounds({ width: windows.focused.win.previousWidth , animate: true}, true);
            } else {
                windows.focused.win.setBounds({ width: 800 , animate: true}, true);
            }
        } else {
            windows.focused.win.previousWidth = bonds.width;
            windows.focused.win.setBounds({ width: 600 , animate: true}, true);
        }
    });

    ipcMain.handle('showOpenDialog', async (event, p) => {
        console.log(p);
        const result = await dialog.showOpenDialog(p);
        return result;
    });

    ipcMain.handle('showSaveDialog', async (event, p) => {
        console.log(p);
        const result = await dialog.showSaveDialog(p);
        return result;
    });

    ipcMain.handle('showMessageBox', async (event, p) => {
        console.log(p);
        const result = await dialog.showMessageBox(p);
        return result;
    });

    ipcMain.handle('showErrorBox', async (event, p) => {
        console.log(p);
        const result = await dialog.showErrorBox(p.title, p.content);
        return result;
    });

    ipcMain.on('system-window-expand', (e, p) => {
        windows.focused.win.setBounds({ width: 800 , animate: true});
    });

    ipcMain.on('open-tools', () => {
        console.warn('Dev tools!');
        windows.focused.win.webContents.openDevTools()
    });

    ipcMain.on('system-window-shrink', (e, p) => {
        windows.focused.win.setBounds({ width: 600 , animate: true});
    });

    //set up search on-page (any focused windows)
    ipcMain.on('search-text', (event, arg) => {
        let nextRes = arg.direction == 'next' ? true : false
        const requestId = windows.focused.win.webContents.findInPage(arg.searchText, {
            forward: true,
            findNext: nextRes,
            matchCase: false
        });
    });
    ipcMain.on('stop-search', (event, arg) => {
        windows.focused.win.webContents.stopFindInPage('clearSelection');
    });

    //system commands to open file explorers and etc
    ipcMain.on('system-open', (e, p) => {
        const dir = JSON.parse(p);
        if (dir[0].length == 0) {
            shell.showItemInFolder('/'+path.join(...dir));
        } else {
            shell.showItemInFolder(path.join(...dir));
        }
    });

    ipcMain.on('system-menu', (e, p) => {
        const menusection = p;
        callFakeMenu[menusection]();
    });

    ipcMain.on('system-open-external', (e, p) => {
        const url = p;
        console.log('Open url: ', p);
        shell.openExternal(url);
    });

    ipcMain.on('system-open-path', (e, p) => {
        const url = path.join(...p);
        console.log('Open path: ', url);
        if (!fs.existsSync(url)) {
            shell.openPath('/'+url);
        } else {
            shell.openPath(url);
        }
    });

    ipcMain.on('system-show-folder', (e, p) => {
        const url = path.join(...p);
        console.log('Open dir: ', url);
        if (!fs.existsSync(url)) {
            shell.showItemInFolder('/'+url);
        } else {
            shell.showItemInFolder(url);
        }
    });



    ipcMain.on('system-beep', (e, p) => {
        shell.beep();
    });



    //promts resolver
    ipcMain.on('promt-resolve', (e, id, val) => {
        wolframRuntime.resolvePrompt(id, val);
    });

    ipcMain.on('locate-logfile', () => {
        shell.showItemInFolder(appDataFolder);
    });

    globalShortcut.register(shortcut("overlay"), () => {
        if (server.running)
            create_window({url: server.url.default() + '/prompt', title: 'Overlay', overlay: true, show: true, focus: true});
    });

}

module.exports = { registerIpcHandlers };
