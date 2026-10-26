BeginPackage["BoxesConverter`", {
  "CoffeeLiqueur`Extensions`FrontendObject`"
}]

WLJSDisplayForm;

Begin["`Private`"]

System`ViewDecorator;
System`ProvidedOptions;


SetAttributes[WLJSDisplayForm, HoldAllComplete]

(* The notebook importer supplies a held box tree prepared on the master.
   In particular, no Cell or BoxData is evaluated on the WLJS kernel. *)
WLJSDisplayForm[HoldComplete[a_]] := WLJSDisplayForm[a]

WLJSDisplayForm[HoldForm[a_] ] := WLJSDisplayForm[a]

WLJSDisplayForm[SubsuperscriptBox[a_,b_, c_] ] := WLJSDisplayForm[SuperscriptBox[SubscriptBox[a,b], c] ]

WLJSDisplayForm[InterpretationBox[_, c_CompressedData, ___] ] := With[{
  u = CreateFrontEndObject[Compress[c] ] // First
},
  With[{r = RowBox[{"Uncompress[", "FrontEndRef[\"", u, "\"]]"}]},
    WLJSDisplayForm[r]
  ]
]

WLJSDisplayForm[TemplateBox[{g_GraphicsBox, ___}, ___] ] := WLJSDisplayForm[g]

(* Standard Mathematica Row boxes use this template rather than RowBox.
   WLJS displays native Rows using a one-row grid as well. *)
WLJSDisplayForm[TemplateBox[items_List, "RowDefault", ___]] :=
  WLJSDisplayForm[GridBox[{items}]]

WLJSDisplayForm[TemplateBox[{_, separator_, items___}, "RowWithSeparators", ___]] :=
  With[{values = Map[WLJSDisplayForm, Unevaluated[{items}]], sep = WLJSDisplayForm[separator]},
    With[{row = Riffle[values, sep]}, WLJSDisplayForm[GridBox[{row}]]]
  ]

WLJSDisplayForm[RowBox[{
  SubsuperscriptBox["\[Integral]", m_, x_], 
  RowBox[{
   b_, 
   RowBox[{"\[DifferentialD]", 
    v_}]}]}] ] := With[{
  body = WLJSDisplayForm[b],
  var = WLJSDisplayForm[v],
  min = WLJSDisplayForm[m],
  max = WLJSDisplayForm[x]
},
    With[{dp = ViewDecorator["Integrate", 1, True]},
      With[{r = RowBox[{"(*TB[*)Integrate[(*|*)", body, "(*|*), {(*|*)", var, "(*|*),(*|*)",min,"(*|*),(*|*)",max,"(*|*)}](*|*)(*", Compress[dp], "*)(*]TB*)"}]},
        WLJSDisplayForm[r]
      ]
    ]
]

WLJSDisplayForm[RowBox[{SubsuperscriptBox["\[Sum]", RowBox[{sym_, "=", start_}], end_], rest_}] ] := With[{
    symbol = WLJSDisplayForm[sym],
    startIndex = WLJSDisplayForm[start],
    endIndex = WLJSDisplayForm[end],
    body = WLJSDisplayForm[rest],
    dp = ViewDecorator["Sum", 1, True]
},
    With[{
        result = RowBox[{"(*TB[*)Sum[(*|*)", body, "(*|*), {(*|*)", symbol, "(*|*),(*|*)", startIndex, "(*|*),(*|*)", endIndex, "(*|*)}](*|*)(*", Compress[dp], "*)(*]TB*)"}]
    },
        WLJSDisplayForm[result]
    ]
]

WLJSDisplayForm[RowBox[{UnderoverscriptBox["\[Sum]", RowBox[{sym_, "=", start_}], end_], rest_}] ] := With[{
    symbol = WLJSDisplayForm[sym],
    startIndex = WLJSDisplayForm[start],
    endIndex = WLJSDisplayForm[end],
    body = WLJSDisplayForm[rest],
    dp = ViewDecorator["Sum", 1, True]
},
    With[{
        result = RowBox[{"(*TB[*)Sum[(*|*)", body, "(*|*), {(*|*)", symbol, "(*|*),(*|*)", startIndex, "(*|*),(*|*)", endIndex, "(*|*)}](*|*)(*", Compress[dp], "*)(*]TB*)"}]
    },
        WLJSDisplayForm[result]
    ]
]

WLJSDisplayForm[
  FractionBox[
    RowBox[{SuperscriptBox["\[PartialD]", n_], sym_}],
    RowBox[terms___],
    ___
  ]
] := Module[
  {
    symbol = WLJSDisplayForm[sym],
    deg = WLJSDisplayForm[n],
    cleanedTerms,
    vars
  },
  

  (* Remove \[ThinSpace] *)
  cleanedTerms = DeleteCases[{terms}//Flatten, "\[ThinSpace]"];

  (* Extract list of {var, pow} pairs *)
  vars = cleanedTerms /. 
    RowBox[{"\[PartialD]", SuperscriptBox[var_, pow_]}] :> 
      RowBox[{"{", WLJSDisplayForm[var], ",", WLJSDisplayForm[pow], "}"}];

  (* Ensure empty matches don't sneak in *)
  vars = DeleteCases[vars, {} | Null];

  (* Final expression *)
  With[{r = RowBox[{" D[", symbol, ",", Sequence @@ Riffle[vars, ","] , "] "}]}, 
    WLJSDisplayForm[
      r
    ] 
  ]
]

WLJSDisplayForm[RowBox[{
           SubscriptBox["\[PartialD]", sub_ ], 
           rest_}] ] := With[{
                subSymbols = WLJSDisplayForm[sub],
                body = WLJSDisplayForm[rest]
           },
           
           With[{
                result = RowBox[{"D[", body, ", ", subSymbols, "]"}]
           },
                WLJSDisplayForm[result]
           ]
] 

WLJSDisplayForm[RowBox[{"\[LeftAngleBracket]", a_, "\[VerticalSeparator]"}] ] := With[{
  c = WLJSDisplayForm[a]
},
  With[{res = With[{dp = ProvidedOptions[ViewDecorator["Bra"], "Head"->"Bra"]}, RowBox[{"(*BB[*)(Bra[", c, "])(*,*)(*", ToString[Compress[dp], InputForm], "*)(*]BB*)"}]]},
    WLJSDisplayForm[res]
  ]
]

WLJSDisplayForm[RowBox[{sym_, "\[LeftDoubleBracket]", p_, "\[RightDoubleBracket]"}] ] := With[{
 a = WLJSDisplayForm[p],
 symbol = WLJSDisplayForm[sym]
},
  With[{result = RowBox[{symbol, "[[", a, "]]"}]},
    WLJSDisplayForm[result]
  ]
]

WLJSDisplayForm[RowBox[{"\[VerticalSeparator]", a_, "\[RightAngleBracket]"}] ] := With[{
  c = WLJSDisplayForm[a]
},
  With[{res = With[{dp = ProvidedOptions[ViewDecorator["Ket"], "Head"->"Ket"]}, RowBox[{"(*BB[*)(Ket[", c, "])(*,*)(*", ToString[Compress[dp], InputForm], "*)(*]BB*)"}]]},
    WLJSDisplayForm[res]
  ]
]

WLJSDisplayForm[TemplateBox[{_, dateBoxes_}, "DateObject", ___]] := Module[{held},
  held = Quiet[Check[ToExpression[Unevaluated[dateBoxes], StandardForm, HoldComplete], $Failed]];
  Replace[held, {
    HoldComplete[date_] :> ToString[Unevaluated[date], InputForm],
    _ :> "(*Unsupported date box*)"
  }]
]


WLJSDisplayForm[RowBox[l_List] ] := StringRiffle[Map[WLJSDisplayForm, Unevaluated[l]], ""]

WLJSDisplayForm[any_String] := any;

WLJSDisplayForm[FormBox[b_, _]] := WLJSDisplayForm[b]

(* InterpretationBox contains the input expression, which must never be evaluated
   while importing an untrusted notebook. *)
WLJSDisplayForm[InterpretationBox[_, expr_, ___] ] := ToString[Unevaluated[expr], InputForm]


WLJSDisplayForm[g_GraphicsBox | g_Graphics3DBox | g_RasterBox] := Module[{held},
  held = Quiet[Check[ToExpression[Unevaluated[g], StandardForm, HoldComplete], $Failed]];
  Replace[held, {
    HoldComplete[expr_] :> ToString[Unevaluated[expr], InputForm],
    _ :> "(*Unsupported graphics box*)"
  }]
]


WLJSDisplayForm[g_] := "(*Unsupported Box*)";

WLJSDisplayForm["\[IndentingNewLine]"] := "\n";

WLJSDisplayForm["\[Rule]"] := " -> ";

WLJSDisplayForm[FractionBox[s_,n_, ___]] := With[{
  a = WLJSDisplayForm[s],
  b = WLJSDisplayForm[n]
},
  With[{r = RowBox[{"(*FB[*)((", a, ")(*,*)/(*,*)(", b, "))(*]FB*)"}]},
    WLJSDisplayForm[r]
  ]
]

WLJSDisplayForm[SqrtBox[b_, ___]] := With[{
  a = WLJSDisplayForm[b]
},
  With[{r = RowBox[{"(*SqB[*)Sqrt[", a, "](*]SqB*)"}]},
    WLJSDisplayForm[r]
  ]
]

WLJSDisplayForm[SuperscriptBox[s_, n_]] := With[{
  a = WLJSDisplayForm[s],
  b = WLJSDisplayForm[n]
},
  With[{r = RowBox[{"(*SpB[*)Power[", a, "(*|*),(*|*)",  b, "](*]SpB*)"}]},
    WLJSDisplayForm[r]
  ]
]

WLJSDisplayForm[SuperscriptBox[s_, n_, _]] := With[{
  a = WLJSDisplayForm[s],
  b = WLJSDisplayForm[n]
},
  With[{r = RowBox[{"(*SpB[*)Power[", a, "(*|*),(*|*)",  b, "](*]SpB*)"}]},
    WLJSDisplayForm[r]
  ]
]

WLJSDisplayForm[SuperscriptBox[s_, "\[Prime]" | ",", _]] := With[{
  a = WLJSDisplayForm[s]
},
  With[{r = RowBox[{a, "'"}]},
    WLJSDisplayForm[r]
  ]
]


WLJSDisplayForm[SubscriptBox[s_, n_]] := With[{
  a = WLJSDisplayForm[s],
  b = WLJSDisplayForm[n]
},
  With[{r = RowBox[{"(*SbB[*)Subscript[", a, "(*|*),(*|*)",  b, "](*]SbB*)"}]},
    WLJSDisplayForm[r]
  ]
]

WLJSDisplayForm[SubscriptBox[s_, n_, _]] := With[{
  a = WLJSDisplayForm[s],
  b = WLJSDisplayForm[n]
},
  With[{r = RowBox[{"(*SbB[*)Subscript[", a, "(*|*),(*|*)",  b, "](*]SbB*)"}]},
    WLJSDisplayForm[r]
  ]
]



WLJSDisplayForm[d_DynamicModuleBox] := "";
WLJSDisplayForm[TooltipBox[display_, ___]] := WLJSDisplayForm[display];
WLJSDisplayForm[TemplateBox[<|"color" -> color_RGBColor, ___|>, "RGBColorSwatchTemplate", ___]] :=
  ToString[Unevaluated[color], InputForm];
WLJSDisplayForm[StyleBox[a_, ___]] := WLJSDisplayForm[a]
WLJSDisplayForm[TagBox[a_, ___]] := WLJSDisplayForm[a]

WLJSDisplayForm[GridBox[rawList_List, opts___]] := With[{result = With[{
  list = Map[WLJSDisplayForm, Unevaluated[rawList]]
}, With[{sorted = Association[ List[opts] ]},
If[!KeyExistsQ[sorted, GridBoxDividers],
If[Lookup[sorted, DefaultBaseStyle, False] === "Matrix",
 RowBox@(Join @@ (Join[{{"(*GB[*){"}}, 
     Riffle[
      (Join[{"{"}, Riffle[#, "(*|*),(*|*)"], {"}"}] & /@ list), 
      If[Length[list] > 1, {{"(*||*),(*||*)"}}, {}] ], {{StringJoin["}(*||*)(*", Compress[ViewDecorator["Matrix"]  ], "*)(*]GB*)"]}}]))
,
 RowBox@(Join @@ (Join[{{"(*GB[*){"}}, 
     Riffle[
      (Join[{"{"}, Riffle[#, "(*|*),(*|*)"], {"}"}] & /@ list), 
      If[Length[list] > 1, {{"(*||*),(*||*)"}}, {}] ], {{"}(*]GB*)"}}]))

]
,
With[{val = sorted[GridBoxDividers]},
 RowBox@(Join @@ (Join[{{"(*GB[*){"}}, 
     Riffle[
      (Join[{"{"}, Riffle[#, "(*|*),(*|*)"], {"}"}] & /@ list), 
      If[Length[list] > 1, {{"(*||*),(*||*)"}}, {}] ], {{StringJoin["}(*||*)(*", Compress[ViewDecorator["Grid", GridBoxDividers -> val ]  ], "*)(*]GB*)"]}}]))
]
] ] ]},
  WLJSDisplayForm[result]
]

WLJSDisplayForm[l_List] := Map[WLJSDisplayForm, Unevaluated[l]]

WLJSDisplayForm[SuperscriptBox[any_, "\[Transpose]"]] := With[{a = WLJSDisplayForm[any]},
  With[{r = RowBox[{
    "Transpose[", a, "]"
  }]},
    WLJSDisplayForm[r]
  ]
]

End[]

EndPackage[]
