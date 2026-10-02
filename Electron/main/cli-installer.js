const fs = require('fs');
const path = require('path');

function createCliInstaller({ app, appDataFolder, dialog, electronDirectory, isWindows, sudo }) {
    const cliInfo = {
        darwin: {
            cliPath: '/usr/local/bin/',
            cliLink: '/usr/local/bin/wljs',
            cmd: 'bash',
            script_uninstall: path.join(electronDirectory, 'build', 'cli_unix_remove.sh'),
            script: path.join(electronDirectory, 'build', 'cli_unix.sh')
        },
        linux: {
            cliPath: '/usr/local/bin/',
            cliLink: '/usr/local/bin/wljs',
            cmd: 'bash',
            script_uninstall: path.join(electronDirectory, 'build', 'cli_unix_remove.sh'),
            script: path.join(electronDirectory, 'build', 'cli_unix.sh')
        },
        win32: {
            cliPath: '%SystemRoot%\\System32\\wljs.bat',
            cliLink: isWindows ? path.join(process.env.windir, 'System32', 'wljs.bat') : '',
            cmd: '',
            script_uninstall: path.join(electronDirectory, 'build', 'cli_win_remove.bat'),
            script: path.join(electronDirectory, 'build', 'cli_win.bat')
        }
    };

    const installedMarkerPath = () => path.join(appDataFolder, '.cli_i3');

    function markPromptHandled() {
        fs.writeFile(installedMarkerPath(), 'Nothing to see here', function(err) {
            if (err) {
                console.error('Failed to write CLI marker');
                console.error(err);
            }
        });
    }

    function checkInstalled(logWindow) {
        if (!app.isPackaged) return;

        if (!cliInfo[process.platform]) {
            console.warn('Cli is not supported on platform ' + process.platform);
            return;
        }

        fs.exists(installedMarkerPath(), (existsQ) => {
            if (existsQ) {
                console.log('Cli is installed');
                return;
            }

            const cliPath = cliInfo[process.platform].cliPath;

            console.log('Cli is not installed');

            const prompt = dialog.showMessageBox(logWindow, {
                type: 'question',
                buttons: ['Install', 'Not now'],
                defaultId: 0,
                cancelId: 1,
                noLink: true,
                message: 'Install the WLJS command line interface?',
                detail: 'This adds the wljs command so WLJS Notebook can be opened from a terminal.'
            });

            prompt.then((res) => {
                if (res.response !== 0) {
                    markPromptHandled();
                    return;
                }

                try {
                    const exePath = app.getPath('exe');

                    console.log(exePath);
                    console.log(path.resolve(cliInfo[process.platform].script));

                    const options = { name: 'WLJS Elevated module' };

                    sudo.exec((cliInfo[process.platform].cmd + ' "' + path.resolve(cliInfo[process.platform].script) + '" ' + '"' + cliPath + '" ' + '"' + exePath + '"').trim(), options,
                        function(error, stdout) {
                            if (error) throw error;
                            console.log('stdout: ' + stdout);
                            markPromptHandled();
                        }
                    );
                } catch (err) {
                    console.log('Failed to install CLI');
                    console.error(err);
                }
            }).catch((err) => {
                console.log('Failed to show CLI install prompt');
                console.error(err);
            });
        });
    }

    return { checkInstalled };
}

module.exports = { createCliInstaller };
