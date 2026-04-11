BeginPackage["CoffeeLiqueur`Extensions`RemoteCells`", {
    "CoffeeLiqueur`Extensions`Editor`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",  
    "CoffeeLiqueur`WLX`WebUI`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`"
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
    notebook["Evaluator"] = kernel["Container"];
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

exportNotebook[notebook_, savingPath_, "wln"] := With[{},
    notebook["Path"] = savingPath;
    notebook["Directory"] = DirectoryName[savingPath];

    Put[<| 
        "Notebook" -> Join[nb`Serialize[notebook], <|"Evaluator" -> notebook["Evaluator"]|>], 
        "Cells" -> ( cell`Serialize /@ notebook["Cells"]), 
        "serializer" -> "jsfn4" 
    |>, savingPath ]
]

saveNotebook[path_, uid_] := With[{
    notebook = nb`HashMap[uid]
},
{
    savingPath = If[path === Null,
            If[StringQ[notebook["Path"] ], 
                notebook["Path"], 
                FileNameJoin[{$TemporaryDirectory, (RandomWord[]<>RandomWord[])<>".wln"}]
            ]
        ,
            path
    ]
},

    exportNotebook[notebook, savingPath, FileExtension[savingPath] ]
]

importNotebook[content_, path_, fullpath_, uid_] := With[{
    notebook = nb`NotebookObj["Hash" -> uid]
},
    nb`Deserialize[content["serializer"], content, notebook];

    notebook["Path"] = fullpath;
    notebook["Directory"] = path;
    notebook["Hash"]
]

sessions[_, _] := False;

wolframCellQ[cell_] := (!StringMatchQ[cell["Data"], StartOfString~~(WordCharacter.. | "")~~"."~~WordCharacter..~~"\n"~~___] && StringLength[StringTrim[cell["Data"] ] ] > 0)
wlxCellQ[cell_] := StringMatchQ[cell["Data"], StartOfString~~".wlx"~~"\n"~~__];

(* [TODO] [REFACTOR] *)

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
        
        sessions[session, uid] = True;

        With[
            {last = initCells//Last},
            {
                (* remove original notebook assigments *)
                transform = Function[Null,
                    Echo["RemoteCells >> Original cells were transformed"];

                    If[mode === "Module",
                        (* a hack to save the context *)
                        last["_Data"] = last["Data"];
                        (*[TODO] FIX ME. USE NORMAL SYMBOLS! *)
                        last["Data"] = "BaseEncode[ExportByteArray["<>last["Data"]<>", \"WXF\"]]";  
                    ];

                    (* remove assigments *)
                    Function[x, 
                        x["Notebook"]=Null;
                    , HoldFirst] /@ initCells;              
                ],

                (* restore original notebook assigments *)
                restore = Function[Null,
                    Echo["RemoteCells >> Original cells were restored"];
                    If[mode === "Module", last["Data"] = last["_Data"] ]; 

                    (* remove assigments *)
                    Function[x, 
                        x["Notebook"]=notebook;
                    , HoldFirst] /@ initCells;                   
                ]
            },
                transform[];


                EventHandler[initCells // Last, {"Finished" -> Function[Null,
                    With[{results = (initCells // Last)["Result"]},
                        Echo[">> Finished!"];
                        Echo["Result:"]; Echo[results];
                        If[Length[results] > 0 && mode === "Module",
                            If[Last[results]["Display"] === "codemirror",
                                EventFire[promise, Resolve,  Last[results]["Data"] ];

                                restore[];

                            ,
                                EventFire[promise, Resolve, Null];

                                restore[];

                                Echo[">> Last cell in the notebook must be Wolfram Language!"];
                            ]

                        ,
                            Echo[">> No output!"];
                            EventFire[promise, Resolve, Null];

                            restore[];
                        ]
                    ];


                ], "Error" -> Function[err,
                    EventFire[promise, Resolve, $Failed ];
                    Echo[">> Error during the evaluation"];
                    Echo[err];
                    restore[];

                ], "State" -> Function[state,
                    Echo["STATE UPDATE: "<>state];
                ]}]; 

            ];

      
            GenericKernel`Init[kernel,
                CoffeeLiqueur`Extensions`RemoteCells`Private`spinner0 = CoffeeLiqueur`Extensions`Notifications`Notify["Evaluating cells in the generated context", "Topic"->"Notebook", "Type"->"Spinner"];
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
            cell`EvaluateCellObj[#, "Evaluator"->kernel["Container"], "EvaluationContext"->evalContext ] &/@ initCells;

            GenericKernel`Init[kernel,
                Delete[CoffeeLiqueur`Extensions`RemoteCells`Private`spinner0];
                If[ContextIsolation,
                    $ContextPath = Append[$ContextPath /. generated -> Nothing, "Global`"];
                    $Context = "Global`";
                ];
                SetDirectory[CoffeeLiqueur`Extensions`RemoteCells`Private`SavedDir];
                Internal`Kernel`$OutputCharactersLimit = CoffeeLiqueur`Extensions`RemoteCells`Private`SavedCharLim;
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
                                Then[evaluateNotebook[hash, kernel, Null, session, elements, Lookup[assoc, "EvaluationContext", <||>], ContextIsolation ], Function[result, 
                                    GenericKernel`Async[kernel, EventFire[promise, Resolve, result] ];
                                ], Function[Null,
                                    GenericKernel`Async[kernel, EventFire[promise, Resolve, $Failed] ];
                                ] ];
                            ];

           
                ]
 
            ];      
        ],

        "CreateNotebook" -> Function[assoc,
           With[{  uid = assoc["Hash"]},
            Echo["Creating notebook..."];
                With[{},
                    createNotebook[uid];
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
                    saveNotebook[Null, uid];
                ]
 
            ];             
        ],

        "SaveNotebook" -> Function[assoc,
           With[{  uid = assoc["Hash"], path = assoc["Path"]},
            Echo["Saving notebook..."];
                With[{},
                    saveNotebook[path, uid];
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
           With[{ kernel = GenericKernel`HashMap[ assoc["Kernel"] ], uid = assoc["Hash"], path = assoc["Path"], fullpath = assoc["FullPath"], content = ImportString[assoc["Data"], "WL"]},
            Echo["Importing notebook..."];
                With[{},
                        importNotebook[content, path, fullpath, uid];
                ]
 
            ];      
        ],

        "AskNotebookDirectory" -> Function[data,
           With[{promise = data["Promise"], kernel = GenericKernel`HashMap[ data["Kernel"] ]},
            
                With[{ref = data["Notebook"]},
                        If[ !MissingQ[nb`HashMap[ref] ] ,
                            With[{dir = If[MemberQ[nb`HashMap[ref]["Properties"], "WorkingDirectory"],
                                    (nb`HashMap[ref]["WorkingDirectory"])
                                ,
                                    If[DirectoryQ[#], #, DirectoryName[#] ] &@ (nb`HashMap[ref]["Path"])
                                ]
                            },
                                If[StringQ[dir],
                                    GenericKernel`Async[kernel, EventFire[promise, Resolve, dir] ];
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
                            GenericKernel`Async[kernel, EventFire[promise, Resolve, ref] ];
                        ,
                            Echo["RemoveCells >> Error. not found"];
                        ];
                    ]
                ,
                    With[{parent = (SequenceCases[o["Notebook"]["Cells"], {_?cell`InputCellQ, ___?cell`OutputCellQ, o} ] // First // First)["Hash"]},
                        Echo["RemoteCells >> found parent"];
                        Echo[parent];
                        
                        GenericKernel`Async[kernel, EventFire[promise, Resolve, parent] ];
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

        (* [TODO] [REFACTOR] *)

        "PrintNewCell" -> Function[t,
            Echo["Cell print options:"];
            Echo[KeyDrop[t, "Data"] ];
            With[{reference = cell`HashMap[ t["Ref"] ], evaluatedQ = Lookup[t["Meta"], "EvaluatedQ", True], title = Lookup[t["Meta"], "Title", "Projector"], imageSize=Lookup[t["Meta"], ImageSize, Automatic], display = Lookup[t["Meta"], "Display", "codemirror"], target = Lookup[t["Meta"], "Target", "Notebook"]},

                If[!MatchQ[reference, _cell`CellObj], 
                    With[{
                        notebook = nb`HashMap[ t["Notebook"] ]
                    },
                        If[!MatchQ[notebook, _nb`NotebookObj], 
                            
                            With[{wins = Values[win`HashMap]},
                                    Echo["Search for any opened window"];
                                    With[{filtered = Select[wins, (TrueQ[#["Opened"] ])&]},
                                        If[Length[filtered] > 0,
                                            With[{cli = (filtered // First)["Socket"], nb = filtered[[1]]["Notebook"]},
                                                With[{win = win`WindowObj["Notebook" -> nb, "EvaluatedQ" -> evaluatedQ, "Title"->title, ImageSize->imageSize, "Display"->display, "Hash"->t["Meta", "Hash"], "Data" -> t["Data"], "Ref" -> First[nb["Cells"] ]["Hash"] ]},
                                                    Echo["project >> sending global event"];
                                                    EventFire[nb, "OnWindowCreate", <|"Window"->win, "Client"->cli|>];
                                                    If[TrueQ[t["Meta", "Offscreen"] ],
                                                        WebUILocation[StringJoin["/window?id=", win["Hash"] ], cli, "Target"->_, "Features"->"width=1,height=1"];
                                                    ,
                                                        If[!NumberQ[imageSize] && !ListQ[imageSize],
                                                            WebUILocation[StringJoin["/window?id=", win["Hash"] ], cli, "Target"->_];
                                                        ,
                                                            With[{features = If[ListQ[imageSize], StringTemplate["width=``,height=``"][imageSize[[1]], imageSize[[2]]], StringTemplate["width=``,height=``"][imageSize, 0.76 imageSize // Round] ]},
                                                                WebUILocation[StringJoin["/window?id=", win["Hash"] ], cli, "Target"->_, "Features"->features]
                                                            ];
                                                        ]
                                                    ]
                                                ];                                                
                                            ];
                                            Return[];
                                        ];
                                    ]
                            ];  
                            Echo["Not found"];  

                            With[{notebooks = Values[nb`HashMap]},
                                    Echo["Search for any opened notebooks"];
                                    With[{filtered = Select[notebooks, (TrueQ[#["Opened"] ])&]},
                                        If[Length[filtered] > 0,
                                            With[{cli = (filtered // First)["Socket"], nb = filtered[[1]]},
                                                With[{win = win`WindowObj["Notebook" -> nb, "EvaluatedQ" -> evaluatedQ, "Title"->title, ImageSize->imageSize, "Display"->display, "Hash"->t["Meta", "Hash"], "Data" -> t["Data"], "Ref" -> First[nb["Cells"] ]["Hash"] ]},
                                                    Echo["project >> sending global event"];
                                                    EventFire[nb, "OnWindowCreate", <|"Window"->win, "Client"->cli|>];
                                                    If[TrueQ[t["Meta", "Offscreen"] ],
                                                        WebUILocation[StringJoin["/window?id=", win["Hash"] ], cli, "Target"->_, "Features"->"width=1,height=1"];
                                                    ,
                                                        If[!NumberQ[imageSize] && !ListQ[imageSize],
                                                            WebUILocation[StringJoin["/window?id=", win["Hash"] ], cli, "Target"->_];
                                                        ,
                                                            With[{features = If[ListQ[imageSize], StringTemplate["width=``,height=``"][imageSize[[1]], imageSize[[2]]], StringTemplate["width=``,height=``"][imageSize, 0.76 imageSize // Round] ]},
                                                                WebUILocation[StringJoin["/window?id=", win["Hash"] ], cli, "Target"->_, "Features"->features]
                                                            ];
                                                        ]
                                                    ]
                                                ];                                                
                                            ];
                                            Return[];
                                        ];
                                    ]
                            ];       

                            Echo["No notebooks, no windows. This sucks, sorry"];                       

                            Return[]; 
                        ];

                        If[MatchQ[target, "Notebook" | Null | Automatic],
                            With[{c = cell`CellObj @@ Join[{"Notebook" -> notebook, "Data" -> t["Data"], "Display" -> display}, 
                                ReplaceAll[ 
                                    Normal[KeyDrop[t["Meta"], {"Notebook", "Window"}] ] 
                                , {CoffeeLiqueur`Extensions`RemoteCells`RemoteCellObj -> cell`HashMap}] 
                            ]},
          
                                If[!evaluatedQ,
                                    EventFire[notebook["Controller"], "NotebookCellEvaluate", c]
                                ];
                            ];
                        ,
                            If[TrueQ[notebook["Opened"] ] ,
                                With[{controller = notebook["Controller"]},
                                    EventFire[controller, "NotebookCellDataProject", <|
                                        "Notebook" -> notebook,
                                        "Cell" -> First[notebook["Cells"] ],
                                        "Hash" -> t["Meta", "Hash"],
                                        "Data" -> t["Data"],
                                        "EvaluatedQ" -> evaluatedQ,
                                        "Display" -> display,
                                        "Title" -> title,
                                        ImageSize -> imageSize,
                                        "Offscreen" -> TrueQ[t["Meta", "Offscreen"] ]
                                    |>]          
                                ]
                            ,
                                With[{wins = Values[win`HashMap]},
                                    Echo["Search for opened windows associated with a notebook"];
                                    With[{filtered = Select[wins, (#["Notebook"] === notebook && TrueQ[#["Opened"] ])&]},
                                        If[Length[filtered] > 0,
                                            With[{cli = (filtered // First)["Socket"]},
                                                With[{win = win`WindowObj["Notebook" -> notebook, "EvaluatedQ" -> evaluatedQ, "Title"->title, ImageSize->imageSize, "Display"->display, "Hash"->t["Meta", "Hash"], "Data" -> t["Data"], "Ref" -> First[notebook["Cells"] ]["Hash"] ]},
                                                    Echo["project >> sending global event"];
                                                    EventFire[notebook, "OnWindowCreate", <|"Window"->win, "Client"->cli|>];
                                                    If[TrueQ[t["Meta", "Offscreen"] ],
                                                        WebUILocation[StringJoin["/window?id=", win["Hash"] ], cli, "Target"->_, "Features"->"width=1,height=1"];
                                                    ,
                                                        If[!NumberQ[imageSize] && !ListQ[imageSize],
                                                            WebUILocation[StringJoin["/window?id=", win["Hash"] ], cli, "Target"->_];
                                                        ,
                                                            With[{features = If[ListQ[imageSize], StringTemplate["width=``,height=``"][imageSize[[1]], imageSize[[2]]], StringTemplate["width=``,height=``"][imageSize, 0.76 imageSize // Round] ]},
                                                                WebUILocation[StringJoin["/window?id=", win["Hash"] ], cli, "Target"->_, "Features"->features]
                                                            ];
                                                        ]
                                                    ]
                                                ];                                                
                                            ]
                                        ]
                                    ]
                                ]
                            ]
                                  
                        ]                        
                    ];
                
                
                    Return[];
                ];
                
                If[MatchQ[target, "Notebook" | Null | Automatic],
                    Echo[cell`HashMap[t["Meta"]["After"][[1]] ] ];

                    With[{c = cell`CellObj @@ Join[{"Notebook" -> If[MatchQ[cell`HashMap[t["Meta"]["After"][[1]] ],  _cell`CellObj], cell`HashMap[t["Meta"]["After"][[1]] ]["Notebook"], reference["Notebook"] ], "Data" -> t["Data"], "Display" -> display}, 
                        ReplaceAll[ 
                            Normal[KeyDrop[t["Meta"], {"Notebook", "Window"}] ] 
                        , {CoffeeLiqueur`Extensions`RemoteCells`RemoteCellObj -> cell`HashMap}] 
                    ]},
        
                        Echo[c];

                        If[!evaluatedQ,
                            EventFire[reference["Notebook"]["Controller"], "NotebookCellEvaluate", c]
                        ];
                    ];
                ,
                    With[{controller = If[MatchQ[nb`HashMap[ t["Notebook"] ], _nb`NotebookObj], nb`HashMap[ t["Notebook"] ]["Controller"], 
                        If[MatchQ[nb`HashMap[ t["Meta"]["Notebook"][[1]] ], _nb`NotebookObj], nb`HashMap[ t["Meta"]["Notebook"][[1]] ]["Controller"], reference["Notebook"]["Controller"] ] 
                    ]},
                        EventFire[controller, "NotebookCellDataProject", <|
                            "Cell" -> reference,
                            "Hash" -> t["Meta", "Hash"],
                            "Data" -> t["Data"],
                            "EvaluatedQ" -> evaluatedQ,
                            "Display" -> display,
                            ImageSize -> imageSize,
                            "Offscreen" -> TrueQ[t["Meta", "Offscreen"] ]
                        |>]          
                    ]
                          
                ]

            ]
        ],

        "CellUnsubscribe" -> Function[assoc,
            Print["CellUnsubscribe!!!!!!"];
            With[{hash = assoc["CellHash"], oldEvent = assoc["Event"], kernel = GenericKernel`HashMap[ assoc["Kernel"] ]},
                EventRemove[ cellClonedEvents[oldEvent] ];
                cellClonedEvents[oldEvent] = .; (* just to save some memory *)
            ]
        ],

        "CellSubscribe" -> Function[assoc,
            Print["CellSubscribe!!!!!!"];
            With[{hash = assoc["CellHash"], callback = assoc["Callback"], kernel = GenericKernel`HashMap[ assoc["Kernel"] ]},
                
                With[{w = EventClone[hash]},
                    cellClonedEvents[callback] = w;

                    EventHandler[w, {
                        "OnWebSocketConnected" -> Function[assoc,
                            With[{socket = assoc["Client"] , ev = EventClone[assoc["Client"] ] },
                                EventHandler[ev, {
                                    "Closed" -> Function[Null,
                                        EventRemove[ev];
                                        GenericKernel`Async[kernel, EventFire[callback, "Closed", CoffeeLiqueur`Extensions`Communication`WindowObj[<|"Socket" -> socket|>] ] ];
                                    ]
                                }];

                                GenericKernel`Async[kernel, EventFire[callback, "Mounted", CoffeeLiqueur`Extensions`Communication`WindowObj[<|"Socket" -> socket|>] ] ];
                            ];
                            
                        ],
                        any_String :> Function[data,
                            Echo["Event generated on RemoteCellObject"];

                            If[any === "Ready" && KeyExistsQ[win`HashMap, hash], (* if this is a window and it is ready *)
                                With[{winO = CoffeeLiqueur`Extensions`Communication`WindowObj[<|"Socket" -> win`HashMap[hash]["EvaluationContext"]["KernelWebSocket"]|>]},
                                    GenericKernel`Async[kernel, EventFire[callback, any, winO] ];
                                ]
                            ,
                                GenericKernel`Async[kernel, EventFire[callback, any, data] ];
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
                        GenericKernel`Async[kernel, EventFire[callback, any, data] ];
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
                        GenericKernel`Async[kernel, EventFire[promise, Resolve, val] ];
                    ];                
                ,
                    With[{val = notebook[prop] // f},    
                        GenericKernel`Async[kernel, EventFire[promise, Resolve, val] ];
                    ];                
                ]
            ]
        ],

        "GetCellProperty" -> Function[assoc,
            With[
                {cell = cell`HashMap[ assoc["Hash"] ], f = assoc["Function"], prop = assoc["Tag"], promise = assoc["Promise"], kernel = GenericKernel`HashMap[ assoc["Kernel"] ]},
                With[{val = cell[prop] // f},    
                    GenericKernel`Async[kernel, EventFire[promise, Resolve, val] ];
                ];
            ]
        ],

        "GetMultipleCells" -> Function[assoc,
            With[
                {cells = (cell`HashMap /@ assoc["Cells"]),  promise = assoc["Promise"], kernel = GenericKernel`HashMap[ assoc["Kernel"] ]},
                With[{data = Map[Function[cell, <|"Data"->cell["Data"], "Type"->cell["Type"], "Display"->cell["Display"], "Props"->cell["Props"]|>], cells]},    
                    GenericKernel`Async[kernel, EventFire[promise, Resolve, data] ];
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
                    If[notebook["ModalsChannel"] === Null,
                        Echo["Search for opened windows associated with a notebook"];
                        With[{wins = Values[win`HashMap]},
                            With[{filtered = Select[wins, (#["Notebook"] === notebook && TrueQ[#["Opened"] ])&]},
                                If[Length[filtered] > 0,
                                    With[{w = (filtered // First)},
                                        EventFire[w["ModalsChannel"], "HTMLWindow", <|
                                            "Promise"-> p,
                                            "Data" -> payload,
                                            "Content" -> messageDialog
                                        |>];                                                                                        
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
                        GenericKernel`Async[kernel, EventFire[promise, Resolve, result] ];
                    ],
                    Function[Null, 
                        GenericKernel`Async[kernel, EventFire[promise, Resolve, False] ];
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

                    If[notebook["ModalsChannel"] === Null,
                        Echo["Search for opened windows associated with a notebook"];
                        With[{wins = Values[win`HashMap]},
                            With[{filtered = Select[wins, (#["Notebook"] === notebook && TrueQ[#["Opened"] ])&]},
                                If[Length[filtered] > 0,
                                    With[{w = (filtered // First)},
                                        EventFire[w["ModalsChannel"], type, Join[<|
                                            "Promise"-> p
                                        |>, payload] ];                                                                                        
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
                        GenericKernel`Async[kernel, EventFire[promise, Resolve, result] ];
                    ],
                    Function[Null, 
                        GenericKernel`Async[kernel, EventFire[promise, Resolve, False] ];
                    ]
                    ];  
                ];
            ];
        ]            
    }
]

End[]
EndPackage[]