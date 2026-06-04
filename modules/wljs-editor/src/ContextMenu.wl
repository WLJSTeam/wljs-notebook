BeginPackage["CoffeeLiqueur`Extensions`ContextMenu`", { 
    "CoffeeLiqueur`Notebook`Transactions`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CoffeeLiqueur`WLX`WebUI`",
    "CoffeeLiqueur`CUSockets`EventsExtension`",
    "CoffeeLiqueur`Extensions`EditorViewMinimal`",
    "CodeParser`"
}]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Begin["`Internal`"]

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"];
Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];


System`ProvidedOptions;
System`CommentBox;

CoffeeLiqueur`Extensions`ContextMenu`Internal`ReadSelectionInDoc;

checkLink[notebook_, logs_] := With[{},
    If[!(notebook["Evaluator"]["Kernel"]["State"] === "Initialized") || !TrueQ[notebook["WebSocketQ"] ],
        EventFire[logs, "Warning", "The kernel isn't ready or connected to a notebook yet. Try running a cell"];
        False
    ,
        True
    ]
]

evaluationInPlace[text_String, notebook_nb`NotebookObj, controls_, logs_, cli_, head_:""] := Module[{}, With[{p = Promise[], t = Transaction[], k = notebook["Evaluator"]["Kernel"]},
    t["Evaluator"] = CoffeeLiqueur`Extensions`Editor`Internal`WolframEvaluator;
    t["Data"] = StringTrim[text];

    With[{check = CheckSyntax[t["Data"] ]},

        If[! TrueQ[check],
            EventFire[logs, "Warning", check];
            Echo["Syntax Error!"];
            EventFire[p, Reject, $Failed];
            Return[p];
        ];
    ];

    If[StringLength[head] > 0,
        t["Data"] = StringJoin[head,"[",t["Data"],"]"];
    ];


    t["EvaluationContext"] = <|"Notebook" -> notebook["Hash"], "KernelWebSocket" -> notebook["KernelWebSocket"]|>;

    EventHandler[t, {
        (* capture successfull event of the last transaction to end the process *)  
        "Result" -> Function[data, 
            EventFire[p, Resolve, data];
        ]
    }];      

    GenericKernel`SubmitTransaction[k, t];
    p
] ]

processSelected[text_, notebook_, controls_, logs_, cli_, head_:""] := With[{},
    Echo["Evaluate in PLACE!!!!"];
    If[!checkLink[notebook, logs], Return[] ];
    Then[WebUIFetch[FrontEditorSelected["Get"], cli, "Format"->"JSON"],
        Function[text,
            Then[evaluationInPlace[text, notebook, controls, logs, cli, head], 
                Function[result,
                    WebUISubmit[FrontEditorSelected["Set", result["Data"] ], cli];
                ]
            ,
                Function[result,
                    Echo["Contextmenu >> evaluate in place >> Rejected!"];
                ]
            ];
        ]
    ];
]

processSelected[text_, notebook_, controls_, logs_, cli_, "Iconize"] := With[{},
    If[!checkLink[notebook, logs], Return[] ];
    Then[WebUIFetch[FrontEditorSelected["Get"], cli, "Format"->"JSON"],
        Function[text,
            With[{
                payload = If[TrueQ[CheckSyntax[StringTrim[text] ] ], {"Iconize", text}, {"BoxForm`IconizeSequence", "{"<>StringTrim[text]<>"}"}]
            },
            
                Then[evaluationInPlace[payload[[2]], notebook, controls, logs, cli, payload[[1]] ], 
                    Function[result,
                        WebUISubmit[FrontEditorSelected["Set", result["Data"] ], cli];
                    ]
                ,
                    Function[result,
                        Echo["Contextmenu >> evaluate in place >> Rejected!"];
                    ]
                ];
            ]
        ]
    ];
]

processSelected[text_, notebook_, controls_, logs_, cli_, "Speak"] := With[{},
    Echo["Evaluate in PLACE!!!!"];
    If[!checkLink[notebook, logs], Return[] ];
    Then[WebUIFetch[ReadSelectionInDoc[], cli, "Format"->"JSON"],
        Function[text,
            Then[evaluationInPlace[ToString[text, InputForm], notebook, controls, logs, cli, "Speak"], 
                Function[result,
                    Null
                ]
            ,
                Function[result,
                    Echo["Contextmenu >> evaluate in place >> Rejected!"];
                ]
            ];
        ]
    ];
]

processSelected[text_, notebook_, controls_, logs_, cli_, "Store"] := With[{uid = (Internal`NoWR`RandomWord[])<>"-"<>StringTake[CreateUUID[], 3]},
    Echo["Evaluate in PLACE!!!!"];
    If[!checkLink[notebook, logs], Return[] ];
    Then[WebUIFetch[FrontEditorSelected["Get"], cli, "Format"->"JSON"],
        Function[text,
            Then[evaluationInPlace[text, notebook, controls, logs, cli, "Function[data, NotebookWrite[NotebookStore[\""<>uid<>"\"] , data]]"], 
                Function[result,
                    WebUISubmit[FrontEditorSelected["Set",  "NotebookRead[NotebookStore[\""<>uid<>"\"]]"], cli];
                ]
            ,
                Function[result,
                    Echo["Contextmenu >> evaluate in place >> Rejected!"];
                ]
            ];
        ]
    ];
]

addListeners[notebook_nb`NotebookObj, controls_, logs_, cli_] := With[{},
    EventHandler[controls, {
        "evaluate_in_place" -> Function[Null,
            processSelected[text, notebook, controls, logs, cli]
        ],

        "iconize_selected" -> Function[Null,
            processSelected[text, notebook, controls, logs, cli, "Iconize"]
        ],

        "store_selected" -> Function[Null,
            processSelected[text, notebook, controls, logs, cli, "Store"]
        ],

        "simplify_selected" -> Function[Null,
            processSelected[text, notebook, controls, logs, cli, "Simplify"]
        ],

        "speak_selected" -> Function[Null,
            processSelected[text, notebook, controls, logs, cli, "Speak"]
        ],

        "comment_selected" -> Function[Null,
            Then[WebUIFetch[FrontEditorSelected["Get"], cli, "Format"->"JSON"], Function[text,
                With[{trimmed = StringTrim[text]},
                
                    If[StringTake[trimmed, 2] === "(*" && StringTake[trimmed, -2] === "*)",
                        With[{new = StringRiffle[{"(*BB[*)(", StringDrop[StringDrop[trimmed,1],-1], ")(*,*)(*", ToString[Compress[ProvidedOptions[CommentBox["#777"], "String"->True,  "HeadString"->"*", "TailString"->"*"]  ], InputForm], "*)(*]BB*)"}, ""]},
                            WebUISubmit[FrontEditorSelected["Set", new ], cli];
                        ]
                    ,
                        With[{
                            artificial = StringJoin["(*", trimmed, "*)"]
                        },
                            With[{new = StringRiffle[{"(*BB[*)(", StringDrop[StringDrop[artificial,1],-1], ")(*,*)(*", ToString[Compress[ProvidedOptions[CommentBox["#777"], "String"->True,  "HeadString"->"*", "TailString"->"*"]  ], InputForm], "*)(*]BB*)"}, ""]},
                                WebUISubmit[FrontEditorSelected["Set", new ], cli];
                            ]                        
                        ]
                    ]
                ]
            ] ];
        ],

        "highlight_selected" -> Function[Null,
            Then[WebUIFetch[FrontEditorSelected["Get"], cli, "Format"->"JSON"], Function[text,
                With[{new = StringRiffle[{"(*BB[*)(", text, ")(*,*)(*", ToString[Compress[Hold[StyleBox[Background->RGBColor[1.,1.,0.] ] ] ], InputForm], "*)(*]BB*)"}, ""]},
                    WebUISubmit[FrontEditorSelected["Set", new ], cli];
                ]
            ] ];
        ]                 
    }];
]

sniffer[ OptionsPattern[] ] := With[{logs = OptionValue["Messager"], notebook = OptionValue["Notebook"], controls = OptionValue["Controls"] // EventClone, event = OptionValue["Event"] // EventClone},
    EventHandler[event, {
        "Load" -> Function[Null,
            addListeners[notebook, controls, logs, Global`$Client];
            With[{cloned = EventClone[Global`$Client]},
      
                EventHandler[cloned, {
                    "Closed" -> Function[Null,
                        Echo["Context menu listener was destroyed"];
                        EventRemove[controls];
                        EventRemove[event];
                        EventRemove[cloned];
                    ]
                }]
            ];
        ]
    }];
    (* nothing to display *)
    ""
]

AppExtensions`TemplateInjection["Footer"] = sniffer;


CheckSyntax[str_String] := 
    Module[{syntaxErrors = Cases[CodeParser`CodeParse[str],(ErrorNode|AbstractSyntaxErrorNode|UnterminatedGroupNode|UnterminatedCallNode)[___],Infinity]},
        If[Length[syntaxErrors]=!=0 ,
            

            Return[StringRiffle[
                TemplateApply["Syntax error `` at line `` column ``",
                    {ToString[#1],Sequence@@#3[CodeParser`Source][[1]]}
                ]&@@@syntaxErrors

            , "\n"], Module];
        ];
        Return[True, Module];
    ];

End[]
EndPackage[]