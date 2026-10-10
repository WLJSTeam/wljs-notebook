BeginPackage["CoffeeLiqueur`WLJS`Tools`"]

Alert::usage = "Alert[s_String] frontend symbol, that shows a modal alert window"

AttachDOM::usage = "AttachDOM[divId_String] frontend symbol, which is used internally to attach DOM within the executable env"

WindowScope::usage = "WindowScope[name_String] frontend symbol, that gets Javascript object from the global scope"

ReadClipboard::usage = "ReadClipboard[] frontend symbol, that reads the text content from a clipboard"

(* Make it system-wide available *)
(* This one is too entangled with other packages [FIXME] *)
System`ProvidedOptions;
ProvidedOptions::usage = "ProvidedOptions[expr, opts...] frontend symbol, which injects opts to env.options"

WLJSInterpreterScript;
$WLJSInterpreterAssets;

Begin["`Private`"]

root = $InputFileName // DirectoryName // ParentDirectory // FileNameSplit // Last;
commonScript = Table[StringTemplate["<script type=\"module\" src=\"``\"></script>"]["/"<>root<>"/"<>p], {p, {
    "dist/interpreter.js",
    "src/core.js"
}}] // StringRiffle;

WLJSInterpreterScript = commonScript;

$WLJSInterpreterAssets = {
    FileNameJoin[{rootDir, "src", "api.js"}],
    FileNameJoin[{rootDir, "src", "extension.js"}]
};

End[];

EndPackage[]
