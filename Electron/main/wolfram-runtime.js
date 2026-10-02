function createWolframRuntime({
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
}) {
    const promts_hash = {}
    class promt {
        constructor(type = 'binary', title, cbk, window) {
            this.uuid = uuid4();
            const self = this;

            switch(type) {
                case 'binary':
                    const res = dialog.showMessageBox({message: title, buttons: ['No', 'Yes'], noLink:true});
                    res.then((r) => {
                        self.resolve(r.response == 1);
                    });
                    this.promise = (result) => cbk(result)
                break;

                case 'input':
                    window.webContents.send('promt', this.uuid, title);
                    this.promise = (result) => cbk(result)
                    //prompt('Action needed', title).then((result) => {
                      //  cbk(result)
                    //});
                break;
            }

            promts_hash[this.uuid] = this;
        }

        resolve(value) {
            this.promise(value);
            delete promts_hash[this.uuid];
        }
    }

    function store_configuration(cbk) {
        const opts = {
            wolfram: server.wolfram,
            version: app.getVersion()
        };

        fs.writeFile(path.join(appDataFolder, 'configuration.ini'), JSON.stringify(opts), function(err) {
            if (err) throw err;
        });

        cbk();
    }

    function clearAllCache() {
        session.defaultSession.clearStorageData();
        session.defaultSession.clearCache();
        console.log('Cache was nuked');
    }

    function load_configuration() {
        if (!fs.existsSync(path.join(appDataFolder, 'configuration.ini'))) {
            clearAllCache();
            return undefined;
        }
        const content = fs.readFileSync(path.join(appDataFolder, 'configuration.ini'), 'utf8');
        if (content.length == 0) {
            clearAllCache();
            return undefined;
        }

        const parsed = JSON.parse(content);
        if (!parsed) return undefined;

        if (parsed.version != app.getVersion()) {
            clearAllCache();
        }

        return parsed;
    }

    //checking if there is working Wolfram Kernel.
    function check_wl (configuration, cbk, window) {
        if (configuration) server.wolfram = {...server.wolfram, ...configuration.wolfram};

        windows.log.print(`WLJS Notebooks
Copyright (c) 2026 Coffee liqueur
Licensed under the AGPLv3. See /LICENSE.md.

This product bundles third-party FOSS.
Wolfram Engine is proprietary and distributed by Wolfram Research.

`);
        windows.log.info("Starting wolframscript");
        windows.log.print("Starting wolframscript by path: " + server.wolfram.path);
        let program;

        let cautch = false;

        try{
            console.log('TRY');
            program = spawn(server.wolfram.path, server.wolfram.args, { cwd: workingDir });
        } catch (err) {
            console.log('catch::err');
            windows.log.clear();
            windows.log.print(err);
            console.log(err);
            windows.log.info("wolframscript was not found!");

            cautch = true;
            //windows.log.print('Do you have Wolfram Engine installed?', '\x1b[42m');
            new promt('binary', 'Do you have Wolfram Engine installed?', (answer) => {
                if (answer) {
                    windows.log.print("");
                    new promt('binary', 'Please, locate an executable called wolframscript or WolframKernel', ()=>{
                        setTimeout(() => {
                            const promise = dialog.showOpenDialog({ title: 'Locate wolframscript', properties: ['openFile', 'showHiddenFiles', 'treatPackageAsDirectory', 'dontAddToRecent']});
                            promise.then((res) => {
                                if (!res.canceled) {
                                    server.wolfram.path = res.filePaths[0];
                                    console.log(res.filePaths);
                                    windows.log.clear();
                                    check_wl(undefined, cbk, window);
                                } else {
                                    windows.log.clear();
                                    check_wl(undefined, cbk, window);
                                }
                            });
                        }, 1000);
                    }, window);
                    windows.log.print('Please, locate an executable called `wolframscript` or `WolframKernel`', '\x1b[44m');

                } else {
                    install_wl(window);
                }
            }, window);
            return;
        }


        program.on('close', (code) => {
            console.log('on::close');

            if (_nohup) {
                windows.log.info("Process exited with code "+code);
                windows.log.print("Process exited with code "+code);
                windows.log.print("No hup");
                program.exitedAlready = true;

            } else {

                windows.log.info("Process exited abnormally with code "+code);
                windows.log.print("Process exited abnormally with code "+code);
                if (cautch) return;
                cautch = true;
                windows.log.print("Restarting soon...");
                setTimeout(() => {
                    check_wl(undefined, cbk, window);
                }, 3000);
            }

        });

        //error
        program.on('error', function(err) {
            console.log('on::error');

            windows.log.print("");
            windows.log.info("Cannot execute a given process");
            windows.log.print("Cannot execute a given process", '\x1b[46m');
            windows.log.print(String(err));

            if (cautch) return;
            cautch = true;
            console.log("Cannot execute a given process");

            setTimeout(() => {
                windows.log.clear();
                windows.log.print(err);
                console.log(err);
                console.log('Do you have Wolfram Engine installed?');
                windows.log.info("Cannot locate wolframscript!");
                new promt('binary', 'Do you have Wolfram Engine installed?', (answer) => {
                    if (answer) {
                        windows.log.print("");

                        windows.log.print('Please, locate an executable called `wolframscript` or `WolframKernel`', '\x1b[44m');

                        new promt('binary', 'Please, locate an executable called wolframscript or WolframKernel', () => {
                            setTimeout(() => {
                                const promise = dialog.showOpenDialog({ title: 'Locate wolframscript or WolframKernel', properties: ['openFile', 'showHiddenFiles', 'treatPackageAsDirectory', 'dontAddToRecent']});
                                promise.then((res) => {
                                    if (!res.canceled) {
                                        //throw ;
                                        if (path.basename(res.filePaths[0]) == 'Wolfram Engine' && isMac) {

                                            windows.log.clear();
                                            windows.log.print("Error!");
                                            windows.log.print('Please do not select "Wolfram Engine" Unix binary on OSX! Use WolframKernel link file instead', '\x1b[44m');
                                            windows.log.print('Restarting in 2 seconds...');

                                            setTimeout(() => {check_wl(undefined, cbk, window);}, 2000);

                                            return;
                                        }
                                        server.wolfram.path = res.filePaths[0];
                                        console.log(res.filePaths);
                                        windows.log.clear();
                                        check_wl(undefined, cbk, window);
                                    } else {
                                        windows.log.clear();
                                        check_wl(undefined, cbk, window);
                                    }
                                });
                            }, 1000);
                        }, window);

                    } else {
                        install_wl(window);
                    }
                }, window);
                return;
            }, 2000);

        });

        let _nohup = false;

        //for debugging only
        /*program.stderr.on('data', (data) => {
            windows.log.print(data.toString());
        });

        program.stdout.on('data', (data) => {
            windows.log.print(data.toString());
        }); */

        program.stderr.once('data', (data) => {
            console.log('stderr::data');
            console.warn(data.toString());
            if (_nohup) return;
            _nohup = true;

            windows.log.print("");

            //TROUBLESHOOTING
            if (default_error_handling(()=>{
                //If managed
                //Wolframscript started
                console.log('Working!');
                server.wolfram.process = program;
                server.running = false;
                server.startedQ = true;
                //windows.log.clear();
                cbk();
            },
            () => {
                //if failed
                if (server.down) return;

                windows.log.clear();

                program.stdin.end();
                program.stdout.destroy();
                program.stderr.destroy();

                program.kill('SIGKILL');
                kill_all(() => console.log('killed!'));
                check_wl(undefined, cbk, window);
            }, data.toString(), program, window)) return;

            //if we did not manage to fix issues...
            windows.log.print(data.toString(), '\x1b[46m');
            windows.log.print("");

            //this is a sign that the command was not found
            setTimeout(() => {
                windows.log.clear();
                check_wl(undefined, cbk, window);

            }, 3000);
        });



        program.stdout.once('data', (data) => {
            //this is ok. wolframscript now is running
            if (_nohup) return;
            _nohup = true;

            const s = data.toString();

            windows.log.print("");

            //TROUBLESHOOTING
            if (default_error_handling(()=>{
                //If managed
                //Wolframscript started
                //windows.log.clear();
                server.wolfram.process = program;
                server.running = false;
                server.startedQ = true;
                cbk();
            },
            () => {
                //if failed
                if (server.down) return;

                program.stdin.end();
                program.stdout.destroy();
                program.stderr.destroy();


                program.kill('SIGKILL');
                kill_all(() => console.log('killed!'));
                windows.log.clear();
                check_wl(undefined, cbk, window);
            }, s, program, window)) return;

            //If OK
            //Wolframscript started
            if (new RegExp('Wolfram').exec(s)) {
                windows.log.print(s);
                server.wolfram.process = program;
                server.running = false;
                server.startedQ = true;
                //windows.log.clear();
                cbk();
                return;
            }


            windows.log.print("");
            windows.log.print(s);

            //wait for more output
            program.stdout.once('data', (data) => {
                //If OK
                //Wolframscript started
                if (new RegExp('Wolfram').exec(data.toString())) {
                    windows.log.print(data.toString());
                    server.wolfram.process = program;
                    server.running = false;
                    server.startedQ = true;
                    cbk();
                    return;
                }

                //if not
                windows.log.print("");
                windows.log.print(data.toString());
                windows.log.print("");
                windows.log.print("Unexpected reply from wolframscript. Restart in 5 sec", '\x1b[46m');
                windows.log.info("Unexpected reply from wolframscript. Restart in 5 sec");
                windows.log.print("Expected 'Wolfram' string");

                setTimeout(()=>{
                    if (server.down) return;

                    program.stdin.end();
                    program.stdout.destroy();
                    program.stderr.destroy();


                    program.kill('SIGKILL');
                    kill_all(() => console.log('killed!'));
                    windows.log.clear();
                    check_wl(undefined, cbk, window);
                }, 5000);
            });
        });

    }

    function default_error_handling(success, reject, s, program, window) {
        if (new RegExp('Wolfram ID', 'i').exec(s)) {
            windows.log.info('Activation required');
            activate_wl(program, success, () => {
                windows.log.clear();
                reject();
            }, window);
            return true;
        }

        //1# activation issues
        if (new RegExp('Wolfram product is not activated').exec(s)) {
            windows.log.print("Automatic activation in 3 seconds...", '\x1b[44m');
            windows.log.info("Automatic activation in 3 seconds...");

            setTimeout(() => {
                if (!server.wolfram.args.includes('-activate')) server.wolfram.args.push('-activate');
                windows.log.clear();
                reject();
            }, 3000);
            return true;
        }

        //on success of activation
        if (new RegExp('activated').exec(s)) {
            server.wolfram.args.pop();
            windows.log.clear();
            reject();
            return true;
        }


        //#2 Too many running Kernels
        if (new RegExp('The Wolfram Engine could not be').exec(s)) {
            windows.log.print("It seems you have some Wolfram Kernels running in the background or on another machine. Due to the Wolfram licensing limitations it is not allowed to run more than 2. WLJS Notebook requires exactly 2 to run locally.", '\x1b[44m');
            windows.log.print("");
            windows.log.info('It seems you have other Wolfram Kernels running in the background. Please stop them');

            //windows.log.print('Should we try to kill other processes?', '\x1b[42m');
            new promt('binary','Should we try to kill other Wolfram processes?', (answer) => {
                if (!answer) {
                    kill_all(() => {
                        windows.log.clear();
                        reject();
                    }, window);
                } else {
                    windows.log.clear();
                    reject();
                }
            }, window);
            return true;
        }


        //#3 Activation
        if (new RegExp('The Wolfram Engine requires one-time').exec(s)) {
            //windows.log.print('Do you have a developer license from Wolfram?', '\x1b[42m');
            windows.log.info('Activation required');

            new promt('binary', 'Do you have a developer license activated?', (answer) => {


                if (!answer) {
                    windows.log.clear();
                    windows.log.print('Please get the license from Wolfram website. A window will open shortly...');
                    shell.openExternal("https://www.wolfram.com/engine/free-license/");
                    setTimeout(() => {
                        windows.log.clear();
                        activate_wl(program, success, () => {
                            //if rejected
                            windows.log.clear();
                            reject();
                        }, window);
                    }, 3000);

                } else {


                    if (program.exitedAlready) {
                        windows.log.print('Something went wrong with wolframscript.\n\r Try to run wolframscript from your terminal');
                        windows.log.print('Quitting in 5 seconds');
                        setTimeout(() => {
                            app.quit();
                        }, 5000);
                        return;
                    }

                    windows.log.clear();

                    activate_wl(program, success, () => {
                        //if rejected
                        windows.log.clear();
                        reject();
                    }, window);
                }
            }, window);

            return true;
        }

        return false;
    }

    function kill_all(cbk, window) {

        switch(process.platform) {
            case 'win32':
                exec('taskkill /F /IM WolframKernel.exe /T');
            break;
            default: // Linux + Darwin
                exec('pkill -9 -f Wolfram');
            break;
        }

        //windows.log.print('probably killed');
        setTimeout(cbk, 2000);
    }


    function activate_wl(program, success, rejection, window) {
        windows.log.clear();

        if (program.exitedAlready) {
            windows.log.print('Something went wrong with wolframscript.\n\r Try to run wolframscript from your terminal');
            windows.log.print('Quitting in 5 seconds');
            setTimeout(() => {
                app.quit();
            }, 5000);
            return;
        }

        //answer checkers
        const check = (string) => {
            //keep going...
            if (string.trim().length == 0) return false;

            if (new RegExp('Incorrect').exec(string)) {
                //windows.log.print('Incorrect');
                windows.log.info('Incorrect login/password');
                setTimeout(rejection, 3000);
                //stop
                return true;
            }

            if (new RegExp('Wolfram Language').exec(string)) {
                //windows.log.print('Success!');
                windows.log.info('Activated');
                success();
                return true;
            }

            //continue
            return false;
        }


        windows.log.print('Enter your Wolfram ID in the field box at the bottom');

        new promt('input', 'Wolfram ID', (result) => {
            program.stdin.write(result.trim());
            program.stdin.write('\n');

            windows.log.clear();
            windows.log.print('Please, enter your password in the field box');
            new promt('input', 'Password', (result) => {
                program.stdin.write(result.trim());
                program.stdin.write('\n');

                windows.log.clear();
                windows.log.print('Waiting for the response from wolframscript');

                let _nohup = false;
                let timer = setTimeout(() => {
                    if (server.down) return;

                    windows.log.print('Timeout. Restarting in 3 seconds...', '\x1b[42m');
                    program.stdin.end();
                    program.stdout.destroy();
                    program.stderr.destroy();


                    program.kill('SIGKILL');
                    kill_all(() => console.log('killed!'));
                    setTimeout(rejection, 3000);
                }, 15000);

                program.stderr.once('data', (data) => {
                    if (_nohup) return;
                    _nohup = true;

                    clearTimeout(timer);

                    windows.log.print(data.toString());
                    if (check(data.toString())) return;

                    windows.log.print('please, wait...');
                    windows.log.info('Please wait');

                    program.stderr.once('data', (data) => {
                        if (server.down) return;

                        windows.log.print(data.toString());
                        if (check(data.toString())) return;
                        //timeout to retry

                        program.stdin.end();
                        program.stdout.destroy();
                        program.stderr.destroy();


                        program.kill('SIGKILL');
                        kill_all(() => console.log('killed!'));
                        setTimeout(rejection, 3000);
                    });
                });

                program.stdout.once('data', (data) => {
                    if (server.down) return;
                    if (_nohup) return;
                    _nohup = true;

                    clearTimeout(timer);

                    windows.log.print(data.toString());
                    if (check(data.toString())) return;

                    windows.log.print('please, wait...');
                    windows.log.info('Please wait');

                    program.stdout.once('data', (data) => {
                        windows.log.print(data.toString());
                        if (check(data.toString())) return;
                        //timeout to retry
                        program.kill('SIGKILL');
                        kill_all(() => console.log('killed!'));
                        setTimeout(rejection, 3000);
                    });
                });
            }, window);
        }, window);
    }

    function install_wl(window) {
        windows.log.clear();
        windows.log.info('Wolfram Engine is required');
        windows.log.print("Please download and install Wolfram Engine manually. A windows will open shortly. A feature for auto-installation is not supported for now.");

        new promt('binary', 'Please download and install freeware Wolfram Engine manually. A window will open shortly. ', () => {
            setTimeout(() => {
                shell.openExternal("https://www.wolfram.com/engine/");
                app.quit();
            }, 1000);
        }, window);
    }



    function check_installed (cbk, window) {
        return cbk();
    }







    function resolvePrompt(id, value) {
        promts_hash[id].resolve(value);
    }

    return {
        checkInstalled: check_installed,
        checkWolfram: check_wl,
        killAll: kill_all,
        loadConfiguration: load_configuration,
        resolvePrompt,
        storeConfiguration: store_configuration
    };
}

module.exports = { createWolframRuntime };
