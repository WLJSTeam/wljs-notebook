BeginPackage["CoffeeLiqueur`Extensions`ExportImport`WLW`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`Notebook`Transactions`"
}];


execute;
export;

Begin["`Internal`"];

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`LocalKernel`" -> "LocalKernel`"];

Needs["CoffeeLiqueur`Notebook`Windows`" -> "win`"];

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];


Needs["CoffeeLiqueur`Notebook`Loader`" -> "loader`"];

{saveNotebook, loadNotebook, renameNotebook, cloneNotebook}         = {loader`save, loader`load, loader`rename, loader`clone};

export[controls_, modals_, messager_, client_, notebookOnLine_nb`NotebookObj, path_, name_, ext_, _, _] := With[{

},
        With[{
            p = Promise[]
        },
            EventFire[modals, "SaveDialog", <|
                "Promise"->p,
                "title"->"Export mini-app",
                "properties"->{"createDirectory", "dontAddToRecent"},
                "filters"->{<|"extensions"->"wlw", "name"->"WLJS Widget"|>}
            |>];

            Then[p, Function[result, 
                Module[{filename = If[StringQ[result], URLDecode @ result, URLDecode @ result["filePath"] ] },
                    If[!StringQ[filename] || TrueQ[result["canceled"] ] || StringLength[filename] === 0, 
                      Echo["Cancelled saving"]; Echo[result];
                      Return[];
                    ];

                    If[!StringMatchQ[filename, __~~".wlw"],  filename = filename <> ".wlw"];
                    If[filename === ".wlw", filename = name<>filename];
                    If[DirectoryName[filename] === "", filename = FileNameJoin[{path, filename}] ];

                    saveNotebook[filename, notebookOnLine];

                    EventFire[messager, "Saved", "Exported to "<>filename];
                ];
            ], Function[result, Echo["!!!R!!"]; Echo[result] ] ];
            
        ]    
]


(*                                             ***                                                 *)
(*                                         WLE Decoder                                          *)
(*                                             ***                                                 *)

checkKernel[getkernel_, cbk_] := With[{
    kernel = getkernel[]
}, Echo["Checking kernel..."]; 
    If[TrueQ[kernel["ContainerReadyQ"] ] && TrueQ[kernel["ReadyQ"] ],
        Echo["Kernel is ready!"];
        cbk[kernel, kernel];
    ,
        Echo["Not yet..."];
        SetTimeout[checkKernel[getkernel, cbk], 500];
    ]
]

wlxCellQ[data_String] := StringMatchQ[data, (".wlx\n"~~__) | (".wlx\r\n"~~__) | (".wlx\r"~~__)]
markdownCellQ[data_String] := StringMatchQ[data, (".md\n"~~__) | (".md\r\n"~~__) | (".md\r"~~__)]
markdownCellQ[_] := False

metadataCell[cells_List] := SelectFirst[cells, (markdownCellQ[#["Data"]] && #["Type"] === "Input")&]

markdownBody[data_String] := FirstCase[
    StringCases[data, RegularExpression["^\\.md(?:\\r\\n|\\n|\\r)([\\s\\S]*)$"] :> "$1"],
    _String,
    ""
]
markdownBody[_] := ""

parseWindowTitle[data_String] := Module[{titleLine, title},
    titleLine = SelectFirst[
        StringTrim /@ StringSplit[markdownBody[data], RegularExpression["\\r\\n|\\n|\\r"]],
        StringLength[#] > 0 && !StringMatchQ[#, RegularExpression["WindowSize\\s*(?::|->).*"]]&,
        Automatic
    ];

    If[!StringQ[titleLine], Return[Automatic] ];

    title = StringTrim @ StringReplace[titleLine, RegularExpression["^[#|\\s]+"] -> ""];
    If[StringLength[title] > 0, title, Automatic]
]
parseWindowTitle[_] := Automatic

parseWindowSize[data_String] := Module[{res},
    res = StringCases[
        data,
        RegularExpression["(?:^|[\\r\\n])\\s*WindowSize\\s*(?::|->)\\s*(?:\\{\\s*)?([0-9]+(?:\\.[0-9]*)?(?:`[0-9.]*)?)\\s*(?:[xX]|,)\\s*([0-9]+(?:\\.[0-9]*)?(?:`[0-9.]*)?)(?:\\s*\\})?"] :> {ToExpression["$1"], ToExpression["$2"]}
    ];

    FirstCase[res, {_?NumberQ, _?NumberQ}, Automatic]
]
parseWindowSize[_] := Automatic


execute[opts__][path_String, secondaryOpts___] := Module[{str, cells, objects, notebook, store, symbols, place, windowTitle, windowSize},
With[{
    name = FileBaseName[path],
    promise = Promise[],
    
    notebook = nb`LoadFromFile[ path ],

    spinner = Notifications`Spinner["Topic"->"Initializing an app", "Body"->"Please, wait"](*`*),
    msg = OptionValue["Messager"],
    generated = StringReplace[(Internal`NoWR`RandomWord[])<>StringTake[CreateUUID[], 3]<>"w`", {"-"->""}]
}, 

    windowTitle = "Application";
    windowSize = Automatic;
    options = Join[Association[List[opts] ], Association[ List[secondaryOpts] ] ]; 

    notebook["Path"] = path;
    notebook["ModalsChannel"] = Null; (* indicate that the window of notebook is not shown. all modals should go somewhere else *)

    EventFire[msg, spinner, True];    

    With[{},
        checkKernel[Function[Null, options["Kernels"] //ReleaseHold //First], Function[{data, kernel},

            Echo["Starting evaluation", "WLE Decoder"];
            With[{
                initCells = Unique[],
                last = Unique[],
                dir = FileNameSplit[DirectoryName[ path ] ]
            },
                initCells = Select[Select[notebook["Cells"], cell`InputCellQ], (#["Props"]["InitGroup"] === True) &];
                last = FirstCase[notebook["Cells"] // Reverse, _?cell`InputCellQ];
                
                notebook["ModalsChannel"] = Null; (* indicate that the window of notebook is not shown. all modals should go somewhere *)
                
                Echo["Switching the context to "<>generated];

                GenericKernel`Send[kernel,
                    $ContextPath = $ContextPath /. "Global`" -> Nothing;
                    $Context = generated;
                    Internal`Kernel`$savedDirectory = Directory[];
                    SetDirectory[FileNameJoin @ dir];
                    $ContextPath = Append[$ContextPath, generated];
                ];

                Echo["Evaluating initialization cells"];

                If[!wlxCellQ[last["Data"]],
                    Echo["Warning: output cell will not be WLX type"];
                    Echo["Automatic convertion using StandardForm will be used"];
                    
                    initCells = Append[initCells, last];
                    
                    last["Props"] = <|"InitGroup" -> True|>;
                    
                    initCells = Append[initCells, cell`CellObj["Notebook"->notebook, "Type"->"Input", "Props"-><|"InitGroup" -> True|>, "Data"->"WLWTemporalWindowSymbol = StandardForm[%];"]];
                    
                    last = cell`CellObj["Notebook"->notebook, "Type"->"Input", "Data"->".wlx\r\n<WLWTemporalWindowSymbol/>"];
                ];                

                data["Container"][ cell`ToTransaction[#, "Notebook"->Null], <|"Ref" -> #["Hash"], "Notebook" -> notebook["Hash"]|> ] &/@ initCells;


                With[{t = metadataCell[notebook["Cells"]]},
                    If[MissingQ[t], Echo["WLW >> Title is missing!"]; ,
                        With[{title = parseWindowTitle[t["Data"]], size = parseWindowSize[t["Data"]]},
                            If[StringQ[title], windowTitle = title; ];
                            If[MatchQ[size, {_?NumberQ, _?NumberQ}], windowSize = size ];
                        ];
                    ];
                ] // Quiet;

                With[{hash = kernel["Hash"]},
                    Echo["Evaluating the last cell"];
                    
                    With[{
                        win = win`WindowObj["Title"->windowTitle, WindowSize->windowSize, ImageSize->windowSize, "WebSocketPort"->kernel["WebSocket"], "RetryWebSocket"->True]
                    }, {
                        cloned = EventClone[win],
                        readyPromise = Promise[],
                        transaction = cell`ToTransaction[last, "Notebook"->Null]
                    },

                        EventHandler[EventClone @ transaction, {
                            "Result" -> Function[output,
                                Echo["Get the result... Submitting to a window"];
                                If[KeyExistsQ[output, "Meta"],
                                    win["Data"] = output["Data"];
                                    win["Display"] = Lookup[<|output["Meta"]|>, "Display", "codemirror"];
                                    With[{generatedHash = <|output["Meta"]|>["Hash"]}, If[StringQ[generatedHash], 
                                        EventHandler[EventClone[win], {
                                            (* forward all events *)
                                            any_ :> (EventFire[generatedHash, any, #]&)
                                        }];
                                    ] ];
                                ,
                                    win["Data"] = output["Data"];
                                ];
                                
                                If[win["Display"] =!= "wlx",
                                    win["Display"] = "html";
                                    win["Data"] = "<div class=\"px-4 py-2\"><small>Output window must be written in WLX. Plain Wolfram is not supported due to context switching issues.</small></div>";
                                ];

                                EventFire[spinner["Promise"], Resolve, True];
                                EventFire[readyPromise, Resolve, True];

                                Echo["Restoring context"];
                                (* This must be here. If you put it in Finished, then it outputs local variables
                                   in Graphics-like objects without their context, assuming it is $Context, and
                                   it can't fetch them once the context is switched back to Global.

                                   I have no idea why it works when I place it here.

                                   Generally speaking, this problem is related to how
                                   ExportByteArray[..., "ExpressionJSON"] omits the explicit context prefix
                                   when it is evaluated within $Context, though I am not sure. It may also have
                                   something to do with how WLXForm outputs it.

                                   Oh crap...

                                   As a rule, use WLX cells as the main output for mini apps for the moment.
                                *)
                                GenericKernel`Send[kernel,
                                                    $ContextPath = Append[$ContextPath /. generated -> Nothing, "Global`"];
                                                    $Context = "Global`";
                                                    SetDirectory[Internal`Kernel`$savedDirectory];
                                ]; 
                                ClearAll[last, initCells];
                            ],

                            "Finished" -> Function[Null,
                                Delete[transaction];
                                


                            ],

                            "Error" -> Function[Null,
                                Delete[transaction];
                                win["Data"] = "$Failed";
                                Echo["Get the result... ERROR!"];
                                
                          

                                EventFire[spinner["Promise"], Resolve, True];
                                EventFire[readyPromise, Resolve, True]; 

                                Echo["Restoring context"];
                                GenericKernel`Send[kernel,
                                                    $ContextPath = Append[$ContextPath /. generated -> Nothing, "Global`"];
                                                    $Context = "Global`";
                                                    SetDirectory[Internal`Kernel`$savedDirectory];
                                ];                                                              
                            ]
                        }];

                        EventHandler[cloned, {
                            "AfterWebSocketConnected" -> Function[Null,
                                EventRemove[cloned];
                                Echo["Window was created, starting evaluation..."];

                                (* just to populate last client, if there is no other source *)
                                (* some WLW windows might have timers running, which has no access to evaluation context *)
                                (* Consider to be fixed [TODO] *)
                                With[{ws = win["KernelWebSocket"]},
                                    GenericKernel`Send[kernel,
                                        CoffeeLiqueur`Extensions`Communication`Internal`$lastClient = ws;
                                    ];
                                ];

                                data["Container"][transaction, 
                                    <|"KernelWebSocket"->win["KernelWebSocket"], "Notebook"->notebook["Hash"], "Ref"->last["Hash"]|>
                                ]; 

                                readyPromise
                            ]  
                        }];

                        Echo["Refresh the page"];
                        EventFire[promise, Resolve, {StringJoin["/window?id=", win["Hash"] ], ""} ];
                    
                    ];                    

                ];
            ];

            
        ] ];
    ];


    
    

    promise
] ]


End[];    
EndPackage[];
