const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { EventEmitter } = require('node:events');

const { createExtensionManager } = require('./main/extension-manager');
const { createMenuManager } = require('./main/menu-manager');
const { createWolframRuntime } = require('./main/wolfram-runtime');
const {
    ProcessLogBuffer,
    createProcessLogWindow,
    installProcessLogCapture
} = require('./main/process-log-buffer');

test('extension lifecycle loads a module once and preserves phase order', async (t) => {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wljs-electron-extension-'));
    t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));

    const extensionDirectory = path.join(fixtureRoot, 'sample-extension');
    fs.mkdirSync(extensionDirectory);
    fs.writeFileSync(path.join(extensionDirectory, 'package.json'), JSON.stringify({
        'wljs-meta': { electron: './electron.cjs' }
    }));
    fs.writeFileSync(path.join(extensionDirectory, 'electron.cjs'), `
        const calls = [];
        module.exports = {
            calls,
            prolog(app, context, args) { calls.push(['prolog', app.name, context, args]); },
            epilog(app, context, args) { calls.push(['epilog', app.name, context, args]); },
            close() { calls.push(['close']); }
        };
    `);

    const manager = createExtensionManager({ name: 'WLJS' });
    manager.discover([fixtureRoot]);

    await manager.start('prolog', ['--example']);
    await manager.start('epilog');
    assert.equal(manager.hasCloseHandlers(), true);
    await manager.close();
    await manager.close();

    const extension = require(path.join(extensionDirectory, 'electron.cjs'));
    assert.deepEqual(extension.calls, [
        ['prolog', 'WLJS', {}, ['--example']],
        ['epilog', 'WLJS', {}, []],
        ['close']
    ]);
});

test('extension discovery ignores missing roots and malformed entries', async () => {
    const manager = createExtensionManager({});
    manager.discover(['/path/that/does/not/exist']);
    await manager.start('prolog');
    assert.equal(manager.hasCloseHandlers(), false);
});

test('menu manager resolves the platform shortcut table from its new location', () => {
    const templates = [];
    let processLogCalls = 0;
    const manager = createMenuManager({
        Menu: {
            buildFromTemplate(template) {
                templates.push(template);
                return template;
            }
        },
        app: { name: 'WLJS' },
        appDataFolder: '/missing',
        contextMenuExtensions: [],
        createWindow() {},
        dialog: {},
        extensionManager: {},
        fs: { existsSync: () => false },
        isMac: process.platform === 'darwin',
        path,
        rootAppFolder: '/app',
        server: {},
        shell: {},
        showProcessLogs: () => processLogCalls++,
        userExtensions: '/extensions',
        windows: {}
    });

    assert.equal(manager.shortcut('save'), process.platform === 'darwin' ? 'Cmd+S' : 'Ctrl+S');
    assert.equal(manager.shortcut('missing-shortcut'), undefined);

    const emptyPlugins = { kernel: [], edit: [], view: [], file: [], misc: [] };
    manager.buildMenu({ plugins: emptyPlugins });
    const windowMenu = templates[1].find(item => item.label === 'Window');
    windowMenu.submenu.find(item => item.label === 'Show logs').click();
    manager.callFakeMenu.showProcessLogs();
    assert.equal(processLogCalls, 2);
});

test('process log buffer preserves stream order and evicts the oldest lines', () => {
    const buffer = new ProcessLogBuffer({ capacity: 3 });

    buffer.append('stdout', 'one\ntwo\n');
    buffer.append('stderr', 'problem\n');
    buffer.append('stdout', 'four\n');

    assert.deepEqual(buffer.snapshot(), [
        '[stdout] two',
        '[stderr] problem',
        '[stdout] four'
    ]);
});

test('process log buffer handles split writes, CRLF, and bounded partial lines', () => {
    const buffer = new ProcessLogBuffer({ capacity: 2, maxLineLength: 5 });

    buffer.append('stdout', Buffer.from('abc'));
    buffer.append('stdout', 'def\r\n');
    buffer.append('stderr', 'pending');

    assert.deepEqual(buffer.snapshot(), [
        '[stdout] abcde… [line truncated]',
        '[stderr] pendi… [line truncated]'
    ]);
});

test('process log capture forwards writes and can restore both streams', () => {
    const stdout = createFakeStream();
    const stderr = createFakeStream();
    const originalStdoutWrite = stdout.write;
    const originalStderrWrite = stderr.write;
    const capture = installProcessLogCapture({ stdout, stderr, capacity: 2 });

    assert.equal(stdout.write('hello\n'), false);
    assert.equal(stderr.write('oops\n'), false);
    assert.deepEqual(capture.buffer.snapshot(), ['[stdout] hello', '[stderr] oops']);
    assert.deepEqual(stdout.writes, ['hello\n']);
    assert.deepEqual(stderr.writes, ['oops\n']);

    capture.restore();
    assert.equal(stdout.write, originalStdoutWrite);
    assert.equal(stderr.write, originalStderrWrite);
});

test('process log capture tolerates unavailable GUI output streams', () => {
    const capture = installProcessLogCapture({ stdout: null, stderr: null, capacity: 1 });
    capture.buffer.append('stdout', 'partial');
    capture.buffer.append('stderr', 'latest');

    assert.deepEqual(capture.buffer.snapshot(), ['[stderr] latest']);
    assert.doesNotThrow(() => capture.restore());
});

test('process log window is sandboxed and escapes captured text', async () => {
    let options;
    let loadedUrl;

    class FakeBrowserWindow {
        constructor(windowOptions) {
            options = windowOptions;
        }

        once(event, callback) {
            if (event === 'closed') this.closed = callback;
        }

        loadURL(url) {
            loadedUrl = url;
            return Promise.resolve();
        }

        isDestroyed() {
            return false;
        }

        destroy() {}
    }

    const win = createProcessLogWindow(FakeBrowserWindow, ['[stdout] <unsafe>&\x1b[31mred']);
    await Promise.resolve();

    assert.deepEqual(options.webPreferences, {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
    });

    const html = decodeURIComponent(loadedUrl.slice(loadedUrl.indexOf(',') + 1));
    assert.match(html, /\[stdout\] &lt;unsafe&gt;&amp;red/);
    assert.doesNotMatch(html, /\x1b\[31m/);
    win.closed();
});

test('Wolfram runtime opens process logs after an unexpected active-session exit', async () => {
    const harness = createWolframHarness();

    harness.runtime.checkWolfram(undefined, () => {
        harness.server.running = true;
    }, {});
    harness.program.stdout.emit('data', Buffer.from('Wolfram'));
    harness.program.emit('close', 23, 'SIGABRT');
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(harness.processLogCalls(), 1);
});

test('Wolfram runtime does not open process logs during an intentional shutdown', async () => {
    const harness = createWolframHarness();

    harness.runtime.checkWolfram(undefined, () => {
        harness.server.running = true;
    }, {});
    harness.program.stdout.emit('data', Buffer.from('Wolfram'));
    harness.server.running = false;
    harness.program.emit('close', 0, null);
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(harness.processLogCalls(), 0);
});

function createFakeStream() {
    return {
        writes: [],
        write(chunk) {
            this.writes.push(chunk);
            return false;
        }
    };
}

function createWolframHarness() {
    const program = new EventEmitter();
    program.stdout = Object.assign(new EventEmitter(), {
        destroy() {},
        setEncoding() {}
    });
    program.stderr = Object.assign(new EventEmitter(), { destroy() {} });
    program.stdin = { end() {}, write() {} };
    program.kill = () => {};

    const server = {
        down: false,
        running: false,
        startedQ: false,
        wolfram: { args: [], path: 'wolframscript' }
    };
    const windows = {
        log: {
            clear() {},
            info() {},
            print() {}
        }
    };
    let logCalls = 0;

    const runtime = createWolframRuntime({
        app: { getVersion: () => 'test', quit() {} },
        appDataFolder: '/missing',
        dialog: {},
        exec() {},
        fs: { existsSync: () => false },
        isMac: false,
        path,
        server,
        session: { defaultSession: { clearCache() {}, clearStorageData() {} } },
        shell: {},
        showProcessLogs: () => logCalls++,
        spawn: () => program,
        uuid4: () => 'test-id',
        windows,
        workingDir: '/tmp'
    });

    return { program, runtime, server, processLogCalls: () => logCalls };
}
