BeginPackage["CoffeeLiqueur`Extensions`WLXCells`", {
    "CoffeeLiqueur`Notebook`Transactions`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`Extensions`FrontendObject`",
    "CoffeeLiqueur`Extensions`Communication`"
}];


Begin["`Private`"]

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];

CoffeeLiqueur`Extensions`WLXCells`Private`dispose;

Internal`Kernel`WLXEvaluator = Function[t,  With[{hash = CreateUUID[]},
        Block[{System`$EvaluationContext = Join[t["EvaluationContext"], <|"ResultCellHash" -> hash|>]},
            With[{result = ProcessString[t["Data"], "Localize"->False]  // ReleaseHold},
                With[{string = If[ListQ[result], StringRiffle[Map[ToString, Select[result, (# =!= Null)&]], ""], ToString[result] ]},
                    EventFire[Internal`Kernel`RemoteEvent[ t["Hash"] ], "Result", <|"Data" -> string, "Meta" -> Sequence["Display"->"wlx", "Hash"->hash] |> ];
                    EventFire[Internal`Kernel`RemoteEvent[ t["Hash"] ], "Finished", True];
                ];
            ];
        ];
    ]
];



System`WLXForm;

(* convert explicitly to WLX form string *)
WLXForm[expr_ ] := StringTrim[ToStringRiffle[ ToBoxes[expr, WLXForm] ] ]

(*CoffeeLiqueur`WLX`Private`IdentityTransform[EventObject[assoc_]] := If[KeyExistsQ[assoc, "View"], CreateFrontEndObject[ assoc["View"]], EventObject[assoc] ]*)
EventObject /: MakeBoxes[EventObject[assoc_], WLXForm] := If[KeyExistsQ[assoc, "View"],
    With[{o = CreateFrontEndObject[assoc["View"]]},
        MakeBoxes[o, WLXForm]
    ]
,
    EventObject[assoc]
]

Unprotect[PageBreakAbove]
Unprotect[PageBreakBelow]

PageBreakAbove /: MakeBoxes[PageBreakAbove, WLXForm] := "<div class=\"print:breakabove\"> </div>"
PageBreakBelow /: MakeBoxes[PageBreakBelow, WLXForm] := "<div class=\"print:breakbelow\"> </div>"

CoffeeLiqueur`WLX`Private`IdentityTransform[x_] := ToBoxes[x , WLXForm]

End[]

EndPackage[]



