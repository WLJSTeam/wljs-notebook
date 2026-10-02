const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createExtensionManager } = require('./main/extension-manager');
const { createMenuManager } = require('./main/menu-manager');

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
    const manager = createMenuManager({
        Menu: {},
        app: {},
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
        userExtensions: '/extensions',
        windows: {}
    });

    assert.equal(manager.shortcut('save'), process.platform === 'darwin' ? 'Cmd+S' : 'Ctrl+S');
    assert.equal(manager.shortcut('missing-shortcut'), undefined);
});
