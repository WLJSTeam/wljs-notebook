(* Orchestrates embeddable HTML exports backed by attachment sidecars. *)

BeginPackage["CoffeeLiqueur`Extensions`ExportImport`HTMLEmbeddable`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`", 
    "CoffeeLiqueur`WLJS`Tools`","CoffeeLiqueur`WLJS`Transport`",
    "CoffeeLiqueur`Extensions`Editor`"
}];

Needs["CoffeeLiqueur`ExtensionManager`" -> "WLJSPackages`"];
Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];
Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Needs["CoffeeLiqueur`Extensions`FrontendObject`" -> "fe`"];

folder = $InputFileName // DirectoryName;
rootFolder = folder // ParentDirectory // ParentDirectory;

Needs["CoffeeLiqueur`Extensions`ExportImport`WidgetAPI`" -> "wapi`", FileNameJoin[{rootFolder, "DynamicsTools", "ESP.wl"}] ];


{generateHTML, generateHTMLStore}      = ImportComponent[FileNameJoin[{folder, "Universal.wlx"}] ];

(* Builds a publishable runtime shared by embeddable HTML and MDX exports. *)
Begin["`Bundle`"]

export;
export::path = "Cannot create a bootstrap directory from `1`.";
export::asset = "Required bootstrap asset was not found: `1`.";

asList[value_] := DeleteMissing[Flatten[{value}]]

toURLPath[path_String] := StringRiffle[FileNameSplit[path], "/"]

bundleRoots[] := DeleteDuplicates @ Select[
    Flatten[{FileNameJoin[{Directory[], "modules"}], AppExtensions`ExtensionsDir}],
    StringQ
]

excludedPackages[settings_] := If[
    AssociationQ[settings],
    asList @ Lookup[settings, "ExportHTMLExclude", {}],
    {}
]

bundlePackageKeys[settings_] := With[{excluded = excludedPackages[settings]},
    Select[WLJSPackages`Packages // Keys, Function[key,
        TrueQ[WLJSPackages`Packages[key, "wljs-meta", "exportable"]] &&
        !MemberQ[excluded, WLJSPackages`Packages[key, "name"]] &&
        Or[
            KeyExistsQ[WLJSPackages`Packages[key, "wljs-meta"], "js"],
            KeyExistsQ[WLJSPackages`Packages[key, "wljs-meta"], "styles"]
        ]
    ]]
]

bundleIncludes[param_, packageKeys_List] := Flatten @ Table[
    With[{name = WLJSPackages`Packages[key, "name"]},
        FileNameJoin[Prepend[StringSplit[#, "/"], name]] & /@
            asList[WLJSPackages`Packages[key, "wljs-meta", param]]
    ],
    {key, Select[packageKeys,
        KeyExistsQ[WLJSPackages`Packages[#, "wljs-meta"], param]&
    ]}
]

findPackageRoot[name_String] := SelectFirst[
    FileNameJoin[{#, name}]& /@ bundleRoots[],
    DirectoryQ,
    Missing["PackageRoot", name]
]

ensureDirectory[path_String] := If[
    FileExistsQ[path],
    If[!DirectoryQ[path], Throw[Failure["BundlePath", <|"Path"->path|>], "BundleExport"]],
    CreateDirectory[path, CreateIntermediateDirectories->True]
]

copyFile[source_String, target_String] := (
    If[!FileExistsQ[source],
        Message[export::asset, source];
        Throw[$Failed, "BundleExport"]
    ];
    ensureDirectory[DirectoryName[target]];
    CopyFile[source, target, OverwriteTarget->True]
)

browserAssetQ[path_String] := MemberQ[
    {"js", "mjs", "css", "woff", "woff2", "ttf", "otf", "eot"},
    ToLowerCase @ FileExtension[path]
]

(* Preserve package layout so relative imports and lazy chunks remain valid. *)
copyTree[source_String, target_String] := Module[{walk, ignored = {"node_modules", ".git", ".github"}},
    walk[from_, to_] := (
        ensureDirectory[to];
        Scan[Function[item,
            If[DirectoryQ[item],
                If[!MemberQ[ignored, FileNameTake[item]],
                    walk[item, FileNameJoin[{to, FileNameTake[item]}]]
                ],
                If[browserAssetQ[item],
                    copyFile[item, FileNameJoin[{to, FileNameTake[item]}]]
                ]
            ]
        ], FileNames["*", from]]
    );
    walk[source, target]
]

localHeaderAsset[path_String] := Module[{relative, source},
    relative = FileNameJoin[StringSplit[path, "/"] /. "" -> Nothing];
    source = SelectFirst[
        DeleteDuplicates @ Flatten[{
            If[StringStartsQ[path, "/"], FileNameJoin[{Directory[], relative}], Nothing],
            path,
            FileNameJoin[{#, relative}]& /@ Append[bundleRoots[], Directory[]]
        }],
        FileExistsQ,
        Missing["HeaderAsset", path]
    ];
    {source, relative}
]

bootstrapScript[cssURLs_List, esmURLs_List] := StringReplace[
    Import[FileNameJoin[{folder, "BootstrapTemplate.js.txt"}], "Text"],
    {
        "/*__WLJS_CSS_URLS__*/ []" -> ExportString[cssURLs, "RawJSON"],
        "/*__WLJS_ESM_URLS__*/ []" -> ExportString[esmURLs, "RawJSON"]
    }
]

bootstrapLoader[cssURLs_List, esmURLs_List] := StringReplace[
    Import[FileNameJoin[{folder, "BootstrapLoader.jsx.txt"}], "Text"],
    {
        "/*__WLJS_CSS_URLS__*/ []" -> ExportString[cssURLs, "RawJSON"],
        "/*__WLJS_ESM_URLS__*/ []" -> ExportString[esmURLs, "RawJSON"]
    }
]

export[outputPath_, _, path_, _, _, settings_, ___] := Catch[Module[{
    base, target, sourceRoot, commonRoot, packageKeys, packageNames,
    packageRoots, cssURLs, esmURLs, coreAssets, coreURLs, headerPaths,
    localHeaders, remoteHeaders, runnersSource, declaredAssets, missingAssets
},
    base = Which[
        MatchQ[outputPath, _File], First[outputPath],
        StringQ[outputPath] && StringLength[outputPath] > 0, outputPath,
        StringQ[path] && StringLength[path] > 0, path,
        True, Message[export::path, outputPath]; Throw[$Failed, "BundleExport"]
    ];
    target = If[FileNameTake[base] === "bootstrap", base, FileNameJoin[{base, "bootstrap"}]];
    sourceRoot = FileNameJoin[{target, "src"}];
    commonRoot = FileNameJoin[{sourceRoot, "common"}];
    ensureDirectory[commonRoot];

    packageKeys = bundlePackageKeys[settings];
    packageNames = WLJSPackages`Packages[#, "name"]& /@ packageKeys;
    packageRoots = findPackageRoot /@ packageNames;
    If[AnyTrue[packageRoots, MissingQ],
        Message[export::asset, FirstCase[packageRoots, _Missing]];
        Throw[$Failed, "BundleExport"]
    ];
    MapThread[
        copyTree[#1, FileNameJoin[{sourceRoot, #2}]]&,
        {packageRoots, packageNames}
    ];
    declaredAssets = Join[
        bundleIncludes["js", packageKeys],
        bundleIncludes["styles", packageKeys]
    ];
    missingAssets = Select[
        declaredAssets,
        !FileExistsQ[FileNameJoin[{sourceRoot, #}]]&
    ];
    If[Length[missingAssets] > 0,
        Message[export::asset, First[missingAssets]];
        Throw[$Failed, "BundleExport"]
    ];

    coreAssets = Join[
        CoffeeLiqueur`WLJS`Tools`$WLJSInterpreterAssets,
        CoffeeLiqueur`WLJS`Transport`$WLJSTransportAssets
    ];
    If[AnyTrue[coreAssets, !FileExistsQ[#]&],
        Message[export::asset, SelectFirst[coreAssets, !FileExistsQ[#]&]];
        Throw[$Failed, "BundleExport"]
    ];
    copyFile[#, FileNameJoin[{commonRoot, FileNameTake[#]}]]& /@ coreAssets;
    coreURLs = ("common/" <> FileNameTake[#])& /@ coreAssets;

    headerPaths = DeleteDuplicates @ Cases[
        AppExtensions`HeaderAssets,
        asset_Association /; asset["Type"] === "JS" :> asset["Path"]
    ];
    remoteHeaders = Select[headerPaths, StringMatchQ[#, ("http://" | "https://") ~~ __]&];
    localHeaders = localHeaderAsset /@ Complement[headerPaths, remoteHeaders];
    If[Length[localHeaders] > 0 && AnyTrue[localHeaders[[All, 1]], MissingQ],
        Message[export::asset, FirstCase[localHeaders[[All, 1]], _Missing]];
        Throw[$Failed, "BundleExport"]
    ];
    copyFile[#[[1]], FileNameJoin[{sourceRoot, #[[2]]}]]& /@ localHeaders;

    copyFile[
        FileNameJoin[{rootFolder, "Assets", "web-components.css"}],
        FileNameJoin[{commonRoot, "web-components.css"}]
    ];
    copyFile[
        FileNameJoin[{rootFolder, "Assets", "web-components.tw.css"}],
        FileNameJoin[{commonRoot, "web-components.tw.css"}]
    ];
    copyFile[
        FileNameJoin[{rootFolder, "Assets", "web-components.js"}],
        FileNameJoin[{commonRoot, "web-components.js"}]
    ];
    runnersSource = FileNameJoin[{rootFolder, "DynamicsTools", "Runners.js"}];
    If[!FileExistsQ[runnersSource],
        Message[export::asset, runnersSource];
        Throw[$Failed, "BundleExport"]
    ];
    copyFile[
        runnersSource,
        FileNameJoin[{sourceRoot, "wljs-export-html", "DynamicsTools", "Runners.js"}]
    ];

    cssURLs = DeleteDuplicates @ Prepend[toURLPath /@ bundleIncludes["styles", packageKeys], "common/web-components.css"];
    esmURLs = DeleteDuplicates @ Join[
        coreURLs,
        remoteHeaders,
        toURLPath /@ If[Length[localHeaders] > 0, localHeaders[[All, 2]], {}],
        toURLPath /@ bundleIncludes["js", packageKeys],
        {"wljs-export-html/DynamicsTools/Runners.js", "common/web-components.js"}
    ];
    Export[
        FileNameJoin[{commonRoot, "app.js"}],
        bootstrapScript[cssURLs, esmURLs],
        "Text"
    ];
    Export[
        FileNameJoin[{commonRoot, "loader.jsx"}],
        bootstrapLoader[cssURLs, esmURLs],
        "Text"
    ];

    target
], "BundleExport"]

(* Interactive entry point used by the export menu. *)
export[modals_, messager_, defaultPath_, settings_] := With[{p = Promise[]},
    EventFire[modals, "OpenDialog", <|
        "Promise"->p,
        "title"->"Choose website folder",
        "defaultPath"->defaultPath,
        "properties"->{"openDirectory", "createDirectory", "dontAddToRecent"}
    |>];
    Then[p, Function[result, Module[{selected, target},
        selected = Which[
            StringQ[result] && StringLength[result] > 0, result,
            AssociationQ[result] && TrueQ[Lookup[result, "canceled", False]], Return[],
            AssociationQ[result] && Length[Lookup[result, "filePaths", {}]] > 0,
                First[result["filePaths"]],
            AssociationQ[result] && StringQ[Lookup[result, "filePath", None]],
                result["filePath"],
            True, Return[]
        ];
        selected = URLDecode[selected];
        target = export[selected, Null, selected, Null, Null, settings];
        If[target === $Failed,
            EventFire[messager, "Warning", "Failed to create the bootstrap bundle"],
            EventFire[messager, "Saved", "Bootstrap bundle created at "<>target]
        ]
    ]]]
]

End[]

(* Static export writes HTML plus notebook/store attachments. *)
Begin["`Static`"]

export;

export[outputPath_, notebookOnLine_nb`NotebookObj, path_, name_, ext_, settings_, proto_] := With[{},
    Module[{filename = outputPath},
        If[filename === Null, filename = path];
        If[DirectoryQ[filename], filename = FileNameJoin[{filename, name}] ];
        If[!StringMatchQ[filename, __~~".html"],  filename = filename <> ".html"];
        If[filename === ".html", filename = name<>filename];
        If[DirectoryName[filename] === "", filename = FileNameJoin[{path, filename}] ];
                    Then[generateHTML["Root"->rootFolder, "Settings"->settings, "DynamicQ"->False, "ExtensionTemplates" -> ext, "Notebook" -> notebookOnLine, "Title"->name], Function[generated,
                        Export[filename, generated // ToStringRiffle, "Text"];

                        With[{newDir = DirectoryName[filename]},
                            If[!FileExistsQ[FileNameJoin[{newDir, "attachments"}] ], CreateDirectory[FileNameJoin[{newDir, "attachments"}] ] ];

                            If[FileExistsQ[FileNameJoin[{DirectoryName[notebookOnLine["Path"] ], "attachments"}] ], 
                                (
                                    Echo["Copying from "<>#<>" >>  to "<>FileNameJoin[{newDir, "attachments", FileNameTake[#]}] ];
                                    CopyFile[#, FileNameJoin[{newDir, "attachments", FileNameTake[#]}], OverwriteTarget->True];

                                ) &/@ FileNames["*.*", FileNameJoin[{DirectoryName[notebookOnLine["Path"] ], "attachments"}] ];
                            ];

                            CopyFile[notebookOnLine["Path"], FileNameJoin[{newDir, "attachments", "notebook-"<>StringTake[notebookOnLine["Hash"], 3]<>".wln"}] ];
                            Export[FileNameJoin[{newDir, "attachments", notebookOnLine["Hash"]<>".txt"}], generateHTMLStore[notebookOnLine], "Text" ]
                        ]                    
                    ] ];
    ]
]

export[controls_, modals_, messager_, client_, notebookOnLine_nb`NotebookObj, path_, name_, ext_, settings_, proto_, dynamicQ_:False, compressed_:Null] := With[{

},
    With[{

    },
        
        With[{
            p = Promise[]
        },

       EventFire[modals, "SaveDialog", <|
           "Promise"->p,
           "title"->"Export as embeddable HTML",
           "properties"->{"createDirectory", "dontAddToRecent"},
           "filters"->{<|"extensions"->"html", "name"->"HTML"|>}
       |>];

       Then[p, Function[result, 
           Module[{filename = If[StringQ[result], URLDecode @ result, URLDecode @ result["filePath"] ] },
               If[!StringQ[filename] || TrueQ[result["canceled"] ] || StringLength[filename] === 0, 
                 Echo["Cancelled saving"]; Echo[result];
                 Return[];
               ];

                    If[!StringMatchQ[filename, __~~".html"],  filename = filename <> ".html"];
                    If[filename === ".html", filename = name<>filename];
                    If[DirectoryName[filename] === "", filename = FileNameJoin[{path, filename}] ];

                    Then[generateHTML["MarkdownTransformer"->proto["markdownTransformer"], "Root"->rootFolder, "Settings"->settings, "DynamicQ"->False, "ExtensionTemplates" -> ext, "Notebook" -> notebookOnLine, "Title"->name], Function[generated,
                        Export[filename, generated // ToStringRiffle, "Text"];

                        With[{newDir = DirectoryName[filename]},
                            If[!FileExistsQ[FileNameJoin[{newDir, "attachments"}] ], CreateDirectory[FileNameJoin[{newDir, "attachments"}] ] ];

                            If[FileExistsQ[FileNameJoin[{DirectoryName[notebookOnLine["Path"] ], "attachments"}] ], 
                                (
                                    Echo["Copying from "<>#<>" >>  to "<>FileNameJoin[{newDir, "attachments", FileNameTake[#]}] ];
                                    CopyFile[#, FileNameJoin[{newDir, "attachments", FileNameTake[#]}], OverwriteTarget->True];

                                ) &/@ FileNames["*.*", FileNameJoin[{DirectoryName[notebookOnLine["Path"] ], "attachments"}] ];
                            ];

                            CopyFile[notebookOnLine["Path"], FileNameJoin[{newDir, "attachments", "notebook-"<>StringTake[notebookOnLine["Hash"], 3]<>".wln"}] ];
                            Export[FileNameJoin[{newDir, "attachments", notebookOnLine["Hash"]<>".txt"}], generateHTMLStore[notebookOnLine], "Text" ];
                        ];



                        EventFire[messager, "Saved", "Exported to "<>filename];                        
                    ] ];
                    
                    
                    
                ];
            ], Function[result, Echo["Exported"]; Echo[result] ] ];
            
        ]
    ]
]

End[]


(* Dynamic export discovers widgets and writes sampled machines as a sidecar. *)
Begin["`Dynamic`"]

export;

analyser = ImportComponent[FileNameJoin[{rootFolder, "DynamicsTools", "Analyser.wlx"}] ];

Needs["CoffeeLiqueur`Extensions`ExportImport`DynamicAnalyzer`" -> "dynamicAnalyzer`", FileNameJoin[{rootFolder, "DynamicsTools", "DynamicAnalyzer.wl"}] ];
Needs["CoffeeLiqueur`Extensions`ExportImport`KernelSniffer`", FileNameJoin[{rootFolder, "DynamicsTools", "KernelSniffer.wl"}] ]

Needs["CoffeeLiqueur`Extensions`ExportImport`BlackBox`" -> "blackBox`", FileNameJoin[{rootFolder, "DynamicsTools", "BlackBox.wl"}] ]



(* Process black boxes serially to avoid overlapping sniffer lifecycles. *)
ApplySync[f_, w_, {first_, rest___}, final_, reject_] := f[w@@first, Function[Null, Echo["Async >> Next"]; ApplySync[f,w, {rest}, final, reject] ], Function[Null, reject[] ] ]
ApplySync[f_, w_, {}, final_, reject_] := final[];

export[controls_, modals_, messager_, client_, notebookOnLine_nb`NotebookObj, path_, name_, ext_, settings_, proto_] := Module[{}, With[{

},
    If[!TrueQ[notebookOnLine["Evaluator"]["Kernel"]["ContainerReadyQ"] ], 
        Block[{$CurrentWebSocket = client}, (* [FIXME] *)
            Echo[messager];
            Echo[client];
            EventFire[messager, "Warning", "Kernel is not attached or intialized"];
        ];
        Return[];
    ];

    With[{
        mode = Promise[]
    },
        EventFire[modals, "SelectBox", <|"Promise"->mode, "title"->"Mode", "message"->"Select the preset", "list"->{"Automatic","Manual sampling"}|>];
        Then[mode, Function[choise,
            Echo[choise];

            Switch[choise,
                1,
                    automaticMode[controls, modals, messager, client, notebookOnLine, path, name, ext, settings, proto],
                2,
                    manualMode[controls, modals, messager, client, notebookOnLine, path, name, ext, settings, proto],
                _,
                    Null
            ]
        ] ]
    ]
] ]



automaticMode[controls_, modals_, messager_, client_, notebookOnLine_nb`NotebookObj, path_, name_, ext_, settings_, proto_] := Module[{que = {}}, With[{
    syncPromise = Promise[],
    notebookHash = notebookOnLine["Hash"]
},
    GenericKernel`Send[notebookOnLine["Evaluator"]["Kernel"],  (
        EventFire[Internal`Kernel`RemoteEvent[ syncPromise // First ], Resolve, wapi`Tools`Serialize[] ]; 
    )];

    Then[syncPromise, Function[values,
        wapi`Tools`Flush[];
        wapi`Tools`Deserialize[values];

        Echo[">> Synced wapi`"];
        With[{widgets = Select[Select[Values[wapi`Tools`HashMap], MatchQ[#, _wapi`Tools`WidgetLike]& ], Function[item, item["Notebook"] === notebookHash && item["Online"] ] ]},
            If[Length[widgets] == 0,
                Block[{$CurrentWebSocket = client}, (* [FIXME] *)
                    EventFire[messager, "Warning", "No active Widget-like expressions associated with opened notebook were found"];   
                ];     
                Return[];
            ];


            With[{socket = EventClone[client]},
                EventHandler[socket, {"Closed" ->Function[Null,
                    EventRemove[socket];
                    Echo["HTMLDyn >> Removed!"];
                ]}]
            ];  

            WebUISubmit[fe`Tools`UIObjects["GarbageCollector", False], client ];

            With[{box = blackBox`findBest[#]},
                            Echo["Found best black box type: "];
                            Echo[box];


                            If[Head[box] =!= Missing, AppendTo[que,
                                blackBox`construct[box, #, notebookOnLine["Evaluator"]["Kernel"] ]
                            ] ];
            ]& /@ widgets;

            Echo["Que:"];
            que = Flatten[que];
            Echo[que];

 

            Echo["Done processing of que of boxes"];

                        With[{p = Promise[]},
                          ApplySync[Then, blackBox`process, {
                                  #, {controls, modals, messager, client, notebookOnLine, path, name, ext, settings}
                              } &/@ que, Function[Null,

                              EventFire[p, Resolve, True];
                          ], Function[Null,

                              EventFire[p, Reject, True];
                          ] ];  

                          Then[p, Function[Null, 
                            Echo["DONE!"];
                            export[{"Final", que}, controls, modals, messager, client, notebookOnLine, path, name, ext, settings, proto];
                          ], Function[Null,
                            
                            Echo["The whole process was aborted!"];
                            WebUISubmit[fe`Tools`UIObjects["GarbageCollector", True], client ];

                            blackBox`delete /@ que;
                            Delete /@ que;

                          ] ];
                        ] 

        ]
    ] ];
] ]

manualMode[controls_, modals_, messager_, client_, notebookOnLine_nb`NotebookObj, path_, name_, ext_, settings_, proto_] := Module[{task, que = {}, hash = 0}, With[{
    sniffer = CreateUUID[],
    snifferControls = CreateUUID[]
},
    With[{
        notification = Notifications`Custom[
            "Topic"->"Analysing dynamic bindings", 
            "Body"->analyser["Controls"->snifferControls, "Sniffer"->sniffer, "Client"->client, "Log"->messager, "Notebook"->notebookOnLine], 
            "Controls"->False
        ]
    },

        EventHandler[sniffer, {
            "Continue" -> Function[Null,
                Echo[Hold[task] ];
                CancelInterval[task] // Echo;
                Delete[notification];
                ClearAll[hash];
                EventRemove[sniffer];
                EventRemove[snifferControls];

                WebUISubmit[fe`Tools`UIObjects["GarbageCollector", False], client ];



                Then[dynamicAnalyzer`report[notebookOnLine["Evaluator"]["Kernel"] ], Function[data, 
                    Echo[data[[All, "Summary"]] ];

                    (* Fully stop discovery before a black box installs its sniffer. *)
                    Then[KernelSniffer[notebookOnLine["Evaluator"]["Kernel"], "Eject"], Function[Null,
                      Then[WebUIFetch[{
                        dynamicAnalyzer`Sniffer["Eject"],
                        dynamicAnalyzer`Sniffer["Retrack"]
                      }, client], Function[Null,

                    Map[Function[group,
                        With[{box = blackBox`findBest[group]},
                            Echo["Found best black box type: "];
                            Echo[box];


                            If[Head[box] =!= Missing, AppendTo[que,
                                blackBox`construct[box, group, notebookOnLine["Evaluator"]["Kernel"] ]
                            ] ];
                        ]
                    ], data];

                    Echo["A list of black boxes instances"];
                    Echo[que // Flatten];

                    With[{list = que // Flatten},
                        With[{p = Promise[]},
                          ApplySync[Then, blackBox`process, {
                                  #, {controls, modals, messager, client, notebookOnLine, path, name, ext, settings}
                              } &/@ list, Function[Null,

                              EventFire[p, Resolve, True];
                          ], Function[Null,

                              EventFire[p, Reject, True];
                          ] ];  

                          Then[p, Function[Null, 
                            Echo["DONE!"];
                            export[{"Final", list}, controls, modals, messager, client, notebookOnLine, path, name, ext, settings, proto];
                          ], Function[Null,
                            
                            Echo["The whole process was aborted!"];
                            WebUISubmit[fe`Tools`UIObjects["GarbageCollector", True], client ];

                            blackBox`delete /@ list;
                            Delete /@ list;

                          ] ];
                        ] 
                    ];
                      ], Function[err,
                        Echo["Failed to eject the frontend sniffer"];
                        Echo[err];
                        EventFire[messager, "Warning", "Failed to stop manual sampling"];
                      ] ];
                    ], Function[err,
                      Echo["Failed to eject the kernel sniffer"];
                      Echo[err];
                      EventFire[messager, "Warning", "Failed to stop manual sampling"];
                    ] ];
                ] ];
            ],

            "Abort" -> Function[Null,
                CancelInterval[task];
                Delete[notification];
                EventRemove[sniffer];
                ClearAll[hash];

                KernelSniffer[notebookOnLine["Evaluator"]["Kernel"], "Eject"];
                WebUISubmit[dynamicAnalyzer`Sniffer["Eject"], client];
                WebUISubmit[dynamicAnalyzer`Sniffer["Retrack"], client];
                WebUISubmit[fe`Tools`UIObjects["GarbageCollector", True], client ];
            ]
        }];

        With[{socket = EventClone[client]},
            EventHandler[socket, {"Closed" ->Function[Null,
                EventRemove[socket];
                Echo["HTMLDyn >> Removed!"];

                CancelInterval[task];
                Delete[notification];
                EventRemove[sniffer];
                ClearAll[hash];
                EventRemove[snifferControls];

                KernelSniffer[notebookOnLine["Evaluator"]["Kernel"], "Eject"];
            ]}]
        ];

        EventFire[messager, notification, True];

        Then[KernelSniffer[notebookOnLine["Evaluator"]["Kernel"], "Inject"], Function[Null,
            
            WebUISubmit[dynamicAnalyzer`Sniffer["Inject"], client];
            WebUISubmit[dynamicAnalyzer`Sniffer["Retrack"], client];

            task = SetInterval[With[{analyzed = dynamicAnalyzer`showAllConnections[notebookOnLine["Evaluator"]["Kernel"] ]},
                Echo["Promise from analyzer: "];
                Echo[analyzed];
                Then[analyzed, Function[data,
                    With[{newHash = Hash[data]},
                        If[newHash =!= hash,
                            If[Length[data["Symbols"] ] > 8,
                                Echo["ERROR!"];
                                Echo[err];
                                ClearAll[hash];
                                CancelInterval[task];
                                Delete[notification];
                                EventRemove[sniffer];

                                KernelSniffer[notebookOnLine["Evaluator"]["Kernel"], "Eject"];
                                WebUISubmit[dynamicAnalyzer`Sniffer["Eject"], client];
                                WebUISubmit[dynamicAnalyzer`Sniffer["Retrack"], client];
                                WebUISubmit[fe`Tools`UIObjects["GarbageCollector", True], client ];  

                                EventFire[messager, "Warning", "The process was aborted. Too many symbols to track"];                            
                            ,
                                EventFire[snifferControls, "Load", <|"Client" -> client, "Data" -> data |> ];
                                hash = newHash;
                            ];
                        ];
                    ];
                ] , Function[err,
                    Echo["ERROR!"];
                    Echo[err];
                    ClearAll[hash];
                    CancelInterval[task];
                ] ]
            ];, 2000];

        ], Function[err,
            EventFire[messager, "Warning", err];
        ] ];

        
    ];
] ];


(* blackBox`export consumes each machine while producing sidecar data. *)
export[{"Final", machines_}, controls_, modals_, messager_, client_, notebookOnLine_nb`NotebookObj, path_, name_, ext_, settings_, proto_] :=  With[{
    machinesData = Map[blackBox`export, machines]
},     
   With[{
       p = Promise[]
   },
       EventFire[modals, "SaveDialog", <|
           "Promise"->p,
           "title"->"Export as embeddable HTML",
           "properties"->{"createDirectory", "dontAddToRecent"},
           "filters"->{<|"extensions"->"html", "name"->"HTML"|>}
       |>];

       Then[p, Function[result, 
           Module[{filename = If[StringQ[result], URLDecode @ result, URLDecode @ result["filePath"] ] },
               If[!StringQ[filename] || TrueQ[result["canceled"] ] || StringLength[filename] === 0, 
                 Echo["Cancelled saving"]; Echo[result];
                 Return[];
               ];
                    If[!StringMatchQ[filename, __~~".html"],  filename = filename <> ".html"];
                    If[filename === ".html", filename = name<>filename];
                    If[DirectoryName[filename] === "", filename = FileNameJoin[{path, filename}] ];

                    Then[proto["collectStaticData"], Function[Null,

                        Then[generateHTML["MarkdownTransformer"->proto["markdownTransformer"], "Root"->rootFolder, "Settings"->settings, "DynamicQ"->True, "ExtensionTemplates" -> ext, "Notebook" -> notebookOnLine, "Title"->name], Function[generated,
                            Export[filename,  generated // ToStringRiffle, "Text"];

                            With[{newDir = DirectoryName[filename]},
                                If[!FileExistsQ[FileNameJoin[{newDir, "attachments"}] ], CreateDirectory[FileNameJoin[{newDir, "attachments"}] ] ];

                                If[FileExistsQ[FileNameJoin[{DirectoryName[notebookOnLine["Path"] ], "attachments"}] ], 
                                    (
                                        Echo["Copying from "<>#<>" >>  to "<>FileNameJoin[{newDir, "attachments", FileNameTake[#]}] ];
                                        CopyFile[#, FileNameJoin[{newDir, "attachments", FileNameTake[#]}], OverwriteTarget->True];

                                    ) &/@ FileNames["*.*", FileNameJoin[{DirectoryName[notebookOnLine["Path"] ], "attachments"}] ];
                                ];

                                CopyFile[notebookOnLine["Path"], FileNameJoin[{newDir, "attachments", "notebook-"<>StringTake[notebookOnLine["Hash"], 3]<>".wln"}] ];
                                Export[FileNameJoin[{newDir, "attachments", notebookOnLine["Hash"]<>".txt"}], generateHTMLStore[notebookOnLine], "Text" ];
                                Export[FileNameJoin[{newDir, "attachments", "kernel-"<>ToString[Hash[name] ]<>".txt"}], ExportString[machinesData, "ExpressionJSON", "Compact"->1], "Text" ];

                                Block[{$CurrentWebSocket = client},
                                    WebUISubmit[fe`Tools`UIObjects["GarbageCollector", True], client ];
                                    EventFire[messager, "Saved", "Exported to "<>filename];
                                ];
                            ];                            
                        ] ];
                        

                        
                    ] ];
           ];
       ], Function[result, Echo["Exported to HTML"]; Echo[result] ] ];
       
   ]
]


End[]


EndPackage[]
