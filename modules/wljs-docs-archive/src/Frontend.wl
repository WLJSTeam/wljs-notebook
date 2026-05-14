BeginPackage["CoffeeLiqueur`Extensions`DocsArchive`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`UInternal`",
    "CoffeeLiqueur`WLX`WebUI`"
}];

Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

Begin["`Internal`"]

Echo["Note: wljs-docs-archive only redirects to a web page since 2.8.1"];

root = DirectoryName[$InputFileName] // ParentDirectory;

AppExtensions`TemplateInjection["AppScripts"] = ("
    <script type=\"module\">
        core['CoffeeLiqueur`Extensions`DocsArchive`Internal`OpenDocs'] = (args, env) => {
            const addr = interpretate(args[0], env);
            if (window.electronAPI) {
                window.electronAPI.openExternal(addr);
            } else {
                const lnk = document.createElement('a');
                lnk.href = addr;
                lnk.target = '_blank';
                lnk.click();
            }
        }
    </script>
")&;

EventHandler[AppExtensions`AppEvents// EventClone, {
    "open_docs" -> Function[Null,
        With[{cli = Global`$Client},
            WebUISubmit[OpenDocs["https://wljs.io/frontend/Reference/"], cli];
        ]
    ]
}];

End[]
EndPackage[]
