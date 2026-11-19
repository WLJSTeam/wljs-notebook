# WLJS trackpad utils

Vendored from `electron-trackpad-utils` 1.0.3 by David Cann. The original
source is MIT licensed; see [LICENSE](LICENSE). The native addon is built by
`node-gyp` when npm installs the local optional dependency on macOS. Electron
Builder rebuilds it for the packaged Electron runtime. The app loads this
directory directly, and the Electron packaging list includes it.

This copy provides trackpad scroll start/end callbacks, force-click detection,
and `triggerFeedback(pattern)`. The renderer bridge accepts the same numeric
pattern: `0` is Generic, `1` is Alignment, and `2` is Level Change. For example,
`window.electronAPI.harptic(2)` requests Level Change. Calling `harptic()` or
passing an invalid value uses Alignment. AppKit does not expose a strength
setting for these trackpad patterns.
