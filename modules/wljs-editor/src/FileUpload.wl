BeginPackage["CoffeeLiqueur`Extensions`FileUploader`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CoffeeLiqueur`Notebook`Transactions`",
    "CoffeeLiqueur`Extensions`EditorViewMinimal`"
}]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];
Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"];

Begin["`Private`"]


askUserToChoose[cellId_, list_] := With[{notebook = cell`HashMap[cellId]["Notebook"], p = Promise[]},
    Echo["File uploader >> upload choise"];
    Echo[cellId];
    Echo[list];
    EventFire[notebook["ModalsChannel"], "SelectBox", <|"Promise"->p, "title"->"File options", "message"->"Please, choose one above", "list"->list|>];
    p
];

checkLink[notebook_, logs_] := With[{},
    If[!(notebook["Evaluator"]["Kernel"]["State"] === "Initialized") || !TrueQ[notebook["WebSocketQ"] ],
        EventFire[logs, "Warning", "Kernel is not ready or not connected to a notebook"];
        False
    ,
        True
    ]
]

evaluationInPlace[text_String, notebook_nb`NotebookObj] := Module[{}, With[{p = Promise[], t = Transaction[], k = notebook["Evaluator"]["Kernel"]},
    t["Evaluator"] = CoffeeLiqueur`Extensions`Editor`Internal`WolframEvaluator;
    t["Data"] = StringTrim[text];


    t["EvaluationContext"] = Join[notebook["EvaluationContext"], <|"Notebook" -> notebook["Hash"]|>];

    EventHandler[t, {
        (* capture successfull event of the last transaction to end the process *)  
        "Result" -> Function[data, 
            EventFire[p, Resolve, data];
        ]
    }];      

    GenericKernel`SubmitTransaction[k, t];
    p
] ]

pasteCrappyContent1[cli_, controls_, data_, modals_, log_] := Module[{current}, With[{
    cell = cell`HashMap[data["CellUID"] ],
    content = URLDecode[data["Content"] ]
},
    With[{transformed = ToString[ToExpression[content, StandardForm, HoldForm], InputForm]},
       WLJSTransportSend[FrontEditorSelected["Set", stripHoldForm[transformed] ], cli];
    ]
] ]

stripHoldForm[transformed_] := StringDrop[StringDrop[transformed, StringLength["HoldForm["] ], -1]

pasteCrappyContent2[cli_, controls_, data_, modals_, log_] := Module[{current}, With[{
    cell = cell`HashMap[data["CellUID"] ],
    content = URLDecode[data["Content"] ]
}, With[{notebook = cell["Notebook"]}, 


    If[checkLink[notebook, log],
        With[{
            expr = With[{u = ToExpression[content, InputForm, Hold]}, 
                MakeBoxes[u, StandardForm]
            ],
            p = Promise[]
        },
            GenericKernel`Send[notebook["Evaluator"]["Kernel"],  (  
                Needs["BoxesConverter`"->None];
                EventFire[Internal`Kernel`RemoteEvent[ p // First ], Resolve, 
                  With[{},
                    TimeConstrained[BoxesConverter`WLJSDisplayForm[expr], 10, "$Failed"]
                  ]
                ];   
            )];

            Then[p, Function[c,
                If[FailureQ[c],
                    WLJSTransportSend[FrontEditorSelected["Set", ""], cli]; 
                    Return[];
                ];
                WLJSTransportSend[FrontEditorSelected["Set", StringReplace[c, StartOfString~~"Hold["~~(a__)~~"]"~~EndOfString :> a] ], cli];
            ] ]
        ]   
    ,
    
        Null;   
    ]
] ] ]

(* I have no fucking idea where it is comming from. But for sure not from WLJS *)
filterBugs[s_String] := StringReplace[s, {
    "Most[;, SyntaxForm -> a;]" -> ";"
}]

pasteCells[cli_, controls_, data_, modals_, log_] := Module[{current}, With[{
    cell = cell`HashMap[data["CellUID"] ],
    list = Uncompress[URLDecode[data["Content"] ] ]
},
    With[{notebook = cell["Notebook"]},
        If[!ListQ[list],
            EventFire[log, "Warning", "Broken cell structure"]
            Return[];
        ];

        current = cell;
        Map[Function[content,
            current = cell`CellObj["Notebook"->notebook, "Data"->content["Data"], "Type"->content["Type"], "Display"->content["Display"], "After"->current];  
        ], list];
    ]
] ]

chunks = <||>;

processRequest[cli_, controls_, data_, __] := With[{channel = data["Channel"]},
    Echo["Drop request >> "];
    Module[{count = data["Length"], files = <||>, finished},
        EventHandler[channel, {
            "Chunk" -> Function[payload,

             With[{name = payload["Name"]},
                    If[!KeyExistsQ[chunks, name], chunks[name] = <||>];

                    chunks[name] = Join[chunks[name], <|payload["Chunk"] -> payload["Data"] |> ];
                    Echo[StringTemplate[  "Received chunk: `` out of ``"] @@ {payload["Chunk"], payload["Chunks"]} ];

                    If[Length[Keys[chunks[name] ] ] === payload["Chunks"],
                        With[{merged = StringJoin @@ (KeySort[chunks[name] ] // Values)},
                            chunks[name] = .;
                            With[{safeName = StringReplace[FileBaseName[name], " "->"-"]<>"-"<>StringTake[CreateUUID[], 3]<>"."<>FileExtension[name]},
                                files[safeName] = merged // BaseDecode;
                            ];
                            count--;
                            If[count === 0, 
                                finished;
                                EventRemove[channel];
                            ]
                        ]
                    ,
                        Echo[StringTemplate[  "Waiting for chunks: `` out of ``"] @@ {Length[Keys[chunks[name] ] ], payload["Chunks"]} ];
                    ];   
             ];         
            
            ],


            "File" -> Function[payload,


                    With[{name = payload["Name"]},
                        With[{safeName = StringReplace[FileBaseName[name], " "->"-"]<>"-"<>StringTake[CreateUUID[], 3]<>"."<>FileExtension[name]},
                            files[safeName] = payload["Data"] // BaseDecode;
                        ]
                    ];
                    
                    count--;
                    If[count === 0, 
                        finished;
                        EventRemove[channel];
                    ]
            ]
        }];

        finished := With[{path = DirectoryName[ data["Notebook"]["Path"] ]},
            If[!DirectoryQ[FileNameJoin[{path, "attachments"}] ], CreateDirectory[FileNameJoin[{path, "attachments"}] ] ];
            Echo["Uploading files..."];
            (
                With[{filename = FileNameJoin[{path, "attachments", # }]},
                    BinaryWrite[filename, files[#] ] // Close;
                ]
            ) &/@ Keys[files];
            Echo["Done!"];

            pasteFileNames[data["CellType"], cli, files];
            
        ];
    ];
]

pasteFileNames["wl", cli_, files_] := With[{},
    WLJSTransportSend[If[Length[Keys[files] ] === 1,
        FrontEditorSelected["Set", "Import[FileNameJoin["<>ToString[{"attachments", #} &@ (Keys[files] // First), InputForm]<>"]]" ]
    ,
        FrontEditorSelected["Set", "Import /@ FileNameJoin /@ "<>ToString[ FileNameJoin[{"attachments", #}] &/@ Keys[files], InputForm] ]
    ], cli]
]

pasteFileNames["md", cli_, files_] := With[{},
    WLJSTransportSend[
        FrontEditorSelected["Set", "\n"<>StringRiffle[StringJoin["![](/attachments/", URLEncode[#], ")"] &/@ Keys[files], "\n"]<>"\n" ]
    , cli]
]


pasteFilePaths[cli_, controls_, data_, modals_, messager_] := Module[{files = URLDecode /@ ImportString[URLDecode[data["JSON"] ], "RawJSON"]},
    If[data["CellType"] =!= "wl", Return[Null, Module] ];
    WLJSTransportSend[If[Length[files ] === 1,
        FrontEditorSelected["Set", "Import["<>ToString[files[[1]], InputForm]<>"]" ]
    ,
        FrontEditorSelected["Set", "Import /@ "<>ToString[ files, InputForm] ]
    ], cli]    
]

insertFilePaths[cli_, controls_, data_, modals_, messager_] := Module[{files = URLDecode /@ ImportString[URLDecode[data["JSON"] ], "RawJSON"]},
    If[data["CellType"] =!= "wl", Return[Null, Module] ];
    WLJSTransportSend[If[Length[files ] === 1,
        FrontEditorSelected["Set", ""<>ToString[files[[1]], InputForm]<>"" ]
    ,
        FrontEditorSelected["Set", ""<>ToString[ files, InputForm] ]
    ], cli]    
]



(* drop and paste events *)
controlsListener[OptionsPattern[]] := With[{messager = OptionValue["Messager"], secret = OptionValue["Event"], controls = OptionValue["Controls"], appEvents = OptionValue["AppEvent"], modals = OptionValue["Modals"]},
    EventHandler[EventClone[controls], {
        "CM:DropEvent" -> Function[data, processRequest[Global`$Client, controls, data, modals, messager] ],
        "CM:PasteEvent" -> Function[data, processRequest[Global`$Client, controls, data, modals, messager] ],
        "CM:PasteCellEvent" -> Function[data, pasteCells[Global`$Client, controls, data, modals, messager] ],
        "CM:PasteCrappy1Event" -> Function[data, pasteCrappyContent1[Global`$Client, controls, data, modals, messager] ],
        "CM:PasteCrappy2Event" -> Function[data, pasteCrappyContent2[Global`$Client, controls, data, modals, messager] ],
        "CM:DropFilePaths" -> Function[data, pasteFilePaths[Global`$Client, controls, data, modals, messager] ],
        "CM:InsertFilePaths" -> Function[data, insertFilePaths[Global`$Client, controls, data, modals, messager] ]
    }];

    ""
]

AppExtensions`TemplateInjection["Footer"] = controlsListener;

End[]
EndPackage[]
