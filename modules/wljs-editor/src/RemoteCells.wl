BeginPackage["CoffeeLiqueur`Extensions`RemoteCells`", {
    "CoffeeLiqueur`Extensions`Editor`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",  
    "CoffeeLiqueur`WLX`WebUI`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`Notebook`Utils`",
    "CoffeeLiqueur`Notebook`Transactions`"
}]

Begin["`Internal`"]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`Windows`" -> "win`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];
Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"];

root = $InputFileName // DirectoryName // ParentDirectory;
messageDialog = ImportComponent[FileNameJoin[{root, "templates", "MessageDialog.wlx"}] ];

closeNotebook[uid_] := With[{notebook = nb`HashMap[uid]},
    WebUIClose[notebook["Socket"] ];
]

createNotebook[uid_] := With[{notebook = nb`NotebookObj["Hash" -> uid]},
    saveNotebook[Null, uid]
]

createNotebook[uid_, kernel_] := With[{notebook = nb`NotebookObj["Hash" -> uid]},
    notebook["AutoconnectKernel"] = kernel["Hash"];
    saveNotebook[Null, uid]
]

writeNotebook[uid_, struct_Association] := With[{
    notebook = nb`HashMap[uid]
},

    If[StringQ[struct["Data"] ], 
        cell`CellObj["Notebook" -> notebook, "Display"->struct["Display"], "Type"->struct["Type"], "Data"->struct["Data"], "Props"->Lookup[struct, "Props", <||>] ] 
    ];
]

writeNotebook[uid_, struct_Association, hash_] := With[{
    notebook = nb`HashMap[uid]
},

    If[StringQ[struct["Data"] ], 
        cell`CellObj["Hash" ->hash, "Notebook" -> notebook, "Display"->struct["Display"], "Type"->struct["Type"], "Data"->struct["Data"], "Props"->Lookup[struct, "Props", <||>] ] 
    ];
]

exportNotebook[notebook_, savingPath_, ext: ("md" | "mdx" | "html" | "nb")] := With[{},
    EventFire[AppExtensions`AppEvents, "Exporter:ExportNotebook", <|
        "Notebook" -> notebook,
        "Path" -> savingPath,
        "Type" -> ext
    |>];
]

exportNotebook[notebook_, savingPath_, "wln"] := With[{stream = OpenWrite[savingPath, DOSTextFormat->False]},
    notebook["Path"] = savingPath;
    notebook["Directory"] = DirectoryName[savingPath];

    nb`SerializeToStream[stream, notebook];
    Close[stream];
]

saveNotebook[path_, uid_, kernelDir_] := With[{
    notebook = nb`HashMap[uid]
},
{
    savingPath = If[path === Null,
            If[StringQ[notebook["Path"] ], 
                notebook["Path"], 
                FileNameJoin[{$TemporaryDirectory, ((Internal`NoWR`RandomWord[])<>(Internal`NoWR`RandomWord[]))<>".wln"}]
            ]
        ,
            path
    ]
},
    SetDirectory[kernelDir];
    With[{res = exportNotebook[notebook, savingPath, FileExtension[savingPath] ] },
        ResetDirectory[];
        res
    ]
]

saveNotebook[path_, uid_, Null] := saveNotebook[path, uid]

saveNotebook[path_, uid_] := With[{
    notebook = nb`HashMap[uid]
},
{
    savingPath = If[path === Null,
            If[StringQ[notebook["Path"] ], 
                notebook["Path"], 
                FileNameJoin[{$TemporaryDirectory, ((Internal`NoWR`RandomWord[])<>(Internal`NoWR`RandomWord[]))<>".wln"}]
            ]
        ,
            path
    ]
},

    exportNotebook[notebook, savingPath, FileExtension[savingPath] ]
]

importNotebook[content_, path_, fullpath_, uid_] := With[{
    notebook = nb`LoadFromString[content, "Hash" -> uid]
},
    notebook["Path"] = fullpath;
    notebook["Directory"] = path;
    notebook["Hash"]
]

sessions[_, _] := False;

wolframCellQ[cell_] := (!StringMatchQ[cell["Data"], StartOfString~~(WordCharacter.. | "")~~"."~~WordCharacter..~~"\n"~~___] && StringLength[StringTrim[cell["Data"] ] ] > 0)
wlxCellQ[cell_] := StringMatchQ[cell["Data"], StartOfString~~".wlx"~~"\n"~~__];


(* This does not work *)

evaluateNotebook[uid_, kernel_, originNotebook_, session_, mode_, evalContext_, ContextIsolation_] := With[{
    notebook = nb`HashMap[uid],
    promise = Promise[]
},
{
    path = notebook["Directory"]
},

    If[MissingQ[notebook],
        EventFire[promise, Resolve, $Failed];
        Return[promise];
    ];

    With[{
        (* build a cell list *)
        initCells = {
            If[!sessions[session, uid], Select[Select[notebook["Cells"], cell`InputCellQ], (#["Props"]["InitGroup"] === True) &], {} ], 
            If[mode === "Module",
                SelectFirst[notebook["Cells"] // Reverse, (cell`InputCellQ[#] && wolframCellQ[#])&] /. {_Missing -> Nothing}
            ,
                Select[notebook["Cells"], (cell`InputCellQ[#] && (wolframCellQ[#] || wlxCellQ[#]) && !(#["Props"]["InitGroup"] === True))&]
            ]
        } // Flatten, 
        generated = "rm"<>ToString[ Hash[notebook] ]<>"G`"
    },
        
        Echo["Cells to evaluate:"];
        Echo[Length[initCells] ];
        Echo["Context:"];
        Echo[evalContext];
        Echo["Mode:"];
        Echo[mode];
        
        If[sessions[session, uid] === True,
            Echo["Was already evaluated. Skipping init cells"];
        ];

        sessions[session, uid] = True;

      
            GenericKernel`Send[kernel,
                CoffeeLiqueur`Extensions`RemoteCells`Private`spinner0 = EchoLabel["Spinner"]["Evaluating cells in the generated context"];
                CoffeeLiqueur`Extensions`RemoteCells`Private`SavedDir = Directory[];
                CoffeeLiqueur`Extensions`RemoteCells`Private`SavedCharLim = Internal`Kernel`$OutputCharactersLimit;
                Internal`Kernel`$OutputCharactersLimit = Infinity;
                SetDirectory[path];
                If[ContextIsolation,
                    $ContextPath = $ContextPath /. "Global`" -> Nothing;
                    $Context = generated;
                    $ContextPath = Append[$ContextPath, generated];
                ];
            ];

            (* evaluate notebook in the context of a caller notebook if provided *)
            With[{transactions = Join[cell`ToTransaction[#, "Notebook"->Null] &/@ Drop[initCells,-1],
                {Transaction[
                    "Data"->"CoffeeLiqueur`Extensions`RemoteCells`Private`$cachedOutput[\""<>uid<>"\"] = "<>(initCells[[-1]]["Data"])<>";"
                ]}
            ] },

                EventHandler[transactions//Last, {"Finished" -> Function[Null,
                    Delete /@ transactions;
                ], "Error" -> Function[err,
                    EventFire[promise, Resolve, $Failed ];
                    Echo[">> Error during the evaluation"];
                    Echo[err];
                    Delete /@ transactions;
                ], "State" -> Function[state,
                    Echo["STATE UPDATE: "<>state];
                ]}]; 

                kernel["Container"][#, If[evalContext===Automatic,
                    <|"Ref" -> initCells[[1]]["Hash"], "Notebook" ->notebook |>
                ,
                    evalContext
                ] ]&/@transactions;
            ];

            GenericKernel`Send[kernel,
                CoffeeLiqueur`Extensions`RemoteCells`Private`spinner0["Cancel"];
                If[ContextIsolation,
                    $ContextPath = Append[$ContextPath /. generated -> Nothing, "Global`"];
                    $Context = "Global`";
                ];
                SetDirectory[CoffeeLiqueur`Extensions`RemoteCells`Private`SavedDir];
                Internal`Kernel`$OutputCharactersLimit = CoffeeLiqueur`Extensions`RemoteCells`Private`SavedCharLim;
                EventFire[Internal`Kernel`RemoteEvent[promise], Resolve, True];
            ];       

            
    ];

    promise
]

cellClonedEvents = <||>;


EventHandler[NotebookEditorChannel // EventClone,
    {
        "DeleteCellByHash" -> Function[uid,
            Echo["Delete object "<>uid];
            With[{target = Lookup[cell`HashMap, uid, win`HashMap[uid] ]},
                If[MatchQ[target, _cell`CellObj],
                    Delete[ target ]
                ];

                If[MatchQ[target, _win`WindowObj],
                    WebUIClose[target["Socket"] ];
                    Delete[target];
                ];
            ]
            
        ],

        "SetCellData" -> Function[assoc,
         
            With[{cell = cell`HashMap[assoc["Hash"] ]},
                Print["Updating the content: "];
                Print[cell];

                If[TrueQ[cell["Notebook"]["Opened"] ] && cell["Type"] === "Input",
                    EventFire[cell, "ChangeContent", assoc["Data"] ];
                    (*no need in setting also in an object, it will be done for the feedback from CM6 editor*)                
                ,
                    cell["Data"] = assoc["Data"];
                ]

            ]
        ],


        "EvaluateNotebook" -> Function[assoc,
           With[{promise = assoc["Promise"], kernel = GenericKernel`HashMap[ assoc["Kernel"] ], hash = assoc["Hash"]},
            Echo["Evaluating notebook..."];
                With[{ref = assoc["Ref"], ContextIsolation = assoc["ContextIsolation"], session = assoc["Session"], elements = assoc["Elements"]},

            
                            With[{},
                                Then[evaluateNotebook[hash, kernel, Null, session, elements, Lookup[assoc, "EvaluationContext", Automatic], ContextIsolation ], Function[result, 
                                    GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, result] ];
                                ], Function[Null,
                                    GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, $Failed] ];
                                ] ];
                            ];

           
                ]
 
            ];      
        ],

        "CreateNotebook" -> Function[assoc,
           With[{  uid = assoc["Hash"], kernel = GenericKernel`HashMap[assoc["Kernel"] ]},
            Echo["Creating notebook..."];
                With[{},
                    createNotebook[uid, kernel];
                    saveNotebook[Null, uid];
                ]
 
            ];      
        ],

        "CreateDocument" -> Function[assoc,
           With[{  uid = assoc["Hash"], list = assoc["List"], kernel = GenericKernel`HashMap[assoc["Kernel"] ]},
            Echo["Creating notebook.with data .."];
                With[{},
                    createNotebook[uid, kernel];
                    writeNotebook[uid, #]& /@ list;
                    saveNotebook[Null, uid];
                ]
 
            ];      
        ],

        "WriteNotebook" -> Function[assoc,
           With[{  uid = assoc["Hash"], uids = assoc["UIds"], list = assoc["List"], kernel = GenericKernel`HashMap[assoc["Kernel"] ]},
            Echo["writting notebook.with data .."];
                With[{},
                    writeNotebook[uid, #[[1]], #[[2]]]& /@ Transpose[{list, uids}];
                ]
 
            ];             
        ],

        "SaveNotebook" -> Function[assoc,
           With[{  uid = assoc["Hash"], path = assoc["Path"], kernelDir = Lookup[assoc, "KernelDirectory", Null]},
            Echo["Saving notebook..."];
                With[{},
                    saveNotebook[path, uid, kernelDir];
                ]
 
            ];      
        ],

        "CloseNotebook" -> Function[assoc,
           With[{  uid = assoc["Hash"]},
            Echo["Closing notebook..."];
                With[{},
                    closeNotebook[uid];
                ]
 
            ];      
        ],

        "ImportNotebook" -> Function[assoc,
           With[{ kernel = GenericKernel`HashMap[ assoc["Kernel"] ], uid = assoc["Hash"], path = assoc["Path"], fullpath = assoc["FullPath"], content = assoc["Data"]},
            Echo["Importing notebook..."];
                With[{},
                        importNotebook[content, path, fullpath, uid];
                ]
 
            ];      
        ],

        "AskNotebookDirectory" -> Function[data,
           With[{promise = data["Promise"], kernel = GenericKernel`HashMap[ data["Kernel"] ]},
                Echo["AskNotebookDirectory"];
                
                With[{ref = data["Notebook"]},
                        If[ !MissingQ[nb`HashMap[ref] ] ,
                            With[{dir = If[MemberQ[nb`HashMap[ref]["Properties"], "WorkingDirectory"],
                                    (nb`HashMap[ref]["WorkingDirectory"])
                                ,
                                    If[DirectoryQ[#], #, DirectoryName[#] ] &@ (nb`HashMap[ref]["Path"])
                                ]
                            },
                                If[StringQ[dir],
                                    GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, dir] ];
                                ,
                                    Echo["RemoveCells >> Error. path is not a string! "];
                                    Echo[dir];
                                ]
        
                                
                            ];
                        ,
                            Echo["RemoveCells >> Error. not found reference notebook"];
                        ];
                ]
 
            ];
        ],

        "FindParent" -> Function[data,
            With[{promise = data["Promise"], o = cell`HashMap[ data["CellHash"] ], kernel = GenericKernel`HashMap[ data["Kernel"] ]},

                If[MissingQ[o],
                    Echo["RemoveCells >> cell does not exist. Using reference cell instead"];
                    With[{ref = data["Ref"]},
                        If[ !MissingQ[cell`HashMap[ref] ] ,
                            Echo["RemoveCells >> "<>ToString[ref] ];
                            GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, ref] ];
                        ,
                            Echo["RemoveCells >> Error. not found"];
                        ];
                    ]
                ,
                    With[{parent = (SequenceCases[o["Notebook"]["Cells"], {_?cell`InputCellQ, ___?cell`OutputCellQ, o} ] // First // First)["Hash"]},
                        Echo["RemoteCells >> found parent"];
                        Echo[parent];
                        
                        GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, parent] ];
                    ]                 
                ];
 
            ];
        ],

        "EvaluateCellByHash" -> Function[assoc,
            With[{cell = cell`HashMap[ assoc["UId"] ], target = assoc["Target"]},
                If[MatchQ[cell, _cell`CellObj],
                    With[{controller = cell["Notebook"]["Controller"]},
                        If[MatchQ[target, "Notebook" | "" | "Parent" | "Same" | Null],
                            EventFire[controller, "NotebookCellEvaluate", cell]
                        ,
                            EventFire[controller, "NotebookCellProject", cell]
                        ]
                       
                    ]
                ];
            ]            
        ],

        "PrintNewCell" -> Function[t,
            Echo["Cell print options:"];
            Echo[KeyDrop[t, "Data"] ];

            With[{
                kernelHash = t["KernelId"],
                reference  = cell`HashMap[t["Ref"] ],
                evaluatedQ = Lookup[t["Meta"], "EvaluatedQ", True],
                notebook   = nb`HashMap[t["Notebook"] ],
                title      = Lookup[t["Meta"], "Title", "Projector"],
                imageSize  = Lookup[t["Meta"], ImageSize, Automatic],
                display    = Lookup[t["Meta"], "Display", "codemirror"],
                target     = Lookup[t["Meta"], "Target", "Notebook"]
            },

                If[MatchQ[target, "Notebook" | Null | Automatic],
                    (* Try to print as a new cell in the notebook *)
                    If[MatchQ[reference["Notebook"], _nb`NotebookObj] || MatchQ[notebook, _nb`NotebookObj],
                        Echo["Print a normal new cell"];
                        Echo["Adding new cell after:"];
                        Echo[cell`HashMap[t["Meta"]["After"][[1]]] ];
                        cell`CellObj @@ Join[
                            {
                                "Notebook" -> If[MatchQ[cell`HashMap[t["Meta"]["After"][[1]]], _cell`CellObj],
                                    cell`HashMap[t["Meta"]["After"][[1]]]["Notebook"],
                                    If[!MatchQ[reference["Notebook"], _nb`NotebookObj], notebook, reference["Notebook"] ]
                                ],
                                "Data"    -> t["Data"],
                                "Display" -> display
                            },
                            ReplaceAll[Normal[KeyDrop[t["Meta"], {"Notebook", "Window"}] ],
                                {CoffeeLiqueur`Extensions`RemoteCells`RemoteCellObj -> cell`HashMap}]
                        ] // Echo;
                        Return[];
                    ,
                        Echo["Failed to print a normal cell. Falling back to a new window..."];
                    ];
                ];

                SetTimeout[
                    (* Assuming that a user asked for printing to a new window *)
                    With[{
                        socketRef = Unique["uniqWinSock"],
                        win = win`WindowObj["Title" -> title, "WebSocketPort" -> GenericKernel`HashMap[kernelHash]["WebSocket"], ImageSize -> imageSize, "Display" -> display, "Hash" -> t["Meta", "Hash"], "Data" -> t["Data"] ]
                    },
                        socketRef = Null;

                        (* provide notebook ref if explicitly told by a user, then it will also copy all js and html outputs *)
                        If[MatchQ[notebook, _nb`NotebookObj],
                            win["Notebook"] = notebook;
                        ];

                        If[TrueQ[reference["Notebook"]["Opened"] ],
                            Echo["Found reference socket from the cell reference"];
                            socketRef = reference["Notebook"]["Socket"];
                            win["CellHash"] =  reference["Hash"];
                        ];

                        If[socketRef === Null && TrueQ[notebook["Opened"] ],
                            Echo["Found reference socket from the notebook reference"];
                            socketRef = notebook["Socket"];
                            win["NotebookHash"] =  notebook["Hash"];
                        ];

                        If[socketRef === Null,
                            Echo["Trying to find any opened window"];
                            With[{
                                ws = SortBy[Select[Values[win`HashMap], TrueQ[#["Opened"] ]&], Function[w, -w["Date"] ] ]
                            },   
                                If[Length[ws] > 0,
                                    socketRef = ws[[-1]]["Socket"];
                                ]
                            ];
                        ];

                        If[socketRef === Null,
                            Echo["Trying to find any opened notebook"];
                            With[{ws = Select[Values[nb`HashMap], TrueQ[#["Opened"] ]&]  },
                                If[Length[ws] > 0,
                                    socketRef = ws[[-1]]["Socket"];
                                ]
                            ];
                        ]; 

                        If[socketRef === Null,    
                            Echo["This is really bad. We have to use Electron Magic. This will not work with docker/server env..."];

                            Which[
                                !NumberQ[imageSize] && !ListQ[imageSize],
                                    ElectronIPCSend["createWindow",  StringJoin["/window?id=", win["Hash"] ], title, <|"offscreen"->TrueQ[t["Meta", "Offscreen"] ]|>],
                                True,
                                    With[{features = If[ListQ[imageSize],
                                            <|"override"-><|"width"->imageSize[[1]], "height"->imageSize[[2]]|>, "offscreen"->TrueQ[t["Meta", "Offscreen"] ]|>,
                                            <|"override"-><|"width"->imageSize, "height"->(0.76 imageSize // Round)|>, "offscreen"->TrueQ[t["Meta", "Offscreen"] ]|>
                                        ]},
                                        ElectronIPCSend["createWindow",  StringJoin["/window?id=", win["Hash"] ], title, features];
                                    ]
                            ];                        
                        ,
                            Echo["Creating a new window... Socket was found"];
                            Which[
                                TrueQ[t["Meta", "Offscreen"] ],
                                    WebUILocation[StringJoin["/window?id=", win["Hash"] ], socketRef, "Target" -> _, "Features" -> "width=1,height=1"],
                                !NumberQ[imageSize] && !ListQ[imageSize],
                                    WebUILocation[StringJoin["/window?id=", win["Hash"] ], socketRef, "Target" -> _],
                                True,
                                    With[{features = If[ListQ[imageSize],
                                            StringTemplate["width=``,height=``"][imageSize[[1]], imageSize[[2]]],
                                            StringTemplate["width=``,height=``"][imageSize, 0.76 imageSize // Round]
                                        ]},
                                        WebUILocation[StringJoin["/window?id=", win["Hash"] ], socketRef, "Target" -> _, "Features" -> features]
                                    ]
                            ];
                        ];  

                    ];
                , 10]; (* let it go to the que async. in a case if some windows have been just closed *)
            ]
        ],


        "CellSubscribe" -> Function[assoc,
            Print["CellSubscribe"];
            With[{hash = assoc["CellHash"], callback = assoc["Callback"], kernel = GenericKernel`HashMap[ assoc["Kernel"] ]},
                
                (* do not clone for cells, since it has to be unique. 
                    It may cause issues with output cells, if they are not yet created.
                    But for windows it is fine *)
                With[{w = If[KeyExistsQ[win`HashMap, hash], EventClone[hash], hash]},
                    (* cellClonedEvents[callback] = w; *)

                    EventHandler[w, {
                        "OnWebSocketConnected" -> Function[assoc,
                            With[{socket = assoc["Client"] , ev = EventClone[assoc["Client"] ] },
                                EventHandler[ev, {
                                    "Closed" -> Function[Null,
                                        EventRemove[ev];
                                        GenericKernel`SendAsync[kernel, EventFire[callback, "Closed", CoffeeLiqueur`Extensions`Communication`WindowObj[<|"Socket" -> socket|>] ] ];
                                    ]
                                }];

                                GenericKernel`SendAsync[kernel, EventFire[callback, "Mounted", CoffeeLiqueur`Extensions`Communication`WindowObj[<|"Socket" -> socket|>] ] ];
                            ];
                            
                        ],
                        any_String :> Function[data,
                            Echo["Event generated on RemoteCellObject"];

                            If[any === "Ready" && KeyExistsQ[win`HashMap, hash], (* if this is a window and it is ready *)
                                With[{winO = CoffeeLiqueur`Extensions`Communication`WindowObj[<|"Socket" -> win`HashMap[hash]["KernelWebSocket"]|>]},
                                    GenericKernel`SendAsync[kernel, EventFire[callback, any, winO] ];
                                ]
                            ,
                                GenericKernel`SendAsync[kernel, EventFire[callback, any, data] ];
                            ]
                        ]
                    }]
                ]
            ]
        ],
        
        (* FIXME!!! NOT EFFICIENT!*)
        (* DO NOT USE BLANK PATTERN !!! *)
        "NotebookSubscribe" -> Function[assoc,
            Print["NotebookSubscribe!!!!!!"];
            With[{hash = assoc["NotebookHash"], callback = assoc["Callback"], kernel = GenericKernel`HashMap[ assoc["Kernel"] ]},
                EventHandler[EventClone[hash], {
                    any_String :> Function[data,
                        Echo["Forwarded notebook event: ", any];
                        GenericKernel`SendAsync[kernel, EventFire[callback, any, data] ];
                    ]
                }]
            ]
        ],


        "NotebookFieldSet" -> Function[assoc,
            With[{notebook = nb`HashMap[ assoc["NotebookHash"] ], field = assoc["Field"], value = assoc["Value"]},
                notebook[field] = value
            ]
        ],

        "GetNotebookProperty" -> Function[assoc,
            With[
                {notebook = nb`HashMap[ assoc["NotebookHash"] ], f = assoc["Function"], prop = assoc["Tag"], promise = assoc["Promise"], kernel = GenericKernel`HashMap[ assoc["Kernel"] ]},
                If[prop === Null,
                    With[{val = notebook // f},    
                        GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, val] ];
                    ];                
                ,
                    With[{val = notebook[prop] // f},    
                        GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, val] ];
                    ];                
                ]
            ]
        ],

        "GetCellProperty" -> Function[assoc,
            With[
                {cell = cell`HashMap[ assoc["Hash"] ], f = assoc["Function"], prop = assoc["Tag"], promise = assoc["Promise"], kernel = GenericKernel`HashMap[ assoc["Kernel"] ]},
                With[{val = cell[prop] // f},    
                    GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, val] ];
                ];
            ]
        ],

        "GetMultipleCells" -> Function[assoc,
            With[
                {cells = (cell`HashMap /@ assoc["Cells"]),  promise = assoc["Promise"], kernel = GenericKernel`HashMap[ assoc["Kernel"] ]},
                With[{data = Map[Function[cell, <|"Data"->cell["Data"], "Type"->cell["Type"], "Display"->cell["Display"], "Props"->cell["Props"]|>], cells]},    
                    GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, data] ];
                ];
            ]
        ],


        "NotebookMessageDialog" -> Function[assoc,
            With[{
                notebook = nb`HashMap[ assoc["Ref"] ], 
                payload = assoc["Payload"], 
                promise = assoc["Promise"], 
                kernel = GenericKernel`HashMap[ assoc["Kernel"] ]
            },

                With[{
                    p = Promise[]
                },
                    If[notebook["ModalsChannel"] === Null || !MatchQ[notebook, _nb`NotebookObj],
                        Echo["Search for opened notebooks"];
                        With[{nbs = Select[nb`HashMap//Values, Function[n, n["Opened"] ] ]},
                            If[Length[nbs] > 0,
                                EventFire[nbs[[1]]["ModalsChannel"], "HTMLWindow", <|
                                    "Promise"-> p,
                                    "Data" -> payload,
                                    "Content" -> messageDialog
                                |>];                             
                            ,
                                Echo["Search for opened windows associated with a notebook"];
                                With[{wins = Values[win`HashMap]},
                                    With[{filtered = Select[wins, (TrueQ[#["Opened"] ])&]},
                                        If[Length[filtered] > 0,
                                            With[{w = (filtered // First)},
                                                EventFire[w["ModalsChannel"], "HTMLWindow", <|
                                                    "Promise"-> p,
                                                    "Data" -> payload,
                                                    "Content" -> messageDialog
                                                |>];                                                                                        
                                            ]
                                        ,
                                            Echo["No windows were found! This is bad, and it won't work in docker/server. Let's use some Electron Magic"];
                                            With[{win = win`WindowObj["Data"->"<div class=\"px-4 py-2\"><small>Please, close this window</small></div>", "Display"->"html", ImageSize->{100,100}, "WebSocketPort"->kernel["WebSocket"] ]},
                                                EventHandler[win // EventClone, {"Ready" -> Function[Null,
                                                    EventFire[win["ModalsChannel"], "HTMLWindow", <|
                                                        "Promise"-> p,
                                                        "Data" -> payload,
                                                        "Content" -> messageDialog
                                                    |>];    
                                                ]}];
                                                ElectronIPCSend["createWindow",  StringJoin["/window?id=", win["Hash"] ], "Message"];
                                            ];
                                        ]
                                    ]
                                ]  
                            ]
                        ]                      
                    ,
                        EventFire[notebook["ModalsChannel"], "HTMLWindow", <|
                            "Promise"-> p,
                            "Data" -> payload,
                            "Content" -> messageDialog
                        |>]; 
                    ];

                    Then[p, Function[result, 
                        GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, result] ];
                    ],
                    Function[Null, 
                        GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, False] ];
                    ]
                    ];  
                ];
            ];
        ],

        "NotebookMessageDialogNative" -> Function[assoc,
            With[{
                notebook = nb`HashMap[ assoc["Ref"] ], 
                payload = assoc["Payload"], 
                type = assoc["Type"], 
                promise = assoc["Promise"], 
                kernel = GenericKernel`HashMap[ assoc["Kernel"] ]
            },

                With[{
                    p = Promise[]
                },

                    If[notebook["ModalsChannel"] === Null || !MatchQ[notebook, _nb`NotebookObj],
                        Echo["Search for opened notebooks"];
                        With[{nbs = Select[nb`HashMap//Values, Function[n, n["Opened"] ] ]},
                            If[Length[nbs] > 0,
                                EventFire[nbs[[1]]["ModalsChannel"], type, Join[<|
                                    "Promise"-> p
                                |>, payload] ]; 
                            ,
                                Echo["Search for opened windows associated with a notebook"];
                                With[{wins = Values[win`HashMap]},
                                    With[{filtered = Select[wins, ( TrueQ[#["Opened"] ])&]},
                                        If[Length[filtered] > 0,
                                            With[{w = (filtered // First)},
                                                EventFire[w["ModalsChannel"], type, Join[<|
                                                    "Promise"-> p
                                                |>, payload] ];                                                                                        
                                            ]
                                        ,
                                            Echo["No windows were found! This is bad, and it won't work in docker/server. Let's use some Electron Magic"];
                                            With[{win = win`WindowObj["Data"->"<div class=\"px-4 py-2\"><small>Please, close this window</small></div>", "Display"->"html", ImageSize->{100,100}, "WebSocketPort"->kernel["WebSocket"] ]},
                                                EventHandler[win // EventClone, {"Ready" -> Function[Null,
                                                    EventFire[win["ModalsChannel"], type, Join[<|
                                                    "Promise"-> p
                                                    |>, payload] ];    
                                                ]}];
                                                ElectronIPCSend["createWindow",  StringJoin["/window?id=", win["Hash"] ], "Message"];
                                            ];                                
                                        ]
                                    ]
                                ] 
                            ]
                        ]                       
                    ,
                        EventFire[notebook["ModalsChannel"], type, Join[<|
                            "Promise"-> p
                        |>, payload] ]; 
                    ];



                    Then[p, Function[result, 
                        GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, result] ];
                    ],
                    Function[Null, 
                        GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, False] ];
                    ]
                    ];  
                ];
            ];
        ]            
    }
]

End[]
EndPackage[]