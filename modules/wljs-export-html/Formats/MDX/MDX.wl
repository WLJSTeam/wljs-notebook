BeginPackage["CoffeeLiqueur`Extensions`ExportImport`MDX`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`", 
    "CoffeeLiqueur`Misc`WLJS`Transport`",
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


{generateMDX, generateMDXStore}      = ImportComponent[FileNameJoin[{folder, "Universal.wlx"}] ];


Begin["`Static`"]

export;

export[outputPath_, notebookOnLine_nb`NotebookObj, path_, name_, ext_, settings_, proto_] := With[{},
    Module[{filename = outputPath},
        If[filename === Null, filename = path];
        If[DirectoryQ[filename], filename = FileNameJoin[{filename, name}] ];
        If[!StringMatchQ[filename, __~~".mdx"],  filename = filename <> ".mdx"];
        If[filename === ".mdx", filename = name<>filename];
        If[DirectoryName[filename] === "", filename = FileNameJoin[{path, filename}] ];

                    Export[filename, generateMDX["Root"->rootFolder, "Settings"->settings, "DynamicQ"->False, "ExtensionTemplates" -> ext, "Notebook" -> notebookOnLine, "Title"->name] // ToStringRiffle, "Text"];
                    
                    With[{newDir = DirectoryName[filename]},
                        If[!FileExistsQ[FileNameJoin[{newDir, "attachments"}] ], CreateDirectory[FileNameJoin[{newDir, "attachments"}] ] ];

                        If[FileExistsQ[FileNameJoin[{DirectoryName[notebookOnLine["Path"] ], "attachments"}] ], 
                            (
                                Echo["Copying from "<>#<>" >>  to "<>FileNameJoin[{newDir, "attachments", FileNameTake[#]}] ];
                                CopyFile[#, FileNameJoin[{newDir, "attachments", FileNameTake[#]}], OverwriteTarget->True];
                            
                            ) &/@ FileNames["*.*", FileNameJoin[{DirectoryName[notebookOnLine["Path"] ], "attachments"}] ];
                        ];

                        CopyFile[notebookOnLine["Path"], FileNameJoin[{newDir, "attachments", "notebook-"<>StringTake[notebookOnLine["Hash"], 3]<>".wln"}] ];
                        Export[FileNameJoin[{newDir, "attachments", notebookOnLine["Hash"]<>".txt"}], generateMDXStore[notebookOnLine], "Text" ]
                    ]
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
           "title"->"Export as Markdown JSX",
           "properties"->{"createDirectory", "dontAddToRecent"},
           "filters"->{<|"extensions"->"mdx", "name"->"MDX"|>}
       |>];

       Then[p, Function[result, 
           Module[{filename = If[StringQ[result], URLDecode @ result, URLDecode @ result["filePath"] ] },
               If[!StringQ[filename] || TrueQ[result["canceled"] ] || StringLength[filename] === 0, 
                 Echo["Cancelled saving"]; Echo[result];
                 Return[];
               ];

                    If[!StringMatchQ[filename, __~~".mdx"],  filename = filename <> ".mdx"];
                    If[filename === ".mdx", filename = name<>filename];
                    If[DirectoryName[filename] === "", filename = FileNameJoin[{path, filename}] ];

                    Export[filename, generateMDX["Root"->rootFolder, "Settings"->settings, "DynamicQ"->False, "ExtensionTemplates" -> ext, "Notebook" -> notebookOnLine, "Title"->name] // ToStringRiffle, "Text"];
                    
                    With[{newDir = DirectoryName[filename]},
                        If[!FileExistsQ[FileNameJoin[{newDir, "attachments"}] ], CreateDirectory[FileNameJoin[{newDir, "attachments"}] ] ];

                        If[FileExistsQ[FileNameJoin[{DirectoryName[notebookOnLine["Path"] ], "attachments"}] ], 
                            (
                                Echo["Copying from "<>#<>" >>  to "<>FileNameJoin[{newDir, "attachments", FileNameTake[#]}] ];
                                CopyFile[#, FileNameJoin[{newDir, "attachments", FileNameTake[#]}], OverwriteTarget->True];
                            
                            ) &/@ FileNames["*.*", FileNameJoin[{DirectoryName[notebookOnLine["Path"] ], "attachments"}] ];
                        ];

                        CopyFile[notebookOnLine["Path"], FileNameJoin[{newDir, "attachments", "notebook-"<>StringTake[notebookOnLine["Hash"], 3]<>".wln"}] ];
                        Export[FileNameJoin[{newDir, "attachments", notebookOnLine["Hash"]<>".txt"}], generateMDXStore[notebookOnLine], "Text" ];
                    ];

                    
                    
                    EventFire[messager, "Saved", "Exported to "<>filename];
                ];
            ], Function[result, Echo["Exported"]; Echo[result] ] ];
            
        ]
    ]
]

End[]


Begin["`Dynamic`"]

export;

analyser = ImportComponent[FileNameJoin[{rootFolder, "DynamicsTools", "Analyser.wlx"}] ];

Needs["CoffeeLiqueur`Extensions`ExportImport`DynamicAnalyzer`" -> "dynamicAnalyzer`", FileNameJoin[{rootFolder, "DynamicsTools", "DynamicAnalyzer.wl"}] ];
Needs["CoffeeLiqueur`Extensions`ExportImport`KernelSniffer`", FileNameJoin[{rootFolder, "DynamicsTools", "KernelSniffer.wl"}] ]

Needs["CoffeeLiqueur`Extensions`ExportImport`BlackBox`" -> "blackBox`", FileNameJoin[{rootFolder, "DynamicsTools", "BlackBox.wl"}] ]



ApplySync[f_, w_, {first_, rest___}, final_, reject_] := f[w@@first, Function[Null, Echo["Async >> Next"]; ApplySync[f,w, {rest}, final, reject] ], Function[Null, reject[] ] ]
ApplySync[f_, w_, {}, final_, reject_] := final[];

export[controls_, modals_, messager_, client_, notebookOnLine_nb`NotebookObj, path_, name_, ext_, settings_, proto_] := Module[{}, With[{

},
    If[!TrueQ[notebookOnLine["Evaluator"]["Kernel"]["ContainerReadyQ"] ], 
        Block[{Global`$Client = client}, (* [FIXME] *)
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
                Block[{Global`$Client = client}, (* [FIXME] *)
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

                    KernelSniffer[notebookOnLine["Evaluator"]["Kernel"], "Eject"];
                    WebUISubmit[dynamicAnalyzer`Sniffer["Eject"], client];
                    WebUISubmit[dynamicAnalyzer`Sniffer["Retrack"], client];

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


export[{"Final", machines_}, controls_, modals_, messager_, client_, notebookOnLine_nb`NotebookObj, path_, name_, ext_, settings_, proto_] :=  With[{
    machinesData = Map[blackBox`export, machines]
},     
   With[{
       p = Promise[]
   },
       EventFire[modals, "SaveDialog", <|
           "Promise"->p,
           "title"->"Export as Markdown JSX",
           "properties"->{"createDirectory", "dontAddToRecent"},
           "filters"->{<|"extensions"->"mdx", "name"->"MDX"|>}
       |>];

       Then[p, Function[result, 
           Module[{filename = If[StringQ[result], URLDecode @ result, URLDecode @ result["filePath"] ] },
               If[!StringQ[filename] || TrueQ[result["canceled"] ] || StringLength[filename] === 0, 
                 Echo["Cancelled saving"]; Echo[result];
                 Return[];
               ];
                    If[!StringMatchQ[filename, __~~".mdx"],  filename = filename <> ".mdx"];
                    If[filename === ".mdx", filename = name<>filename];
                    If[DirectoryName[filename] === "", filename = FileNameJoin[{path, filename}] ];

                    Then[proto["collectStaticData"], Function[Null,

                        Export[filename, generateMDX["Root"->rootFolder, "Settings"->settings, "DynamicQ"->True, "ExtensionTemplates" -> ext, "Notebook" -> notebookOnLine, "Title"->name] // ToStringRiffle, "Text"];

                        With[{newDir = DirectoryName[filename]},
                            If[!FileExistsQ[FileNameJoin[{newDir, "attachments"}] ], CreateDirectory[FileNameJoin[{newDir, "attachments"}] ] ];

                            If[FileExistsQ[FileNameJoin[{DirectoryName[notebookOnLine["Path"] ], "attachments"}] ], 
                                (
                                    Echo["Copying from "<>#<>" >>  to "<>FileNameJoin[{newDir, "attachments", FileNameTake[#]}] ];
                                    CopyFile[#, FileNameJoin[{newDir, "attachments", FileNameTake[#]}], OverwriteTarget->True];

                                ) &/@ FileNames["*.*", FileNameJoin[{DirectoryName[notebookOnLine["Path"] ], "attachments"}] ];
                            ];

                            CopyFile[notebookOnLine["Path"], FileNameJoin[{newDir, "attachments", "notebook-"<>StringTake[notebookOnLine["Hash"], 3]<>".wln"}] ];
                            Export[FileNameJoin[{newDir, "attachments", notebookOnLine["Hash"]<>".txt"}], generateMDXStore[notebookOnLine], "Text" ];
                            Export[FileNameJoin[{newDir, "attachments", "kernel-"<>ToString[Hash[name] ]<>".txt"}], ExportString[machinesData, "ExpressionJSON", "Compact"->1], "Text" ];
                            
                            Block[{Global`$Client = client},
                                WebUISubmit[fe`Tools`UIObjects["GarbageCollector", True], client ];
                                EventFire[messager, "Saved", "Exported to "<>filename];
                            ];
                        ];
                    ] ];
           ];
       ], Function[result, Echo["Exported to MDX"]; Echo[result] ] ];
       
   ]
]


End[]


EndPackage[]