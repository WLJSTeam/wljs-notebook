BeginPackage["CoffeeLiqueur`Extensions`FrontendObject`Sync`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`", 
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`", 
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CoffeeLiqueur`Misc`Language`",
    "CoffeeLiqueur`Extensions`Editor`"
}]

Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];

Begin["`Private`"]

rootDir = $InputFileName // DirectoryName // ParentDirectory;

syncMonitor = ImportComponent[FileNameJoin[{rootDir, "templates", "SyncMonitor.wlx"}] ];

EventHandler[NotebookEditorChannel // EventClone, {
    "FetchFrontEndObject" -> Function[data,
           Echo["Sync >> requested from master kernel"];
           With[{promise = data["Promise"],  kernel = GenericKernel`HashMap[ data["Kernel"] ]}, 
                (* [FIXME] Include these symbols normally using Needs[] *)
                (* we release any possible deferred compression wrappers *)
                With[{result = CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects[data["UId"] ]["Public"]},
                    With[{c =  CoffeeLiqueur`Extensions`FrontendObject`Internal`releaseCompression[result]},
                        GenericKernel`Async[kernel, EventFire[promise, Resolve, c ] ];
                    ];
                ];
           ];       
    ]
}];

syncMonitorConstructor[uids_List, opts_Association, title_String: "Syncing data"] := LeakyModule[{
    object, 
    monitor = CreateUUID[], 
    time = AbsoluteTime[],
    cnt = 0,
    controller = CreateUUID[]
},

    If[Length[uids] < 3, 
    
        EventHandler[monitor, Function[Null,
            cnt = cnt + 1;
            Echo["SyncMonitor >> Syncing "<>ToString[cnt]<>" out of "<>ToString[Length[uids] ] ];
        ] ];

        object /: Delete[object] := (
            EventRemove[monitor];
            ClearAll[cnt];
            ClearAll[time];
            ClearAll[controller];
            ClearAll[object];
            Echo["SyncMonitor >> removed"];
        );

        Return[{object, monitor}];
    ];

    With[{notification = Notifications`Custom["Topic"->title, "Body"->syncMonitor[controller], "Controls"->False]},
        
        object /: Delete[object] := (
            EventRemove[monitor];
            EventRemove[controller];
            ClearAll[cnt];
            ClearAll[time];
            ClearAll[object];
            ClearAll[controller];
            Delete[notification];
            Echo["SyncMonitor >> removed"];
        );
        
        EventHandler[monitor, Function[Null,
            cnt = cnt + 1;
            Echo["SyncMonitor >> Syncing "<>ToString[cnt]<>" out of "<>ToString[Length[uids] ] ];
            With[{t = AbsoluteTime[]},
                If[t - time > 2,
                    Echo["SyncMonitor >> Too long"];

                    EventFire[opts["Log"], notification, True];
                    EventFire[controller, "Sync", <|"Client"->opts["Client"], "Current"->cnt, "Total"->Length[uids] |>];

                    EventHandler[monitor, Function[Null,
                        cnt = cnt + 1;
                        Echo["SyncMonitor >> Syncing "<>ToString[cnt]<>" out of "<>ToString[Length[uids] ] ];
                        EventFire[controller, "Sync", <|"Client"->opts["Client"], "Current"->cnt, "Total"->Length[uids] |>];
                    ] ];
                ];
            ];
        ] ];


    ];

    {object, monitor}
]

WLJSTransportHandler["GetSymbol"] = Function[{expr, client, callback},
              Print["evaluating cached symbol"];
              With[{name = StringDrop[StringDrop[ToString[expr], StringLength["Hold["] ], -1]},
                If[KeyExistsQ[CoffeeLiqueur`Extensions`FrontendObject`Internal`Symbols, name],
                    Print[name];
                    callback[CoffeeLiqueur`Extensions`FrontendObject`Internal`Symbols[name] ]
                ,
                    callback[$Failed]
                ]
              ]
          ];

EventHandler[AppExtensions`AppEvents// EventClone, {
    "Loader:NewNotebook" ->  (Once[ attachListeners[#] ] &),
    "Loader:LoadNotebook" -> (Once[ attachListeners[#] ] &)
}];

filterEmptyOrFailed[keys_, values_] := With[{t = {keys, values} // Transpose},
    Select[t, Function[val, !FailureQ[val[[2]]] && val[[2]] =!= False ] ] // Transpose
]

(* [TODO] [REFACTOR] *)

attachListeners[notebook_nb`NotebookObj] := With[{},
    Echo["Attach event listeners to notebook from EXTENSION"];
    EventHandler[notebook // EventClone, {
        "OnBeforeLoad" -> Function[opts,
            If[MemberQ[notebook["Properties"], "Objects"],
                Echo["FrontendObject`Sync >> restored!"];
                CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects = Join[CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects, notebook["Objects"] ];
                If[MemberQ[notebook["Properties"], "Symbols"],
                    
                    CoffeeLiqueur`Extensions`FrontendObject`Internal`Symbols = Join[CoffeeLiqueur`Extensions`FrontendObject`Internal`Symbols, notebook["Symbols"] ];
                    Echo["FrontendObject`Sync`Symbols >> restored!"];
                ]
            ,
                Echo["FrontendObject`Sync >> nothing to restore "];
            ]
        ],
        "OnBeforeSave" -> Function[opts,
            Echo["OnBefore Save!!!!!!!!"];

            With[{promise = Promise[]},
                Then[WebUIFetch[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects["GetAllUids"] , opts["Client"] , "Format"->"ExpressionJSON"],
                    Function[uids,
                        Echo["uids resolved!"];
                        Echo[uids];

                        LeakyModule[{
                            monitor, monitorHandler,
                            monitorSym, monitorHandlerSym, promises
                        },

                            {monitorHandler, monitor} = syncMonitorConstructor[uids, opts];

                            With[{requests = Table[WebUIFetch[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects["GetById", i, "MonitorEvent"->monitor] , opts["Client"] , "Format"->"ExpressionJSON"], {i, uids}]},
                                Echo["Number of requests to resolve: "<>ToString[Length[requests] ] ];
                                If[Length[requests] == 0,
                                    promises = Promise[];
                                    EventFire[promises, Resolve, {}];
                                ,
                                    promises = requests;
                                ];
                                
                                If[Length[requests] == 0 && False, (* just pass though *)
                                    notebook["Objects"] = <||>;
                                    notebook["Symbols"] = <||>;
                                    EventFire[promise, Resolve, True];
                                , 

                                    Echo["Promises: "<>ToString[requests ] ];

                                    Then[promises,
                                        Function[results,
                                            Echo["results resolved!"];


                                            With[{processed = With[{fixed = filterEmptyOrFailed[uids, results]}, If[Length[fixed]==0, <||>, Map[<|"Public"->#|>&, AssociationThread[Rule @@ fixed ] ] ] ]},
                                                CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects = Join[CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects , processed];
                                                notebook["Objects"] = processed;

                                                monitorHandler // Delete;
                                                ClearAll[monitor];
                                                ClearAll[monitorHandler];

                                                Echo["FrontendObject`Sync`Objects >> ok "];


                                                Then[WebUIFetch[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects["GetAllSymbolsNames"] , opts["Client"] ],
                                                    Function[names,
                                                        Echo["symbols names resolved!"];
                                                        Echo[names];

                                                        {monitorHandlerSym, monitorSym} = syncMonitorConstructor[names, opts, "Syncing symbols"];

                                                        With[{symRequests = Table[WebUIFetch[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects["GetSymbolByName", i, "MonitorEvent"->monitorSym] , opts["Client"] ], {i, names}]},
                                                            If[Length[symRequests] == 0,
                                                                notebook["Symbols"] = <||>;
                                                                EventFire[promise, Resolve, True];
                                                                ClearAll[promises];
                                                            , 
                                                                Then[symRequests,
                                                                    Function[symResults,
                                                                        Echo["symbols resolved!"];
                                                          

                                                                        notebook["Symbols"] = AssociationThread[names -> symResults];

                                                                        Delete[monitorHandlerSym];

                                                                        ClearAll[monitorSym];
                                                                        ClearAll[monitorHandlerSym];

                                                                        Echo["FrontendObject`Sync`Symbols >> ok "];
                                                                        EventFire[promise, Resolve, True];
                                                                        ClearAll[promises];
                                                                    ]
                                                                ]
                                                            ]
                                                        ]
                                                    ]
                                                ];
                                            ]
                                        ],
                                        Function[rejected,
                                            Echo["REJECTED: "<>ToString[rejected ] ];
                                        ]
                                    ]
                                ]
                            ]
                        ];
                    ], 
                    Function[error,
                        Echo["FrontendObject`Sync >> Syncing error!"];
                        Echo[error]
                    ]
                ];

                (*Then[WebUIFetch[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects["GetAll"] , opts["Client"] ],
                    Function[pay,
                        Echo["resolved!"];
                        With[{processed = Map[<|"Public"->#|>&, pay]},
                            CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects = Join[CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects , processed];
                            notebook["Objects"] = processed;

                            Echo["FrontendObject`Sync`Objects >> ok "];
                            Then[WebUIFetch[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects["GetAllSymbols"] , opts["Client"] ],
                                Function[symbols,
                                    notebook["Symbols"] = symbols;
                                    

                                    Echo["FrontendObject`Sync`Symbols >> ok "];
                                    EventFire[promise, Resolve, True];
                                ]
                            ]
                            
                        ];
                    ]
                , Function[error,
                    Echo["FrontendObject`Sync >> Syncing error!"];
                    Echo[error]
                ] ];*)

                promise
            ]

        
        ]
    }]; 
]

script = "<script type=\"module\">" <> Import[ FileNameJoin[{rootDir, "templates", "script.js"}], "Text"] <> "</script>";
AppExtensions`TemplateInjection["NotebookScript"] = Function[Null, script];

End[]
EndPackage[]