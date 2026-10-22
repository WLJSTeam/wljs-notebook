//@ts-check
const path = require('node:path');

/**
 * electron-builder deliberately skips Contents/PlugIns. Add the Quick Look
 * bundle as an explicit signing target and give only that bundle the app
 * extension sandbox entitlements. Electron helpers retain their existing
 * entitlements.
 */
function configureSignOptions(options) {
    const extensionPath = path.join(
        options.app,
        'Contents',
        'PlugIns',
        'WLJSQuickLook.appex'
    );
    const extensionEntitlements = path.join(
        __dirname,
        '..',
        'QuickLook',
        'WLJSQuickLook',
        'WLJSQuickLook.entitlements'
    );
    const originalIgnore = options.ignore;
    const originalOptionsForFile = options.optionsForFile;

    options.binaries = [...(options.binaries || []), extensionPath];
    options.ignore = filePath => {
        if (filePath === extensionPath) return false;
        return originalIgnore ? originalIgnore(filePath) : false;
    };
    options.optionsForFile = filePath => {
        if (filePath === extensionPath) {
            return {
                entitlements: extensionEntitlements,
                hardenedRuntime: true,
                timestamp: options.timestamp
            };
        }
        return originalOptionsForFile ? originalOptionsForFile(filePath) : {};
    };

    return { extensionPath, extensionEntitlements };
}

module.exports = async function signMacApplication(options) {
    configureSignOptions(options);

    const { sign } = await import('@electron/osx-sign');
    await sign(options);
};

module.exports.configureSignOptions = configureSignOptions;
