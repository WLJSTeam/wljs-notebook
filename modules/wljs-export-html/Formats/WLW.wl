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

checkKernel[kernel_, cbk_] := (Echo["Checking kernel..."]; If[TrueQ[kernel["ContainerReadyQ"] ] && TrueQ[kernel["ReadyQ"] ],
    Echo["Kernel is ready!"];
    cbk[kernel];
,
    Echo["Not yet..."];
    SetTimeout[checkKernel[kernel, cbk], 1000];
])

(* [TODO] [REFACTOR] *)


execute[opts__][path_String, secondaryOpts___] := Module[{str, cells, objects, notebook, store, symbols, place, windowTitle, windowSize},
With[{
    name = FileBaseName[path],
    promise = Promise[],
    
    notebook = nb`LoadFromFile[ path ],

    spinner = Notifications`Spinner["Topic"->"Initializing an App", "Body"->"Please, wait"](*`*),
    msg = OptionValue["Messager"],
    generated = StringReplace[(Internal`NoWR`RandomWord[])<>StringTake[CreateUUID[], 3]<>"w`", {"-"->""}]
}, 

    windowTitle = "Application";
    windowSize = Automatic;
    options = Join[Association[List[opts] ], Association[ List[secondaryOpts] ] ]; 

    notebook["Path"] = path;

    EventFire[msg, spinner, True];

    If[Length[options["Kernels"] //ReleaseHold ] === 0,
      EventFire[spinner["Promise"], Resolve, True];
      EventFire[options["Messager"], "Error", "The process is not possible to start without working Kernels"];
      Pause[2];

      Return[promise];
    ];

    

    With[{kernel = options["Kernels"] //ReleaseHold //First},
        checkKernel[kernel, Function[data,

            Echo["Starting evaluation", "WLE Decoder"];
            With[{
                initCells = Select[Select[notebook["Cells"], cell`InputCellQ], (#["Props"]["InitGroup"] === True) &],
                last = FirstCase[notebook["Cells"] // Reverse, _?cell`InputCellQ],
                dir = FileNameSplit[DirectoryName[ path ] ]
            },
                EventFire[spinner["Promise"], Resolve, True];

                GenericKernel`Send[kernel,
                    CoffeeLiqueur`Extensions`RemoteCells`Private`spinners[generated] = EchoLabel["Spinner"]["Evaluating cells in the generated context"];
                    $ContextPath = $ContextPath /. "Global`" -> Nothing;
                    $Context = generated;
                    Internal`Kernel`$savedDirectory = Directory[];
                    SetDirectory[FileNameJoin @ dir];
                    $ContextPath = Append[$ContextPath, generated];
                ];

                (* FIXME!!! *)
                (*(
                    #["Data"] = StringReplace[#["Data"], {"NotebookDirectory[]" -> ToString[dir, InputForm] }];
                    Print[#["Data"] ];
                ) &/@ initCells;*)

                data["Container"][ cell`ToTransaction[#, "Notebook"->Null],  Join[notebook["EvaluationContext"], <|"Ref" -> #["Hash"], "Notebook" -> notebook["Hash"]|>] ] &/@ initCells;

                Module[{title = "", decription = ""},
                        With[{t = notebook["Cells"][[1]]},
                            If[!StringMatchQ[t["Data"], ".md\n"~~__], Echo["WLW >> Title is missing!"]; ,
                                {title, decription} = StringCases[t["Data"], RegularExpression[".md\n[#| ]*([^\n]*)\n?(.*)?"]:> {"$1", "$2"}] // First;
                                If[StringQ[title], windowTitle = title; ];
                                With[{res = StringCases[t["Data"], "WindowSize: "~~(d1:DigitCharacter..)~~"x"~~(d2:DigitCharacter..) :> {ToExpression[d1],ToExpression[d2]}] // First },
                                    If[MatchQ[res, {_?NumberQ, _?NumberQ}], windowSize = res ];
                                ];
                            ];
                        ] // Quiet;   
                ];
                
                Echo["Fixme!!! WLW.wl"];
                Exit[-1];

                With[{hash = kernel["Hash"], s = Promise[] // First},
                    Then[Promise[s], Function[Null,
                        With[{win = win`WindowObj["Notebook" -> notebook, "Title"->windowTitle, ImageSize->windowSize, "Data" -> last["Data"], "Ref" -> last["Hash"] ]},
                            win["FirstTime"] = True;
                            Echo["project >> sending global event"];
                            EventFire[notebook, "OnWindowCreate", <|"Window"->win, "Client"->options["Client"]|>];
                            EventHandler[win["Hash"] // EventClone, {"Ready" -> Function[Null,
                                notebook["ModalsChannel"] = Null;
                                Echo["Modals set to Null"];

                                GenericKernel`Send[kernel,

                                    $ContextPath = Append[$ContextPath /. generated -> Nothing, "Global`"];
                                    $Context = "Global`";
                                    SetDirectory[Internal`Kernel`$savedDirectory];
                         
                                ];                            
                            ]
                            }];


                            EventFire[promise, Resolve, {StringJoin["/window?id=", win["Hash"] ], ""} ];
                        
                        ] ;                    
                    ] ];

                    GenericKernel`Send[kernel,
                        CoffeeLiqueur`Extensions`RemoteCells`Private`spinners[generated]["Cancel"];
                        Unset[CoffeeLiqueur`Extensions`RemoteCells`Private`spinners[generated] ];
                        EventFire[Internal`Kernel`RemoteEvent[ s ], Resolve, True ]; 
                    ];


                ];
            ];

            
        ] ];
    ];


    
    

    promise
] ]


End[];    
EndPackage[];
