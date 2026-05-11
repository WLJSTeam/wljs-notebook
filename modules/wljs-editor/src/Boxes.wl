BeginPackage["CoffeeLiqueur`Extensions`Boxes`", {
  "CoffeeLiqueur`Misc`Events`", 
  "CoffeeLiqueur`Extensions`FrontendObject`",
  "CoffeeLiqueur`Extensions`EditorView`"
}]

(* has to be system, since it is cross-required everywhere*)

System`ViewBox;
System`BoxBox;


ViewBox::usage = "ViewBox[expr_, decorator_] low-level box used by InterpretationBox. It keeps `expr` in its original form, while visially covers it with DOM element to which `decorator` expression will be attached and executed"

BoxBox::usage = "DEPRICATED"

Begin["`Tools`"]

InnerExpression::usage = "ViewBox`InnerExpression[expr_] sets content of a view box being evaluated inside the container"
OuterExpression::usage = "ViewBox`OuterExpression[expr_] sets content of a th whole view box being evaluated inside the container"

notString[s_] := !StringQ[s]
InnerExpression[s_?notString] := InnerExpression[ ToString[s, StandardForm] ]
OuterExpression[s_?notString] := OuterExpression[ ToString[s, StandardForm] ]


End[]


Begin["`Private`"]

System`ProvidedOptions;

ViewBox[expr_, display_, OptionsPattern[] ] := With[{event = OptionValue["Event"]}, If[event === Null,
  RowBox[{"(*VB[*)(", ToString[expr, InputForm], ")(*,*)(*", ToString[Compress[Hold[display] ], InputForm], "*)(*]VB*)"}]
,
  RowBox[{"(*VB[*)(", ToString[expr, InputForm], ")(*,*)(*", ToString[Compress[ProvidedOptions[Hold[display], "Event"->event ] ], InputForm], "*)(*]VB*)"}]
] ]

ViewBox[rowbox_RowBox, display_, OptionsPattern[] ] := With[{event = OptionValue["Event"]}, If[event === Null,
  RowBox[{"(*VB[*)(", rowbox, ")(*,*)(*", ToString[Compress[Hold[display] ], InputForm], "*)(*]VB*)"}]
,
  RowBox[{"(*VB[*)(", rowbox, ")(*,*)(*", ToString[Compress[ProvidedOptions[Hold[display], "Event"->event ] ], InputForm], "*)(*]VB*)"}]
] ]

Options[ViewBox] = {"Event" -> Null}



(* DEPRICATED *)
BoxBox[expr_, display_, OptionsPattern[] ] := With[{event = OptionValue["Event"]}, 
  If[OptionValue[Head] =!= Null,
    With[{dp = ProvidedOptions[Hold[display], "Head"->ToString[OptionValue[Head], InputForm], "Event"->event]},
      RowBox[{"(*BB[*)(", ToString[OptionValue[Head], InputForm], "[", expr, "]", ")(*,*)(*", ToString[Compress[dp], InputForm], "*)(*]BB*)"}]
    ]
  ,
    If[OptionValue["String"] === True,
      With[{dp = ProvidedOptions[Hold[display], "String"->True, "Event"->event]},
        RowBox[{"(*BB[*)(", expr, ")(*,*)(*", ToString[Compress[dp], InputForm], "*)(*]BB*)"}]
      ]
    ,
      If[event === Null,
        RowBox[{"(*BB[*)(", expr, ")(*,*)(*", ToString[Compress[Hold[display] ], InputForm], "*)(*]BB*)"}]
      ,
        With[{dp = ProvidedOptions[Hold[display], "Event"->event]},
          RowBox[{"(*BB[*)(", expr, ")(*,*)(*", ToString[Compress[Hold[dp] ], InputForm], "*)(*]BB*)"}]
        ]
      ]
    ]
  ]
]


Options[BoxBox] = {Head -> Null, "String"->False, "Event"->Null}




End[]
EndPackage[]

$ContextAliases["ViewBox`"] = "CoffeeLiqueur`Extensions`Boxes`Tools`";