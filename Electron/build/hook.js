//@ts-check
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { promises: fs } = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const execFileAsync = promisify(execFile);
const log = (...messages) => console.log(...messages);

async function removeLegacyElectronSudoLicenses(appPath) {
    const relativePaths = [
        'Contents/Resources/app/node_modules/electron-sudo/LICENSE',
        'Contents/Resources/app/node_modules/electron-sudo/dist/bin/applet.app/LICENSE',
        'Contents/Resources/app/node_modules/electron-sudo/src/bin/applet.app/LICENSE'
    ];

    await Promise.all(relativePaths.map(async relativePath => {
        const filePath = path.join(appPath, relativePath);
        try {
            await fs.rm(filePath);
            log(`Deleted ${filePath}`);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }));
}

async function buildQuickLookExtension(context, appPath) {
    const projectPath = path.join(
        context.packager.projectDir,
        'Electron',
        'QuickLook',
        'WLJSQuickLook.xcodeproj'
    );
    const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'wljs-quicklook-'));
    const buildDirectory = path.join(temporaryDirectory, 'build');
    const extensionName = 'WLJSQuickLook.appex';
    const builtExtension = path.join(buildDirectory, extensionName);
    const plugInsDirectory = path.join(appPath, 'Contents', 'PlugIns');
    const destination = path.join(plugInsDirectory, extensionName);

    try {
        log('Building Universal 2 WLJS Quick Look extension');
        const { stdout, stderr } = await execFileAsync('xcodebuild', [
            '-project', projectPath,
            '-scheme', 'WLJSQuickLook',
            '-configuration', 'Release',
            '-derivedDataPath', path.join(temporaryDirectory, 'DerivedData'),
            `CONFIGURATION_BUILD_DIR=${buildDirectory}`,
            'ARCHS=arm64 x86_64',
            'ONLY_ACTIVE_ARCH=NO',
            'CODE_SIGNING_ALLOWED=NO',
            'build'
        ], { maxBuffer: 10 * 1024 * 1024 });

        if (stdout.trim()) log(stdout.trim());
        if (stderr.trim()) log(stderr.trim());

        await fs.mkdir(plugInsDirectory, { recursive: true });
        await fs.rm(destination, { recursive: true, force: true });
        await fs.cp(builtExtension, destination, { recursive: true });
        log(`Embedded ${destination}`);
    } finally {
        await fs.rm(temporaryDirectory, { recursive: true, force: true });
    }
}

async function afterPack(context) {
    // Finder Quick Look extensions only exist on macOS. In particular, do not
    // require Xcode or add native artifacts during Windows and Linux builds.
    if (context.electronPlatformName !== 'darwin') return context;

    const appPath = path.join(
        context.appOutDir,
        `${context.packager.appInfo.productFilename}.app`
    );

    log('\n\n🪝 macOS afterPack hook triggered');
    await removeLegacyElectronSudoLicenses(appPath);
    await buildQuickLookExtension(context, appPath);
    log('Finished macOS afterPack hook\n');
    return context;
}

module.exports = afterPack;
module.exports.default = afterPack;
module.exports.buildQuickLookExtension = buildQuickLookExtension;
