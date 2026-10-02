// Electron entry point. Feature implementations live in ./main; this file owns
// process-level state, window lifecycle, and startup ordering.
const { session, nativeImage, app, Tray, Menu, BrowserWindow, dialog, ipcMain, nativeTheme, systemPreferences } = require('electron')

nativeImage.__emitterPool = new Set();

const { screen, globalShortcut} = require('electron/main')

const { mkdir, writeFile } = require('node:fs/promises');

const { net } = require('electron')
const fs = require('fs');
const path = require('path')
const { createExtensionManager } = require('./main/extension-manager');

const extensionManager = createExtensionManager(app);

const cliIndex = process.argv.indexOf("--cli");
const isCli = cliIndex !== -1;

if (isCli) {
  app.commandLine.appendSwitch("disable-gpu");
  app.commandLine.appendSwitch("disable-software-rasterizer");
  app.commandLine.appendSwitch("log-level", "3");

  const cliArgs = process.argv.slice(cliIndex + 1);

  extensionManager.discover([path.join(app.getAppPath(), 'modules')]);
  void extensionManager.start('prolog', cliArgs);

  return;
}

const { createDevicePermissions } = require('./main/device-permissions');
const { registerIpcHandlers } = require('./main/ipc-handlers');
const { createMenuManager } = require('./main/menu-manager');
const { createWolframRuntime } = require('./main/wolfram-runtime');
const { spawn } = require('node:child_process');

const pdfjsLib = require("./pdfjs/pdf.mjs");
const { createPdfTools } = require('./main/pdf-tools');
const { cropPdfBuffer } = createPdfTools(pdfjsLib, path.join(__dirname, 'pdfjs'));

/*
const cliArgs = process.argv.slice(cliIndex + 1);

  try {
    await runCli(cliArgs);
    app.exit(0);
  } catch (error) {
    console.error(error?.message ?? String(error));
    app.exit(1);
  }
*/

const { autoUpdater } = require("electron-updater")

function isFile(pathItem) {
    return !!path.extname(pathItem);
  }

const {powerMonitor } = require('electron')

const https = require('https');
const { powerSaveBlocker } = require('electron')

let powerSaveId;

const contextMenu = require('electron-context-menu');
const contextMenuExtensions = [];

const { exec } = require('node:child_process');
const controller = new AbortController();
const { signal } = controller;

const { shell } = require('electron')

const { IS_WINDOWS_11 } = require('mica-electron');

const isWindows = process.platform === 'win32'
const isMac = process.platform === 'darwin'



if (!isWindows && !isMac) {
   // app.commandLine.appendSwitch('gtk-version', '3')
}

class Deferred {
  promise = {}
  reject = {}
  resolve = {}

  constructor() {
    this.promise = new Promise((resolve, reject)=> {
      this.reject = reject;
      this.resolve = resolve;
    });
  }
}

let trackpadUtils = {
    onForceClick: () => {},
    triggerFeedback: () => {}
};
if (isMac) trackpadUtils = require("electron-trackpad-utils");

//all routes to important folders
let appDataFolder;

//check if it is working from the repo folder of not
if (app.isPackaged) {
    appDataFolder = path.join(app.getPath('appData'), 'wljs-notebook');
} else {
    appDataFolder = app.getAppPath();
}

let rootAppFolder = app.getAppPath();

const userExtensions = path.join(app.getPath('documents'), 'WLJS Notebooks', 'Extensions');

const runPath = path.join(rootAppFolder, 'Scripts', 'start.wls');
const workingDir = app.getPath('home');

trackpadUtils.onForceClick(() => {
	console.log("onForceClick");
});

const { createCliInstaller } = require('./main/cli-installer');
const cliInstaller = createCliInstaller({
    app,
    appDataFolder,
    dialog,
    electronDirectory: __dirname,
    isWindows,
    sudo: require('./sudo')
});


//fetch contex menus items from wljs_packages folder

let tray;

var majorVersion = app.getVersion().split('.');
majorVersion.pop();
majorVersion = majorVersion.join('');

let server;
let wolframRuntime;

const initServer = () => {
    server = {
        startedQ: false,
        running: false,
        electronCode: 1,
        path: {
            //called via args
        },
        url: {
            self: undefined,
            local: undefined,
            default () {
                return this.local;
            }
        },

        wolfram: {
            process: undefined,
            path: 'wolframscript',
            args: []
        },

        frontend: {},


        shutdown (forced = false) {
            if (server.startedQ || forced) {
                this.startedQ = false;
                this.running = false;
                console.log(this.wolfram.process.pid);

                this.wolfram.process.kill('SIGINT');
                this.wolfram.process.stdin.write("exit\n");

                this.wolfram.process.stdin.end();
                this.wolfram.process.stdout.destroy();
                this.wolfram.process.stderr.destroy();

                this.wolfram.process.kill('SIGKILL');
                console.log('Killed?');

                if (!isWindows) {
                    //bug on Unix
                    wolframRuntime.killAll(() => console.log('killed!'));
                }

                //this.wolfram.process.kill('SIGINT');
                //this.wolfram.process.stdin.write("exit\n");
            }
        }
    }
}

initServer();

const devicePermissions = createDevicePermissions({
    dialog,
    isMac,
    isWindows,
    isWindows11: IS_WINDOWS_11,
    majorVersion,
    server,
    session
});

/* working windows */
const windows = {
    log: {
        aliveQ: false,
        readyQ: false,
        win: undefined,

        dump: [],

        clear () {
            if (!this.readyQ || !this.aliveQ) return;
            this.win.webContents.send('clear', null);
        },

        print (data, color) {
            if (Array.isArray(this.dump)) this.dump.push(data);
            if (!this.readyQ || !this.aliveQ) {
                console.log(data);
                return;
            };


            this.win.webContents.send('push-logs', data, color);
        },

        info (data) {
            if (!this.readyQ || !this.aliveQ) {
                console.log(data);
                return;
            };
            this.win.webContents.send('info', data);
        },

        version (data) {
            this.win.webContents.send('version', data);
        },

        news (items) {
            if (!this.readyQ || !this.aliveQ) return;
            this.win.webContents.send('news-items', items);
        },

        async fetchNews() {
            try {
                const items = await getLatestNews();
                this.news(items);
                console.log(items);
            } catch (error) {
                console.error('Failed to load WLJS news:', error);
                this.news([{
                    source: 'WLJS news',
                    title: 'Unable to load latest news',
                    url: 'https://wljs.io',
                    summary: error.message,
                    date: new Date(),
                    dateText: ''
                }]);
            }
        },

        construct(cbk = (...any) => {}) {
            let win;

            if (isMac) {
              win = new BrowserWindow({
                vibrancy: "sidebar", // in my case...
                frame: true,

                titleBarStyle: 'hiddenInset',
                width: 600,
                height: 660,
                resizable: false,
                title: 'Launcher',
                contextMenu: true,

                webPreferences: {
                    preload: path.join(__dirname, 'preload_log.js'),
                    webSecurity: false,
                    backgroundThrottling:  false,
                    contextMenu: true
                    //nodeIntegration: true
                }
             });
            } else if (isWindows) {
                let mica = server.frontend.WindowsBackgroundMaterial || 'tabbed';
                if (server.frontend.WindowsLegacy) mica = false;

                win = new BrowserWindow({
                    backgroundMaterial: mica, // in my case...
                    frame: true,
                    autoHideMenuBar: true,
                    titleBarStyle: 'hidden',
                    titleBarOverlay: {
                        color: 'rgba(255, 255, 255, 0.0)',
                        symbolColor: 'rgba(128, 128, 128, 1.0)'
                    },
                    autoHideMenuBar: true,
                    width: 600,
                    height: 660,
                    resizable: false,
                    title: 'Launcher',
                    maximizable: false,
                    contextMenu: true,
                    webPreferences: {
                        preload: path.join(__dirname, 'preload_log.js'),
                        //webSecurity: false,
                        backgroundThrottling:  false,
                        nodeIntegration: true,
                        contextMenu: true
                    }
                 });




            } else {
                win = new BrowserWindow({
                    frame: true,
                    autoHideMenuBar: true,
                    transparent: false,
                    titleBarStyle: 'hidden',
                    titleBarOverlay: {
                        color: 'rgba(255, 255, 255, 0.0)',
                        symbolColor: 'rgba(128, 128, 128, 1.0)'
                    },
                    autoHideMenuBar: true,
                    width: 600,
                    height: 660,
                    resizable: false,
                    title: 'Launcher',
                    maximizable: false,
                    contextMenu: true,
                    webPreferences: {
                        preload: path.join(__dirname, 'preload_log.js'),
                        //webSecurity: false,
                        nodeIntegration: true,
                        backgroundThrottling:  false ,
                        contextMenu: true
                    }
                 });
            }

            contextMenu({
                window: win,
                menu: (actions, props, browserWindow, dictionarySuggestions) => [
                    actions.cut(),
                    actions.copy(),
                    actions.paste()
                ]
            });

            win.webContents.setWindowOpenHandler((details) => {
                shell.openExternal(details.url); // Open URL in user's browser.
                return { action: "deny" }; // Prevent the app from opening the URL.
              })

            /*win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
              callback({ responseHeaders: Object.assign({
                  "Content-Security-Policy": [ "default-src 'self' 'unsafe-inline'"]
              }, details.responseHeaders)})});*/

            if (isMac) {
                win.loadFile(path.join(__dirname, 'log.html'));
            } else {
                win.loadFile(path.join(__dirname, 'log_padded.html'));
            }


            if ((!isMac && !isWindows) || (isWindows && (!IS_WINDOWS_11 || server.frontend.WindowsLegacy))) {
                                const checkTheme = () => {
                    if (!nativeTheme.shouldUseDarkColors) {
                        win.setBackgroundColor("#eeeeee");
                        //titleBarOverlay
                    } else {
                        win.setBackgroundColor("#292929");
                    }
                }

                nativeTheme.on("updated", checkTheme);
                nativeImage.__emitterPool.add(checkTheme);
                win.on('closed', () => {
                    nativeTheme.removeListener("updated", checkTheme);
                    nativeImage.__emitterPool.delete(checkTheme);
                });

                checkTheme();
            }

            windows.log.win = win;
            this.aliveQ = true;

            const self = this;

            win.once('ready-to-show', () => {
                self.readyQ = true;
                cbk(win);
                self.fetchNews();
            });

            win.on('close', () => {
                self.destroy();
                //app.quit();
            });

            return win;
        },

        destroy() {
            this.readyQ = false;
            this.aliveQ = false;
            //console.log('log wind destroyed');
            //windows.log.win.close();
            windows.log.win.destroy();

            //this.win = false;
        }
    },

    windows: [],

    focused: {
        win: false,
        last: [],

        add (window) {
            //if (win !== false) unshift(this.last, win);
            this.win = window;
        },
        remove(window) {
            if (this.win == window) this.win = false;
        },

        call (type, args) {
            const self = this;
            console.log(type);
            if (!self.win) {

                //special cases - open window if not shown
                if (type === 'newnotebook' || type === 'settings' || type === 'newshortnote') {
                    create_window({url: server.url.default(), focus: true}, (window) => {
                        window.webContents.send('call', type);
                    });
                    return;
                }

                dialog.showMessageBoxSync({message: 'There is no window opened to perform your action'});
                return;
            }

            self.win.webContents.send(type, args);
        }
    }
};

function ensureDirectoryExistence(filePath) {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
      return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
  }

function fetchUrlText(url) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(fetchUrlText(new URL(res.headers.location, url).href));
            }
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
            }
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(body));
        });
        request.on('error', reject);
    });
}

function stripHtml(html) {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseNewsItems(html, source, pathPrefix) {
    const regex = new RegExp(`<a[^>]+href="/${pathPrefix}/[^"]+"[^>]*>[\\s\\S]*?</a>`, 'gi');
    const items = [];
    let match;
    let matchCount = 0;

    while ((match = regex.exec(html))) {
        matchCount++;
        if (matchCount > 50) break; // safety limit

        const block = match[0];
        const hrefMatch = block.match(/href="(\/[^\"]+)"/);
        const titleMatch = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
        const summaryMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        const dateMatch = block.match(/([A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4})/);

        const url = hrefMatch ? `https://wljs.io${hrefMatch[1]}` : 'https://wljs.io';
        const title = titleMatch ? stripHtml(titleMatch[1]) : url;
        const summary = summaryMatch ? stripHtml(summaryMatch[1]) : '';
        const dateText = dateMatch ? dateMatch[1] : '';
        const date = dateText ? new Date(dateText) : new Date(0);

        if (title && title !== url && dateText) {
            items.push({ source, title, url, summary, date, dateText });
        }
    }

    console.log(`Parsed ${matchCount} matches for ${source}, extracted ${items.length} items`);
    return items;
}

async function getLatestNews() {
    try {
        console.log('Fetching WLJS blog and releases...');
        const [blogHtml, releasesHtml] = await Promise.all([
            fetchUrlText('https://wljs.io/blog'),
            fetchUrlText('https://wljs.io/releases')
        ]);

        console.log(`Blog HTML length: ${blogHtml.length}, Releases HTML length: ${releasesHtml.length}`);

        const items = [
            ...parseNewsItems(blogHtml, 'Blog', 'blog'),
            ...parseNewsItems(releasesHtml, 'Releases', 'releases')
        ];

        console.log(`Total items collected: ${items.length}`);
        items.sort((a, b) => b.date - a.date);
        const result = items.slice(0, 8);
        console.log(`Final result: ${result.length} items`);
        result.forEach(item => console.log(`  - ${item.source}: ${item.title} (${item.dateText})`));
        return result;
    } catch (error) {
        console.error('Error in getLatestNews:', error);
        throw error;
    }
}

const dumpLogs = (cbk) => {
    const p = path.join(appDataFolder, 'Debug', 'System.log');
    ensureDirectoryExistence(p);
    fs.writeFile(p, windows.log.dump.join('\r\n'), function(err) {
        if (err) throw err;

        shell.showItemInFolder(p);
        shell.beep();
        cbk();
    });


}

const read_wl_settings = () => {
    if (!fs.existsSync(path.join(appDataFolder, '_settings.wl'))) return;
    const file = fs.readFileSync(path.join(appDataFolder, '_settings.wl'), 'utf8');
    console.log(file);

    const r = new RegExp(/("\w*") -> *\n* *("?[^"|>,]*"?)/gm);
    let m;

    const parse = (s) => {
        if (s == 'True') return true;
        if (s == 'False') return false;
        if (s.charAt(0) === '"') return s.slice(1,-1);
        return s;
    }


    server.frontend = {};
    while (m = r.exec(file)) {
        server.frontend[m[1].slice(1,-1)] = parse(m[2]);
    }

    //if ('RunInTray' in server.frontend && ! server.frontend.RunInTray) {
        //server.frontend.RunInTray = false;
   // }

    console.log(server.frontend);
}

const blocked_windows = {};
let blocked_window_counter = 1;
const blocked_windows_messages = {};

const closing_handler = (event, id) => {
    blocked_window_counter++;

    if (blocked_windows[id]) {

        const uid = blocked_window_counter;
        blocked_windows_messages[uid] = (result) => {
            if (!blocked_windows[id]) return;

            if (!result) return;
            const win = blocked_windows[id].window;
            delete blocked_windows[id];

            win.close();
            return;
        }

        const res = dialog.showMessageBox({message: blocked_windows[id].message, buttons: ['Cancel', 'Close'],  noLink:true, type:'question'});

        res.then((r) => {
            blocked_windows_messages[uid](r.response == 1);
        });

        event.preventDefault();
        return false;
    }

    return true;
}

function parseWindowFeatures(features) {
    return Object.fromEntries(
        features.split(',').map(feature => {
            let [key, value] = feature.split('=').map(str => str.trim());
            return [key, Number(value)]; // Convert value to number
        })
    );
}


const overlayConfig =  {};



overlayConfig.loadWindowState = (win) => {
  try {
    win.setBounds(JSON.parse(fs.readFileSync(path.join(appDataFolder, "window-overlay-state.json"))))
  } catch {

  }
}

overlayConfig.saveWindowState = (win) => {
  const {x, y} = win.getBounds();

  fs.writeFileSync(
    path.join(appDataFolder, "window-overlay-state.json"),
    JSON.stringify({x,y})
  );
}


function create_window(opts, cbk = () => {}) {
    if (buildMenu.main) {
        Menu.setApplicationMenu(buildMenu.main);
        buildMenu.main = undefined
    }

        //default options
        const defaults = {
            title: 'Notebook',
            show: true,
            contextMenu: true,
            focus: false,
            width: 1024,
            height: 640,
            linuxMenuBar: true,
            override: {},
            offscreen: false
        };



        const options = Object.assign({}, defaults, opts);


        options.minWidth = 576;
        if (!isMac) {
            options.minWidth = 700;
        }

        if (isWindows) {
            options.disallowFullscreen = true;

        }

        if ((new RegExp(/docFind/)).exec(options.url)) {
            options.width = options.minWidth;
            options.linuxMenuBar = false;
            options.contextMenu = false;
            options.override.maximizable = false;
        }

        if ((new RegExp(/settings/)).exec(options.url)) {
            options.linuxMenuBar = false;
            options.contextMenu = true;
            options.override.maximizable = false;
        }


        if (new RegExp(/acknowledgments/).exec(options.url)) {
            options.height = 310;
            options.linuxMenuBar = false;
            options.contextMenu = false;
            options.override.maximizable = false;
        }

        if (new RegExp(/window/).exec(options.url)) {
            options.minWidth = 100;
            options.width = 500;
            options.height = 500;
            options.linuxMenuBar = false;
            options.contextMenu = false;
            options.override.maximizable = true;
            options.disallowFullscreen = false;
            //options.override.fullScreenable = true;
        }


        if ((new RegExp(/little/)).exec(options.url)) {
            options.minWidth = 500*1024.0/800.0;;
            options.width = 576*1024.0/800.0;
            options.height = 520*640.0/600.0;
            options.linuxMenuBar = false;
            options.contextMenu = false;
        }



        if (options.overlay) {
            options.width = options.minWidth;
            options.height = 2*112 * 640.0/600.0;
            options.override.frame = false;
            options.linuxMenuBar = false;
            options.override.resizable = false;
            options.override.transparent = true;
            options.override.titleBarStyle = undefined;
            options.override.titleBarOverlay = undefined;
            options.override.vibrancy = undefined;
            options.override.backgroundMaterial = false;
            options.override.maximizable = false;
        }

        let win;

        if (options.features) {
            options.features = parseWindowFeatures(options.features);
            console.log(options.features);
            options.width = options.features.width || options.width;
            options.height = options.features.height || options.height;
            if (options.width == 1 && options.height == 1) {
                options.offscreen = true;
                options.width = 1920;
                options.height = 1280;
            }
        }

        if (options.offscreen) {
          options.override.width = 1920;
          options.override.height = 1280;
          options.override.show = false;
          options.show = true;
        }

        if (isMac) {
            win = new BrowserWindow({
                vibrancy: "sidebar", // in my case...
                frame: true,

                titleBarStyle: 'hiddenInset',
                width: Math.round(options.width*800.0/1024),
                height: Math.round(options.height*600.0/640),
                minWidth: Math.round(options.minWidth),
                //backgroundMaterial: 'acrylic',
                title: options.title,
                //transparent:true,
                show: options.show,
                webPreferences: {
                    //scrollBounce: true,
                    preload: path.join(__dirname, 'preload_main.js'),
                    backgroundThrottling:  false,
                    offscreen: false
                },
                ...options.override

            });
        } else if (isWindows) {

            /*win = new BrowserWindow({
                width: 800,
                height: 600,
                title: options.title,
                show: options.show,
                autoHideMenuBar: true,
                titleBarOverlay: true,
                titleBarStyle: 'hidden',
                webPreferences: {
                    preload: path.join(__dirname, 'preload_main.js'),
                    enableRemoteModule: true,
                    nodeIntegration: true
                }
            });*/

            //let mica = 'mica';
            let mica = server.frontend.WindowsBackgroundMaterial || 'tabbed';
            if (server.frontend.WindowsLegacy) mica = false;

            win = new BrowserWindow({
                frame: true,
                autoHideMenuBar: true,
                titleBarStyle: 'hidden',
                titleBarOverlay: {
                  color: 'rgba(255, 255, 255, 0.0)',
                  symbolColor: 'rgba(128, 128, 128, 1.0)'
                },

                width: Math.round(options.width),
                height: Math.round(options.height),
                minWidth: Math.round(options.minWidth),
                backgroundMaterial: mica,
                title: options.title,
                //transparent:true,
                maximizable: true,

                show: options.show,
                webPreferences: {
                    preload: path.join(__dirname, 'preload_main.js'),
                    backgroundThrottling:  false ,
                    offscreen: false
                },
                ...options.override

            });

            //win.setVibrancy('appearance-based');

            //Windows 10-11 specific settings for transparency
            /*if (IS_WINDOWS_11) {
                win.setMicaEffect();
                //win.setMicaTabbedEffect();
                ///win.setMicaAcrylicEffect();
                win.setRoundedCorner();
                win.setAutoTheme();
            } else {
                //win.setAcrylic();
                const checkTheme = () => {
                    if (!nativeTheme.shouldUseDarkColors) win.setBackgroundColor("#fff");
                    else win.setBackgroundColor("#000");
                }

                nativeTheme.on("updated", checkTheme);
                win.on('closed', () => {
                    nativeTheme.removeListener("updated", checkTheme);
                });

                checkTheme();
                //win.setRoundedCorner();
            }*/
            if (!options.overlay) {

                if (!IS_WINDOWS_11 || server.frontend.WindowsLegacy) {
                const checkTheme = () => {
                    if (!nativeTheme.shouldUseDarkColors) {
                        win.setBackgroundColor("#eeeeee");
                        //titleBarOverlay
                    } else {
                        win.setBackgroundColor("#292929");
                    }
                }

                nativeTheme.on("updated", checkTheme);
                nativeImage.__emitterPool.add(checkTheme);
                win.on('closed', () => {
                    nativeTheme.removeListener("updated", checkTheme);
                    nativeImage.__emitterPool.delete(checkTheme);
                });

                checkTheme();
                } else {
                //a bug with maximizing the window
                //https://github.com/electron/electron/issues/38743

                /*win.once('maximize', () => {
                    const checkTheme = () => {
                        if (!nativeTheme.shouldUseDarkColors) {
                            win.setBackgroundColor("#fff");
                            //titleBarOverlay
                        } else {
                            win.setBackgroundColor("#000");
                        }
                    }

                    nativeTheme.on("updated", checkTheme);
                    win.on('closed', () => {
                        nativeTheme.removeListener("updated", checkTheme);
                    });

                    checkTheme();
                });*/



                }
            }

        } else {
            win = new BrowserWindow({
                frame: true,
                autoHideMenuBar: true,
                titleBarStyle: 'hidden',
                titleBarOverlay: {
                  color: 'rgba(255, 255, 255, 0.0)',
                  symbolColor: 'rgba(128, 128, 128, 1.0)'
                },
                width: Math.round(options.width),
                height: Math.round(options.height),

                minWidth: Math.round(options.minWidth),
                title: options.title,
                //transparent:true,
                maximizable: true,

                show: options.show,
                webPreferences: {
                    preload: path.join(__dirname, 'preload_main.js'),
                    backgroundThrottling:  false ,
                    offscreen: false
                },
                ...options.override

            });


            if (!options.overlay) {

                if (true) {
                const checkTheme = () => {
                    if (!nativeTheme.shouldUseDarkColors) {
                        win.setBackgroundColor("#eeeeee");
                        //titleBarOverlay
                    } else {
                        win.setBackgroundColor("#292929");
                    }
                }

                nativeTheme.on("updated", checkTheme);
                nativeImage.__emitterPool.add(checkTheme);
                win.on('closed', () => {
                    nativeTheme.removeListener("updated", checkTheme);
                    nativeImage.__emitterPool.delete(checkTheme);
                });

                checkTheme();
                } else {
                //a bug with maximizing the window
                //https://github.com/electron/electron/issues/38743

                /*win.once('maximize', () => {
                    const checkTheme = () => {
                        if (!nativeTheme.shouldUseDarkColors) {
                            win.setBackgroundColor("#fff");
                            //titleBarOverlay
                        } else {
                            win.setBackgroundColor("#000");
                        }
                    }

                    nativeTheme.on("updated", checkTheme);
                    win.on('closed', () => {
                        nativeTheme.removeListener("updated", checkTheme);
                    });

                    checkTheme();
                });*/



                }
            }

        }

        if (options.overlay) {
            win.once('blur', () => {
                overlayConfig.saveWindowState(win);
                win.close();
            });
            overlayConfig.loadWindowState(win);
        } else {
            win.webContents.on('will-navigate', () => {
                win.webContents.send('will-navigate');
            })
        }

        if (options.features ) {
            if (options.features.top || options.features.right || options.features.left || options.features.bottom) {
                const pos = options.parent.getPosition();
                pos[0] = pos[0] + (options.features.right || 0) - (options.features.left || 0);
                pos[1] = pos[1] + (options.features.top || 0) - (options.features.bottom || 0);

                if(pos[0] < 0) pos[0] = 0;
                if(pos[1] < 0) pos[1] = 0;

                win.setPosition(pos[0], pos[1], true);
            }
        }

        //search on the page (just for debugging)
        win.webContents.on('found-in-page', (event, result) => {
            //show results when Ctrl+F pressed
            console.log(result)
        });

        //permissions of the window
        devicePermissions.attach(win);

        //focus window
        if (options.focus && !options.offscreen) {
            win.focus();
            windows.focused.add(win);
        }

        win.on('focus', () => {
            windows.focused.add(win);
        });

        win.uuid = uuid4();

        win.on('close', (event) => {
            if (closing_handler(event, win.id)) {
                windows.focused.remove(win);
                windows.windows.splice(windows.windows.findIndex(a => a.uuid === win.uuid) , 1);
            }
        });

        //extend context menu
        if (options.contextMenu && !options.offscreen) {
            contextMenu({
                window: win,
                prepend: (defaultActions, parameters, browserWindow) => contextMenuExtensions.map((mi) => {
                    let visible = false;

                    switch(mi.visible) {
                        case 'selection':
                            visible =  parameters.selectionText.trim().length > 0;
                        break;
                        default:
                            visible = true;
                    };

                    const onclick = () => {
                        win.webContents.send('context', mi.event);
                    }

                    return ({
                        label: mi.label,
                        // Only show it when right-clicking images
                        visible: visible,
                        click: onclick
                    })
                })
                ,

                menu: (actions, props, browserWindow, dictionarySuggestions) => [
                    ...dictionarySuggestions,
                    actions.separator(),
                    actions.cut(),
                    actions.copy(),
                    actions.paste(),
                    ...(server.frontend.ExpertMode ? [actions.separator(), actions.inspect()] : [])
                ]
            });
        }

        if (!options.url) {
            console.error('No url is provided!');
            return;
        }



        if (options.cacheClear) {
            win.webContents.session.clearCache();
        }

        //callback when it is ready
        if (options.show) {
            cbk(win);
        } else {
            win.once('ready-to-show', () => {
                if (!options.offscreen) win.show(); else win.showInactive();
                cbk(win);
            });
        }

        //add to the list of opened windows
        windows.windows.push(win);


        const contents = win.webContents;
        //handlers for internal links and pop-ups




        win.webContents.setWindowOpenHandler(({ url , frameName, features}) => {
            console.log(url);
            const u = new URL(url);

            //console.error(features);



            //if it is on the same domain
            if (u.hostname === (new URL(server.url.default())).hostname) {
                create_window({url: url, show: true, parent: win, features:features});

            } else if (u.hostname === "reference.wolfram.com") {
                contents.send('reload_iframe', url);
            } else {
                //open in the default user's browser
                shell.openExternal(url);
            }

            return { action: 'deny' };
        });

        win.loadURL(options.url);

        win.on('focus', () => {
            win.webContents.send('focus');
        });

        win.on('blur', () => {
            win.webContents.send('blur');
        });


        return win;
}




const {
    buildMenu,
    callFakeMenu,
    pluginsMenu,
    shortcut
} = createMenuManager({
    Menu,
    app,
    appDataFolder,
    contextMenuExtensions,
    createWindow: create_window,
    dialog,
    extensionManager,
    fs,
    isMac,
    path,
    rootAppFolder,
    server,
    shell,
    userExtensions,
    windows
});

/* APP Logic */

let electronExtensionsClosed = false;

app.on('will-quit', (e) => {
    console.log('exiting the server...');

    server.shutdown();

    if (!electronExtensionsClosed && extensionManager.hasCloseHandlers()) {
        e.preventDefault();
        void extensionManager.close().finally(() => {
            electronExtensionsClosed = true;
            app.exit(0);
        });
    }
});

app.on('before-quit', (e) => {

    if (server.debug) {
        e.preventDefault();

        dumpLogs(()=>{
            server.debug = false;
            server.shutdown();
            app.exit(0);
        });
        return false;
    }

    //server.shutdown();
    if ((server.browserMode || server.frontend.RunInTray) && process.platform !== 'darwin') {

        e.preventDefault();
        tray.fireBallon()


    }
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && !(server.browserMode || server.frontend.RunInTray)) {app.quit()} else {
        if ((server.browserMode || server.frontend.RunInTray) && process.platform !== 'darwin') {

            tray.fireBallon()
        }
    }
})



app.on('open-file', (ev, path) => {
    ev.preventDefault();
    app.addRecentDocument(path);
    if (!server.running) {
        server.path.requested = path;
        return;
    }

    if (isFile(path))
        create_window({url: server.url.default('local') + `/` + encodeURIComponent(path), title: path, show: true, focus: true});
    else
        create_window({url: server.url.default('local') + `/folder/` + encodeURIComponent(path), title: path, show: true, focus: true});
})

app.on('open-url', (event, url) => {
    const protocol = new RegExp('wljs-url-message:\/\/(.*)').exec(url);
    console.log(protocol);

    if (!server.running) {
        server.path.requested = path;
        server.protocol = protocol[1];
        return;
    }

    create_window({url: server.url.default('local') + `/protocol/` +protocol[1], title: 'WLJS Window', show: true, focus: true});
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        //const o = createWindow(globalURL);
        create_window({url: server.url.default('local'), focus: true, show: true});
    }
})

function parseArgs(args) {
    const result = {};
    const pendingFlags = [];
    const booleanShortFlags = ['cdn']; // flags like -cdn that are boolean
    const startIndex = 1; // skip the path at index 0

    for (let i = startIndex; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        result[arg.slice(2)] = true;
      } else if (arg.startsWith('-')) {
        const flag = arg.slice(1);
        if (booleanShortFlags.includes(flag)) {
          result[flag] = true;
        } else {
          pendingFlags.push(flag);
        }
      } else {
        // Not a flag: assign it to the next pending short flag
        const flag = pendingFlags.shift();
        if (flag) {
          result[flag] = arg;
        }
      }
    }

    // Assign empty string to any flags that didn't get a value
    for (const flag of pendingFlags) {
      result[flag] = '';
    }

    return result;
  }
// Behaviour on the second instance for the parent process
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) app.quit();
else {
    app.on('second-instance', async (_, argv) => {
        //User requested a second instance of the app.
        //argv has the process.argv arguments of the second instance.
        //on windows IT SENDS --allow-file-access-from-files as a second argument.!!!
        if (app.hasSingleInstanceLock()) {
            windows.log.print('second instance was blocked');
            windows.log.print(argv[0]);
            windows.log.print(argv[1]);
            windows.log.print(argv);

            console.log(argv);
            const parsedCommndLine = parseArgs(argv);
            console.log(parsedCommndLine);

            if (parsedCommndLine.a) {
              console.log('Parsed command line parameters');
              console.log(parsedCommndLine);


              const response = await net.fetch(server.url.default('local') + `/cmdapi/` + encodeURIComponent(JSON.stringify(parsedCommndLine)))
              if (response.ok) {
                const body = await response.json()
                console.log(body);
              }


            }


            const protocol = new RegExp('wljs-url-message:\/\/(.*)').exec(argv[argv.length - 1]);
            if (protocol) {
                console.log(protocol[1]);
                create_window({url: server.url.default('local') + `/protocol/` + protocol[1], title:'WLJS Notebook', focus: true, show: false});
                return;
            }

            let pos = 1;

            while(pos < argv.length) {
                if (new RegExp('--').exec(argv[pos])) {
                    pos++;
                } else {
                    break;
                }
            }

            if (!(typeof argv[pos] == 'string')) {
                create_window({url: server.url.default('local') + `/`, title: 'WLJS Notebook', focus: false, show: false});
            } else {
                if (isFile(argv[pos])) {
                    create_window({url: server.url.default('local') + `/` + encodeURIComponent(argv[pos]), title: argv[pos], focus: true, show: false});
                } else {
                    create_window({url: server.url.default('local') + `/folder/` + encodeURIComponent(argv[pos]), title: argv[pos], focus: true, show: false});
                }
            }
        }
    });
}

if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('wljs-url-message', process.execPath, [path.resolve(process.argv[1])])
    }
  } else {
    app.setAsDefaultProtocolClient('wljs-url-message')
  }

//reset HTTP cache in the browser if an update flag was detected (created by WL)
const checkCacheReset = (cbk) => {
    if (fs.existsSync(path.join(appDataFolder, '.wasupdated'))) {
        fs.unlinkSync(path.join(appDataFolder, '.wasupdated'));
        session.defaultSession.clearStorageData();
        session.defaultSession.clearCache();

        server.wasUpdated = true;

        cbk();

        windows.log.print('HTTP Cache reset!', "\x1b[32m");
        windows.log.info('HTTP Cache reset');
    }
}

const powerSaver = () => {
    console.log('Electron >> starting powersafe blocker');
    powerSaveId = powerSaveBlocker.start('prevent-app-suspension');

    setInterval(() => {
        //console.log('Electron >> checking power saving...');
        if (BrowserWindow.getAllWindows().length > 0) {
            if (!powerSaveBlocker.isStarted(powerSaveId)) {
                console.log('Electron >> starting powersafe blocker');
                powerSaveId = powerSaveBlocker.start('prevent-app-suspension');
            }
        } else {
            if (powerSaveBlocker.isStarted(powerSaveId)) {
                console.log('Electron >> stopping powersafe blocker');
                powerSaveBlocker.stop(powerSaveId);
            }
        }
    }, 15000);

    powerMonitor.on('suspend', () => {

    });

    powerMonitor.on('lock-screen', () => {

    })
}

const draggingIcon = nativeImage.createFromPath(path.join(__dirname, 'build', 'file', 'File-512x512.png'));

/* App Ready */

app.whenReady().then(() => {
    if (!isMac) {
        if (!isWindows) {
            tray = new Tray(path.join(__dirname, 'build', 'icon.png'));
        } else {
            tray = new Tray(path.join(__dirname, 'build', 'icon.ico'));
        }
        //console.log(path.join(__dirname, 'build', '256x256_new.ico'));
        tray.setToolTip('Sorry, I am buzy');
        tray.setContextMenu(Menu.buildFromTemplate([
            {
              label: 'Quit', click: function () {
                server.browserMode = false;
                server.frontend.RunInTray = false;
                app.quit();
              }
            },


            {
                label: 'Prompt', click: function () {
                    if (server.running)
                        create_window({url: server.url.default() + '/prompt', title: 'Overlay', overlay: true, show: true, focus: true});
                }
              },

              {
                label: 'Create window', click: function () {
                    if (server.running)
                        create_window({url: server.url.default(), title: 'WLJS Notebook', show: true, focus: true});
                }
              }
          ]));

        tray.fireBallon = () => {
            tray.displayBalloon({
                title: "WLJS Server",
                content: "Running in the background as a server",
                largeIcon: false
              });
              console.log("Balloon")
        }


    }

    pluginsMenu.fetch();
    buildMenu({plugins: pluginsMenu.items});
    Menu.setApplicationMenu(buildMenu.small);



    powerSaver();

    ipcMain.on('ondragstart', (event, filePath) => {
      event.sender.startDrag({
        file: filePath,
        icon: draggingIcon
      })
    });

    ipcMain.on('debug', () => {
        server.debug = true;

    });



    read_wl_settings();

    if (server.frontend.Theme) {
        nativeTheme.themeSource = server.frontend.Theme.toLowerCase();
    }


    const splash = require('./coffee.js').showCoffeeSplash;
    const coffee = nativeImage.createFromPath(path.join(__dirname, 'build', 'coffee.png'));

    //make a log window and start WL
    windows.log.construct((log_window) => {
        windows.log.version(app.getVersion());
        //new promt('input', 'Do you have Wolfram Engine installed?', (answer) => console.log(answer), log_window);
        wolframRuntime.checkInstalled(() => {
            wolframRuntime.checkWolfram(
                wolframRuntime.loadConfiguration(),
                () => wolframRuntime.storeConfiguration(() => start_server(log_window)),
                log_window
            );
        }, log_window);
    });

    //again in a case if something changed
    read_wl_settings();

    setTimeout(() => {
      if (server.frontend.NoCoins) return;
      if(Math.random() < 0.7) return;
      splash({
        imageRef: coffee,
        onClick: () => shell.openExternal('https://wljs.io/frontend/Support')
      })
    }, 1000*60*45);

    if (!server.frontend.NoUpdates) autoUpdater.checkForUpdatesAndNotify();

    registerIpcHandlers({
        BrowserWindow,
        Deferred,
        Menu,
        appDataFolder,
        blockedWindows: blocked_windows,
        blockedWindowMessages: blocked_windows_messages,
        callFakeMenu,
        createWindow: create_window,
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
    });

    //purge cache if an update was detected (using a special file created by WL)


    let cinterval;
    let tmout;

    /*cinterval = setInterval(checkCacheReset(() => {
        clearInterval(cinterval);
        clearTimeout(tmout);
    }), 5000);

    tmout = setTimeout(() => {
        clearInterval(cinterval);
    }, 60 * 1000)  */
});


function start_server (window) {
    console.log('Started! app');
    if (window) cliInstaller.checkInstalled(window);
    // app.quit();
    if (!server.startedQ) {
        windows.log.clear();
        windows.log.print('Internal error. Wolframscript has not started');
        setTimeout(() => app.quit(), 3000);
        return;
    }

    windows.log.info('Starting server');
    let accentColor;
    //fuck u, linux version of Electron;
    if (systemPreferences) {
      if (typeof systemPreferences.getAccentColor == 'function') {
        accentColor = systemPreferences.getAccentColor();
      }
    }


    if (!accentColor) {
        accentColor = '#f67070';
    } else {
        if (accentColor.charAt(0) != '#') accentColor = '#'+accentColor;
        if (accentColor.length > 7) accentColor = accentColor.slice(0, 7);

    }


    console.log('Accentcolor: ', accentColor);


    server.wolfram.process.stdin.write('System`$Env = <|"AppData"->URLDecode["'+encodeURIComponent(appDataFolder)+'"], "ElectronCode"->'+server.electronCode+', "AccentColor"->"'+accentColor+'"|>;');
    server.wolfram.process.stdin.write(`Get[URLDecode["${encodeURIComponent(runPath)}"]]\n`);


    let buf = "";

    const ipc = {
        'runningAt': (ip, port) => {
            server.url.local = `http://${ip}:${port}`;
            console.log('Open first window');
            //open a first window. could be a file or second instance
            create_first_window();
            server.running = true;
            if (!server.debug) setTimeout(() => {windows.log.destroy()}, 300);
        },
        'reloadSettings': () => {
           //apply theme?
           const last = server.frontend.Theme;
           read_wl_settings();
           if (server.frontend.Theme != last) {
               nativeTheme.themeSource = server.frontend.Theme.toLowerCase();
               nativeImage.__emitterPool.forEach((el) => el());
               console.log('Update theme!');
           }
        },
        'createWindow': (path, title, rest = {}) => {
            console.log(rest);
            create_window({url: server.url.default() + path, title: title, ...rest});
        }
    };

    server.wolfram.streamer = (chunk) => {
        buf += chunk;

        let nl;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);

          if (line.startsWith("<<<IPC>>>")) {
            try {
                const payload = JSON.parse(line.slice("<<<IPC>>>".length));
                ipc[payload[0]](...payload[1]);
            } catch (err) {
                console.error(err);
            }
          } else {
            windows.log.print(line);
          }
        }
    };

    server.wolfram.errors = (data) => {
        const string = data.toString();
        windows.log.print(string, '\x1b[46m');
    };

    server.wolfram.process.stdout.setEncoding("utf8");
    server.wolfram.process.stdout.on('data', server.wolfram.streamer);
    server.wolfram.process.stderr.on('data', server.wolfram.errors);
}




//applicable only to the first time!!!
function create_first_window() {
    void extensionManager.start('epilog');


    const parsedCommndLine = parseArgs(process.argv);
    const commandOnly = parsedCommndLine.a;

    if (commandOnly) net.fetch(server.url.default('local') + `/cmdapi/` + encodeURIComponent(JSON.stringify(parsedCommndLine)))


    //Windows/Unix open a file
    if (!isMac && server.startedQ && !server.running && process.argv[1] && !commandOnly) {
        console.log('OPEN a FILE WIN/Linux');


        const protocol = new RegExp('wljs-url-message:\/\/(.*)').exec(process.argv[process.argv.length - 1]);
        if (protocol) {
            console.log(protocol[1]);
            create_window({url: server.url.default('local') + `/protocol/` + protocol[1], title:'WLJS Notebook', focus: true, show: false});
            server.wasUpdated = false;
            return;
        }

        if (process.argv[1].length > 3) {
            let pos = 1;

            while(pos < process.argv.length) {
                if (new RegExp('--').exec(process.argv[pos])) {
                    pos++;
                } else {
                    break;
                }
            }



                // AppImage desktop entries can supply only Electron flags (for example, --no-sandbox).
                const requestedPath = process.argv[pos];

                if (typeof requestedPath !== 'string') {
                    create_window({url: server.url.default(), title: 'Default', show: false, focus: false, cacheClear: server.wasUpdated});
                } else if (isFile(requestedPath)) {
                    app.addRecentDocument(requestedPath);
                    create_window({url: server.url.default() + '/' + encodeURIComponent(requestedPath), title: path.basename(requestedPath), show: false, focus: true, cacheClear: server.wasUpdated});
                } else {
                    create_window({url: server.url.default() + '/folder/' + encodeURIComponent(requestedPath), title:  path.basename(requestedPath), show: false, focus: true, cacheClear: server.wasUpdated});
                }


        } else  {
            create_window({url: server.url.default(), title: 'Default', show: false, focus: false, cacheClear: server.wasUpdated});
        }

        server.wasUpdated = false;
        return;
    }

    //Mac
    if (isMac && server.startedQ && !server.running && server.protocol && !commandOnly) {
        console.log('OPEN a URL on OSX');

        //app.addRecentDocument(server.path.requested);
        create_window({url: server.url.default() + '/protocol/' + server.protocol, title: 'WLJS Window', show: false, focus: true, cacheClear: server.wasUpdated});
        server.protocol = undefined;

        server.wasUpdated = false;
        return;
    }

    //Mac
    if (isMac && server.startedQ && !server.running && server.path.requested && !commandOnly) {
        console.log('OPEN a FILE OSX');

        app.addRecentDocument(server.path.requested);
        create_window({url: server.url.default() + '/' + encodeURIComponent(server.path.requested), title: server.path.requested, show: false, focus: true, cacheClear: server.wasUpdated});
        server.path.requested = undefined;

        server.wasUpdated = false;
        return;
    }

    //nothing... just regular start

    console.log('Regular start. Open default url');
    create_window({url: server.url.default(), title: 'Notebook', show: true, focus: false});
    server.wasUpdated = false;

}


/* uuid v4 generator */
var uuid4 = () => {
    var h=['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'];
    var k=['x','x','x','x','x','x','x','x','-','x','x','x','x','-','4','x','x','x','-','y','x','x','x','-','x','x','x','x','x','x','x','x','x','x','x','x'];
    var u='',i=0,rb=Math.random()*0xffffffff|0;
    while(i++<36) {
        var c=k[i-1],r=rb&0xf,v=c=='x'?r:(r&0x3|0x8);
        u+=(c=='-'||c=='4')?c:h[v];rb=i%8==0?Math.random()*0xffffffff|0:rb>>4
    }
    return u
}

wolframRuntime = createWolframRuntime({
    app,
    appDataFolder,
    dialog,
    exec,
    fs,
    isMac,
    path,
    server,
    session,
    shell,
    spawn,
    uuid4,
    windows,
    workingDir
});

var unshift = (array, value) => {
    array.unshift(value);
    array.length = Math.min(array.length, 5);
    return array;
}

let proto = {
    create_window: create_window,
    server: server
}
