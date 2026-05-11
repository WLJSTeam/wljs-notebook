BeginPackage["CoffeeLiqueur`Extensions`ExportImport`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`", 
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CoffeeLiqueur`Extensions`WLJSInterpreter`"
}]

Needs["CoffeeLiqueur`ExtensionManager`" -> "WLJSPackages`"];
Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Begin["`Internal`"]



rootFolder = $InputFileName // DirectoryName;
AppExtensions`TemplateInjection["SettingsFooter"] = ImportComponent[FileNameJoin[{rootFolder, "Templates", "Settings.wlx"}] ];

Needs["CoffeeLiqueur`Notebook`SettingsUtils`"->"settings`", FileNameJoin[{"Frontend", "Settings.wl"}] ];
{loadSettings, storeSettings}        = {settings`initialize, settings`storeConfiguration};

settings = <||>;

LoaderComponent = ImportComponent[ FileNameJoin[{rootFolder, "Templates", "Loader.wlx"}] ];

Needs["CoffeeLiqueur`Extensions`ExportImport`SFX`" -> "sfx`", FileNameJoin[{rootFolder, "Formats", "SFX", "SFX.wl"}] ];

EventHandler[AppExtensions`AppEvents// EventClone, {
    "Loader:LoadNotebook" -> sfx`extract,
    "Exporter:ExportNotebook" -> universalStaticExport
}];

Needs["CoffeeLiqueur`Extensions`ExportImport`HTML`" -> "html`", FileNameJoin[{rootFolder, "Formats", "HTML", "HTML.wl"}] ];

HTMLFileQ[path_] := If[FileExtension[path] === "html", html`Static`check[path], False ];
CoffeeLiqueur`Notebook`Views`Router[any_?HTMLFileQ, appevents_String, _] := With[{},
    {LoaderComponent[##, "Path"->any, "Decoder"->html`Static`decode], ""}&
]


Needs["CoffeeLiqueur`Extensions`ExportImport`Markdown`" -> "markdown`", FileNameJoin[{rootFolder, "Formats", "Markdown", "Markdown.wl"}] ];

MDFileQ[path_] := FileExtension[path] === "md"
CoffeeLiqueur`Notebook`Views`Router[any_?MDFileQ, appevents_String, _] := With[{},
    {LoaderComponent[##, "Path"->any, "Decoder"->markdown`decode], ""}&
]

Needs["CoffeeLiqueur`Extensions`ExportImport`Mathematica`" -> "mathematica`", FileNameJoin[{rootFolder, "Formats", "Mathematica", "Mathematica.wl"}] ];

NBFileQ[path_] := FileExtension[path] === "nb"
CoffeeLiqueur`Notebook`Views`Router[any_?NBFileQ, appevents_String, _] := With[{},
    {LoaderComponent[##, "Path"->any, "Decoder"->mathematica`decode[##] ], ""}
]&

Needs["CoffeeLiqueur`Extensions`ExportImport`WLW`" -> "wlw`", FileNameJoin[{rootFolder, "Formats", "WLW.wl"}] ];

WLEFileQ[path_] := FileExtension[path] === "wlw"
CoffeeLiqueur`Notebook`Views`Router[any_?WLEFileQ, appevents_String, _] := With[{},
    {LoaderComponent[##, "Path"->any, "Decoder"->wlw`execute[##] ], ""}
]&

Needs["CoffeeLiqueur`Extensions`ExportImport`Slides`" -> "slides`", FileNameJoin[{rootFolder, "Formats", "Slides", "Slides.wl"}] ];

Needs["CoffeeLiqueur`Extensions`ExportImport`MDX`" -> "mdx`", FileNameJoin[{rootFolder, "Formats", "MDX", "MDX.wl"}] ];

Needs["CoffeeLiqueur`Extensions`ExportImport`HTMLEmbeddable`" -> "htmle`", FileNameJoin[{rootFolder, "Formats", "HTMLEmbeddable", "HTMLEmbeddable.wl"}] ];


buttonTemplate := ImportComponent[FileNameJoin[{rootFolder, "Templates", "Button.wlx"}] ];
AppExtensions`TemplateInjection["AppNotebookTopBar"] = buttonTemplate["HandlerFunction" -> processRequest];

AppExtensions`SidebarIcons = ImportComponent[FileNameJoin[{rootFolder, "Templates", "Icons.wlx"}] ];

getNotebook[controls_] := EventFire[controls, "NotebookQ", True] /. {{___, n_nb`NotebookObj, ___} :> n};

processRequest[controls_, modals_, messager_, client_, "SFX"] := With[{
    notebookOnLine = getNotebook[controls]
},
    With[{
        path = DirectoryName[ notebookOnLine["Path"] ],
        name = FileBaseName[ notebookOnLine["Path"] ],
        ext  = AppExtensions`Templates
    },

        If[!MatchQ[notebookOnLine, _nb`NotebookObj], 
            EventFire[messager, "Warning", "Notebook not found"];
            Return[];
        ];

        loadSettings[settings];

        With[{
   
        }, 
            sfx`applyToNotebook[controls, modals, messager, client, notebookOnLine, path, name, ext, settings, Null];

        ]
    ]
]

processRequest[controls_, modals_, messager_, client_] := With[{
    notebookOnLine = getNotebook[controls]
},
    With[{
        path = DirectoryName[ notebookOnLine["Path"] ],
        name = FileBaseName[ notebookOnLine["Path"] ],
        ext  = AppExtensions`Templates
    },

        If[!MatchQ[notebookOnLine, _nb`NotebookObj], 
            EventFire[messager, "Warning", "Notebook not found"];
            Return[];
        ];

        loadSettings[settings];

        With[{
            p = Promise[]
        }, 
            EventFire[modals, "SelectBox", <|"Promise"->p, "title"->"Export options", "message"->"Please, choose one below", "list"->{"HTML File","HTML Embeddable", "MDX", "Markdown", "Slides", "Mini app", "Mathematica"}|>];
            Then[p, Function[choise,
                If[!MatchQ[choise, _Integer], Return[] ];

                (*If[choise["Result"] === 7, (* different API *)
                    sfx`applyToNotebook[controls, modals, messager, client, notebookOnLine, path, name, ext, settings, Null];
                    Return[];
                ];*)
                With[{args = {controls, modals, messager, client, notebookOnLine, path, name, ext, settings, <|
                            "collectStaticData" :> collectStaticData[client, messager, notebookOnLine],
                            "markdownTransformer" -> requestMarkdownProcessor[client]
                        |>}
                    },
                    Then[collectStaticData[client, messager, notebookOnLine], Function[Null,
                        Echo["Export >>"];
                        Which[
                            choise===1,
                            askIfDynamic[modals, html`Static`export @@ args, html`Dynamic`export @@ args],

                            choise===2,
                            askIfDynamic[modals, htmle`Static`export @@ args, htmle`Dynamic`export @@ args],

                            choise===3,
                            askIfDynamic[modals, mdx`Static`export @@ args, mdx`Dynamic`export @@ args],

                            choise===4,
                            markdown`export @@ args,

                            choise===5,
                            slides`export @@ args,

                            choise===6,
                            wlw`export @@ args,

                            choise===7,
                            mathematica`export @@ args
                        ];
                    ] ] 
                ];
            ] ];
        ]
    ]
]

SetAttributes[askIfDynamic, HoldRest]
askIfDynamic[modals_, callback1_, callback2_] := With[{
            p = Promise[]
        }, 
            EventFire[modals, "SelectBox", <|"Promise"->p, "title"->"Export options", "message"->"Please, choose one below", "list"->{"Static", "Interactive"}|>];
            Then[p, Function[choise,
                If[!MatchQ[choise, _Integer], Return[] ];
                If[choise === 1,
                    callback1;
                ,
                    callback2;
                ]
            ] ]
];

renderMarkdownToString;

requestMarkdownProcessor[client_][data_] :=requestMarkdownProcessor[client][ToString[data] ]
requestMarkdownProcessor[client_][data_String] := WebUIFetch[renderMarkdownToString[data], client, "Format"->"RawJSON"]

collectStaticData[client_, messager_, notebook_] := Block[{
    Global`$Client = client
},
    Pause[0.25];
    (* EventFire[messager, Notifications`NotificationMessage["Info"], "Collecting notebook data"]; *)
    With[{p = EventFire[notebook, "OnBeforeSave", <|"Client" -> client|>] },
        p
    ]
]


EventHandler[AppExtensions`AppProtocol, {
    "open_html" -> Function[assoc,
        Echo[">> Handling URL protocol ! >>"];
        Echo[assoc["url"] ];
        Module[{path = assoc["url"]},
            If[StringTake[path, 5] === "file:",
                Echo["Local file!"];
                path = If[$OperatingSystem === "Windows",
                    FileNameJoin[StringSplit[StringDrop[path, 6], "/"] ],
                    "/"<>FileNameJoin[StringSplit[StringDrop[path, 5], "/"] ]
                ];
                Echo["Local path:"];
                Echo[path];
                path = URLDecode[path];
                Echo["Local path decoded:"];
                Echo[path];
            ,
                Echo["Web resource"];
                Echo["Downloading..."];
                path = URLDownload[path];
            ];

            With[{p = html`Static`decode[path, "Messager"->assoc["Messanger"], "Client"->assoc["Client"] ]},
                Then[p, Function[result,
                  Pause[1];
                  Echo[result];
                  (*/*EventFire[spinner["Promise"], Resolve, True];*/*)
                  WebUILocation[ StringJoin["/", URLEncode[ result ] ], assoc["Client"] ] // Echo;

                ] ];
            ];
        ];
    ]
}]

universalStaticExport[as_Association] := universalStaticExport[as["Notebook"], as["Path"], as["Type"] ]
universalStaticExport[notebook_, outputPath_, "html" ] :=  With[{
    path = DirectoryName[ notebook["Path"] ],
    name = FileBaseName[ notebook["Path"] ],
    ext  = AppExtensions`Templates
}, 
    html`Static`export[outputPath, notebook, path, name, ext, settings, <||>];
]

universalStaticExport[notebook_, outputPath_, "md" ] :=  With[{
    path = DirectoryName[ notebook["Path"] ],
    name = FileBaseName[ notebook["Path"] ],
    ext  = AppExtensions`Templates
}, 
    markdown`export[outputPath, notebook, path, name, ext, settings, <||>];
]

universalStaticExport[notebook_, outputPath_, "mdx" ] :=  With[{
    path = DirectoryName[ notebook["Path"] ],
    name = FileBaseName[ notebook["Path"] ],
    ext  = AppExtensions`Templates
}, 
    mdx`Static`export[outputPath, notebook, path, name, ext, settings, <||>];
]

universalStaticExport[notebook_, outputPath_, "nb" ] :=  With[{
    path = DirectoryName[ notebook["Path"] ],
    name = FileBaseName[ notebook["Path"] ],
    ext  = AppExtensions`Templates
}, 
    mathematica`export[outputPath, notebook, path, name, ext, settings, <||>];
]

End[]
EndPackage[]