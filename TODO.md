Phase I

- [x] Search WebUISubmit: finish replacing globals
- [x] $DefaultSerializer replace
- [x] Check WebUIKeyListener and others
- [x] FrontFetch: Remove "Format" option, restict to plain JS objects
- [x] WebUIFetch: Remove "Format" option
- [x] "KernelSocket" check how ot transfer
- [x] Try saving dataset with many many FEs
- [x] Test mini apps context
- [x] DATA COmpression roundtrip!!!!!!!
- [x] Legacy notebooks may not be correctly uncompressed when FE is requested, since now they dot do a roundtrip
- [x] Clean up FE creation, plain blocked ExportByteArray + comp
- [x] Use AsyncFunction during the sync
- [ ] Move WLJSTranspost and Interpreer to its own package, expose assets dir via some variable (so it can be added to PATH). Add WebUSoceckSendBinary[]
- [x] Then[WebUIFetch[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObject
- [x] With[{result = FrontFetch[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObject
- [x] GetSymbol function seems to use some sort of communication with kernel. check misc 
- [x] server.emitt: remove it completely
- [x] server.kernel.emitt: remove it completely
- [x] server._emitt: remove it completely
- [x] Views/Notebook/Notebook.wlx: Replace Forwarded with some text stuff
- [x] rename WLJS.wl inside WLX package into something else. Used only for loading scripts
- [x] Kick out sync from frontend, only ids
- [x] Fix FrontRef to fetch the missing from master kernel
- [ ] Run tests
- [x] Run manual test on printing, 
- [x] sidebar, 
- [x] context menu,
- [ ] Look though all modules  
- [x] uploading, 
- [x] spinner
- [x] snippets, 
- [x] odd error when first time run prompt window
- [ ] exports as widgets, 
- [x] check settings reload, 
- [ ] html export, 
- [ ] slide export, 
- [x] save boxes, 
- [x] add bg to kernels 
- [x] message boxes, 
- [x] input string and etc, 
- [x] dropdown menu, 
- [x] autocompelte extend, 
- [x] setdirectory on focus, 
- [x] createwindow, 
- [x] xterm, 
- [x] greek character 
- [x] from specialchars table, 
- [x] check debugger 
- [ ] animation framework, 
- [x] export animation, 
- [x] export Animate, 
- [x] export PDF, 
- [x] Rasterize, 
- [ ] test MCP, 
- [x] test drag  and drop

- [ ] make WLJSIO.wl -> Interpeter?
- [ ] move wljs-cells to views?

Phase II
- [ ] modules/wljs-editor/src/FrontendObject.wl: Remove deferred compression and use explicit ExpressionJSON convertion with neutral context

- [ ] Switch to WXF
- [ ] Find all [TODO] tags


Phase III
- [ ] Test FEM
- [ ] WLX add NewLine tag
- [x] cache time reduce
- [ ] NotebookClose on CurrentWindow[] should send WebUIClose
- [ ] SystemDialogInputAsync no need in Window and for other