(* Orchestrates static and replayable MDX exports with attachment sidecars. *)

BeginPackage["CoffeeLiqueur`Extensions`ExportImport`MDX`", {
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


{generateMDX, generateMDXStore}      = ImportComponent[FileNameJoin[{folder, "Universal.wlx"}] ];


(* Static export writes MDX plus notebook/store attachments. *)
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
                                Echo[StringJoin["[wljs-export-html/MDX] Copying attachment from ", #, " to ", FileNameJoin[{newDir, "attachments", FileNameTake[#]}], "."]];
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
                 Echo["[wljs-export-html/MDX] Save operation was cancelled."]; Echo[result, "[wljs-export-html/MDX] operation result: "];
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
                                Echo[StringJoin["[wljs-export-html/MDX] Copying attachment from ", #, " to ", FileNameJoin[{newDir, "attachments", FileNameTake[#]}], "."]];
                                CopyFile[#, FileNameJoin[{newDir, "attachments", FileNameTake[#]}], OverwriteTarget->True];
                            
                            ) &/@ FileNames["*.*", FileNameJoin[{DirectoryName[notebookOnLine["Path"] ], "attachments"}] ];
                        ];

                        CopyFile[notebookOnLine["Path"], FileNameJoin[{newDir, "attachments", "notebook-"<>StringTake[notebookOnLine["Hash"], 3]<>".wln"}] ];
                        Export[FileNameJoin[{newDir, "attachments", notebookOnLine["Hash"]<>".txt"}], generateMDXStore[notebookOnLine], "Text" ];
                    ];

                    
                    
                    EventFire[messager, "Saved", "Exported to "<>filename];
                ];
            ], Function[result, Echo["[wljs-export-html/MDX] Export completed successfully."]; Echo[result, "[wljs-export-html/MDX] operation result: "] ] ];
            
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
ApplySync[f_, w_, {first_, rest___}, final_, reject_] := f[w@@first, Function[Null, Echo["[wljs-export-html/MDX] Continuing with the next asynchronous step."]; ApplySync[f,w, {rest}, final, reject] ], Function[Null, reject[] ] ]
ApplySync[f_, w_, {}, final_, reject_] := final[];

export[controls_, modals_, messager_, client_, notebookOnLine_nb`NotebookObj, path_, name_, ext_, settings_, proto_] := Module[{}, With[{

},
    If[!TrueQ[notebookOnLine["Evaluator"]["Kernel"]["ContainerReadyQ"] ], 
        Block[{$CurrentWebSocket = client}, (* [FIXME] *)
            Echo[messager, "[wljs-export-html/MDX] messenger: "];
            Echo[client, "[wljs-export-html/MDX] client: "];
            EventFire[messager, "Warning", "Kernel is not attached or intialized"];
        ];
        Return[];
    ];

    With[{
        mode = Promise[]
    },
        EventFire[modals, "SelectBox", <|"Promise"->mode, "title"->"Mode", "message"->"Select the preset", "list"->{"Automatic","Manual sampling"}|>];
        Then[mode, Function[choise,
            Echo[choise, "[wljs-export-html/MDX] selected choice: "];

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

        Echo["[wljs-export-html/MDX] Synchronized the Wolfram API context."];
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
                    Echo["[wljs-export-html/MDX] Removed the temporary dynamic HTML notebook."];
                ]}]
            ];  

            WebUISubmit[fe`Tools`UIObjects["GarbageCollector", False], client ];

            With[{box = blackBox`findBest[#]},
                            Echo["[wljs-export-html/MDX] Selected black-box type:"];
                            Echo[box, "[wljs-export-html/MDX] black-box instance: "];


                            If[Head[box] =!= Missing, AppendTo[que,
                                blackBox`construct[box, #, notebookOnLine["Evaluator"]["Kernel"] ]
                            ] ];
            ]& /@ widgets;

            Echo["[wljs-export-html/MDX] Queued black-box instances:"];
            que = Flatten[que];
            Echo[que, "[wljs-export-html/MDX] black-box queue: "];

 

            Echo["[wljs-export-html/MDX] Finished processing the black-box queue."];

                        With[{p = Promise[]},
                          ApplySync[Then, blackBox`process, {
                                  #, {controls, modals, messager, client, notebookOnLine, path, name, ext, settings}
                              } &/@ que, Function[Null,

                              EventFire[p, Resolve, True];
                          ], Function[Null,

                              EventFire[p, Reject, True];
                          ] ];  

                          Then[p, Function[Null, 
                            Echo["[wljs-export-html/MDX] Processing completed."];
                            export[{"Final", que}, controls, modals, messager, client, notebookOnLine, path, name, ext, settings, proto];
                          ], Function[Null,
                            
                            Echo["[wljs-export-html/MDX] Export analysis was aborted."];
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
                Echo[Hold[task], "[wljs-export-html/MDX] task: "];
                Echo[CancelInterval[task], "[wljs-export-html/MDX] Sampling timer cancellation result: "];
                Delete[notification];
                ClearAll[hash];
                EventRemove[sniffer];
                EventRemove[snifferControls];

                WebUISubmit[fe`Tools`UIObjects["GarbageCollector", False], client ];



                Then[dynamicAnalyzer`report[notebookOnLine["Evaluator"]["Kernel"] ], Function[data, 
                    Echo[data[[All, "Summary"]], "[wljs-export-html/MDX] Dynamic-analysis summaries: "];

                    (* Fully stop discovery before a black box installs its sniffer. *)
                    Then[KernelSniffer[notebookOnLine["Evaluator"]["Kernel"], "Eject"], Function[Null,
                      Then[WebUIFetch[{
                        dynamicAnalyzer`Sniffer["Eject"],
                        dynamicAnalyzer`Sniffer["Retrack"]
                      }, client], Function[Null,

                    Map[Function[group,
                        With[{box = blackBox`findBest[group]},
                            Echo["[wljs-export-html/MDX] Selected black-box type:"];
                            Echo[box, "[wljs-export-html/MDX] black-box instance: "];


                            If[Head[box] =!= Missing, AppendTo[que,
                                blackBox`construct[box, group, notebookOnLine["Evaluator"]["Kernel"] ]
                            ] ];
                        ]
                    ], data];

                    Echo["[wljs-export-html/MDX] Black-box instances selected for processing:"];
                    Echo[que // Flatten, "[wljs-export-html/MDX] black-box queue: "];

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
                            Echo["[wljs-export-html/MDX] Processing completed."];
                            export[{"Final", list}, controls, modals, messager, client, notebookOnLine, path, name, ext, settings, proto];
                          ], Function[Null,
                            
                            Echo["[wljs-export-html/MDX] Export analysis was aborted."];
                            WebUISubmit[fe`Tools`UIObjects["GarbageCollector", True], client ];

                            blackBox`delete /@ list;
                            Delete /@ list;

                          ] ];
                        ] 
                    ];
                      ], Function[err,
                        Echo["[wljs-export-html/MDX] Failed to eject the frontend sniffer"];
                        Echo[err, "[wljs-export-html/MDX] error details: "];
                        EventFire[messager, "Warning", "Failed to stop manual sampling"];
                      ] ];
                    ], Function[err,
                      Echo["[wljs-export-html/MDX] Failed to eject the kernel sniffer"];
                      Echo[err, "[wljs-export-html/MDX] error details: "];
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
                Echo["[wljs-export-html/MDX] Removed the temporary dynamic HTML notebook."];

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
                Echo["[wljs-export-html/MDX] Analyzer result:"];
                Echo[analyzed, "[wljs-export-html/MDX] analysis result: "];
                Then[analyzed, Function[data,
                    With[{newHash = Hash[data]},
                        If[newHash =!= hash,
                            If[Length[data["Symbols"] ] > 8,
                                Echo["[wljs-export-html/MDX] Operation failed."];
                                Echo[err, "[wljs-export-html/MDX] error details: "];
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
                    Echo["[wljs-export-html/MDX] Operation failed."];
                    Echo[err, "[wljs-export-html/MDX] error details: "];
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
           "title"->"Export as Markdown JSX",
           "properties"->{"createDirectory", "dontAddToRecent"},
           "filters"->{<|"extensions"->"mdx", "name"->"MDX"|>}
       |>];

       Then[p, Function[result, 
           Module[{filename = If[StringQ[result], URLDecode @ result, URLDecode @ result["filePath"] ] },
               If[!StringQ[filename] || TrueQ[result["canceled"] ] || StringLength[filename] === 0, 
                 Echo["[wljs-export-html/MDX] Save operation was cancelled."]; Echo[result, "[wljs-export-html/MDX] operation result: "];
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
                                    Echo[StringJoin["[wljs-export-html/MDX] Copying attachment from ", #, " to ", FileNameJoin[{newDir, "attachments", FileNameTake[#]}], "."]];
                                    CopyFile[#, FileNameJoin[{newDir, "attachments", FileNameTake[#]}], OverwriteTarget->True];

                                ) &/@ FileNames["*.*", FileNameJoin[{DirectoryName[notebookOnLine["Path"] ], "attachments"}] ];
                            ];

                            CopyFile[notebookOnLine["Path"], FileNameJoin[{newDir, "attachments", "notebook-"<>StringTake[notebookOnLine["Hash"], 3]<>".wln"}] ];
                            Export[FileNameJoin[{newDir, "attachments", notebookOnLine["Hash"]<>".txt"}], generateMDXStore[notebookOnLine], "Text" ];
                            Export[FileNameJoin[{newDir, "attachments", "kernel-"<>ToString[Hash[name] ]<>".txt"}], ExportString[machinesData, "ExpressionJSON", "Compact"->1], "Text" ];
                            
                            Block[{$CurrentWebSocket = client},
                                WebUISubmit[fe`Tools`UIObjects["GarbageCollector", True], client ];
                                EventFire[messager, "Saved", "Exported to "<>filename];
                            ];
                        ];
                    ] ];
           ];
       ], Function[result, Echo["[wljs-export-html/MDX] Exported to MDX"]; Echo[result, "[wljs-export-html/MDX] operation result: "] ] ];
       
   ]
]


End[]


EndPackage[]
