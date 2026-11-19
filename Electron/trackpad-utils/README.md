# WLJS trackpad utils

Vendored from `electron-trackpad-utils` 1.0.3 by David Cann. The original
source is MIT licensed; see [LICENSE](LICENSE). The native addon is built by
`node-gyp` when npm installs the local optional dependency on macOS. Electron
Builder rebuilds it for the packaged Electron runtime. The app loads this
directory directly, and the Electron packaging list includes it.

This copy provides trackpad scroll start/end callbacks, force-click detection,
and `triggerFeedback(pattern)`. The renderer bridge accepts the same pattern:
`window.electronAPI.harptic('generic')` or `harptic('levelChange')`. Calling
`harptic()` uses `alignment`, as before. Unknown patterns also fall back to
`alignment`. AppKit does not expose a strength setting for these trackpad
patterns.
