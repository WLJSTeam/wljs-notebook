BeginPackage["CoffeeLiqueur`Extensions`MarkdownCells`", {
    "CoffeeLiqueur`Notebook`Transactions`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`Extensions`FrontendObject`",
    "CoffeeLiqueur`Extensions`Communication`",
    "CoffeeLiqueur`Extensions`Boxes`",
    "CoffeeLiqueur`Misc`Parallel`",
    "CoffeeLiqueur`Misc`WLJS`Transport`"
}];

TeXView::usage = "TeXView[expr_] renders expr as LaTeX equation"
TeXFormAsync::usage = "TeXFormAsync[expr_] converts expr to LaTeX string expression asynchronously"

Begin["`Private`"]

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];


MTrimmer = Function[str, 
StringReplace[str, {
  RegularExpression["\\A([\\n|\\t|\\r| ]*)([\\w|:|\\$|#|\\-|\\[|\\]|!|\\*|_|\\/|.|\\d]?)"] :> If[StringLength["$2"]===0, "", "$1"<>"$2"],
  RegularExpression["([\\w|\\$|#|*|\\*|\\-|\\[|!|\\]|:|\\/|.|\\d]?)([\\r|\\n| |\\t]*)\\Z"] :> If[StringLength["$1"]===0, "", "$1"<>"$2"]
}]
];

Internal`Kernel`EXJSEvaluator; (* JS function *)


postProcess[string_String] := Module[{drawings = {}}, With[{p = Promise[], win = CurrentWindow[]},
    (* extract Excalidraw drawings *)
    drawings =  StringCases[string, RegularExpression["!!\\[.*\\]"] ];

    If[Length[drawings] > 0,
        Then[FrontFetchAsync[Internal`Kernel`EXJSEvaluator[ StringDrop[#, 2] &/@ drawings ], "Window"->win], Function[transformed,
            EventFire[p, Resolve, StringReplace[string, (Rule @@ #)&/@Transpose[{drawings, StringJoin["\n<div class=\"text-center w-full\">", #, "</div>\n"] &/@ ({transformed} // Flatten)}] ] ];
        ] ];
    ,
        EventFire[p, Resolve, string];
    ];

    p
] ]

Internal`Kernel`MarkdownEvaluator = Function[t, With[{hash = CreateUUID[]},
        Block[{System`$EvaluationContext = Join[t["EvaluationContext"], <|"ResultCellHash" -> hash|>]},
            With[{result = ProcessString[t["Data"], "Localize"->False, "Trimmer"->MTrimmer]  // ReleaseHold},
                With[{string = If[ListQ[result], StringRiffle[Map[ToString, Select[result, (# =!= Null)&] ], ""], ToString[result] ]},

                    Then[postProcess[string], Function[processed,
                        EventFire[Internal`Kernel`RemoteEvent[ t["Hash"] ], "Result", <|"Data" -> StringDrop[StringDrop[processed,-8], 8], "Meta" -> Sequence["Display"->"markdown", "Hash"->hash] |> ];
                        EventFire[Internal`Kernel`RemoteEvent[ t["Hash"] ], "Finished", True];                    
                    ],
                    Function[processed,
                        EventFire[Internal`Kernel`RemoteEvent[ t["Hash"] ], "Result", <|"Data" -> processed, "Meta" -> Sequence["Display"->"markdown", "Hash"->hash] |> ];
                        EventFire[Internal`Kernel`RemoteEvent[ t["Hash"] ], "Finished", True];                      
                    ] ];

                ];
            ];
        ];
] ];



TeXView;

TeXView /: MakeBoxes[TeXView[expr_, opts___], WLXForm] := With[{o = CreateFrontEndObject[ TeXView[expr, opts] ]}, MakeBoxes[o, WLXForm] ]
TeXView /: MakeBoxes[TeXView[expr_, opts___], StandardForm] := With[{o = ViewBox[Null, TeXView[expr, opts] ]}, o ]

Options[TeXView] = {ImageSize->Automatic, "AnchorPoint"->"Center"};

TeXView[expr_String, opts: OptionsPattern[]] := With[{enc = URLEncode[expr]}, TeXView[Offload[URLDecode[enc]], opts]]

TeXFormAsync[all__] := (
  If[Length[Kernels[] ] == 0, LaunchKernels[1] ];

  ParallelSubmitFunctionAsync[Function[{args, cbk},
    cbk @ ToString[TeXForm @@ args, InputForm]
  ], {all}]
)


Unprotect[TraditionalForm]
DownValues[TraditionalForm] = {};

(* default render sucks, we replace it with true LaTeX *)
Unprotect[TraditionalForm]
DownValues[TraditionalForm] = {};
TraditionalForm[expr_] := BoxForm`TeXForm[expr]

BoxForm`TeXForm /: MakeBoxes[BoxForm`TeXForm[expr_], form_] := With[{tex = TeXForm[expr]//TeXView},
  MakeBoxes[tex, form]
]

End[]

EndPackage[]



