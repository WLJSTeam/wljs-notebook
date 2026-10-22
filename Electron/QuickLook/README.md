# WLJS Quick Look extension

This macOS-only app extension renders `.wln` and `.wlw` files in Finder's
preview pane and Space-bar Quick Look. It reads only the `%Cells%` section,
stopping at `%EndOfCells%`, and does not start Wolfram Engine or Electron.

`Electron/build/hook.js` builds a Universal 2 (`arm64` and `x86_64`) `.appex`
during macOS packaging and copies it to the application's `Contents/PlugIns`
directory. `Electron/build/mac-sign.js` applies the extension's sandboxed,
read-only entitlements before signing the containing Electron application.
The data-based Quick Look API requires macOS 12 or newer and supports both
Intel and Apple Silicon Macs.

The build requires the full Xcode application. Command Line Tools alone do not
include `xcodebuild` support for application-extension targets.

The parser can be checked without building the `.appex`:

```sh
swiftc \
  Electron/QuickLook/WLJSQuickLook/WLNPreviewParser.swift \
  Electron/QuickLook/Tests/ParserSmokeTest.swift \
  -o /tmp/wljs-quicklook-parser-test

/tmp/wljs-quicklook-parser-test \
  "modules/wljs-demos-archive/Demos/Data visualisation/A - 1D Plot.wln" \
  "modules/wljs-demos-archive/Demos/Mini apps/B - Units Converter.wlw"
```
