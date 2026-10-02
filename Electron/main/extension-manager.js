const fs = require('fs');
const path = require('path');

function createExtensionManager(app) {
    const loadedExtensions = new Set();
    const loadedModules = new Map();
    let closePromise;

    function register(electronEntry, packageJsonPath) {
        if (!electronEntry) return;

        const packageDir = path.dirname(packageJsonPath);
        const entries = Array.isArray(electronEntry) ? electronEntry : [electronEntry];

        entries.forEach(entry => {
            if (!entry || typeof entry !== 'string') return;

            const entryPath = path.isAbsolute(entry)
                ? entry
                : path.join(packageDir, entry);

            try {
                loadedExtensions.add(require.resolve(entryPath));
            } catch (err) {
                console.error(`Failed to resolve electron extension "${entry}" from "${packageDir}"`, err);
            }
        });
    }

    function discover(extensionRoots, visitPackage = () => {}) {
        extensionRoots.forEach(extensionRoot => {
            if (!fs.existsSync(extensionRoot)) return;

            fs.readdirSync(extensionRoot, { withFileTypes: true })
                .filter(item => item.isDirectory())
                .forEach(item => {
                    const packageJsonPath = path.join(extensionRoot, item.name, 'package.json');
                    if (!fs.existsSync(packageJsonPath)) return;

                    try {
                        const packageMetadata = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                        register(packageMetadata['wljs-meta']?.electron, packageJsonPath);
                        visitPackage(packageMetadata, packageJsonPath, item);
                    } catch (err) {
                        console.error(`Failed to read extension package "${packageJsonPath}"`, err);
                    }
                });
        });
    }

    function requireExtension(extensionPath) {
        if (!loadedModules.has(extensionPath)) {
            loadedModules.set(extensionPath, require(extensionPath));
        }

        return loadedModules.get(extensionPath);
    }

    async function invoke(extensionPath, phase, args = []) {
        try {
            console.error(`Loading ${phase} electron extension: ${extensionPath}`);
            const extension = requireExtension(extensionPath);
            const handler = phase === 'prolog'
                ? extension?.prolog
                : (extension?.epilog || extension);

            if (typeof handler !== 'function') {
                if (phase === 'prolog') return;
                throw new TypeError(`Electron extension "${extensionPath}" does not export a callable handler`);
            }

            await handler(app, {}, args);
        } catch (err) {
            console.error(`Failed to run ${phase} electron extension "${extensionPath}"`, err);
        }
    }

    function start(phase, args = []) {
        return Promise.all(
            Array.from(loadedExtensions, extensionPath => invoke(extensionPath, phase, args))
        );
    }

    function close() {
        if (!closePromise) {
            closePromise = Promise.all(
                Array.from(loadedModules.entries(), async ([extensionPath, extension]) => {
                    if (typeof extension?.close !== 'function') return;

                    try {
                        await extension.close();
                    } catch (err) {
                        console.error(`Failed to close electron extension "${extensionPath}"`, err);
                    }
                })
            );
        }

        return closePromise;
    }

    function hasCloseHandlers() {
        return Array.from(loadedModules.values())
            .some(extension => typeof extension?.close === 'function');
    }

    return {
        close,
        discover,
        hasCloseHandlers,
        start
    };
}

module.exports = { createExtensionManager };
