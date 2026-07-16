Begin["CoffeeLiqueur`Extensions`Boxes`Workarounds`"]



(* Workarounds for Mathematica's Boxes *)
(* The road of pain, blood and tears *)


System`ViewDecorator;
System`ProvidedOptions;

(* ::: Short reimplementation ::: *)
(* it messes up with formatting and cuts comments used in WLJS *)

(* [TODO]: Use normal Skeleton[] so that Short can work as InputForm! *)

Unprotect[Short]
ClearAll[Short]

Short /: MakeBoxes[Short[expr_?AtomQ, ___], StandardForm | TraditionalForm] := (
  If[NumericQ[BoxForm`$accumulatorSize], BoxForm`$accumulatorSize += ByteCount[expr] ];
  
  RowBox[{"<<", ToString[Head[expr], InputForm], ">>"}]
) /; ByteCount[expr] > 1024

Short /: MakeBoxes[Short[expr_?AtomQ, ___], StandardForm | TraditionalForm] := With[{boxes = MakeBoxes[expr, StandardForm]},
    If[NumericQ[BoxForm`$accumulatorSize], BoxForm`$accumulatorSize += ByteCount[boxes] ];
  boxes
]

Short /: MakeBoxes[Short[expr_, ___], StandardForm | TraditionalForm] := With[{boxes = MakeBoxes[expr, StandardForm]},
    If[NumericQ[BoxForm`$accumulatorSize], BoxForm`$accumulatorSize += ByteCount[boxes] ];
  boxes
]

BoxForm`shortenHeadAndBody[List, args_, sep_:""] := RowBox[Join[{"{"<>sep}, Riffle[args, ","<>sep], {StringReplace[sep, " "->""]<>"}"}] ]

BoxForm`shortenHeadAndBody[Plus, args_, sep_:""] := RowBox[Riffle[args, "+"<>sep] ]

BoxForm`shortenHeadAndBody[any_, args_, sep_:""] := RowBox[Join[{ToString[any, InputForm], "["<>sep}, Riffle[args, ","<>sep], {StringReplace[sep, " "->""]<>"]"}] ]

Short /: MakeBoxes[Short[expr_], StandardForm | TraditionalForm] := Module[{row = {}, index = 1}, With[{
  process :=   (While[BoxForm`$accumulatorSize < 1024 && index <= Length[expr],
    With[{element = Extract[expr, index]},
      With[{elementBox = MakeBoxes[Short[element, 1], StandardForm]},
        AppendTo[row, elementBox];
        index++;
      ]
    ]
  ];

  If[index == Length[expr]+1,
    BoxForm`shortenHeadAndBody[Head[expr], row]
  ,
    If[Length[row] == 0,
    RowBox[Join[{"<<", ToString[Head[expr], InputForm], ">>"}] ]
    ,
    BoxForm`shortenHeadAndBody[Head[expr], Join[row, {RowBox[{"<<", ToString[Length[expr] - index+1], ">>"}]}] ]
    ]
  ])
}, 

If[NumericQ[BoxForm`$accumulatorSize],
  process
,

  Block[{BoxForm`$accumulatorSize = 0},
    process
  ]
] ]
] /; ByteCount[expr] > 1024

Short /: MakeBoxes[Short[expr_, 1], form: StandardForm | TraditionalForm] := MakeBoxes[Short[expr], form]

Short /: MakeBoxes[Short[expr_, lines_Integer], StandardForm | TraditionalForm] := Module[{row = {}, index = 1}, With[{
  process :=   (While[(BoxForm`$accumulatorSize < 1024 || index < lines) && index <= Length[expr],
    With[{element = Extract[expr, index]},
      With[{elementBox = MakeBoxes[Short[element, 1], StandardForm]},
        AppendTo[row, elementBox];
        index++;
      ]
    ]
  ];

  If[index == Length[expr]+1,
    BoxForm`shortenHeadAndBody[Head[expr], row, "\n "]
  ,
    If[Length[row] == 0,
    RowBox[Join[{"<<", ToString[Head[expr], InputForm], ">>"}] ]
    ,
    BoxForm`shortenHeadAndBody[Head[expr], Join[row, {RowBox[{"<<", ToString[Length[expr] - index+1], ">>"}]}], "\n "]
    ]
  ])
}, 

If[NumericQ[BoxForm`$accumulatorSize],
  process
,

  Block[{BoxForm`$accumulatorSize = 0},
    process
  ]
] ]
] /; ByteCount[expr] > 1024


BoxForm`SpokenWithinLimit[expr_, maxChars_: 1500] := Module[
  {
    e = expr,
    params,
    s
  },
  params = Flatten[
    Table[
      {sl, asl, depth},
      {depth, {10, 5, 3, 2, 1}},
      {asl, {1000, 500, 200, 150, 75, 50, 25, 5, 1}},
      {sl, {1000,50,10}}
    ],
    2
  ];

  s = SelectFirst[
    SpokenString[
      e,
      StringLengthLimit -> #[[1]],
      ArraySizeLimit -> #[[2]],
      ExpressionDepthLimit -> #[[3]]
    ] & /@ params,
    StringLength[#] <= maxChars &
  ];

  If[MissingQ[s],
    StringTake[
      SpokenString[
        e,
        StringLengthLimit -> 1,
        ArraySizeLimit -> 1,
        ExpressionDepthLimit -> 1
      ],
      UpTo[maxChars]
    ],
    s
  ]
];

(* ::: Commonly used Math symbols :::  *)
(* ::: does not require decorators ::: *)

Unprotect[FractionBox]
FractionBox[a_, b_] := RowBox[{"(*FB[*)((", a, ")(*,*)/(*,*)(", b, "))(*]FB*)"}]

Unprotect[SqrtBox]
SqrtBox[a_] := RowBox[{"(*SqB[*)Sqrt[", a, "](*]SqB*)"}]

Unprotect[SuperscriptBox]
SuperscriptBox[a_, b_] := RowBox[{"(*SpB[*)Power[", a, "(*|*),(*|*)",  b, "](*]SpB*)"}]
SuperscriptBox[a_, b_, _] := RowBox[{"(*SpB[*)Power[", a, "(*|*),(*|*)",  b, "](*]SpB*)"}]

SuperscriptBox[a_, "\[Prime]", _] := RowBox[{a, "'"}]
SuperscriptBox[a_, ",", _] := RowBox[{a, "'"}]

Unprotect[SubscriptBox]
SubscriptBox[a_, b_] := RowBox[{"(*SbB[*)Subscript[", a, "(*|*),(*|*)",  b, "](*]SbB*)"}]
SubscriptBox[a_, b_, _] := RowBox[{"(*SbB[*)Subscript[", a, "(*|*),(*|*)",  b, "](*]SbB*)"}]



(* ::: Boxes, which do require decorators ::: *)

Unprotect[RotationBox]
RotationBox[expr_, OptionsPattern[] ] := With[{o = OptionValue["BoxRotation"]}, BoxBox[expr, ViewDecorator["Rotation", o] ] ]
Options[RotationBox] = {"BoxRotation" -> 90. Degree}

Unprotect[Transpose]
Transpose /: MakeBoxes[t: Transpose[expr_], StandardForm]:= With[{boxes = MakeBoxes[expr, StandardForm]},
  BoxBox[boxes, ViewDecorator["Transpose", "T"], Head->Transpose]
]

Unprotect[ConjugateTranspose]
ConjugateTranspose /: MakeBoxes[t: ConjugateTranspose[expr_], StandardForm]:= With[{boxes = MakeBoxes[expr, StandardForm]},
  BoxBox[boxes, ViewDecorator["Transpose", "&dagger;"], Head->ConjugateTranspose]
]

Unprotect[Sum]

Sum /: MakeBoxes[Sum[expr_, {x_Symbol, min_, max_}], s: StandardForm] := With[{func = MakeBoxes[expr, s]},
    With[{dp = ViewDecorator["Sum", 1, True], symbol = MakeBoxes[x, s], bmin = MakeBoxes[min, s], bmax = MakeBoxes[max, s]},
      RowBox[{"(*TB[*)Sum[(*|*)", func, "(*|*), {(*|*)", symbol, "(*|*),(*|*)", bmin, "(*|*),(*|*)", bmax, "(*|*)}](*|*)(*", Compress[dp], "*)(*]TB*)"}]
    ]
]

Sum /: MakeBoxes[Sum[expr_, vars__List], s: StandardForm] := With[{list = List[vars]},
    With[{dp = ViewDecorator["Sum", 1, True], func = MakeBoxes[expr, s], symbols = Riffle[
        With[{sym = #[[1]], min = #[[2]], max = #[[3]]},
          If[Length[#] === 3,
            {"{(*|*)", MakeBoxes[sym, s], "(*|*),(*|*)", MakeBoxes[min, s], "(*|*),(*|*)", MakeBoxes[max, s], "(*|*)}"}
          ,
            {"{(*|*)", MakeBoxes[sym, s], "(*|*),(*|*)", MakeBoxes[min, s], "(*|*),(*|*)", MakeBoxes[max, s], "(*|*)", ToString[#[[4]], InputForm],"}"}
          ]
          
        ] &/@ list
      , ","] // Flatten // RowBox
    },
      RowBox[{"(*TB[*)Sum[(*|*)", func, "(*|*), ", symbols, "](*|*)(*", Compress[dp], "*)(*]TB*)"}]
    ]
]

Sum /: MakeBoxes[Sum[expr_, {x_Symbol, min_, max_, step_}], s: StandardForm] := With[{func = MakeBoxes[expr, s]},
    With[{dp = ViewDecorator["Sum", 1, True], symbol = MakeBoxes[x, s], bmin = MakeBoxes[min, s], bmax = MakeBoxes[max, s], bstep = MakeBoxes[step, s]},
      RowBox[{"(*TB[*)Sum[(*|*)", func, "(*|*), {(*|*)", symbol, "(*|*),(*|*)", bmin, "(*|*),(*|*)", bmax, "(*|*)", bstep, "}](*|*)(*", Compress[dp], "*)(*]TB*)"}]
    ]
]

Unprotect[Derivative]
Derivative /: MakeBoxes[Derivative[single_][f_], s: StandardForm] := With[{},
  RowBox[{MakeBoxes[f, s], StringJoin @@ Table["'", {i, single}]}]
]

Derivative /: MakeBoxes[Derivative[multi__][f_], s: StandardForm] := With[{list = List[multi]},
  With[{func = MakeBoxes[f, s], head = "Derivative["<>StringRiffle[ToString/@list, ","]<>"]"},
    With[{dp = ProvidedOptions[ViewDecorator["Derivative", list], "Head"->head]},
      RowBox[{"(*BB[*)(", head, "[", func, "])(*,*)(*", ToString[Compress[dp ], InputForm], "*)(*]BB*)"}]
    ]
  ]
]

Unprotect[Integrate]

Integrate /: MakeBoxes[Integrate[f_, x_Symbol], s: StandardForm ] := With[{},
    With[{dp = ViewDecorator["Integrate", 1, False], func = MakeBoxes[f, s], symbol = MakeBoxes[x, s]},
      RowBox[{"(*TB[*)Integrate[(*|*)", func, "(*|*), (*|*)", symbol, "(*|*)](*|*)(*", Compress[dp], "*)(*]TB*)"}]
    ]
]

Integrate /: MakeBoxes[Integrate[f_, x__Symbol], s: StandardForm ] := With[{list = List[x]},
    With[{dp = ViewDecorator["Integrate", list // Length, False], func = MakeBoxes[f, s], symbols = RowBox[Riffle[MakeBoxes[#, s]&/@list, "(*|*),(*|*)"] ]},
      RowBox[{"(*TB[*)Integrate[(*|*)", func, "(*|*), (*|*)", symbols, "(*|*)](*|*)(*", Compress[dp], "*)(*]TB*)"}]
    ]
]

Integrate /: MakeBoxes[Integrate[f_, {x_Symbol, min_, max_}], s: StandardForm ] := With[{},
    With[{dp = ViewDecorator["Integrate", 1, True], func = MakeBoxes[f, s], symbol = MakeBoxes[x, s], xmin = MakeBoxes[min, s], xmax = MakeBoxes[max, s]},
      RowBox[{"(*TB[*)Integrate[(*|*)", func, "(*|*), {(*|*)", symbol, "(*|*),(*|*)",xmin,"(*|*),(*|*)",xmax,"(*|*)}](*|*)(*", Compress[dp], "*)(*]TB*)"}]
    ]
]

Integrate /: MakeBoxes[Integrate[f_, bond__List], s: StandardForm ] := With[{list = List[bond]},
    With[{dp = ViewDecorator["Integrate", list // Length, True], func = MakeBoxes[f, s], symbols = RowBox[Riffle[{
        With[{var = #[[1]], min = #[[2]], max = #[[3]]},
          {"{(*|*)", MakeBoxes[var, s], "(*|*),(*|*)", MakeBoxes[min, s], "(*|*),(*|*)", MakeBoxes[max, s], "(*|*)}"}
        ]
      }&/@list, ","] // Flatten ]},
      RowBox[{"(*TB[*)Integrate[(*|*)", func, "(*|*), ", symbols, "](*|*)(*", Compress[dp], "*)(*]TB*)"}]
    ]
]


Unprotect[Cross]
FormatValues[Cross] = {};

Cross /: MakeBoxes[Cross[a_,b_], StandardForm] := With[{
  y1 = MakeBoxes[a, StandardForm],
  y2 = MakeBoxes[b, StandardForm]
},
  RowBox[{"(*TB[*)Cross[(*|*)", y1, "(*|*),(*|*)", y2, "(*|*)](*|*)(*", Compress[ ViewDecorator["Cross"] ], "*)(*]TB*)"}]
]

Cross /: MakeBoxes[Cross[x1_, x2_, x3_], StandardForm] := With[{
  y1 = MakeBoxes[x1, StandardForm],
  y2 = MakeBoxes[x2, StandardForm],
  y3 = MakeBoxes[x3, StandardForm]
},
  RowBox[{"(*TB[*)Cross[(*|*)", y1, "(*|*),(*|*)", y2, "(*|*),(*|*)", y3, "(*|*)](*|*)(*", Compress[ViewDecorator["Cross"]], "*)(*]TB*)"}]
]

Cross /: MakeBoxes[Cross[x1_, x2_, x3_, x4_], StandardForm] := With[{
  y1 = MakeBoxes[x1, StandardForm],
  y2 = MakeBoxes[x2, StandardForm],
  y3 = MakeBoxes[x3, StandardForm],
  y4 = MakeBoxes[x4, StandardForm]
},
  RowBox[{"(*TB[*)Cross[(*|*)", y1, "(*|*),(*|*)", y2, "(*|*),(*|*)", y3, "(*|*),(*|*)", y4, "(*|*)](*|*)(*", Compress[ViewDecorator["Cross"]], "*)(*]TB*)"}]
]

Unprotect[Colon]
FormatValues[Colon] = {};

Colon /: MakeBoxes[Colon[a_, b_], StandardForm] := With[{
  y1 = MakeBoxes[a, StandardForm],
  y2 = MakeBoxes[b, StandardForm]
},
  RowBox[{"(*TB[*)Colon[(*|*)", y1, "(*|*),(*|*)", y2, "(*|*)](*|*)(*", Compress[ViewDecorator["Colon"]], "*)(*]TB*)"}]
]

Colon /: MakeBoxes[Colon[x1_, x2_, x3_], StandardForm] := With[{
  y1 = MakeBoxes[x1, StandardForm],
  y2 = MakeBoxes[x2, StandardForm],
  y3 = MakeBoxes[x3, StandardForm]
},
  RowBox[{"(*TB[*)Colon[(*|*)", y1, "(*|*),(*|*)", y2, "(*|*),(*|*)", y3, "(*|*)](*|*)(*", Compress[ViewDecorator["Colon"]], "*)(*]TB*)"}]
]

Colon /: MakeBoxes[Colon[x1_, x2_, x3_, x4_], StandardForm] := With[{
  y1 = MakeBoxes[x1, StandardForm],
  y2 = MakeBoxes[x2, StandardForm],
  y3 = MakeBoxes[x3, StandardForm],
  y4 = MakeBoxes[x4, StandardForm]
},
  RowBox[{"(*TB[*)Colon[(*|*)", y1, "(*|*),(*|*)", y2, "(*|*),(*|*)", y3, "(*|*),(*|*)", y4, "(*|*)](*|*)(*", Compress[ViewDecorator["Colon"]], "*)(*]TB*)"}]
]


(* ::: Some convertions to simplify the output form ::: *)

SuperscriptBox[a_, "\[Transpose]"] := RowBox[{"Transpose[", a, "]"}]

RowBox[{SuperscriptBox["f", TagBox[RowBox[{"(", RowBox[{"1", ",", "1"}], ")"}], Derivative], MultilineFunction -> None], "[", RowBox[{"x", ",", "y"}], "]"}]

Unprotect[SubsuperscriptBox]
SubsuperscriptBox[x_?(Not[# === "\[Sum]"]&), y_, z_] := SuperscriptBox[SubscriptBox[x,y], z]
SubsuperscriptBox[x_?(Not[# === "\[Sum]"]&), y_, z_, __] := SuperscriptBox[SubscriptBox[x,y], z]

Unprotect[RowBox]
RowBox[{first___, SubsuperscriptBox["\[Sum]", iterator_, till_], f_, rest___}] := RowBox[{first, "Sum[", f, ", {", iterator, ",", till, "}]",  rest}]
RowBox[{first___, SubsuperscriptBox["\[Sum]", RowBox[{iterator_, "=", initial_}], till_], f_, rest___}] := RowBox[{first, "Sum[", f, ", {", iterator, ",", initial, ",", till, "}]",  rest}]



Unprotect[TagBox]
TagBox[x_, opts___] := x

(* TEXT *)
Unprotect[Text];
FormatValues[Text] = {}
Text /: MakeBoxes[Text[expr_, ___], StandardForm] := With[{m = Style[TextString[expr], 12]}, 
  MakeBoxes[m, StandardForm]
]
Text /: MakeBoxes[Text[Column[list_List], ___], StandardForm] := With[{r = Column[Text/@list]},
  MakeBoxes[r, StandardForm]
]
Text /: MakeBoxes[Text[Grid[list_List], ___], StandardForm] := With[{r = Grid[Map[Text, list, {2}]]},
  MakeBoxes[r, StandardForm]
]

(* :::Grid Decorators::: aka TableForm, MatrixForm and many more *)
(* we do support only one(two) option*)

halfNumber[n_?NumberQ] := Floor[n/2];
halfNumber[expr_] := expr

Unprotect[GridBox]
gridBoxCanonicalRules[opts_List] := Module[{assoc = Association[opts], spacings, alignments},
    spacings = {
        If[KeyExistsQ[assoc, ColumnSpacings], "Columns" -> halfNumber[assoc[ColumnSpacings]], Nothing],
        If[KeyExistsQ[assoc, RowSpacings], "Rows" -> halfNumber[assoc[RowSpacings]], Nothing]
    };

    alignments = {
        If[KeyExistsQ[assoc, ColumnAlignments], "Columns" -> assoc[ColumnAlignments], Nothing],
        If[KeyExistsQ[assoc, RowAlignments], "Rows" -> assoc[RowAlignments], Nothing]
    };
    Join[
        opts,
        If[spacings =!= {} && !KeyExistsQ[assoc, GridBoxSpacings], {GridBoxSpacings -> spacings}, {}],
        If[alignments =!= {} && !KeyExistsQ[assoc, GridBoxAlignment], {GridBoxAlignment -> alignments}, {}]
    ]
]

GridBox[list_List, opts___] := With[{optList = gridBoxCanonicalRules[List[opts]]},
    With[{rls = FilterRules[optList, {BaselinePosition, Selectable, GridBoxDividers, GridBoxAlignment, GridBoxSpacings, ImageSize}]},
        If[Association[optList][DefaultBaseStyle] === "Matrix",
            RowBox@(Join @@ (Join[{{"(*GB[*){"}}, 
                Riffle[
                    (Join[{"{"}, Riffle[#, "(*|*),(*|*)"], {"}"}] & /@ list), 
                        If[Length[list] > 1, {{"(*||*),(*||*)"}}, {}] ], {{StringJoin["}(*||*)(*", Compress[ViewDecorator["Matrix"]  ], "*)(*]GB*)"]}}]))
        ,
            RowBox@(Join @@ (Join[{{"(*GB[*){"}}, 
                Riffle[
                    (Join[{"{"}, Riffle[#, "(*|*),(*|*)"], {"}"}] & /@ list), 
                        If[Length[list] > 1, {{"(*||*),(*||*)"}}, {}] ], {{StringJoin["}(*||*)(*", Compress[ViewDecorator["Grid", Sequence@@rls]  ], "*)(*]GB*)"]}}]))

        ]
    ]
]

MakeBoxes[TableForm[{{1,2}, {3,4}}], StandardForm]; (* trigger symbol fetch *)

Unprotect[MatrixForm]
FormatValues[MatrixForm] = {};

MatrixForm /: MakeBoxes[MatrixForm[whatever_, OptionsPattern[] ], form_] := With[{
  grid = Grid[whatever, DefaultBaseStyle->"Matrix"]
},
  With[{b = MakeBoxes[grid, form]},
    b
  ]
] /; MatchQ[whatever, {_List..}] 

MatrixForm /: MakeBoxes[MatrixForm[whatever_, OptionsPattern[] ], form_] := With[{
  grid = Grid[List /@ whatever, DefaultBaseStyle->"Matrix"]
},
  With[{b = MakeBoxes[grid, form]},
    b
  ]
] /; MatchQ[whatever, _List] 

MatrixForm /: MakeBoxes[MatrixForm[whatever_, OptionsPattern[] ], form_] := With[{},
  MakeBoxes[whatever, form]
]  


GridBox[{{"\[Piecewise]", whatever_}}, a___] := With[{original = whatever /. {RowBox -> RowBoxFlatten} // ToString // ToExpression},
  With[{
    dp = ViewDecorator["Piecewise", Length[original] ]
  },
    With[{boxes = Riffle[
      With[{
        val = #[[1]],
        cond = #[[2]]
      },
        {"{(*|*)", MakeBoxes[val, StandardForm], "(*|*),(*|*)", MakeBoxes[cond, StandardForm], "(*|*)}"}
      ]& /@ original
    , ","] // Flatten // RowBox},
      RowBox[{"(*TB[*)Piecewise[{", boxes, "}](*|*)(*", Compress[dp], "*)(*]TB*)"}]
    ]
  ]
]

Unprotect[Piecewise]
FormatValues[Piecewise] = {};

Piecewise /: MakeBoxes[Piecewise[original_List, default_], StandardForm] :=  With[{list = Join[original, {{default, True}}]}, MakeBoxes[Piecewise[list], StandardForm] ]
Piecewise /: MakeBoxes[Piecewise[original_List], StandardForm] := With[{},
  With[{
    dp = ViewDecorator["Piecewise", Length[original] ]
  },
    With[{boxes = Riffle[
      With[{
        val = #[[1]],
        cond = #[[2]]
      },
        {"{(*|*)", MakeBoxes[val, StandardForm], "(*|*),(*|*)", MakeBoxes[cond, StandardForm], "(*|*)}"}
      ]& /@ original
    , ","] // Flatten // RowBox},
      RowBox[{"(*TB[*)Piecewise[{", boxes, "}](*|*)(*", Compress[dp], "*)(*]TB*)"}]
    ]
  ]
]

ToStringStrip[str_] := With[{s = ToString[str]}, 
  If[StringTake[s, 1] == "\"" && StringTake[s, -1] == "\"",
    StringDrop[StringDrop[s,-1],1]
  ,
    s
  ]
]

Unprotect[UnderscriptBox]
UnderscriptBox[a_, b_] := RowBox[{"(*TB[*)Underscript[(*|*)", a, "(*|*),", b, "](*|*)(*", Compress[ViewDecorator["Under" ] ], "*)(*]TB*)"}]
UnderscriptBox[a_, "_"] := RowBox[{"(*TB[*)UnderBar[(*|*)", a, "(*|*)](*|*)(*", Compress[ViewDecorator["Under", "_" ] ], "*)(*]TB*)"}]


Unprotect[OverscriptBox]
OverscriptBox[a_, b_] := RowBox[{"(*TB[*)Overscript[(*|*)", a, "(*|*),", b, "](*|*)(*", Compress[ViewDecorator["Over" ] ], "*)(*]TB*)"}]

OverscriptBox[a_, "^"] := RowBox[{"(*TB[*)OverHat[(*|*)", a, "(*|*)](*|*)(*", Compress[ViewDecorator["Over", "^" ] ], "*)(*]TB*)"}]
OverscriptBox[a_, "\[RightVector]"] := RowBox[{"(*TB[*)OverVector[(*|*)", a, "(*|*)](*|*)(*", Compress[ViewDecorator["Over", "&#8594;" ] ], "*)(*]TB*)"}]
OverscriptBox[a_, "~"] := RowBox[{"(*TB[*)OverTilde[(*|*)", a, "(*|*)](*|*)(*", Compress[ViewDecorator["Over", "~" ] ], "*)(*]TB*)"}]
OverscriptBox[a_, "_"] := RowBox[{"(*TB[*)OverBar[(*|*)", a, "(*|*)](*|*)(*", Compress[ViewDecorator["Over", "_" ] ], "*)(*]TB*)"}]
OverscriptBox[a_, "."] := RowBox[{"(*TB[*)OverDot[(*|*)", a, "(*|*),1](*|*)(*", Compress[ViewDecorator["Over", "." ] ], "*)(*]TB*)"}]
OverscriptBox[a_, ".."] := RowBox[{"(*TB[*)OverDot[(*|*)", a, "(*|*),2](*|*)(*", Compress[ViewDecorator["Over", ".." ] ], "*)(*]TB*)"}]
OverscriptBox[a_, "..."] := RowBox[{"(*TB[*)OverDot[(*|*)", a, "(*|*),3](*|*)(*", Compress[ViewDecorator["Over", "..." ] ], "*)(*]TB*)"}]

(* ::: Leftover plugs for FormatValues, we could not overwrite ::: *)

System`ByteArrayWrapper;
System`ByteArrayBox;
ByteArrayWrapper /: MakeBoxes[ByteArrayWrapper[b_ByteArray], form_] := ByteArrayBox[b, form]

If[!ListQ[Kernel`Internal`garbage], Kernel`Internal`garbage = {}];

Unprotect[ByteArray]
FormatValues[ByteArray] = {};

ByteArray /: MakeBoxes[b_ByteArray, form_] := ByteArrayBox[b, form]

ByteArrayBox[b_ByteArray, form_] := With[{
  size = UnitConvert[Quantity[Length[b], "Bytes"], "Conventional"] // TextString
},
  If[ByteCount[b] > 1024,
    LeakyModule[{
      store
    },
      With[{view = 
        Module[{above, below},
              above = { 
                {BoxForm`SummaryItem[{"Size: ", Style[size, Bold]}]},
                {BoxForm`SummaryItem[{"Location", Style["Kernel", Italic, Red]}]}
              };

              BoxForm`ArrangeSummaryBox[
                 ByteArray, (* head *)
                 ByteArray[store],      (* interpretation *)
                 None,    (* icon, use None if not needed *)
                 (* above and below must be in a format suitable for Grid or Column *)
                 above,    (* always shown content *)
                 Null (* expandable content. Currently not supported!*)
              ] // Quiet
          ]        
        },
       
        AppendTo[Kernel`Internal`garbage , Hold[store] ]; (* Garbage collector bug for ByteArrays *)
        store = BaseEncode[b];
        

        view
      ]
    ]
  ,
    Module[{above, below},
        above = { 
          {BoxForm`SummaryItem[{"Size: ", Style[size, Bold]}]}
        };

        BoxForm`ArrangeSummaryBox[
           ByteArray, (* head *)
           b,      (* interpretation *)
           None,    (* icon, use None if not needed *)
           (* above and below must be in a format suitable for Grid or Column *)
           above,    (* always shown content *)
           Null (* expandable content. Currently not supported!*)
        ]
    ]
  ]
] // Quiet

Protect[BoxForm`ArrangeSummaryBox];

System`TreeWrapper;
TreeWrapper /: MakeBoxes[TreeWrapper[t_Tree], StandardForm] := With[{c = Insert[GraphPlot[t, VertexLabels->Automatic, AspectRatio->1, ImageSize->180, ImagePadding->None] /. {
  Text[{HoldComplete[text_], _}, rest__] :>  {Black, Text[ToString[text], rest]},
  Text[{text_, _}, rest__] :>  {Black, Text[ToString[text], rest]},
  Text[text_, rest__] :>  {Black, Text[ToString[text], rest]},
  (g:GraphicsComplex[v_, data_, ___]) :> ReplaceAll[Normal[g], Arrow[list: {{_Integer, _Integer} ..}, rest___] :> Arrow[Map[Function[i, v[[i]]], list], rest]]
}, CoffeeLiqueur`Extensions`Graphics`Controls->False, {2,-1}] /. CoffeeLiqueur`Extensions`StandardForm`ExpressionReplacements}, ViewBox[t, c] ]

TagBox["ByteArray", "SummaryHead"] = ""

(* ::: FIX for WL14+ ::: *)

TagBox[any_, f_Function] := any


(* ::: FIX for WL11+ ::: *)
(* ::: TODO: Make it work ::: *)

Kernel`Internal`trimStringCharacters[s_String] := With[{
  c = StringTake[s, 1]
},
  If[c === "\"",
    StringDrop[StringDrop[s, -1], 1]
  ,
    StringReplace[s, "\[Times]"-> (ToString[Style[" x ", RGBColor[0.5,0.5,0.5] ], StandardForm]) ]
  ]
]

(* ::: Around  ::: *)

Unprotect[Around]
FormatValues[Around] = {};
Around /: MakeBoxes[Around[mean_?NumberQ, std_?NumberQ], StandardForm] := With[{},
  ViewBox[Around[mean, std], ViewDecorator["Around", TextString[N@Round[mean, std/2] ], TextString @ std ] ]
] 

Around /: MakeBoxes[Around[mean_?NumberQ, {stdm_?NumberQ, stdp_?NumberQ}], StandardForm] := With[{},
  ViewBox[Around[mean, {stdm, stdp}], ViewDecorator["Around", TextString[N@Round[mean, Min[stdp, stdm]/2 ] ], (TextString @ stdp)<>"/"<>(TextString @ stdm) ] ]
] 

(* ::: Styling expressions ::: *)

System`StyleDecorator;

Unprotect[FrameBox]
FrameBox[x_, opts___]  := RowBox[{"(*BB[*)(", x, ")(*,*)(*", ToString[Compress[ StyleDecorator[opts, "Frame"->True] ], InputForm], "*)(*]BB*)"}]


Unprotect[StyleBox]

(* FIXME!!! *)
(* FIXME!!! *)
(* FIXME!!! *)
With[{c = Uncompress["1:eJxTTMoPCmZjYGCIsXIzdjQAABpPAx4="]}, 
    BoxForm`emptyCharacterQ[c] = True;
    BoxForm`emptyCharacterQ[]  = True;
    BoxForm`emptyCharacterQ[_] = False;
];

StyleBox[px_, popts__]  := With[{
    x = If[BoxForm`emptyCharacterQ[px], "None", px],
    opts = If[BoxForm`emptyCharacterQ[px], {popts, "ShowContents"->False}, {popts}]
}, {list = Association[Cases[opts, _Rule] ]},
  If[KeyExistsQ[list, ShowStringCharacters], 
    If[!list[ShowStringCharacters],
      RowBox[{"(*BB[*)(", ReplaceAll[x, s_String :> Kernel`Internal`trimStringCharacters[s] ], ")(*,*)(*", ToString[Compress[StyleDecorator[Sequence@@opts]  ] , InputForm], "*)(*]BB*)"}]  
    ,
      RowBox[{"(*BB[*)(", x, ")(*,*)(*", ToString[Compress[StyleDecorator[Sequence@@opts] ], InputForm], "*)(*]BB*)"}]
    ]
  ,
    RowBox[{"(*BB[*)(", x, ")(*,*)(*", ToString[Compress[StyleDecorator[Sequence@@opts] ], InputForm], "*)(*]BB*)"}]
  ]
]



Unprotect[Databin];
FormatValues[Databin] = {};
Databin /: MakeBoxes[d_Databin, StandardForm] := Module[{above, below},
        above = { 
          {BoxForm`SummaryItem[{"Short ID: ", d["ShortID"]}]}
        };

        BoxForm`ArrangeSummaryBox[
           Databin, (* head *)
           d,      (* interpretation *)
           None,    (* icon, use None if not needed *)
           (* above and below must be in a format suitable for Grid or Column *)
           above,    (* always shown content *)
           Null (* expandable content. Currently not supported!*)
        ]
    ];


Unprotect[Hyperlink];
FormatValues[Hyperlink] = {};

Hyperlink /: MakeBoxes[Hyperlink[str_String], StandardForm] := MakeBoxes[Hyperlink[str, str], StandardForm]

Hyperlink /: MakeBoxes[Hyperlink[label_, url_String], f: StandardForm] := With[{labelBox = MakeBoxes[label, f]}, 

BoxBox[labelBox, StyleDecorator["URL"->url] ] ]

Hyperlink /: MakeBoxes[Hyperlink[label_String, url_String], f: StandardForm] := With[{labelBox = MakeBoxes[label, f]}, 
 
BoxBox[labelBox, StyleDecorator["URL"->url], "String"->True]]

(*if a string, then remove quotes*)

Unprotect[Style]
Style /: MakeBoxes[Style[s_String, opts__], StandardForm] := RowBox[{"(*BB[*)(", ToString[s, InputForm], ")(*,*)(*", ToString[Compress[ProvidedOptions[StyleDecorator[opts], "String"->True ] ], InputForm], "*)(*]BB*)"}]

(* ::: MISC view decorators ::: *)

Unprotect[Panel]
Panel /: EventHandler[p_Panel, list_List] := With[{
  uid = CreateUUID[],
  assoc = Association[list]
},
  EventHandler[uid, assoc["Click"] ];
  Insert[p, "Event"->uid, -1]
]

Unprotect[PanelBox]
PanelBox[x_, opts___]  := RowBox[{"(*BB[*)(Panel[", x, "])(*,*)(*", ToString[Compress[ProvidedOptions[ViewDecorator["Panel", opts], "Head"->"Panel"] ], InputForm], "*)(*]BB*)"}]

(* Special WLX Form*)

Unprotect[Panel];
Options[Panel] = Join[Options[Panel], {Selectable->True}]

Panel /: MakeBoxes[Panel[expr_, ___], WLXForm] := With[{
  Content = ToString[MakeBoxes[expr, WLXForm]]
},
  StringJoin["<div class=\"rounded-md 0 py-1 px-2 bg-gray-50 text-left text-gray-500 ring-1 ring-inset ring-gray-400\">", Content, "</div>"]
]

(* Deploy *)

Unprotect[Deploy]
Deploy[expr_] := expr /. {
  Panel[f_, a___] :> Panel[Deploy[f],a, Selectable->False],
  Pane[f_, a___] :> Pane[Deploy[f],a, Selectable->False],
  Row[f_, a___] :> Row[Deploy[f],a, Selectable->False],
  Column[f_, a___] :> Column[Deploy[f],a, Selectable->False],
  Grid[f_, a___] :> Grid[Deploy[f],a, Selectable->False]
};

(* :::Template Boxes convertion to ViewDecorators ::: *)

Unprotect[TemplateBox]

TemplateBox[list_List, "RowDefault", rest___] := GridBox[{list}, rest]
TemplateBox[list_List, "Row", rest___] := GridBox[{list}, rest]

TemplateBox[{head_String}, "InactiveHead", __] := head

ToString[Reals, StandardForm];

TemplateBox[{}, "Integers"] := ViewBox[Integers, ViewDecorator["Integers"] ]
TemplateBox[{}, "Reals"] := ViewBox[Reals, ViewDecorator["Reals"] ]
TemplateBox[{}, "Complexes"] := ViewBox[Complexes, ViewDecorator["Complexes"] ]
TemplateBox[{}, "Rationals"] := ViewBox[Rationals, ViewDecorator["Rationals"] ]

TemplateBox[{pts_Integer}, "Spacer"] := ViewBox[Spacer[pts], ViewDecorator["Spacer", pts] ]
TemplateBox[{pts_Integer}, "Spacer1"] := ViewBox[Spacer[pts], ViewDecorator["Spacer", pts] ]
TemplateBox[{pts__Integer}, "Spacer2"] := ViewBox[Spacer[pts], ViewDecorator["Spacer", List @ pts] ]

TemplateBox[list:{expr_, label_}, "Labeled", opts__Rule ] := With[{func = Association[ List[opts] ][DisplayFunction]},
  func @@ list
]

Unprotect[Labeled];
Labeled /: MakeBoxes[Labeled[expr_, label_], WLXForm] := With[{
  exprBox = MakeBoxes[expr, WLXForm],
  labelBox = MakeBoxes[label, WLXForm]
},
  StringTemplate["<div class=\"inline-block\"><div>``</div><legend class=\"text-center\">``</legend></div>"][exprBox, labelBox]
]

BoxForm`ToViewBox /: MakeBoxes[BoxForm`ToViewBox[expr_], StandardForm] := With[{out = MakeBoxes[expr, StandardForm]},
  ViewBox[out, expr]
]

BoxForm`ToViewBox /: MakeBoxes[BoxForm`ToViewBox[expr_],  WLXForm] := With[{out = MakeBoxes[expr, WLXForm]},
  out
]

If[$VersionNumber > 14.1,
  Labeled[i_Image | i_Graphics | i_Graphics3D | i_Image3D, rest___] := Labeled[CreateFrontEndObject[i]//BoxForm`ToViewBox, rest];
  Labeled[style_[i_Image | i_Graphics | i_Graphics3D | i_Image3D, styleOpts___], rest___] := Labeled[style[CreateFrontEndObject[i]//BoxForm`ToViewBox, styleOpts], rest];
];


(* :::Item Boxes convertion to ViewDecorators ::: *)

Unprotect[ItemBox]

ItemBox[expr_, o: OptionsPattern[] ] := RowBox[{expr, "(*VB[*)(**)(*,*)(*", ToString[Compress[ViewDecorator["Item", o] ], InputForm], "*)(*]VB*)"}] ;/ Head[expr] =!= Slot


(* :::QuantityBox to ViewDecorators ::: *)

Unprotect[QuantityUnits`QuantityBox]
ClearAll[QuantityUnits`QuantityBox]

QuantityUnits`QuantityBox[QuantityUnits`Private`x_, _] := With[{
  n = QuantityMagnitude[QuantityUnits`Private`x],
  units = QuantityUnit[QuantityUnits`Private`x]
},
  ViewBox[QuantityUnits`Private`x, ViewDecorator["Quantity", n, units] ]
] /; NumberQ[ QuantityMagnitude[QuantityUnits`Private`x] ]

QuantityUnits`QuantityBox[QuantityUnits`Private`x_, _] := ToString[QuantityUnits`Private`x, InputForm]

(* ::: More Template Boxes ::: *)

TemplateBox[{"Root", m_, raw_, approx_}, opts___] := RowBox[{"(*VB[*)(", approx /. {RowBox->RowBoxFlatten} // ToString, ")(*,*)(*", ToString[Compress[ViewDecorator["Root", approx] ] , InputForm], "*)(*]VB*)"}]
TemplateBox[{number_}, "C"] := RowBox[{ SubscriptBox[C, number]}]

Unprotect[AlgebraicNumber]
FormatValues[AlgebraicNumber] = {};

AlgebraicNumber /: MakeBoxes[a_AlgebraicNumber, StandardForm] := With[{approx = N[a]},
  ViewBox[a, ViewDecorator["Root", approx]]
]

TemplateBox[expr_, "Bra"] := With[{dp = ProvidedOptions[ViewDecorator["Bra"], "Head"->"Bra"]}, RowBox[{"(*BB[*)(Bra[", RowBox[Riffle[expr, ","]], "])(*,*)(*", ToString[Compress[dp], InputForm], "*)(*]BB*)"}]]
TemplateBox[expr_, "Ket"] := With[{dp = ProvidedOptions[ViewDecorator["Ket"], "Head"->"Ket"]}, RowBox[{"(*BB[*)(Ket[", RowBox[Riffle[expr, ","]], "])(*,*)(*", ToString[Compress[dp], InputForm], "*)(*]BB*)"}]]

Unprotect[Ket]
Unprotect[Bra]

Ket /: MakeBoxes[Ket[list__], StandardForm] := With[{dp = ProvidedOptions[ViewDecorator["Ket"], "Head"->"Ket"]}, RowBox[{"(*BB[*)(Ket[", RowBox[Riffle[List[list], ","]], "])(*,*)(*", ToString[Compress[dp], InputForm], "*)(*]BB*)"}]]
Bra /: MakeBoxes[Bra[list__], StandardForm] := With[{dp = ProvidedOptions[ViewDecorator["Bra"], "Head"->"Bra"]}, RowBox[{"(*BB[*)(Bra[", RowBox[Riffle[List[list], ","]], "])(*,*)(*", ToString[Compress[dp], InputForm], "*)(*]BB*)"}]]

TemplateBox[{file_String}, "FileArgument"] := file

TemplateBox[{expr_, cond_}, "ConditionalExpression"] := With[{dp = ViewDecorator["Conditional"]},
  RowBox[{"(*TB[*)ConditionalExpression[(*|*)", expr, "(*|*), (*|*)", cond, "(*|*)](*|*)(*", Compress[dp], "*)(*]TB*)"}]
]

TemplateBox[expr_, "IconizedObject"] := "\"Box is not implemented\""

(* :: Fallback for DynamicBox :: *)
(* for plots and charts to works as static plots *)

Unprotect[DynamicModuleBox]
(* fallback *)
DynamicModuleBox[vars_, body_] := body

(* :: Color Boxes :: *)

TemplateBox[assoc_Association, "RGBColorSwatchTemplate"] := With[{color = assoc["color"]//N},
   RowBox[{"(*VB[*)(", ToString[assoc["color"], InputForm], ")(*,*)(*", ToString[Compress[ViewDecorator["CSWT", color]], InputForm], "*)(*]VB*)"}]
]

TemplateBox[assoc_Association, "LABColorSwatchTemplate"] := With[{rgb = RGBColor[assoc["color"]]//N},
  RowBox[{"(*VB[*)(", ToString[assoc["color"], InputForm], ")(*,*)(*", ToString[Compress[ViewDecorator["CSWT", rgb]], InputForm], "*)(*]VB*)"}]  
]

TemplateBox[assoc_Association, "GrayLevelColorSwatchTemplate"] := With[{color = assoc["color"]//N // RGBColor},
   RowBox[{"(*VB[*)(", ToString[assoc["color"], InputForm], ")(*,*)(*", ToString[Compress[ViewDecorator["CSWT", color]], InputForm], "*)(*]VB*)"}]
]

TemplateBox[assoc_Association, "HueColorSwatchTemplate"] := With[{color = assoc["color"]//N // RGBColor},
   RowBox[{"(*VB[*)(", ToString[assoc["color"], InputForm], ")(*,*)(*", ToString[Compress[ViewDecorator["CSWT", color]], InputForm], "*)(*]VB*)"}]
]

(* :: Date Boxes :: *)

TemplateBox[expr_List, "DateObject", __] := With[{date = expr[[1]][[1]][[1]]},
   RowBox[{"(*VB[*)(", expr[[2]], ")(*,*)(*", ToString[Compress[ViewDecorator["Date", date] ], InputForm], "*)(*]VB*)"}]
]

(* :: Convertions to other boxes :: *)

TemplateBox[expr_List, "SummaryPanel"] := RowBox[expr]

TemplateBox[{expr_, opts__}, "Highlighted"] := StyleBox[expr, Background->Yellow, Frame->True] 

(* :: Indexed Box :: *)

TemplateBox[{symbol_, index__}, "IndexedDefault"] := With[{dp = ViewDecorator["Indexed"], indexSym = StringRiffle[ List[index] /. {RowBox -> RowBoxFlatten}, ","]},
      RowBox[{"(*TB[*)Indexed[(*|*)", symbol, "(*|*), {(*|*)", indexSym, "(*|*)}](*|*)(*", Compress[dp], "*)(*]TB*)"}]
]

(* :: Custom Iconize function :: *)

Unprotect[Iconize]
ClearAll[Iconize]

Iconize /: MakeBoxes[Iconize[compressed_, 0, title_ ], StandardForm] := With[{c = compressed, b = ByteCount[compressed]},
      RowBox[{"(*VB[*)(Uncompress[", ToString[c, InputForm], "])(*,*)(*", ToString[Compress[ ViewDecorator["Iconized", b, "Label"->title] ], InputForm], "*)(*]VB*)"}]
]

Iconize /: MakeBoxes[Iconize[path_, 1, title_ ], StandardForm] := With[{},
  RowBox[{"(*VB[*)(Uncompress@Get[FileNameJoin[", ToString[path, InputForm], "]])(*,*)(*", ToString[Compress[ ViewDecorator["Iconized", 0, "Label"->title, "File"->True] ], InputForm], "*)(*]VB*)"}]
]

Iconize /: MakeBoxes[Iconize[compressed_, 2, title_ ], StandardForm] := With[{c = compressed, b = ByteCount[compressed]},
      RowBox[{"(*VB[*)(Sequence@@Uncompress[", ToString[c, InputForm], "])(*,*)(*", ToString[Compress[ ViewDecorator["Iconized", b, "Label"->"... ,"] ], InputForm], "*)(*]VB*)"}]
]

Iconize /: MakeBoxes[Iconize[path_, 3, title_ ], StandardForm] := With[{},
  RowBox[{"(*VB[*)(Sequence@@Uncompress@Get[FileNameJoin[", ToString[path, InputForm], "]])(*,*)(*", ToString[Compress[ ViewDecorator["Iconized", 0, "Label"->"... ,", "File"->True] ], InputForm], "*)(*]VB*)"}]
]


BoxForm`IconizeSequence[expr_, opts: OptionsPattern[] ] := With[{
  title = OptionValue["Label"],
  location = OptionValue[GeneratedAssetLocation]
},
{
  file = FileNameJoin[{location, title<>".wl"}]
},
  If[ByteCount[expr] > 5000,
    If[!DirectoryQ[location],  CreateDirectory[ location ]  ];
    Put[expr // Compress, file ];
    Iconize[FileNameSplit[file], 3, title]
  ,
    Iconize[Compress[expr], 2, title]
  ]
]


Iconize[expr_, opts: OptionsPattern[] ] := With[{
  title = OptionValue["Label"],
  location = OptionValue[GeneratedAssetLocation]
},
{
  file = FileNameJoin[{location, title<>".wl"}]
},
  If[ByteCount[expr] > 5000,
    If[!DirectoryQ[location],  CreateDirectory[ location ]  ];
    Put[expr // Compress, file ];
    Iconize[FileNameSplit[file], 1, title]
  ,
    Iconize[Compress[expr], 0, title]
  ]
]

Iconize[expr_, title_String, opts: OptionsPattern[] ] := Iconize[expr, "Label" -> title, opts]

Options[Iconize] = {"Label":>StringReplace[(Internal`NoWR`RandomWord[]), {"-"->"_"}], GeneratedAssetLocation :> FileNameJoin[{".iconized"}]}
Options[BoxForm`IconizeSequence] = Options[Iconize];

(* :: Pane Boxes :: *)
(*  ignore them, show the first item only  *)

Unprotect[PaneSelectorBox]

PaneSelectorBox[list_, opts___] := list[[1]][[2]]


(* :: Iterpretation Box Implementation *)

Unprotect[InterpretationBox]


InterpretationBox[placeholder_, expr_, opts___] := With[{data = expr, v = EditorView[ToString[placeholder /. {RowBox->RowBoxFlatten}], "ReadOnly"->True, "Selectable"->False]},
  RowBox[{"(*VB[*)(", ToString[expr, InputForm], ")(*,*)(*", ToString[Compress[v], InputForm], "*)(*]VB*)"}]
]

Unprotect[Interpretation]

(* :: Optimized version *)

System`InterpretationOptimized;
Interpretation[view_FrontEndExecutable, expr_] := With[{},
  (*Echo["Optimized expression!"];*)
  InterpretationOptimized[view, expr]
]

InterpretationOptimized /: MakeBoxes[InterpretationOptimized[view_, expr_], StandardForm] := RowBox[{"(*VB[*)(", ToString[expr, InputForm], ")(*,*)(*", ToString[Compress[view], InputForm], "*)(*]VB*)"}]


(* :: Plug for SummaryBox :: *)

TemplateBox[v_List, "SummaryPanel"] := v

Unprotect[FrameBox]
FrameBox[x_] := FrameBox[x, "Background"->White] 

(* :: Fix for WL14+ :: *)

Unprotect[Show]
Show[any_, DisplayFunction->Identity] := any 
Protect[Show]


System`WLXForm;
System`EditorView; (* already defined in other package, just make sure it won't be placed to Global scope *)


(* :: Legends Workarounds :: *)

BoxForm`RawText;
Unprotect[Legended];
FormatValues[Legended] = {};

BoxForm`RawText /: MakeBoxes[BoxForm`RawText[text_String], StandardForm] := ViewBox[text, ViewDecorator["RawText", text] ]

BoxForm`RawText /: MakeBoxes[BoxForm`RawText[text_], StandardForm] := MakeBoxes[text, StandardForm]

Legended[expr_, {p_Placed}] := Legended[expr, p]

(* special case undocumented *)
SwatchLegend;
Unprotect[SwatchLegend]
SwatchLegend[{list1_List, list2_List}, {label1_List, label2_List}, rest___] :=SwatchLegend[list2, label2, rest]

BoxForm`LegendMakeLabel[uid_, expressionJSON_] := With[{expr = ImportByteArray[expressionJSON//StringToByteArray, "ExpressionJSON"]},
  CreateFrontEndObject[EditorView[ToString[expr, StandardForm], "ReadOnly"->True, "Selectable"->False], uid];
  uid
];

With[{sym = #}, 
  Unprotect[sym];
  FormatValues[sym] = {};
  sym /: MakeBoxes[a_sym, StandardForm] := ViewBox[a, a];
  sym /: MakeBoxes[a_sym, WLXForm] := With[{o = CreateFrontEndObject[ a ]},
    MakeBoxes[o, WLXForm]
  ];

] & /@ {LineLegend,PointLegend,SwatchLegend};

Legended /: MakeBoxes[Legended[expr_, legendFunction_Placed ], StandardForm] := With[{
  containerUId = ToString[expr, StandardForm] // CreateFrontEndObject // First
}, With[{
  exprView = EditorView[FrontEndExecutable[containerUId], "ReadOnly"->True, "Selectable"->False ]
},
  RowBox[{"(*VB[*)(Legended[ToExpression[FrontEndRef[\"", containerUId, "\"], InputForm], ", ToString[legendFunction, InputForm], "])(*,*)(*", ToString[Compress[ ViewDecorator["Legend2", exprView, legendFunction] ], InputForm], "*)(*]VB*)"}]
] ]

Legended /: MakeBoxes[Legended[expr_, legendFunction_Placed ], WLXForm] := With[{
  containerUId = ToString[expr, StandardForm] // CreateFrontEndObject // First
}, With[{
  exprView = EditorView[FrontEndExecutable[containerUId], "ReadOnly"->True,"Selectable"->False ]
},
  With[{o = CreateFrontEndObject[ViewDecorator["Legend2", exprView, legendFunction] ]},
    MakeBoxes[o, WLXForm]
  ]
] ]

Legended /: MakeBoxes[Legended[expr_, legendFunction_ ], StandardForm] := With[{
  containerUId = ToString[expr, StandardForm] // CreateFrontEndObject // First
}, With[{
  exprView = EditorView[FrontEndExecutable[containerUId], "ReadOnly"->True, "Selectable"->False ]
},
  RowBox[{"(*VB[*)(Legended[ToExpression[FrontEndRef[\"", containerUId, "\"], InputForm], ", ToString[legendFunction, InputForm], "])(*,*)(*", ToString[Compress[ ViewDecorator["Legend", exprView, legendFunction] ], InputForm], "*)(*]VB*)"}]
] ]

Legended /: MakeBoxes[Legended[expr_, legendFunction_ ], WLXForm] := With[{
  containerUId = ToString[expr, StandardForm] // CreateFrontEndObject // First
}, With[{
  exprView = EditorView[FrontEndExecutable[containerUId], "ReadOnly"->True, "Selectable"->False ]
},
  With[{o = CreateFrontEndObject[ViewDecorator["Legend", exprView, legendFunction] ]},
    MakeBoxes[o, WLXForm]
  ]
] ]

Unprotect[BarLegend];
FormatValues[BarLegend] = {};

BarLegend /: MakeBoxes[BarLegend[{cf_, range_List}, opts___Rule, ___], form: WLXForm] := With[{o = CreateFrontEndObject[BoxForm`makeBarLegend[cf, range, opts] ]},
  MakeBoxes[o, form]
]

BarLegend /: MakeBoxes[BarLegend[{cf_, range_List}, opts___Rule, ___], form: StandardForm] := With[{o = CreateFrontEndObject[BoxForm`makeBarLegend[cf, range, opts] ]},
  With[{out = MakeBoxes[o, StandardForm]},
    ViewBox[out, o]
  ]
]

BoxForm`makeBarLegend[uid_String, JSON_String] := (CreateFrontEndObject[BoxForm`makeBarLegend @@ ImportByteArray[JSON//StringToByteArray, "ExpressionJSON"], uid]; uid)
BoxForm`makeBarLegend[{cf_, range_List}, opts___Rule, ___] :=  BoxForm`makeBarLegend[cf, range, opts]
BoxForm`makeBarLegend[cf_String, range_List, opts___Rule] := BoxForm`makeBarLegend[ColorData[cf], range, opts]
BoxForm`makeBarLegend[cf_] := BoxForm`makeBarLegend[cf, {0,1}]

BoxForm`makeBarLegend[{cf: {__RGBColor}, {min_, max_}}, rest___] := BoxForm`makeBarLegend[{Blend[cf, (# - min)/(max-min)]&, {min, max}}, rest]

BoxForm`makeBarLegend[cf_, range_List, opts___Rule] := With[{
  ticks = Table[{Round[i, (range[[2]] - range[[1]])/20.0], Null}, {i, range[[1]], range[[2]], (range[[2]] - range[[1]])/10.0}]
},
  With[{
    legend =   With[{options = Association[List[opts] ]}, 
    
    Module[{colorConvert, step = (ticks[[2, 1]] - ticks[[1, 1]]) * 0.5, 
      imageSize = 
        If[KeyExistsQ[options, ImageSize], options[ImageSize], 370 / 1.6180339  ]},
      
      (* Adjust the image size depending on whether it is a list or not *)
      imageSize = 
        1.2 If[!ListQ[imageSize], 
          (* If it's not a list, scale by the golden ratio *)
          imageSize {0.1, 1.0} ,
          (* If it's a list, adjust by the second element *)
          imageSize[[2]] {0.1, 1.0} // N
        ];

      If[imageSize[[1]] < 50.0, imageSize[[1]] = 50.0];

      (* Color conversion function based on range *)
      colorConvert[value_] := 
        cf @ ((value - range[[1]]) / (range[[2]] - range[[1]]));
      
      (* Create the graphic with rectangles for each tick *)
      Graphics[
        Map[
          Function[tick, 
            With[{val = tick[[1]], deco = tick[[2 ;;]]}, 
              {colorConvert[val], 
               Rectangle[{-1, val - step}, {1, val + step}]}
            ]
          ], 
          ticks
        ], 
        Axes -> True, Frame -> True, 
        FrameTicks -> {{{}, ticks[[All, 1]]}, {False, False}}, 
        TickLabels -> {False, False, False, True}, 
        PlotRange -> {{-1, 1}, range}, 
        "Controls" -> False, 
        ImageSize -> imageSize, 
        ImagePadding -> {{0, 25}, {0,0}},
        "PaddingIsImportant" -> True
      ]
    ]
  ]
  },
  
  legend
  
  ]
]





Unprotect[System`DateObjectDump`makeDateObjectBox]
Unprotect[DateObject]

DateObject /: System`DateObjectDump`makeDateObjectBox[System`DateObjectDump`dObj:DateObject[System`DateObjectDump`date_,___], WLXForm] := With[{res = TextString[System`DateObjectDump`dObj]}, res/;System`DateObjectDump`fname=!=$Failed]

System`DateObjectDump`makeDateObjectBox[System`DateObjectDump`dObj:DateObject[System`DateObjectDump`date_,___], WLXForm] := With[{res = TextString[System`DateObjectDump`dObj]}, res/;System`DateObjectDump`fname=!=$Failed]

(* have to convert to FE and EditorView, since there is no wljs-editor avalable to interpretate RowBoxes*)

(* FUCK it slows down Plot fo some reasons *)
(*Unprotect[DynamicBox];
ClearAll[DynamicBox];
DynamicBox[x_] := x;*)

(* :: SummaryBox ::*)

BoxForm`ArrangeSummaryBox;

Unprotect[BoxForm`ArrangeSummaryBox]
ClearAll[BoxForm`ArrangeSummaryBox]

Unprotect[BoxForm`SummaryItem]

BoxForm`SummaryItem[{label_String, view_}] := With[{encoded = ToString[view, StandardForm]//URLEncode}, BoxForm`SummaryItemView[label, EditorView[encoded//URLDecode//Hold, "ReadOnly"->True] ] ]

BoxForm`SummaryItem[{label_String}] := BoxForm`SummaryItemView[label, ""]

BoxForm`SummaryItem[{view_}] := BoxForm`SummaryItem[{"", view}]


If[!AssociationQ[BoxForm`IconsStore], BoxForm`IconsStore = <||>];

If[!ListQ[BoxForm`temporal], BoxForm`temporal = {}];

Options[BoxForm`ArrangeSummaryBox] = {"Event" -> Null}

If[!ListQ[BoxForm`boxes], BoxForm`boxes = {}];

BoxForm`ArrangeSummaryBox[head_, interpretation_, icon_, above_, below_, BoxForm`opts:OptionsPattern[] ] := With[{a = If[ListQ[above], above, {}]}, BoxForm`ArrangeSummaryBox[head, interpretation, icon, a, {}, StandardForm, BoxForm`opts] ]

BoxForm`ArrangeSummaryBox[head_, interpretation_, icon_, above_, below_, BoxForm`fmt_, BoxForm`opts:OptionsPattern[] ] := With[{a = If[ListQ[above], above, {}]}, BoxForm`ArrangeSummaryBox[head, interpretation, icon, a, {}, StandardForm, BoxForm`opts] ]

BoxForm`ArrangeSummaryBox[head_, interpretation_, icon_, above_List, _List, BoxForm`fmt_, BoxForm`opts:OptionsPattern[] ] := With[{
  headString = If[!StringQ[head], ToString[head, InputForm], head],
  interpretationHead = ToString[ Head[interpretation], InputForm ],
  event = OptionValue["Event"],
  iconHash = Hash[icon],
  hidden = False
},

  AppendTo[BoxForm`boxes, Hold[{head, interpretation, icon, above}] ];

  (* Wolfram cleans up icon symbols for some reason. Frontend cannot get them back. Also to fix this and improve caching we will store the copies of them separately *)
  With[{iconSymbol = If[KeyExistsQ[BoxForm`IconsStore, iconHash], 
                      BoxForm`IconsStore[iconHash]
                    ,
                      Module[{},
                        If[icon === None, Return[Hold[None], Module ] ];
                        BoxForm`IconsStore[iconHash] = CreateFrontEndObject[icon];
                        BoxForm`IconsStore[iconHash]
                      ]
                      
                    ]},
  If[ByteCount[interpretation] < BoxForm`$SummaryBoxSizeLimit,               
  With[{interpretationString = ToString[interpretation, InputForm]},
    If[StringLength[interpretationString] > 2500 || (interpretationHead =!= headString && StringQ[head]),
      Module[{BoxForm`temporalStorage},
        With[{
          BoxForm`tempSymbol = ToString[BoxForm`temporalStorage, InputForm],
          viewBox = StringRiffle[{headString, "[(*VB[*) ", "(*,*)(*", ToString[Compress[ProvidedOptions[BoxForm`ArrangedSummaryBox[iconSymbol , above, hidden], "DataOnKernel"->True ] ], InputForm ], "*)(*]VB*)]"}, ""]
        },
          AppendTo[BoxForm`temporal, Hold[BoxForm`temporalStorage] ];

          BoxForm`temporalStorage = interpretation;

          With[{fakeEditor = EditorView[viewBox, "ReadOnly"->True, "Selectable"->False]},
            RowBox[{"(*VB[*)", BoxForm`tempSymbol, "(*,*)(*", ToString[Compress[fakeEditor], InputForm ], "*)(*]VB*)"}]
          ]
        ]
      ]
    ,
      
        If[event === Null,
          If[interpretationHead =!= headString && !StringQ[head],
            RowBox[{headString, "[", "(*VB[*) ", interpretationString, " (*,*)(*", ToString[Compress[BoxForm`ArrangedSummaryBox[iconSymbol , above, hidden] ], InputForm ], "*)(*]VB*)", "]"}]          
          ,
            RowBox[{headString, "[", "(*VB[*) ", StringDrop[StringDrop[interpretationString, -1], StringLength[interpretationHead] + 1], " (*,*)(*", ToString[Compress[BoxForm`ArrangedSummaryBox[iconSymbol // FrontEndVirtual, above, hidden] ], InputForm ], "*)(*]VB*)", "]"}]
          ]
        ,
          If[interpretationHead =!= headString && !StringQ[head],
            RowBox[{headString, "[", "(*VB[*) ", interpretationString, " (*,*)(*", ToString[Compress[ProvidedOptions[BoxForm`ArrangedSummaryBox[iconSymbol , above, hidden], "Event" -> event] ], InputForm ], "*)(*]VB*)", "]"}]
          ,
            RowBox[{headString, "[", "(*VB[*) ", StringDrop[StringDrop[interpretationString, -1], StringLength[interpretationHead] + 1], " (*,*)(*", ToString[Compress[ProvidedOptions[BoxForm`ArrangedSummaryBox[iconSymbol // FrontEndVirtual, above, hidden], "Event" -> event] ], InputForm ], "*)(*]VB*)", "]"}]
          ]
        ]
      
    ]
  ],
      Module[{BoxForm`temporalStorage},
        With[{
          BoxForm`tempSymbol = ToString[BoxForm`temporalStorage, InputForm],
          viewBox = StringRiffle[{headString, "[(*VB[*) ", "(*,*)(*", ToString[Compress[ProvidedOptions[BoxForm`ArrangedSummaryBox[iconSymbol , above, hidden], "DataOnKernel"->True ] ], InputForm ], "*)(*]VB*)]"}, ""]
        },
          AppendTo[BoxForm`temporal, Hold[BoxForm`temporalStorage] ];

          BoxForm`temporalStorage = interpretation;

          With[{fakeEditor = EditorView[viewBox, "ReadOnly"->True, "Selectable"->False]},
            RowBox[{"(*VB[*)", BoxForm`tempSymbol, "(*,*)(*", ToString[Compress[fakeEditor], InputForm ], "*)(*]VB*)"}]
          ]
        ]
      ]
  ]
  ]
] // Quiet

Options[BoxForm`ArrangeSummaryBox] = Append[Options[BoxForm`ArrangeSummaryBox], "Event"->Null]



SetAttributes[BoxForm`ArrangeSummaryBox, HoldAll]


(* :: Boxes for Graph Object :: *)

Unprotect[Graph] 
Graph /: MakeBoxes[g_Graph, StandardForm] := With[{c = Insert[GraphPlot[g, ImageSize->200, AspectRatio->1, ImagePadding->None], "Controls"->False, {2,-1}] }, 
  If[ByteCount[g] > 3250,
    LeakyModule[{temporal},
      With[{v = ViewBox[temporal, CreateFrontEndObject[c] ]},
        AppendTo[Kernel`Internal`garbage, Hold[temporal] ];
        temporal = g;
        v
      ]
    ]    
  ,
    ViewBox[g, c] 
  ]
  
]


(* :: Pane box :: *)


Unprotect[PaneBox]
PaneBox[expr_, a___] := BoxBox[expr, ViewDecorator["Pane", a] ]

Unprotect[Pane]
Pane /: EventHandler[p_Pane, list_List] := With[{
  uid = CreateUUID[],
  assoc = Association[list]
},
  EventHandler[uid, Lookup[assoc, "Click", assoc["click"] ] ];
  Insert[p, "Event"->uid, -1]
]

(* :: BoundaryMeshRegion :: *)
Unprotect[BoundaryMeshRegion]
FormatValues[BoundaryMeshRegion] = {}


BoundaryMeshRegion /: MakeBoxes[b_BoundaryMeshRegion, StandardForm] := With[{r = If[RegionDimension[b] == 3, RegionPlot3D[b, ImageSize->200], Insert[RegionPlot[b, ImageSize->200, Axes->False, Frame->False, ImagePadding->10], "Controls"->False, {2,-1}]] // CreateFrontEndObject // BoxForm`ToViewBox},
  If[ByteCount[b] > 3250,
    LeakyModule[{temporal},
      With[
        {v = Interpretation[Labeled[r, Style["Data is on Kernel", Gray, 10, FontFamily->"system-ui"] ]//Panel, temporal]},
        {box = MakeBoxes[v, StandardForm]},      
        AppendTo[Kernel`Internal`garbage, Hold[temporal] ];
        temporal = b;
        box
      ]
    ]
    
  ,
    ViewBox[b, r]
  ]
  
]

(*  :: Mesh Region :: *)
Unprotect[MeshRegion]
FormatValues[MeshRegion] = {}


MeshRegion /: MakeBoxes[b_MeshRegion, StandardForm] := With[{r = If[RegionDimension[b] == 3, RegionPlot3D[b, ImageSize->200], Insert[RegionPlot[b, ImageSize->200, Axes->False, Frame->False, ImagePadding->10], "Controls"->False, {2,-1}]] // CreateFrontEndObject // BoxForm`ToViewBox},
  If[ByteCount[b] > 3250,
    LeakyModule[{temporal},
      With[
        {v = Interpretation[Labeled[r, Style["Data in on Kernel", Gray, 10, FontFamily->"system-ui"] ]//Panel, temporal]},
        {box = MakeBoxes[v, StandardForm]},
        AppendTo[Kernel`Internal`garbage, Hold[temporal] ];
        temporal = b;
        box
      ]
    ]
    
  ,
    ViewBox[b, r]
  ]
]

(* :: Region :: *)

Unprotect[Region]
FormatValues[Region] = {}


Region /: MakeBoxes[b_Region, StandardForm] := With[{r = If[RegionDimension[b] == 3, RegionPlot3D[b, ImageSize->200], Insert[RegionPlot[b, ImageSize->200, Axes->False, Frame->False, ImagePadding->10], "Controls"->False, {2,-1}]] // CreateFrontEndObject // BoxForm`ToViewBox},
  If[ByteCount[b] > 3250,
    LeakyModule[{temporal},
      With[{v = ViewBox[temporal, r]},
        AppendTo[Kernel`Internal`garbage, Hold[temporal]];
        temporal = b;
        v
      ]
    ]
    
  ,
    ViewBox[b, r]
  ]
]

(* :: EventObject boxes :: *)

BoxForm`EventObjectHasView[assoc_Association] := KeyExistsQ[assoc, "View"]
EventObject /: MakeBoxes[EventObject[a_?BoxForm`EventObjectHasView], StandardForm] := If[StringQ[a["View"] ],
  (* reuse an existing FE Object to save up resources, if someone copied it *)
  With[{uid = a["View"]}, 
    RowBox[{"(*VB[*)(", ToString[EventObject[Join[a, <|"View"->uid|>] ], InputForm], ")(*,*)(*", ToString[Compress[Hold[FrontEndExecutable[uid]]], InputForm], "*)(*]VB*)"}]
  ]
,
  With[{uid = CreateFrontEndObject[a["View"] ] // First}, 
    RowBox[{"(*VB[*)(", ToString[EventObject[Join[a, <|"View"->uid|>] ], InputForm], ")(*,*)(*", ToString[Compress[Hold[FrontEndExecutable[uid]]], InputForm], "*)(*]VB*)"}]
  ] 
]

EventObject /: Inset[EventObject[a_?BoxForm`EventObjectHasView], rest___ ] := If[StringQ[a["View"] ],
  (* reuse an existing FE Object to save up resources, if someone copied it *)
  With[{uid = a["View"]}, 
    Inset[FrontEndExecutable[uid], rest]
  ]
,
  With[{uid = CreateFrontEndObject[a["View"] ] // First}, 
    Inset[FrontEndExecutable[uid], rest]
  ] 
]


(* :: Row, Column adaptation for WLXForm :: *)

Unprotect[Row]

FormatValues[Row] = {};
Row /: MakeBoxes[Row[expr_List, opts:OptionsPattern[]], StandardForm] := With[{g = Grid[{expr}, opts]},
    MakeBoxes[g, StandardForm]
]

Row /: MakeBoxes[Row[expr_List, sep_, opts:OptionsPattern[]], StandardForm] := With[{g = Grid[{Riffle[expr, sep]}, opts]},
    MakeBoxes[g, StandardForm]
]


Row /: MakeBoxes[Row[expr__, OptionsPattern[] ], WLXForm] := With[{list = List[expr]},
  With[{Res = Map[MakeBoxes[#, WLXForm]&, list]},
    StringJoin["<div class=\"flex flex-row\">", StringRiffle[Res, "\n"], "</div>"]
  ]
]

Row /: MakeBoxes[Row[expr_List, OptionsPattern[] ], WLXForm] := With[{list = expr},
  With[{Res = Map[MakeBoxes[#, WLXForm]&, list]},
    StringJoin["<div class=\"flex flex-row\">", StringRiffle[Res, "\n"], "</div>"]
  ]
]

Unprotect[Column]

Column /: MakeBoxes[Column[expr__, OptionsPattern[] ], WLXForm] := With[{list = List[expr]},
  With[{Res = Map[MakeBoxes[#, WLXForm]&, list]},
    StringJoin["<div class=\"flex flex-col\">", StringRiffle[Res, "\n"], "</div>"]
  ]
]

Column /: MakeBoxes[Column[expr_List, OptionsPattern[] ], WLXForm] := With[{list = expr},
  With[{Res = Map[MakeBoxes[#, WLXForm]&, list]},
    StringJoin["<div class=\"flex flex-col\">", StringRiffle[Res, "\n"], "</div>"]
  ]
]

(* :: Squiggled convertion  ::*)

Unprotect[Squiggled]

Unprotect[Style]

Style[Style[expr_, a__], b__] := Style[expr, b, a]

Squiggled[expr_, color_:Lighter[Red] ] := Style[expr, Underlined -> color]





General::wljsunsupported = "Symbol `` is not supported in WLJS. We are sorry";

(* abandoned symbols. sorry, someoneelse should do that *)

With[{ unsupported = {GraphicsRow, WordCloud, GraphicsColumn, ClockGauge, GeoListPlot, GeoGraphics, InputField, GraphicsGrid, GalleryView, FormObject, FormFunction, FormPage, Toggler, Opener, Setter, RadioButton, Control, CheckboxBar, RadioButtonBar, Setter, Checkbox, Toggler, SetterBar, RadioButton, Checkbox, PopupMenu, FileNameSetter, ColorSetter, Trigger, HorizontalGauge, Setter, BulletGauge, AngularGauge, ThermometerGauge, Slider, VerticalSlider, Slider2D, IntervalSlider, Manipulator, HorizontalGauge, Slider2D, ColorSlider, LocatorPane, SlideView, MenuView, FlipView, PopupView, OpenerView, PaneSelector}},
  Do[With[{item = i},
    Unprotect[item];
    ClearAll[item];
  ], {i, unsupported}]
];

GraphicsRow /: MakeBoxes[GraphicsRow[list_, ___], any_] := With[{b = Row[list]},
  MakeBoxes[b, any]
]
GraphicsColumn /: MakeBoxes[GraphicsColumn[list_, ___], any_ ] := With[{b = Column[list]},
  MakeBoxes[b, any]
]
GraphicsGrid /: MakeBoxes[GraphicsGrid[list_, ___], any_] := With[{b = Grid[list]},
  MakeBoxes[b, any]
]


HorizontalGauge[all__] := (
  If[Length[Kernels[] ] == 0, LaunchKernels[1] ];

  ParallelSubmit[Rasterize[HorizontalGauge[all] ]]//WaitAll
);

BulletGauge[all__] := (
  If[Length[Kernels[] ] == 0, LaunchKernels[1] ];

  ParallelSubmit[Rasterize[BulletGauge[all] ]]//WaitAll
);

AngularGauge[all__] := (
  If[Length[Kernels[] ] == 0, LaunchKernels[1] ];

  ParallelSubmit[Rasterize[AngularGauge[all] ]]//WaitAll
);

ThermometerGauge[all__] := (
  If[Length[Kernels[] ] == 0, LaunchKernels[1] ];

  ParallelSubmit[Rasterize[ThermometerGauge[all] ]]//WaitAll
);

ClockGauge[all__] := (
  If[Length[Kernels[] ] == 0, LaunchKernels[1] ];

  ParallelSubmit[Rasterize[ClockGauge[all] ]]//WaitAll
);

(* :: GeoGraphics :: *)
(* Sorry, it is soo complicated to implement this :() *)

GeoGraphics[all__] := (
  If[Length[Kernels[] ] == 0, LaunchKernels[1] ];

  ParallelSubmit[Rasterize[GeoGraphics[all] ]]//WaitAll
)

GeoListPlot[all__] := (
  If[Length[Kernels[] ] == 0, LaunchKernels[1] ];

  ParallelSubmit[Rasterize[GeoListPlot[all] ]]//WaitAll
)



(* :: WordCoud :: *)
(* Sorry, it is soo complicated to implement this :() *)

WordCloud[all__] := (
  If[Length[Kernels[] ] == 0, LaunchKernels[1] ];

  ParallelSubmit[Rasterize[WordCloud[all] ]]//WaitAll
)

(* ::: TeX forms are currently not supported ;(  ::: *)


Unprotect[TeXForm]
ClearAll[TeXForm]
Unprotect[MathMLForm]
ClearAll[MathMLForm]

TeXForm[all__] := (
  If[Length[Kernels[] ] == 0, LaunchKernels[1] ];
  ParallelSubmit[ToString[TeXForm[all], InputForm]]//WaitAll
)

MathMLForm[all__] := (
  If[Length[Kernels[] ] == 0, LaunchKernels[1] ];
  ParallelSubmit[ToString[MathMLForm[all], InputForm]]//WaitAll
)


(* ::Entity boxes :: *)
Entity;
Unprotect[Entity];
EntityFramework`MakeEntityFrameworkBoxes;

Unprotect[TemplateBox];
TemplateBox[{name_, entity_, raw_, type_}, "Entity"] := entity  

TemplateBox[list: {__}, "KroneckerDeltaSeq"] := RowBox[{"KroneckerDelta", "[", Sequence @@ Riffle[list, ","], "]"}]

Entity /: MakeBoxes[EntityFramework`Formatting`Private`x_Entity,
     EntityFramework`Formatting`Private`fmt_
    ] :=
    (Entity;With[{EntityFramework`Formatting`Private`boxes = ViewBox[EntityFramework`Formatting`Private`x, ViewDecorator["Entity", EntityTypeName[EntityFramework`Formatting`Private`x], EntityFramework`Formatting`Private`x//EntityValue //TextString ] ]},
        
        EntityFramework`Formatting`Private`boxes/;EntityFramework`Formatting`Private`boxes=!=$Failed
])

Unprotect[EntityFramework`MakeEntityFrameworkBoxes]
ClearAll[EntityFramework`MakeEntityFrameworkBoxes]
EntityFramework`MakeEntityFrameworkBoxes[EntityFramework`Formatting`Private`x_Entity ,
     EntityFramework`Formatting`Private`fmt_] := With[{EntityFramework`Formatting`Private`boxes = ViewBox[EntityFramework`Formatting`Private`x, ViewDecorator["Entity", EntityTypeName[EntityFramework`Formatting`Private`x], EntityFramework`Formatting`Private`x//EntityValue //TextString ] ]},
        
        EntityFramework`Formatting`Private`boxes
]

EntityFramework`MakeEntityFrameworkBoxes[ EntityFramework`Formatting`Private`x_EntityClass,
     EntityFramework`Formatting`Private`fmt_] := With[{EntityFramework`Formatting`Private`boxes = ViewBox[EntityFramework`Formatting`Private`x, ViewDecorator["Entity", EntityTypeName[EntityFramework`Formatting`Private`x], EntityFramework`Formatting`Private`x[[1]] //TextString ] ]},
        
        EntityFramework`Formatting`Private`boxes
]

EntityFramework`MakeEntityFrameworkBoxes[ any_, EntityFramework`Formatting`Private`fmt_] := With[{EntityFramework`Formatting`Private`boxes = ToString[any, InputForm]},
        EntityFramework`Formatting`Private`boxes
]

Unprotect[EntityProperty]

FormatValues[EntityProperty] = {};
EntityProperty /: MakeBoxes[e_EntityProperty, _] := ToString[e, InputForm]

TemplateBox[{_String, e_EntityProperty, _String}, "EntityProperty"] := e;
TemplateBox[{_, e_, ___}, "EntityProperty"] := e;

(* :: Resource function boxes :: *)

Unprotect[FunctionResource`Formatting`Private`makeResourceFunctionBoxes]
ClearAll[FunctionResource`Formatting`Private`makeResourceFunctionBoxes]

FunctionResource`Formatting`Private`makeResourceFunctionBoxes[s_, StandardForm] := With[{
		summary = {BoxForm`SummaryItem[{"Name: ", s[[1,1,"Name"]]}]}
	},
		BoxForm`ArrangeSummaryBox[
			ResourceFunction,
			s,
			None,
			summary,
      {},
      StandardForm
		]
	]


(* :: System Infromation boxes :: *)

Unprotect[System`InformationDump`detailBoxes]
ClearAll[System`InformationDump`detailBoxes]

Unprotect[SystemInformation]
FormatValues[SystemInformation] = {}

Unprotect[InformationData]
FormatValues[InformationData] = {}

toStringOutputForm[any_] := ToString[any, OutputForm];
toStringOutputForm[any_String] := ToString[any, OutputForm];
toStringOutputForm[any_List] := HoldForm[any];
toStringOutputForm[any_Association] := HoldForm[any];

MakeBoxes[d_InformationData, StandardForm] := (

  
  With[{ i = Map[toStringOutputForm, d//Dataset ] },
    MakeBoxes[i, StandardForm]
  ]
)

Unprotect[InformationDataGrid]
FormatValues[InformationDataGrid] = {};

InformationDataGrid /: MakeBoxes[InformationDataGrid[data_,___], StandardForm] := Module[{}, With[{a = Association[data]},
  If[!AssociationQ[a], Return[$Failed] ];

  With[{test = KeyValueMap[Function[{key, val},
    {key, val}
  ], a]},

    With[{
      set = With[{}, 
  MapIndexed[Function[{head, indx},
    Join[{Style[test[[indx[[1]], 1]], Bold]}, head]
  ], PadRight[Map[Function[u,
    u[[2]]
  ], test], Automatic, Missing[]]]
] //Transpose // Dataset 
    },
      MakeBoxes[set, StandardForm]
    ]
  ]
] ]


Protect[InformationData]



BoxForm`TabViewBox;
TabView;

Unprotect[BoxForm`TabViewBox]
ClearAll[BoxForm`TabViewBox];

Unprotect[TabView]
FormatValues[TabView] = {};
ClearAll[TabView]

TabView[l:{Except[expr_Rule]..}, default_Integer:1] := TabView[Table[ToString[i]->l[[i]], {i, Length[l]}], default]

TabView /: MakeBoxes[TabView[list:{r__Rule}, default_Integer:1], StandardForm] := With[{
  labels = With[{s = #[[1]]},
    If[StringQ[s],
      s
    ,
      EditorView[ToString[s, StandardForm], "ReadOnly"->True, "Selectable"->False] // CreateFrontEndObject
    ]
  ] &/@ list,

  values = EditorView[ToString[#[[2]], StandardForm], "ReadOnly"->True, "Selectable"->False] &/@ list
},
  ViewBox[Null, BoxForm`TabViewBox[labels, values, default] ]
]

TabView /: MakeBoxes[TabView[list:{r__Rule}, default_Integer:1], WLXForm] := With[{
  labels = With[{s = #[[1]]},
    If[StringQ[s],
      s
    ,
      EditorView[ToString[s, StandardForm], "ReadOnly"->True, "Selectable"->False] // CreateFrontEndObject
    ]
  ] &/@ list,

  values = EditorView[ToString[#[[2]], StandardForm], "ReadOnly"->True, "Selectable"->False] &/@ list
},
  With[{ o = CreateFrontEndObject[BoxForm`TabViewBox[labels, values, default] ]},
    MakeBoxes[o, WLXForm]
  ]
]




(* :: Inactivate Workarounds :: *)
(* IMPORNTAT for IMPORTING Mathematica's Expressions *)

Unprotect[Inactive];
FormatValues[Inactive] = {
 
  HoldPattern[MakeBoxes[Inactive[Part][BoxForm`head_, InactiveDump`spec__], BoxForm`fmt_] /; BoxForm`sufficientVersionQ[10.]] :> RowBox[{MakeBoxes[BoxForm`head, StandardForm], "[[", Sequence @@ Riffle[BoxForm`ListMakeBoxes[{InactiveDump`spec}, BoxForm`fmt], ","], "]]"}],

  HoldPattern[MakeBoxes[Inactive[head: (RGBColor | DateObject | Hue | LABColor | DateObject | Dataset)][InactiveDump`spec__], BoxForm`fmt_] /; BoxForm`sufficientVersionQ[10.] ] :> MakeBoxes[head[InactiveDump`spec], BoxForm`fmt],

  HoldPattern[MakeBoxes[Inactive[CompoundExpression][BoxForm`args__, Null], BoxForm`fmt_]] :> With[{InactiveDump`semi = TagBox[";\n", "InactiveToken", BaseStyle -> InactiveDump`makeStyle[BoxForm`fmt], SyntaxForm -> ";"]}, RowBox[Append[BoxForm`MakeInfixForm[CompoundExpression[BoxForm`args], InactiveDump`semi, BoxForm`fmt], ";\n" ] ] ],
  HoldPattern[MakeBoxes[Inactive[CompoundExpression][BoxForm`args__], BoxForm`fmt_] /; Length[Unevaluated[{BoxForm`args}]] > 1] :> RowBox[BoxForm`MakeInfixForm[CompoundExpression[BoxForm`args], TagBox[";\n", "InactiveToken", BaseStyle -> InactiveDump`makeStyle[BoxForm`fmt], SyntaxForm -> ";"], BoxForm`fmt]],
  HoldPattern[MakeBoxes[Inactive[ReplaceAll][InactiveDump`l_, BoxForm`r_], BoxForm`fmt_]] :> RowBox[BoxForm`MakeInfixForm[InactiveDump`l /. BoxForm`r, TagBox["/.", "InactiveToken", BaseStyle -> InactiveDump`makeStyle[BoxForm`fmt], SyntaxForm -> "/."], BoxForm`fmt]],
  HoldPattern[MakeBoxes[Inactive[ReplaceRepeated][InactiveDump`l_, BoxForm`r_], BoxForm`fmt_]] :> RowBox[BoxForm`MakeInfixForm[InactiveDump`l //. BoxForm`r, TagBox["//.", "InactiveToken", BaseStyle -> InactiveDump`makeStyle[BoxForm`fmt], SyntaxForm -> "//."], BoxForm`fmt]], 
  HoldPattern[MakeBoxes[Inactive[Times][BoxForm`a_, BoxForm`b__], BoxForm`fmt_]] :> RowBox[BoxForm`MakeInfixForm[BoxForm`a*BoxForm`b, TagBox[" ", "InactiveToken", BaseStyle -> InactiveDump`makeStyle[BoxForm`fmt], SyntaxForm -> "a*b"], BoxForm`fmt]], 
  HoldPattern[MakeBoxes[Inactive[BoxForm`head_][BoxForm`args___], BoxForm`fmt:StandardForm] /;  !BoxForm`UsesPreInPostFixOperatorQ[BoxForm`head] && BoxForm`sufficientVersionQ[10.]] :> RowBox[{TemplateBox[{MakeBoxes[BoxForm`head, StandardForm]}, "InactiveHead", BaseStyle -> InactiveDump`makeStyle[BoxForm`fmt], Tooltip -> StringJoin["Inactive[", ToString[Unevaluated[BoxForm`head], InputForm], "]"], SyntaxForm -> "Symbol"], "[", Switch[Length[Unevaluated[{BoxForm`args}]], 0, Sequence @@ {}, 1, MakeBoxes[BoxForm`args, BoxForm`fmt], _, RowBox[Riffle[BoxForm`ListMakeBoxes[{BoxForm`args}, BoxForm`fmt], ","]]], "]"}]

};

(* :: ProgressIndicator :: *)

Unprotect[ProgressIndicator];
ClearAll[ProgressIndicator]

ProgressIndicator[o: OptionsPattern[]] := ProgressIndicator[0, o];
ProgressIndicator[x_, Indeterminate, o: OptionsPattern[]] := ProgressIndicator[x, "Indeterminate", o]
ProgressIndicator[x_, o: OptionsPattern[] ] := ProgressIndicator[x, {0,1}, o]

MakeBoxes[p_ProgressIndicator, StandardForm] := ViewBox[p, p]
MakeBoxes[p_ProgressIndicator, WLXForm] := With[{v = CreateFrontEndObject[p]},
  MakeBoxes[v, WLXForm]
]

Options[ProgressIndicator] = {};

(* :: Derivative :: *)

Unprotect[D]
(* drop to avoid complicated boxes forms *)
FormatValues[D] = {};

(* :: Failure Boxes :: *)

BoxForm`failureIcon = Graphics[{ EdgeForm[Red], White, Triangle[{{-1,-(*SqB[*)Sqrt[2](*]SqB*)/2}, {0,(*SqB[*)Sqrt[2](*]SqB*)}, {1,-(*SqB[*)Sqrt[2](*]SqB*)/2}}],{
  Red, Text[Style["!", FontSize->16], {0,0}, {0,0}]
}}, ImageSize->30, PlotRange->{1.15{-1,1}, 1.15{-(*SqB[*)Sqrt[2](*]SqB*)/2,(*SqB[*)Sqrt[2](*]SqB*)}}];

Unprotect[Failure];

Failure;
FormatValues[Failure] = {};

Failure /: MakeBoxes[f:Failure[__], form: StandardForm] := With[{
  params = f["MessageParameters"]
},
  With[{msg = If[MemberQ[f["Properties"] , "MessageParameters"] && MemberQ[f["Properties"] , "MessageTemplate"], StringTemplate[f @ "MessageTemplate"] @ params, If[StringQ[f[[2, "Message"]]], f[[2, "Message"]], "Generic"] ]},
    BoxForm`ArrangeSummaryBox[
                 Failure, (* head *)
                 f,      (* interpretation *)
                 BoxForm`failureIcon,    (* icon, use None if not needed *)
                 (* above and below must be in a format suitable for Grid or Column *)
                 {
                   {BoxForm`SummaryItem[{"Error: ", Style[msg, Bold]}]}, 
                   {BoxForm`SummaryItem[{f//First}]}
                 },    (* always shown content *)
                 Null (* expandable content. Currently not supported!*)
    ]
  ]
]

Failure /: MakeBoxes[f:Failure[_, command_Association], form: StandardForm] := With[{
  params = f["MessageParameters"]
},
  With[{msg = If[MemberQ[f["Properties"] , "MessageParameters"] && MemberQ[f["Properties"] , "MessageTemplate"], StringTemplate[f @ "MessageTemplate"] @ params, Lookup[command, "StandardError", If[StringQ[f[[2, "Message"]]], f[[2, "Message"]], "Generic"] ] ]},
    BoxForm`ArrangeSummaryBox[
                 Failure, (* head *)
                 f,      (* interpretation *)
                 BoxForm`failureIcon,    (* icon, use None if not needed *)
                 (* above and below must be in a format suitable for Grid or Column *)
                 {
                   {BoxForm`SummaryItem[{"Error: ", Style[msg, Bold]}]}, 
                   {BoxForm`SummaryItem[{f//First}]}
                 },    (* always shown content *)
                 Null (* expandable content. Currently not supported!*)
    ]
  ]
]

Unprotect[Success]
FormatValues[Success] = {};
Success /: MakeBoxes[f:Success[__], form: StandardForm] := With[{
  keys = f["Properties"]
},
  With[{msg = Table[{
    BoxForm`SummaryItem[{k, f[k]}]
  }, {k, Complement[keys, {"StandardError", "StandardOutput"}]}]},
    BoxForm`ArrangeSummaryBox[
                 Success, (* head *)
                 f,      (* interpretation *)
                 None,    (* icon, use None if not needed *)
                 (* above and below must be in a format suitable for Grid or Column *)
                 msg,    (* always shown content *)
                 Null (* expandable content. Currently not supported!*)
    ]
  ]
]

(* Tooltip: reimplementation *)
Unprotect[Tooltip];
FormatValues[Tooltip] = {}
ClearAll[Tooltip]

makeTooltipId[expr_] := BoxForm`TooltipId[ CreateFrontEndObject[EditorView[ToString[expr/.{Charting`iHold -> HoldForm}, StandardForm], "Selectable"->False, "ReadOnly"->True ] ][[1]] ]
makeTooltipId[expr_String | expr_Real | expr_Integer] := expr

Tooltip[l1_List, l2_List] := (Tooltip@@#)&/@Transpose[{l1,l2}] /; Length[l1]===Length[l2]
Tooltip[x_] := Tooltip[x, x]
Tooltip[x_, expr_, ___] := Tooltip[x,  makeTooltipId[expr] ] /; (!MatchQ[expr, _String | _Real | _Integer | _BoxForm`TooltipId])

Tooltip /: MakeBoxes[Tooltip[x_, tool_, ___], form_] := With[{
  boxes = MakeBoxes[x, form]
},
  BoxBox[boxes, ViewDecorator["Tooltip", tool] ]
]

(* ROOT Boxes *)
Unprotect[Root];
FormatValues[Root];
FormatValues[Root] = {};
Root /: MakeBoxes[r_Root, StandardForm] :=  ViewBox[r, ViewDecorator["Root", N[r] ] ] /; NumberQ[ N[r] ];
Protect[Root];

(* Device Object *)
Unprotect[DeviceObject]
FormatValues[DeviceObject] = {}

DeviceObject /: MakeBoxes[d: DeviceObject[o_List],  StandardForm] := Module[{above},
        above = { 
          {BoxForm`SummaryItem[{"Class: ", o//First}]},
          {BoxForm`SummaryItem[{"ID: ", o[[2]]}]}, 
          {BoxForm`SummaryItem[{"Status: ", Refresh[If[DeviceOpenQ[d]//TrueQ, Green, Red], 1]}]}
        };

        BoxForm`ArrangeSummaryBox[
           DeviceObject,
           d,
           None,
           above,
           Null
        ]
    ];


Unprotect[OpenerView]
FormatValues[OpenerView] = {};
OpenerView /: MakeBoxes[OpenerView[expr:{_, _}], form_] := makeBoxesOpener[expr, False, form]
OpenerView /: MakeBoxes[OpenerView[expr:{_, _}, state_], form_] := makeBoxesOpener[expr, TrueQ[state], form]


makeBoxesOpener[{s_String, expr_}, initial_, StandardForm] := With[{eView = CreateFrontEndObject@EditorView[ToString[expr, StandardForm], "ReadOnly"->True, "Selectable"->False ]},
  ViewBox[Null, ViewDecorator["OV", s, eView, initial, True] ]
]

makeBoxesOpener[{s_String, expr_}, initial_, WLXForm] := With[{eView = EditorView[ToString[expr, StandardForm], "ReadOnly"->True,"Selectable"->False ]},
  With[{b = CreateFrontEndObject@ViewDecorator["OV", s, eView, initial, True]},
    MakeBoxes[b, WLXForm]
  ]
]

makeBoxesOpener[{s_, expr_}, initial_, StandardForm] := With[{
  eView = CreateFrontEndObject@EditorView[ToString[expr, StandardForm], "ReadOnly"->True,"Selectable"->False ],
  sView = CreateFrontEndObject@EditorView[ToString[s, StandardForm], "ReadOnly"->True,"Selectable"->False ]
},
  ViewBox[Null, ViewDecorator["OV", sView, eView, initial, False] ]
]

makeBoxesOpener[{s_, expr_}, initial_, WLXForm] := With[{
  eView = EditorView[ToString[expr, StandardForm], "ReadOnly"->True ,"Selectable"->False],
  sView = EditorView[ToString[s, StandardForm], "ReadOnly"->True,"Selectable"->False ]
},
  With[{b = CreateFrontEndObject@ViewDecorator["OV", sView, eView, initial, False]},
    MakeBoxes[b, WLXForm]
  ]
]

(* StandardForm and TranditionalForm *)
Unprotect[FormBox]
Unprotect[StandardForm]

FormBox[expr_, StandardForm] := expr
FormBox[expr_, TraditionalForm] := expr /. {RowBox->StringJoin}

(* add missing for WLXForm *)
StandardForm /: MakeBoxes[StandardForm[expr_], WLXForm] := With[{
    editor = EditorView[ToString[expr, StandardForm], "ReadOnly"->True, "Focusable"->False, "Selectable"->False] // CreateFrontEndObject
},
    MakeBoxes[editor, WLXForm]
]


(* WL14 with no reason reloads the definitons of some symbols *)
(* It breaks ANY FormatValues (even for custom forms) and Downvalues ofc *)
(* In this example to reproduce see issue https://github.com/WLJSTeam/wolfram-js-frontend/issues/396  *)

$rootPackageDirectory = DirectoryName[$InputFileName] // ParentDirectory;

If[Internal`Kernel`Watchdog["Enabled"],
  With[{
    file = FileNameJoin[{$rootPackageDirectory, "src", "BoxesWorkarounds.wl"}],
    tag = "Boxes Workarounds (Editor)"
  },
    Internal`Kernel`Watchdog["Assertion", "ArrangeSummaryBox",
      DownValues[BoxForm`ArrangeSummaryBox]//Hash
    ,
      Get[file]
    , tag];

    Internal`Kernel`Watchdog["Assertion", "GridBox",
      DownValues[GridBox]//Hash
    ,
      Get[file]
    , tag];    

    Internal`Kernel`Watchdog["Assertion", "TemplateBox",
      DownValues[TemplateBox]//Hash
    ,
      Get[file]
    , tag];

    Internal`Kernel`Watchdog["Assertion", "MatrixForm",
      FormatValues[MatrixForm]//Hash
    ,
      Get[file]
    , tag];
    
    Internal`Kernel`Watchdog["Assertion", "Tooltip",
      FormatValues[Tooltip]//Hash
    ,
      Get[file]
    , tag];
 
    Internal`Kernel`Watchdog["Assertion", "OpenerView",
      FormatValues[OpenerView]//Hash
    ,
      Get[file]
    , tag];
    

    Internal`Kernel`Watchdog["Assertion", "Iconize",
      FormatValues[Iconize]//Hash
    ,
      Get[file]
    , tag];

    Internal`Kernel`Watchdog["Assertion", "D",
      FormatValues[D] //Hash
    ,
      Get[file]
    , tag];

    Internal`Kernel`Watchdog["Assertion", "Databin",
      FormatValues[Databin] //Hash
    ,
      Get[file]
    , tag];
    

    Internal`Kernel`Watchdog["Assertion", "Root",
      FormatValues[Root] //Hash
    ,
      Get[file]
    , tag];

    Internal`Kernel`Watchdog["Assertion", "MeshRegion",
      FormatValues[MeshRegion] //Hash
    ,
      Get[file]
    , tag];

    Internal`Kernel`Watchdog["Assertion", "DeviceObject",
      FormatValues[DeviceObject] //Hash
    ,
      Get[file]
    , tag];
    
    
  ];
];

End[]
