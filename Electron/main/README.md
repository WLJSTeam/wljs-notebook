# Electron main-process modules

`../main.js` remains the entry point and owns startup ordering, application
lifecycle, and window state. The modules in this directory isolate features
that can evolve independently:

- `extension-manager.js` discovers and runs package-provided Electron hooks.
- `wolfram-runtime.js` contains the tested wolframscript startup, activation,
  retry, and shutdown behavior. Keep its stream and timer ordering intact.
- `menu-manager.js` builds native menus and renderer-triggered menu actions.
- `ipc-handlers.js` registers renderer IPC contracts.
- `device-permissions.js` owns HID selection and permission/header handlers.
- `cli-installer.js` owns the optional system CLI installation prompt.
- `pdf-tools.js` implements PDF rendering and crop calculations.

Modules receive mutable application state explicitly. This avoids hidden
cross-module imports while retaining the initialization order in `main.js`.
