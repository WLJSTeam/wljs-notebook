function createMenuManager({
    Menu,
    app,
    appDataFolder,
    contextMenuExtensions,
    createWindow,
    dialog,
    extensionManager,
    fs,
    isMac,
    path,
    rootAppFolder,
    server,
    shell,
    showProcessLogs,
    userExtensions,
    windows
}) {
    const create_window = createWindow;
    /* extesions for contex menu */
    const pluginsMenu = {};

    pluginsMenu.items = {};
    pluginsMenu.fetch = () => {
        pluginsMenu.items = {kernel: [], edit: [], view: [], file: [], misc: []}

        const collectPackageMenus = (packageMetadata) => {
            const metadata = packageMetadata["wljs-meta"];
            if (!metadata) return;

            if (metadata.menu) {
                metadata.menu.forEach(mi => {
                    const mitem = {
                        label: mi["label"],
                        click: async(ev) => {
                            console.log(ev);
                            windows.focused.call('extension', mi["event"]);
                        }
                    };

                    if (mi["accelerator"]) {
                        mitem.accelerator = isMac ? mi["accelerator"][0] : mi["accelerator"][1];
                    }

                    if (metadata.priority) {
                        mitem.priority = metadata.priority;
                    } else {
                        mitem.priority = 1;
                    }

                    let section = mi["section"];
                    if (!section) section = "misc";

                    if (!(pluginsMenu.items[section].find((el) => { return el.label == mitem.label })))
                        pluginsMenu.items[section].push(mitem);
                });
            }

            if (metadata.contextMenu) {
                metadata.contextMenu.forEach(mi => {
                    const mitem = {
                        label: mi["label"],
                        event: mi["event"],
                        visible: true,
                    };

                    if (mi["visible"]) {
                        mitem.visible = mi["visible"];
                    }

                    if (!(contextMenuExtensions.find((el) => { return el.label == mitem.label })))
                        contextMenuExtensions.push(mitem);
                });
            }
        };

        const defaultPath = path.join(rootAppFolder, 'modules');
        extensionManager.discover([defaultPath, userExtensions], collectPackageMenus);
    }


    //load shortcuts
    let shortcuts_table = require("../shortcuts.json");
    if (fs.existsSync(path.join(appDataFolder, "Electron", "shortcuts.json"))) {
        shortcuts_table = JSON.parse(fs.readFileSync(path.join(appDataFolder, "Electron", "shortcuts.json"), 'utf8'));
    }

    const shortcut = (id) => {

        if (! shortcuts_table[id]) return undefined;
        if (process.platform === 'darwin') return shortcuts_table[id][0]
        return shortcuts_table[id][1]
    }


    //build TOP MENU

    const callFakeMenu = {}

    let buildMenu = {};
    buildMenu = (opts) => {
        //default options
        const defaults = {
            footermenu: [],
            localmenu: true,
            plugins: []
        };

        const options = Object.assign({}, defaults, opts);

        const template = [
            // { role: 'appMenu' }
            ...(isMac ? [{
                label: app.name,
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    ...(options.footermenu),
                    { label: 'Close app', accelerator: shortcut('quit'), click: (ev) => {
                        console.warn('Quit dialog');
                        dialog.showMessageBox({message: 'Are you sure you want to quit?', type:'question', buttons:['Yes', 'No']}).then((res) => {
                            if (res.response == 0) {
                                app.quit();
                            }
                        })

                    }}
                ]
            }] : []),
            // { role: 'fileMenu' }
            {
                label: 'File',
                submenu: [{
                        label: 'New',
                        accelerator: shortcut('new_file'),
                        click: async(ev) => {
                            console.log(ev);
                            windows.focused.call('newshortnote', true);
                        }
                    },
                    {
                        label: 'Open File',
                        accelerator: shortcut('open_file'),
                        click: async() => {
                            const promise = dialog.showOpenDialog({
                                title: 'Open File',
                                filters: [
                                    { name: 'Notebooks', extensions: ['wln', 'nb', 'md', 'html', 'wlw', 'wl'] }
                                ],
                                properties: ['openFile']
                            });

                            promise.then((res) => {
                                if (!res.canceled) {
                                    app.addRecentDocument(res.filePaths[0]);
                                    create_window({url: server.url.default('local') + `/` + encodeURIComponent(res.filePaths[0]), title: res.filePaths[0]});
                                }
                            });
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'New note in folder',
                        accelerator: shortcut('new_file_folder'),
                        click: async(ev) => {
                            console.log(ev);
                            windows.focused.call('newnotebook', true);
                        }
                    },
                    ...(options.plugins.file.sort((a, b)=> (a.priority - b.priority))),
                    { type: 'separator' },
                    {
                        label: 'Prompt call',
                        click: async(ev) => {
                            console.log(ev);
                            if (server.running)
                                create_window({url: server.url.default() + '/prompt', title: 'Overlay', overlay: true, show: true, focus: true});
                        }
                    },
                    { type: 'separator' },
                    ...((options.localmenu) ? [
                        {
                            label: 'Open Folder',

                            click: async() => {
                                const promise = dialog.showOpenDialog({ title: 'Open Vault', properties: ['openDirectory'] });
                                promise.then((res) => {
                                    if (!res.canceled) {
                                        app.addRecentDocument(res.filePaths[0]);
                                        create_window({url: server.url.default('local') + `/folder/` + encodeURIComponent(res.filePaths[0]), title: res.filePaths[0]});
                                    }
                                });
                            }
                        },
                        {
                            "label":"Open Recent",
                            "role":"recentdocuments",
                            "submenu":[
                              {
                                "label":"Clear Recent",
                                "role":"clearrecentdocuments"
                              }
                            ]
                          }
                    ] : []),
                    { type: 'separator' },
                    {
                        label: 'Save',
                        accelerator: shortcut('save'),
                        click: async(ev) => {
                            console.log(ev);
                            windows.focused.call('save', true);

                        }
                    },
                    {
                        label: 'Save As',
                        click: async() => {
                            const promise = dialog.showSaveDialog({ title: 'Save as', properties: ['createDirectory'], filters: [
                                { name: 'Notebooks', extensions: ['wln'] }
                            ],});
                            promise.then((res) => {
                                if (!res.canceled) {
                                    app.addRecentDocument(res.filePath);

                                    console.log(res.filePath);
                                    windows.focused.call('saveas', encodeURIComponent(res.filePath) );
                                }
                            });
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Print',
                        click: async(ev) => {

                            windows.focused.call('print', true);
                            //windows.focused.win.webContents.print({silent: false, printBackground: false, deviceName: ''}, console.log);
                        }
                    },
                    /*{ type: 'separator' },
                    {
                        label: 'Share',
                        submenu: [{
                                label: 'HTML',
                                click: async(ev) => {
                                    windows.focused.call('share', 'HTML');
                                }
                            },

                            {
                                label: 'React',
                                click: async(ev) => {
                                    windows.focused.call('share', 'React');
                                }
                            }
                        ]
                    },*/
                    ...((options.localmenu) ? [{ type: 'separator' },
                        {
                            label: 'Open Examples',
                            click: async(ev) => {
                                create_window({url: server.url.default('local') + `/folder/` + encodeURIComponent(path.join(app.getPath('documents'), 'WLJS Notebooks', 'Demos')), title: 'Examples'});
                            }
                        },
                        { type: 'separator' },
                        {
                            label: 'Reopen as quick note',
                            click: (ev) => {
                                windows.focused.call('reopenasquick', true);
                            }
                        },

                        {
                            label: 'Reopen in browser',
                            click: (ev) => {
                                server.browserMode = true;
                                shell.openExternal(windows.focused.win.webContents.getURL());
                            }
                        },
                        ...(isMac ? [{ type: 'separator' }] : [
                            { label: 'Close app', accelerator: shortcut('quit'), click: (ev) => {
                                console.warn('Quit dialog');
                                dialog.showMessageBox({message: 'Are you sure you want to quit?', type:'question', buttons:['Yes', 'No']}).then((res) => {
                                    if (res.response == 0) {
                                        app.quit();
                                    }
                                })

                            }}
                        ])
                    ] : []),
                    //win.webContents.send('context', 'Iconize');
                    ...(isMac ? [] : [{ type: 'separator' }, ...(options.footermenu)])
                ]
            },
            // { role: 'editMenu' }
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' },
                    /*{ type: 'separator' },
                    {
                        label: 'Find',
                        accelerator: shortcut('find'),
                        click: (ev) => {
                            windows.focused.call('Find');
                        }
                    },*/
                    { type: 'separator' },
                    {
                        label: 'Hide/Unhide cell',
                        accelerator: shortcut('toggle_cell'),
                        click: async(ev) => {
                            console.log(ev);
                            windows.focused.call('togglecell');
                        }
                    },
                    {
                        label: 'Unhide All Cells',
                        click: async(ev) => {
                            console.log(ev);
                            windows.focused.call('unhideallcells', true);
                        }
                    },

                    { type: 'separator' },
                    {
                        label: 'Delete cell',
                        accelerator: shortcut('delete_cell'),
                        click: async(ev) => {
                            console.log(ev);
                            windows.focused.call('deletecell', true);
                        }
                    },
                    { type: 'separator' },
                    ...(options.plugins.edit.sort((a, b)=> (b.priority - a.priority))),
                    ...(isMac ? [
                        { role: 'pasteAndMatchStyle' },
                        { role: 'delete' },
                        { role: 'selectAll' },
                        { type: 'separator' },
                        {
                            label: 'Speech',
                            submenu: [
                                { role: 'startSpeaking' },
                                { role: 'stopSpeaking' }
                            ]
                        }
                    ] : [
                        { role: 'delete' },
                        { type: 'separator' },
                        { role: 'selectAll' }
                    ])
                ]
            },
            // { role: 'windowMenu' }
            {
                label: 'Window',
                submenu: [
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { role: 'toggleDevTools' },
                    { type: 'separator' },
                    { role: 'minimize' },
                    { role: 'zoom' },
                    {
                        label: 'Always on top',
                        click: async(ev) => {
                            console.log(ev);
                            if (windows.focused.win.isAlwaysOnTop()) {
                                windows.focused.win.setAlwaysOnTop(false);
                            } else {
                                windows.focused.win.setAlwaysOnTop(true);
                            }
                        }
                    },
                    ...(options.plugins.view.sort((a, b)=> (a.priority - b.priority))),
                    { type: 'separator' },
                    { role: 'resetZoom' },
                    { role: 'zoomIn' },
                    { role: 'zoomOut' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' },
                    ...(isMac ? [
                        { type: 'separator' },
                        { role: 'front' }
                    ] : [])
                ]
            },

            {
                label: 'Evaluation',
                submenu: [{
                        label: 'Abort',
                        accelerator: shortcut('abort'),
                        click: async(ev) => {
                            console.log(ev);
                            windows.focused.call('abort', true);
                        }
                    },

                    {
                        label: 'Evaluate Initializing Cells',
                        accelerator: shortcut('evaluate_init'),
                        click: async(ev) => {
                            console.log(ev);
                            windows.focused.call('evaluateinit', true);
                        }
                    },
                    {
                        label: 'Evaluate All Cells',
                        accelerator: shortcut('evaluate_all'),
                        click: async(ev) => {
                            console.log(ev);
                            windows.focused.call('evaluateall', true);
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Clear Output Cells',
                        accelerator: shortcut('clear_outputs'),
                        click: async(ev) => {
                            console.log(ev);
                            windows.focused.call('clearoutputs', true);
                        }
                    },
                    {
                        label: 'Trashed Cells',
                        click: async(ev) => {
                            console.log(ev);
                            windows.focused.call('untrashcell', true);
                        }
                    },

                    {
                        label: 'Change Kernel',
                        click: async(ev) => {
                            console.log(ev);
                            windows.focused.call('changekernel', true);
                        }
                    },

                    ...(options.plugins.kernel.sort((a, b)=> (a.priority - b.priority))),

                    { type: 'separator' },

                    {
                        label: 'Kernel',
                        submenu: [{
                                label: 'New Evaluation Kernel',
                                click: async(ev) => {
                                    console.log(ev);
                                    windows.focused.call('newlocalkernel', true);
                                }
                            },
                            {
                                label: 'Restart',
                                click: async(ev) => {
                                    console.log(ev);
                                    windows.focused.call('restartkernel', true);
                                }
                            },
                            {
                                label: 'Shutdown all',
                                click: async(ev) => {
                                    console.log(ev);
                                    windows.focused.call('killallkernels', true);
                                }
                            }
                        ]
                    }
                ]
            },

            {
                label: 'Misc',
                submenu: [{
                        label: 'Settings',
                        click: async(ev) => {
                            console.log(ev);
                            windows.focused.call('settings', true);
                        }
                    },
                    {
                        label: 'Show logs',
                        click: showProcessLogs
                    },
                    { type: 'separator' },

                    ...(options.plugins.misc.sort((a, b)=> (a.priority - b.priority)))
                ]
            }
        ];

        const noMenu = [
            // { role: 'appMenu' }
            ...(isMac ? [{
                label: app.name,
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    ...(options.footermenu),
                    { label: 'Close app', accelerator: shortcut('quit'), click: (ev) => {
                        console.warn('Quit dialog');
                        dialog.showMessageBox({message: 'Are you sure you want to quit?', type:'question', buttons:['Yes', 'No']}).then((res) => {
                            if (res.response == 0) {
                                app.quit();
                            }
                        })

                    }}
                ]
            }] : []),
            // { role: 'fileMenu' }
            ...(isMac ? [] : [{
                label: 'File',
                submenu: [
                        ...(isMac ? [{ type: 'separator' }] : [
                            { label: 'Close app', accelerator: shortcut('quit'), click: (ev) => {
                                console.warn('Quit dialog');
                                dialog.showMessageBox({message: 'Are you sure you want to quit?', type:'question', buttons:['Yes', 'No']}).then((res) => {
                                    if (res.response == 0) {
                                        app.quit();
                                    }
                                })

                            }}
                        ])
                ]
            }]),

            {
                label: 'Window',
                submenu: [
                    { role: 'toggleDevTools' }
                ]
            }
        ];

        buildMenu.small = Menu.buildFromTemplate(noMenu);
        buildMenu.main  = Menu.buildFromTemplate(template);
    }

    callFakeMenu["openFile"] = async () => {
        const promise = dialog.showOpenDialog({
            title: 'Open File',
            filters: [
                { name: 'Notebooks', extensions: ['wln', 'nb', 'md', 'html', 'wlw', 'wl'] }
            ],
            properties: ['openFile']
        });

        promise.then((res) => {
            if (!res.canceled) {
                app.addRecentDocument(res.filePaths[0]);
                create_window({url: server.url.default('local') + `/` + encodeURIComponent(res.filePaths[0]), title: res.filePaths[0]});
            }
        });
    }

    callFakeMenu["openFolder"] = async () => {
        const promise = dialog.showOpenDialog({ title: 'Open Vault', properties: ['openDirectory'] });
        promise.then((res) => {
            if (!res.canceled) {
                app.addRecentDocument(res.filePaths[0]);
                create_window({url: server.url.default('local') + `/folder/` + encodeURIComponent(res.filePaths[0]), title: res.filePaths[0]});
            }
        });
    }

    callFakeMenu["Save"] = async () => {
        windows.focused.call('save', true);
    }

    callFakeMenu["print"] = async (ev) => {
        windows.focused.call('print', true);
        //windows.focused.call('print', true);
    }


    callFakeMenu["SaveAs"] = async () => {
        const promise = dialog.showSaveDialog({ title: 'Save as', properties: ['createDirectory'], filters: [
            { name: 'Notebooks', extensions: ['wln'] }
        ],});
        promise.then((res) => {
            if (!res.canceled) {
                app.addRecentDocument(res.filePath);
                console.log(res.filePath);
                windows.focused.call('saveas', encodeURIComponent(res.filePath) );
            }
        });
    }

    callFakeMenu["OnTop"] = async(ev) => {
        console.log(ev);
        if (windows.focused.win.isAlwaysOnTop()) {
            windows.focused.win.setAlwaysOnTop(false);
        } else {
            windows.focused.win.setAlwaysOnTop(true);
        }
    }

    callFakeMenu["new"] = async(ev) => {
        console.log(ev);
        windows.focused.call('newnotebook', true);
    }

    callFakeMenu["newshort"] = async(ev) => {
        windows.focused.call('newshortnote', true);
    }

    callFakeMenu["acknowledgments"] = async(ev) => {
        windows.focused.call('acknowledgments', true);
    }


    callFakeMenu["browser"] = async(ev) => {
        server.browserMode = true;
        shell.openExternal(windows.focused.win.webContents.getURL());
    }

    callFakeMenu["abort"] = () => {
        windows.focused.call('abort', true);
    }


    callFakeMenu["untrashcell"] = () => {
        windows.focused.call('untrashcell', true);
    }

    callFakeMenu["clearoutputs"] = () => {
        windows.focused.call('clearoutputs', true);
    }

    callFakeMenu["togglecells"] = () => {
        windows.focused.call('togglecell', true);
    }

    callFakeMenu["evalInit"] = () => {
        windows.focused.call('evaluateinit', true);
    }

    callFakeMenu["evalAll"] = () => {
        windows.focused.call('evaluateall', true);
    }

    callFakeMenu["restartkernels"] = () => {
        windows.focused.call('restartkernel', true);
    }

    callFakeMenu["newlocalkernel"] = () => {
        windows.focused.call('newlocalkernel', true);
    }

    callFakeMenu["shutdownall"] = () => {
        windows.focused.call('killallkernels', true);
    }

    callFakeMenu["zoomIn"] = () => {
        windows.focused.call('zoomIn', true);
    }

    callFakeMenu["devTools"] = () => {
        windows.focused.win.webContents.openDevTools()
    }

    callFakeMenu["showProcessLogs"] = showProcessLogs;

    callFakeMenu["zoomOut"] = () => {
        windows.focused.call('zoomOut', true);
    }

    callFakeMenu["zoomReset"] = () => {
        windows.focused.call('zoomReset', true);
    }


    callFakeMenu["locateExamples"] = async(ev) => {
        create_window({url: server.url.default('local') + `/folder/` + encodeURIComponent(path.join(app.getPath('documents'), 'WLJS Notebooks', 'Demos')), title: 'Examples'});
    }

    callFakeMenu["locateAppData"] = async(ev) => {
        console.log(ev);
        shell.showItemInFolder(appDataFolder);
    }

    callFakeMenu["reload"] = () => {
        windows.focused.win.webContents.reloadIgnoringCache();
    }

    callFakeMenu["docsx"] = () => {
        shell.openExternal('http://127.0.0.1:20540')
    }

    callFakeMenu["prompt"] = () => {
        if (server.running)
            create_window({url: server.url.default() + '/prompt', title: 'Overlay', overlay: true, show: true, focus: true});
    }


    callFakeMenu["quickmode"] = () => {
        windows.focused.call('reopenasquick', true);
    }


    callFakeMenu["exit"] = () => {
        dialog.showMessageBox({message: 'Are you sure you want to quit?', type:'question', buttons:['Yes', 'No']}).then((res) => {
                            if (res.response == 0) {
                                app.quit();
                            }
                        })
    }


    return { buildMenu, callFakeMenu, pluginsMenu, shortcut };
}

module.exports = { createMenuManager };
