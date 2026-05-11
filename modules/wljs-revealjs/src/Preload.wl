BeginPackage["CoffeeLiqueur`Extensions`RevealCells`", {
    "CoffeeLiqueur`Notebook`Transactions`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`Extensions`FrontendObject`",
    "CoffeeLiqueur`Extensions`Communication`"
}];


Begin["`Private`"]

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];


Internal`Kernel`EXJSEvaluator; (* JS function *)


postProcess[string_String] := Module[{drawings = {}}, With[{p = Promise[], win = CurrentWindow[]},
    (* extract Excalidraw drawings *)
    drawings =  StringCases[string, RegularExpression["!!\\[.*\\]"] ];

    If[Length[drawings] > 0,
        Then[FrontFetchAsync[Internal`Kernel`EXJSEvaluator[ StringDrop[#, 2] &/@ drawings ], "Window"->win], Function[transformed,
            EventFire[p, Resolve, StringReplace[string, (Rule @@ #)&/@Transpose[{drawings, StringJoin["\n<div class=\"text-center w-full\">", #, "</div>\n"] &/@ ({transformed} // Flatten)} ] ] ];
        ] ];
    ,
        EventFire[p, Resolve, string];
    ];

    p
] ]

MTrimmer = Function[str, 
StringReplace[str, {
  RegularExpression["\\A([\\n|\\t|\\r| ]*)([\\w|:|\\$|#|\\-|\\[|\\]|!|\\*|_|\\/|.|\\d]?)"] :> If[StringLength["$2"]===0, "", "$1"<>"$2"],
  RegularExpression["([\\w|\\$|#|*|\\*|\\-|\\[|!|\\]|:|\\/|.|\\d]?)([\\r|\\n| |\\t]*)\\Z"] :> If[StringLength["$1"]===0, "", "$1"<>"$2"]
}]
];

Internal`Kernel`RevealEvaluator = Function[t, With[{hash = CreateUUID[]},
        Block[{System`$EvaluationContext = Join[t["EvaluationContext"], <|"ResultCellHash" -> hash|>]},
            With[{result = ProcessString[t["Data"], "Localize"->False, "Trimmer"->MTrimmer]  // ReleaseHold},
                With[{string = If[ListQ[result], StringRiffle[Map[ToString, Select[result, (# =!= Null)&]], ""], ToString[result] ]},


                    Then[postProcess[string], Function[processed,
                        EventFire[Internal`Kernel`RemoteEvent[ t["Hash"] ], "Result", <|"Data" -> processed, "Meta" -> Sequence["Display"->"slide", "Hash"->hash] |> ];
                        EventFire[Internal`Kernel`RemoteEvent[ t["Hash"] ], "Finished", True];                  
                    ],
                    Function[processed,
                        EventFire[Internal`Kernel`RemoteEvent[ t["Hash"] ], "Result", <|"Data" -> processed, "Meta" -> Sequence["Display"->"slide", "Hash"->hash] |> ];
                        EventFire[Internal`Kernel`RemoteEvent[ t["Hash"] ], "Finished", True];                     
                    ] ];


                ];
            ];
        ];
] ];


End[]

EndPackage[]



