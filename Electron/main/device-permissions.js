function createDevicePermissions({ dialog, isMac, isWindows, isWindows11, majorVersion, server, session }) {
    let deviceDialogOpen = false;
    const usedHIDCallbacks = new WeakSet();

    function createHIDDialog(deviceList, callback) {
        if (usedHIDCallbacks.has(callback)) {
            console.log('HID: callback already used, ignoring this event');
            return;
        }

        if (deviceDialogOpen) {
            console.log('HID: dialog already open, ignoring this event');
            return;
        }

        deviceDialogOpen = true;
        let done = false;

        const finish = (id) => {
            if (done) return;
            done = true;
            deviceDialogOpen = false;

            if (!usedHIDCallbacks.has(callback)) {
                usedHIDCallbacks.add(callback);
            }

            try {
                callback(id);
            } catch (err) {
                console.error('Error in HID callback:', err);
            }
        };

        console.log('HID Dialog (dialog.showMessageBox)!');

        const list = (deviceList || []).map((device) => ({
            name: device.name || device.deviceName || 'Unknown device',
            id: device.deviceId
        }));

        if (!list.length) {
            dialog.showMessageBox({
                type: 'info',
                buttons: ['OK'],
                defaultId: 0,
                title: 'Device selector',
                message: 'No devices available',
                detail: 'No HID-compatible devices are currently available. Please connect a device and try again.',
                noLink: true,
                normalizeAccessKeys: true
            }).finally(() => finish(''));
            return;
        }

        const buttons = list.map(device => device.name);
        buttons.push('Cancel');
        const cancelId = buttons.length - 1;

        dialog.showMessageBox({
            type: 'question',
            buttons,
            cancelId,
            defaultId: 0,
            title: 'Device selector',
            message: 'Select a HID device',
            detail: 'Choose the device you want to use from the list below.',
            noLink: true,
            normalizeAccessKeys: true
        }).then(({ response }) => {
            if (response === cancelId) {
                finish('');
            } else {
                const selected = list[response];
                finish(selected ? selected.id : '');
            }
        }).catch((err) => {
            console.error('Error showing HID selection dialog:', err);
            finish('');
        });
    }

    function attach(mainWindow) {
        mainWindow.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
            console.log('Select HID (bluetooth)');
            event.preventDefault();
            createHIDDialog(deviceList, callback);
            return false;
        });

        mainWindow.webContents.session.on('select-hid-device', (event, details, callback) => {
            console.log('Select HID');
            event.preventDefault();
            createHIDDialog(details.deviceList, callback);
            return false;
        });

        mainWindow.webContents.session.setPermissionCheckHandler(() => true);
        mainWindow.webContents.session.setDevicePermissionHandler(() => true);

        session.fromPartition('default').setPermissionRequestHandler((webContents, permission, callback) => {
            const allowedPermissions = ['audioCapture', 'desktopCapture'];

            if (allowedPermissions.includes(permission)) {
                callback(true);
            } else {
                console.error(
                    `The application tried to request permission for '${permission}'. This permission was not whitelisted and has been blocked.`
                );
                callback(false);
            }
        });

        let currentOS;
        if (isWindows) currentOS = 'Windows';
        if (isWindows && (!isWindows11 || server.frontend.WindowsLegacy)) currentOS = 'WindowsLegacy';
        if (isMac) currentOS = 'OSX';
        if (!isMac && !isWindows) currentOS = 'Unix';

        session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
            details.requestHeaders.Electron = majorVersion;
            details.requestHeaders.AppOS = currentOS;
            callback({ requestHeaders: details.requestHeaders });
        });
    }

    return { attach };
}

module.exports = { createDevicePermissions };
