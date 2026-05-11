BeginPackage["CoffeeLiqueur`Extensions`Manipulate`", {
    "CoffeeLiqueur`Extensions`Graphics`",
    "CoffeeLiqueur`Extensions`InputsOutputs`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`Misc`Language`",
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CoffeeLiqueur`Extensions`Boxes`",
    "CoffeeLiqueur`Extensions`Communication`",
    "CoffeeLiqueur`Extensions`RemoteCells`",
    "CoffeeLiqueur`Extensions`EditorView`",
    "CoffeeLiqueur`Misc`Events`Promise`", 
    "CoffeeLiqueur`Misc`Parallel`",
    "CoffeeLiqueur`Extensions`System`"
}]

Needs["CoffeeLiqueur`Extensions`Manipulate`Diff`"->"df`"]
Needs["CoffeeLiqueur`Extensions`ExportImport`WidgetAPI`"->"wapi`"]


ManipulatePlot::usage = "ManipulatePlot[f_, {x, min, max}, {p1, min, max}, ...] an interactive plot of a function f[x, p1] with p1 given as a parameter"
ManipulateParametricPlot::usage = ""

AnimatePlot::usage = "AnimatePlot[f_, {x, min, max}, {t, min, max}]"
AnimateParametricPlot::usage = ""

ListAnimatePlot::usage = ""

Unprotect[Animate]
ClearAll[Animate]

Unprotect[Refresh]



Manipulator[_] := (
  Message["Not supported in WLJS. Use AnimatePlot or general dynamics"];
  Style["Not supported! Please, use AnimatePlot or general dynamics", Background->Yellow]
)



Unprotect[ListAnimate]
ClearAll[ListAnimate]

Unprotect[Animator]
ClearAll[Animator]

Animator[_] := (
  Message["Not supported in WLJS. Use AnimatePlot or general dynamics"];
  $Failed
)

Animator[__] := (
  Message["Not supported in WLJS. Use AnimatePlot or general dynamics"];
  $Failed
)



AnimatePlot;

(* register globally, cuz Refresh is also originally a system function *)
System`RefreshBox;

Begin["`Internal`"]

Unprotect[Manipulate]
ClearAll[Manipulate]

ClearAll[Manipulate]





SetAttributes[TempHeld, HoldAll]

ListAnimate[olist_List, fps_:20] := With[{list = Evaluate[olist]}, With[{len = Length[list]},
  Animate[list[[index]], {index,1,len,1}, RefreshRate->fps] 
] ]

passPart[index_, Null] := Null 
passPart[index_, expr_] := Offload[expr[[index]]]

checkIfFunction[_Symbol] := False;
checkIfFunction[_] := True

checkIfFunction[_CoffeeLiqueur`Extensions`Editor`Internal`$PreviousOut] := False

SetAttributes[checkIfFunction, HoldFirst]





clearUnderHold[Hold[symbol_] ] := With[{},
  ClearAll[symbol]// Quiet;
]

assignUnderHold[Hold[symbol_], value_ ] := symbol = value;
SetAttributes[assignUnderHold, HoldFirst]
SetAttributes[clearUnderHold, HoldFirst]


Manipulate[f_, paramters:({_Subscript | _Symbol | {_Subscript, _?NumericQ} | {_Symbol, _?NumericQ} | {_Subscript, _?NumericQ, _String} | {_Symbol, _?NumericQ, _String}, ___?NumericQ} | {_Subscript | {_Subscript, _} | {_Subscript, _, _String}, _List} | {_Symbol | {_Symbol, _} | {_Symbol, _, _String}, _List}).., rawopts: OptionsPattern[] ] := With[{
  scripts = Cases[Hold[ List[paramters] ], _Subscript, Infinity]
},
{
  generated = Table[Unique[], {Length[scripts]} ]
},
{
  rules = Table[With[{
    original = scripts[[i]],
    replacement = generated[[i]]
  },
    {
      {original, initial_, label_String} :> {replacement, initial, label},
      {original, initial_} :> {replacement, initial, StringTemplate["``<sub>``</sub>"][original[[1]], original[[2]]]},
      {original} :> {replacement, Automatic, StringTemplate["``<sub>``</sub>"][original[[1]], original[[2]]]},
      original :> {replacement, Automatic, StringTemplate["``<sub>``</sub>"][original[[1]], original[[2]]]}
    }
  ], {i,1,Length[scripts]}] // Flatten,

  basicRules = Thread @ Rule[scripts, generated]
},
{
  newparams = Sequence @@ (List[paramters] /. rules), 
  function = If[Length[Cases[Hold[f], _CoffeeLiqueur`Extensions`Editor`Internal`$PreviousOut, Infinity] ] > 0, 
    With[{o=Evaluate[f]}, Hold[o] ]
  ,
    If[Length @ Cases[Hold[f], scripts//First, Infinity] > 0,
      Hold[f],
      With[{o=Evaluate[f]}, Hold[o] ]
    ]
  ]
},
  Extract[function  /. basicRules, 1, Function[passed, 
    Manipulate[passed, newparams]
  , HoldAll] ]  
] /; (Length[Cases[Hold[ List[paramters] ], _Subscript, Infinity] ] > 0)

Manipulate[f_, parameters:({_Symbol | {_Symbol, _?NumericQ | Automatic} | {_Symbol, _?NumericQ | Automatic, _}, ___?NumericQ, ___Rule} | {_Symbol | {_Symbol, _} | {_Symbol, _, _String}, _List, ___Rule} | Delimiter | _Item | _Style ).., OptionsPattern[] ] := Module[{code, currentData, originalExpression, sliders, protected = {}, jitFailedQQ = True, instance = <||>}, With[{
  pvars = Map[makeVariableObject, Unevaluated @ List[parameters] ],
  hash = ToString[Hash[{f//Hold, parameters, Now}] ],
  updateFunction = OptionValue["UpdateFunction"],
  caction = OptionValue[ContinuousAction],
  diffTable = Unique["diffTable"],
  copyButton = EventObject[],
  initialValues = OptionValue["InitialValues"],
  widgetInstance = wapi`Tools`WidgetLike["Interpolation"->False, "Notebook"->First[EvaluationNotebook[] ], "Meta"-><|"Description" -> "Manipulate expression widget"|> ],
  jit = (OptionValue[PerformanceGoal] === "Speed" && TrueQ[OptionValue["JITFeature"] ])
},
{
  vars = If[initialValues === Automatic, pvars, MapIndexed[Function[{var, index}, Join[var, <|"Initial"->initialValues[[index[[1]]]]|>] ], pvars] ]
},

    If[!AllTrue[vars, !FailureQ[#] &] || vars === $Failed,
      Return[$Failed];
    ];

    EventHandler[widgetInstance["Hash"], {
      "Mounted" -> Function[Null,
        wapi`Tools`ChangeState[widgetInstance, "Online"];
        EventHandler[CurrentWindow[], {"Closed" -> Function[Null,
          wapi`Tools`ChangeState[widgetInstance, "Offline"];
        ]}];  
      ],

      "Destroy" -> Function[Null,
        wapi`Tools`ChangeState[widgetInstance, "Offline"];
      ]
    }];

    EventHandler[ResultCell[], {"Destroy" -> Function[Null,
        (* Echo["Unprotect all protected objects"]; *)
        (* FrontSubmit[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects["GarbageCollector", True] ]; *)
        ClearAll[protected];
        wapi`Tools`ChangeState[widgetInstance, "Offline"];
        EventRemove[widgetInstance["Hash"] ];
        Delete[ widgetInstance ];
        df`Private`clearTable[diffTable];
        ClearAll[code, currentData, originalExpression, sliders];
    ]}];
 


    With[{
    (* wrap f into a pure function *)
    anonymous = With[{s = Extract[#, "Symbol", Hold] &/@ vars},

                  With[{vlist = Hold[s] /. {Hold[u_Symbol] :> u}},
                    makeFunction[vlist, f]
                  ]
              ]
    },


        currentData = (#["Initial"] &/@ vars);
        With[{result = updateFunction @@ (#["Initial"] &/@ vars)},
  code = ToString[anonymous @@ (#["Initial"] &/@ vars), StandardForm];
          If[result === False || !TrueQ[jit],
            If[result === False, jitFailedQQ = False];
          
          ,
         (* preoptimize *)
        Module[{jitFailedQ = True, taken = Length[vars]+1}, While[jitFailedQ && taken > 1, 
         df`Private`clearTable[diffTable];
         With[{
          next = Table[With[{v = vars[[index]]}, 
           If[index < taken,
            Switch[v["Controller"],
              InputRange,
              If[v[["Initial"]] + v[["StepRaw"]] > v[["MaxRaw"]], v[["Initial"]] - v[["StepRaw"]], v[["Initial"]] + v[["StepRaw"]] ],

              InputSelect,
              RandomChoice[Complement[v[["List"]], {v[["Initial"]]}] ]

            ] 
           ,
              v[["Initial"]]
           ]
          ], {index, 1, Length[vars]}]
         },
          originalExpression = anonymous @@ next;

 

          With[
            {expr = anonymous @@ (#["Initial"] &/@ vars)},
            {diffList = Flatten[{df`Private`diff[originalExpression, expr, 1, <||>]}]},

            jitFailedQ = Or @@ (FailureQ/@diffList);

            df`Private`processDiffs[diffTable, originalExpression, expr, diffList, Function[editorExpr,
              code = ToString[editorExpr, StandardForm];
              False
            ] ];

            originalExpression = expr;
          ];  
         ];

         taken--; 
        ]; 
          jitFailedQQ = jitFailedQ;
        ];
          
        ] ];

  
      (* controls *)

      EventHandler[copyButton, {
        "Expr" -> Function[Null,
          CopyToClipboard["Uncompress[\""<>Compress[anonymous @@ currentData]<>"\"]" ]
        ], 
        "Values" -> Function[Null,
          CopyToClipboard["\"InitialValues\"->"<>ToString[currentData, InputForm] ]
        ],
        "Refresh" -> Function[Null,
          code = code
        ]
      }];

 
      sliders = MapIndexed[With[{index = #2[[1]]}, Switch[#1["Controller"],
                  InputRange,
                    InputRange[#["Min"], #["Max"], #["Step"], #["Initial"], "Label"->(#["Label"]), "Topic"->If[caction, "Default", {Null, "Default"}], "TrackedExpression"->passPart[index, OptionValue["TrackedExpression"] ] ],

                  InputSelect,
                    InputSelect[#["List"], #["Initial"], "Label"->(#["Label"]), "TrackedExpression"->passPart[index, OptionValue["TrackedExpression"] ] ],
                  
                  _,
                    Null
                ] ] &,  vars];

      widgetInstance["Ranges"] = Table[
        Switch[c[[1]]["Controller"],
          InputRange,

            With[{r=Table[i, {i, c[[1]]["Min"], c[[1]]["Max"], c[[1]]["Step"]}]}, wapi`Tools`RangeSet[
                  "Range"->r,
                  "Event"->{c[[2]][[1]]["Id"], "Default"},
                  "Initial"->SortBy[Transpose[{Range[Length[r] ], r}], Function[v, (v[[2]]-c[[1]]["Initial"])^2 ] ][[1,1]],
                  "Type"->"Range",
                  "Delay"->If[jitFailedQQ, 500, 100]
                ] ]

          ,
          InputSelect,

            wapi`Tools`RangeSet[
                  "Range"->c[[2]][[1]]["HashList"],
                  "Event"->{c[[2]][[1]]["InternalId"], "Default"},
                  "Initial"->FirstPosition[c[[2]][[1]]["HashList"], c[[2]][[1]]["HashSelected"] ],
                  "Type"->"Select",
                  "Delay"->If[jitFailedQQ, 500, 100]
            ]

          ,
          _,
          Nothing
        ]
      , {c, {vars, sliders} // Transpose}];


      sliders = InputGroup[sliders, "Layout"->OptionValue["ControlsLayout"] ];
      
      (* update expression when any slider is dragged *)
      With[{o = code}, EventHandler[sliders, Function[data, 
        (* FrontSubmit[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects["GarbageCollector", False] ]; *)
        currentData = data;
        With[{result = updateFunction @@ data},
          Switch[result,
            True,

                If[jit,
                  With[
                    {expr = anonymous @@ data},
                    {diffList = Flatten[{df`Private`diff[originalExpression, expr, 1, <||>]}]},

                    df`Private`processDiffsStateless[diffTable, originalExpression, expr, diffList, Function[editorExpr,
                      code = ToString[editorExpr, StandardForm];
                      False
                    ], Function[Null,
                      code = o;
                    ] ];

                    (* currentExpression = expr; *)
                  ]
                ,
                  With[
                    {expr = anonymous @@ data},
                    code = ToString[expr, StandardForm];
                    originalExpression = expr;
                  ]
                ];
              ,
            False,
            Null,

            _,
            code =  result
            
          ];
        ];
      ] ] ];

      widgetInstance["ResetStateFunction"] = With[{o = code, init = (#["Initial"] &/@ vars)}, 
        wapi`Tools`safeFunction @ Function[Null, 
          code = o;
          df`Private`resetAll[diffTable];
          updateFunction @@ init;
        ]
      ];


      ManipulateHelper[
          sliders[[1, "View"]],
          EditorView[code // Offload, "FullReset"->True, "KeepMaxHeight"->True, "KeepMaxWidth"->True]  (* EditorView works only with strings, FullReset for the cleanest update *)
      , "ViewChange"->widgetInstance["Hash"], "JIT"->Offload[code], Appearance->OptionValue[Appearance], "OptionsButton"->copyButton[[1, "Id"]] ]
    ]
] ]

ManipulatePanel;
ManipulateHelper::useanim = "Use Animate instead for exporting"

ManipulateHelper /: AnimatedImage[a_ManipulateHelper, opts: OptionsPattern[] ] := (
  Message[ManipulateHelper::useanim]
  $Failed
);

ManipulateHelper /: AnimatedImage[a_ManipulateHelper, opts: OptionsPattern[] ] := (
  Message[ManipulateHelper::useanim]
  $Failed
);

(* HELP WITH MESH!!! too many variations, jit often fails or produce too many temporal symbols *)
Do[With[{p=p},
  Unprotect[p];
  Options[p] = Options[p] /. {Rule[Mesh, Automatic] -> Rule[Mesh, 8]};
  Protect[p];
], {p, {
  Plot3D, SphericalPlot3D, ListPlot3D, ListSurfacePlot3D, ContourPlot3D, ListContourPlot3D, DensityPlot3D
}}];



ManipulateHelper /: MakeBoxes[a_ManipulateHelper, form: WLXForm | StandardForm] := With[{o = CreateFrontEndObject[a]},
  If[form === WLXForm,
    MakeBoxes[o, form]
  ,
    With[{out = MakeBoxes[o, StandardForm]},
      ViewBox[out, o]
    ]
  ]
]

Off[Refresh::arg];

SetAttributes[Manipulate, HoldAll]
(*
Unprotect[Refresh]

Options[Refresh] = {UpdateInterval -> 1}




*)


Options[Refresh] = Join[Options[Refresh], {UpdateInterval->Infinity, "JIT"->True, PerformanceGoal->"Speed"}];


Refresh::usage = "Refresh[expr_, UpdateInterval] creates a dynamic widget, which reevalues expr every UpdateInterval in seconds.\nRefresh[expr_, ev_EventObject] is updated by external event object ev"

(* Refresh[expr_, Rule[UpdateInterval, updateInterval_Quantity] | Rule[UpdateInterval, updateInterval_?NumericQ] ] := Refresh[expr, updateInterval ] *)

FormatValues[Refresh] = {};

(* this is not going to work 
  if we clear all values
  then NeuralPackage stops working for some fucking reason
  then we keep it for the future
  default DownValues does not reveal anything...
*)

(*Refresh /: MakeBoxes[Refresh[expr_, opts: OptionsPattern[] ], form: StandardForm | WLXForm ] := With[{
  interval = OptionValue[Refresh, opts, UpdateInterval]
},
{
  r = Refresh[expr, If[TrueQ[interval < Infinity && NumberQ[interval] ], interval, 1.0 ] ]
},
  MakeBoxes[r, form]
]*)

Refresh /: MakeBoxes[Refresh[expr_, updateInterval_Quantity | updateInterval_?NumericQ, OptionsPattern[] ], form: StandardForm | WLXForm ] := With[{
  interval = If[MatchQ[updateInterval, _Quantity], UnitConvert[updateInterval, "Milliseconds"] // QuantityMagnitude, updateInterval 1000],
  event = CreateUUID[],
  evaluated = expr,
  diffTable = Unique["diffTable"]
},
  (* We need LeakyModule to fool WL's Garbage collector *)
  LeakyModule[{
    currentExpression = evaluated,
    str = ToString[evaluated, StandardForm],
    trigger = 0
  },

  (* event is fired from JS side (RefreshBox) *)
    EventHandler[event, Function[Null,
        With[
          {
            newExpr = expr
          },

          {
            diffList = Flatten[{df`Private`diff[currentExpression, newExpr, 1, <||>]}]
          },

          df`Private`processDiffs[diffTable, currentExpression, newExpr, diffList, Function[editorExpr,
            str = ToString[editorExpr, StandardForm];
            False
          ] ];  

          currentExpression = newExpr;
          trigger = 0;      
        ];
    ] ];

    With[{
      editor = EditorView[str // Offload, "ReadOnly"->True, "FullReset"->True] 
    },
    
        Switch[form,
          StandardForm,
          ViewBox[Null, RefreshBox[editor, event, interval, trigger // Offload] ],

          _,
          With[{f = CreateFrontEndObject[RefreshBox[editor, event, interval, trigger // Offload] ]},
            If[form === WLXForm,
              MakeBoxes[f, form]
            ,
              With[{out = MakeBoxes[f, StandardForm]},
                ViewBox[out, f]
              ]
            ]
            
          ]
        ]
    ]
  ]
] 

Refresh /: MakeBoxes[Refresh[expr_, ev_String | ev_EventObject,opts: OptionsPattern[] ], form: StandardForm | WLXForm ] := With[{
  event = CreateUUID[],
  evaluated = expr,
  diffTable = Unique["diffTable"],
  bypassJIT = TrueQ[OptionValue[Refresh, opts, "JIT"] === False || OptionValue[Refresh, opts, PerformanceGoal] === "Quality"]
},
  LeakyModule[{
    str = ToString[evaluated, StandardForm],
    currentExpression = evaluated
  },
  
  If[bypassJIT, 
    ClearAll[currentExpression];
    EventHandler[ev, Function[Null, With[{newExpr = expr},
      str = ToString[newExpr, StandardForm];
    ] ] ];
  ,
    EventHandler[ev, Function[Null,
        With[
          {
            newExpr = expr
          },

          {
            diffList = Flatten[{df`Private`diff[currentExpression, newExpr, 1, <||>]}]
          },

          df`Private`processDiffs[diffTable, currentExpression, newExpr, diffList, Function[editorExpr,
              str = ToString[editorExpr, StandardForm];
            False
          ] ];
          currentExpression = newExpr; 

          
        ];
    ] ];  
  ];

    With[{
      editor = EditorView[str // Offload, "ReadOnly"->True, "FullReset"->True] 
    },

      Switch[form,
        StandardForm,
        ViewBox[Null, RefreshBox[editor, event, 0, Null] ],

        _,
        With[{f = CreateFrontEndObject[RefreshBox[editor, event, 0, Null] ]},
          MakeBoxes[f, form]
        ]
      ]
    ]
  ]
] 

Off[Refresh::opset];

SetAttributes[Refresh, HoldFirst]

If[$VersionNumber < 13.3,
  RealValuedNumericQ = NumericQ
];

(* convert parameters to objects *)

makeVariableObject[Delimiter | _Style | _Item] := Nothing

makeVariableObject[{s_Symbol, list_List}, ___Rule] := <|"Controller"->InputSelect, "Symbol" :> s, "Label"->ToString[Unevaluated[s]], "List"->list, "Initial" -> First[list]|>

makeVariableObject[{{s_Symbol, init_}, list_List, ___Rule}] := <|"Controller"->InputSelect, "Symbol" :> s, "Label"->ToString[Unevaluated[s]], "List"->list, "Initial" -> If[init === Automatic, First[list], init]|>

makeVariableObject[{{s_Symbol, init_, _}, list_List, ___Rule}] := <|"Controller"->InputSelect, "Symbol" :> s, "Label"->ToString[Unevaluated[s]], "List"->list, "Initial" -> If[init === Automatic, First[list], init]|>


makeVariableObject[{{s_Symbol, init_, label_String}, list_List, ___Rule}] := <|"Controller"->InputSelect, "Symbol" :> s, "Label"->label, "List"->list, "Initial" -> If[init === Automatic, First[list], init]|>



makeVariableObject[{s_Symbol, min_, max_, ___Rule}] := <|"Controller"->InputRange, "Symbol" :> s, "Label"->ToString[Unevaluated[s]], "MinRaw"->min, "MaxRaw"->max, "Min"->N[min], "Max"->N[max], "Step" -> N[((max-min)/50.0)], "StepRaw" -> N[((max-min)/50.0)], "Initial" -> N[((min + max)/2.0)]|>

makeVariableObject[{{s_Symbol, init_}, min_, max_, ___Rule}] := <|"Controller"->InputRange, "Symbol" :> s, "Label"->ToString[Unevaluated[s]], "MinRaw"->min, "MaxRaw"->max, "Min"->N[min], "Max"->N[max], "Step" -> N[((max-min)/50.0)], "StepRaw" -> N[((max-min)/50.0)], "Initial" -> If[init===Automatic, N[((min + max)/2.0)], N[init] ]|>

makeVariableObject[{{s_Symbol, init_, _}, min_, max_, ___Rule}] := <|"Controller"->InputRange, "Symbol" :> s, "Label"->ToString[Unevaluated[s]], "MinRaw"->min, "MaxRaw"->max, "Min"->N[min], "Max"->N[max], "Step" -> N[((max-min)/50.0)], "StepRaw" -> N[((max-min)/50.0)], "Initial" -> If[init===Automatic, N[((min + max)/2.0)], N[init] ]|>


makeVariableObject[{{s_Symbol, init_, label_String}, min_, max_, ___Rule}] := <|"Controller"->InputRange, "Symbol" :> s, "Label"->label, "MinRaw"->min, "MaxRaw"->max, "Min"->N[min], "Max"->N[max], "Step" -> N[((max-min)/50.0)], "StepRaw" -> N[((max-min)/50.0)], "Initial" -> If[init===Automatic, N[((min + max)/2.0)], N[init] ]|>


makeVariableObject[{s_Symbol, min_, max_, step_, ___Rule}] := <|"Controller"->InputRange, "Symbol" :> s, "Label"->ToString[Unevaluated[s]], "MinRaw"->min, "MaxRaw"->max, "Min"->N[min], "Max"->N[max], "Step" -> N[step], "StepRaw" -> step, "Initial" -> Round[(min + max)/2.0 // N, step]|>

makeVariableObject[{{s_Symbol, init_}, min_, max_, step_, ___Rule}] := <|"Controller"->InputRange, "Symbol" :> s, "Label"->ToString[Unevaluated[s]], "MinRaw"->min, "MaxRaw"->max, "Min"->N[min], "Max"->N[max], "Step" -> N[step], "StepRaw" -> step, "Initial" -> Round[init // N, step]|>

makeVariableObject[{{s_Symbol, init_, _}, min_, max_, step_, ___Rule}] := <|"Controller"->InputRange, "Symbol" :> s, "Label"->ToString[Unevaluated[s]], "MinRaw"->min, "MaxRaw"->max, "Min"->N[min], "Max"->N[max], "Step" -> N[step], "StepRaw" -> step, "Initial" -> Round[init // N, step]|>


makeVariableObject[{{s_Symbol, init_, label_String}, min_, max_, step_, ___Rule}] := <|"Controller"->InputRange, "Symbol" :> s, "Label"->label, "MinRaw"->min, "MaxRaw"->max, "Min"->N[min], "Max"->N[max], "Step" -> N[step], "StepRaw" -> step, "Initial" -> Round[init // N, step]|>


makeVariableObject[{s_Symbol}] := <|"Controller"->InputRange, "Symbol" :> s, "Label"->ToString[Unevaluated[s]], "Min"->-1, "Max"->1, "Step" -> 0.1, "MinRaw"->-1, "MaxRaw"->1, "StepRaw" -> 0.1, "Initial" -> 0.|>
makeVariableObject[{{s_Symbol, init_}}] := <|"Controller"->InputRange, "Symbol" :> s, "Label"->ToString[Unevaluated[s]], "Min"->-1, "Max"->1, "Step" -> 0.1, "MinRaw"->-1, "MaxRaw"->1, "StepRaw" -> 0.1, "Initial" -> If[init===Automatic, 0., N[init] ]|>

makeVariableObject[{{s_Symbol, init_, _}}] := <|"Controller"->InputRange, "Symbol" :> s, "Label"->ToString[Unevaluated[s]], "Min"->-1, "Max"->1, "Step" -> 0.1, "MinRaw"->-1, "MaxRaw"->1, "StepRaw" -> 0.1, "Initial" -> If[init===Automatic, 0., N[init] ]|>


makeVariableObject[{{s_Symbol, init_, label_String}}] := <|"Controller"->InputRange, "Symbol" :> s, "Label"->label, "Min"->-1, "Max"->1, "Step" -> 0.1, "MinRaw"->-1, "MaxRaw"->1, "StepRaw" -> 0.1, "Initial" -> If[init===Automatic, 0., N[init] ]|>



makeVariableObject[__] := (
  Message[ManipulatePlot::badargs, "does not match the pattern"];
  $Failed
)

SetAttributes[makeVariableObject, HoldAll]


ClearAll[makeFunction];
makeFunction[Hold[list_], f_] := If[MatchQ[list, {__?(MatchQ[Head[#], Subscript | Symbol]&)}],
  If[Length[Cases[Hold[f], _CoffeeLiqueur`Extensions`Editor`Internal`$PreviousOut, Infinity] ] > 0,
    With[{out = CoffeeLiqueur`Extensions`Editor`Internal`$PreviousOut[]},
        Internal`LocalizedBlock[list, Block[{
          CoffeeLiqueur`Extensions`Editor`Internal`$PreviousOut = Function[Null, out]
        },
          list = {##}; f
        ] ]&
    ]
  ,
    Internal`LocalizedBlock[list,
      list = {##}; f
    ]&
  ]
,
  Function[list, f]
]

System`WLXForm;

noJITEntry /: MakeBoxes[n_noJITEntry, form: StandardForm | WLXForm] := With[{
  object = CreateFrontEndObject[n]
}, 
  If[form === WLXForm,
    MakeBoxes[object, form]
  ,
    With[{out = MakeBoxes[object, StandardForm]},
      ViewBox[out, object]
    ]
  ]
]

packedAnimation /: MakeBoxes[n_packedAnimation, form: StandardForm | WLXForm] := With[{
  object = CreateFrontEndObject[n]
}, 
  If[form === WLXForm,
    MakeBoxes[object, form]
  ,
    With[{out = MakeBoxes[object, StandardForm]},
      ViewBox[out, object]
    ]
  ]
]

checkIfFunction[] := False


SetAttributes[makeFunction, HoldAll]

ManipulateParametricPlot[all__] := manipulatePlot[xyChannel, all]

ManipulatePlot[all__] := manipulatePlot[yChannel, all]

yChannel[t_, y_] := {t, y}
xyChannel[t_, y_] := y

ManipulatePlot::badargs = "Unsupported sequence of arguments: `1`";

manipulatePlot[__] := (
  Message[ManipulatePlot::badargs, "???"];
  $Failed
) 

manipulatePlot::nonreal = "The result function does not return real numbers"

manipulatePlot[tracer_, f_, {t_Subscript, rest__}, rest2__] := With[{generated = Unique[]},
  Extract[Hold[f] /. {t->generated}, 1, Function[passed, 
    manipulatePlot[tracer, passed, {generated, rest}, rest2]
  , HoldAll] ]
]

manipulatePlot[tracer_, f_, any_, paramters:({_Subscript | _Symbol | {_Subscript, _?NumericQ} | {_Symbol, _?NumericQ} | {_Subscript, _?NumericQ, _String} | {_Symbol, _?NumericQ, _String}, ___?NumericQ} | {_Subscript | {_Subscript, _} | {_Subscript, _, _String}, _List} | {_Symbol | {_Symbol, _} | {_Symbol, _, _String}, _List}).., rawopts: OptionsPattern[] ] := With[{
  scripts = Cases[Hold[ List[paramters] ], _Subscript, Infinity]
},
{
  generated = Table[Unique[], {Length[scripts]} ]
},
{
  rules = Table[With[{
    original = scripts[[i]],
    replacement = generated[[i]]
  },
    {
      {original, initial_, label_String} :> {replacement, initial, label},
      {original, initial_} :> {replacement, initial, StringTemplate["``<sub>``</sub>"][original[[1]], original[[2]]]},
      {original} :> {replacement, Automatic, StringTemplate["``<sub>``</sub>"][original[[1]], original[[2]]]},
      original :> {replacement, Automatic, StringTemplate["``<sub>``</sub>"][original[[1]], original[[2]]]}
    }
  ], {i,1,Length[scripts]}] // Flatten,

  basicRules = Thread @ Rule[scripts, generated]
},
{
  newparams = Sequence @@ (List[paramters] /. rules), 
  function = If[Length[Cases[Hold[f], _CoffeeLiqueur`Extensions`Editor`Internal`$PreviousOut, Infinity] ] > 0, 
    With[{o=Evaluate[f]}, Hold[o] ]
  ,
    If[Length @ Cases[Hold[f], scripts//First, Infinity] > 0,
      Hold[f],
      With[{o=Evaluate[f]}, Hold[o] ]
    ]
  ]
},
  Extract[function  /. basicRules, 1, Function[passed, 
    manipulatePlot[tracer, passed, any, newparams]
  , HoldAll] ]  
] /; (Length[Cases[Hold[ List[paramters] ], _Subscript, Infinity] ] > 0)

manipulatePlot[tracer_, f_, {t_Symbol, tmin_?NumericQ, tmax_?NumericQ}, paramters:({_Symbol | {_Symbol, _?NumericQ | Automatic} | {_Symbol, _?NumericQ | Automatic, _String}, ___?NumericQ} | {_Symbol | {_Symbol, _} | {_Symbol, _, _String}, _List}).., rawopts: OptionsPattern[] ] := 
With[{
  vars = Map[makeVariableObject, Unevaluated @ List[paramters] ], (* convert all parameters, ranges to associations *)
  plotPoints = OptionValue["SamplingPoints"],
  updateFunction = OptionValue["UpdateFunction"],

  widgetInstance = wapi`Tools`WidgetLike["Interpolation"->True, "Notebook"->First[EvaluationNotebook[] ], "Meta"-><|"Description" -> "ManipulatePlot expression widget"|> ]
},


  If[!AllTrue[vars, !FailureQ[#] &] || vars === $Failed,
    Return[$Failed];
  ];

    EventHandler[widgetInstance["Hash"], {
      "Mounted" -> Function[Null,
        wapi`Tools`ChangeState[widgetInstance, "Online"];
        EventHandler[CurrentWindow[], {"Closed" -> Function[Null,
          wapi`Tools`ChangeState[widgetInstance, "Offline"];
        ]}];  
      ],

      "Destroy" -> Function[Null,
        wapi`Tools`ChangeState[widgetInstance, "Offline"];
      ]
    }];  

    EventHandler[ResultCell[], {"Destroy" -> Function[Null,

        wapi`Tools`ChangeState[widgetInstance, "Offline"];
        EventRemove[widgetInstance["Hash"] ];
        Delete[ widgetInstance ];
      
    ]}];    

  With[{
    (* wrap f to a pure function *)
    anonymous = With[{s = Extract[#, "Symbol", Hold] &/@ Join[{<|"Symbol":>t|>}, vars]},
                  With[{vlist = Hold[s] /. {Hold[u_Symbol] :> u}},
                     makeFunction[vlist, f]
                  ]
              ],
    
    
    
    size = OptionValue[ImageSize], (*fix me*)

    transitionType = OptionValue[TransitionType],
    transitionDuration = OptionValue[TransitionDuration],

    axes = OptionValue[AxesLabel], (*fix me*)
    prolog = OptionValue[Prolog], (*fix me*)
    epilog = OptionValue[Epilog], (*fix me*)
    style = {OptionValue[PlotStyle]}//Flatten, (*fix me*)
    rest = Sequence @@ Normal[KeyDrop[Association[rawopts], {ImageSize, "UpdateFunction", TransitionType, TransitionDuration, AxesLabel, Prolog, Epilog, PlotStyle, "TrackedExpression"}] ] 
  },

    test = anonymous;
    
    Module[{pts, plotRange = OptionValue[PlotRange], sampler},


      sampler[args_] := Select[
        Table[tracer[t, anonymous @@ Join[{t}, args] ], {t, tmin, tmax, (tmax-tmin)/plotPoints}]
      , AllTrue[# // Flatten, RealValuedNumericQ]&];

      (* test sampling of f *)
      pts = sampler[#["Initial"] &/@ vars];
      updateFunction @@ (#["Initial"] &/@ vars);

      If[Length[pts] == 0,
        Message[manipulatePlot::nonreal];
        Return[$Failed];
      ];


      With[{
        opts = Sequence[
          ImageSize->size, 
          PlotRange->plotRange, 
          Axes->True, 
          TransitionType->transitionType, 
          TransitionDuration->transitionDuration, 
          Epilog -> epilog,
          Prolog -> prolog,
          AxesLabel -> axes,
          "TrackedExpression"->OptionValue["TrackedExpression"],
          rest
        ],
        traces = Length[{pts[[1,2]]} // Flatten],
        length = plotPoints
      },
      
        (* two cases: single curve or multiple *)
        If[Depth[pts] === 3,
          singleTrace[tracer, anonymous, t, tmin, tmax, length, style, vars, updateFunction, widgetInstance, opts]
        ,
          multipleTraces[tracer, anonymous, traces, t, tmin, tmax, length, style, vars, updateFunction, widgetInstance, opts]
        ]

      ]


    ]
  ]
]


singleTrace[tracer_, anonymous_, t_, tmin_, tmax_, plotPoints_, style_, vars_, updateFunction_, widgetInstance_, opts__] := Module[{sliders, pts, sampler, plotRange},
      (* sampling of f *)
      sampler[a_] := Select[
        Table[tracer[t, anonymous @@ Join[{t}, a] ]// N, {t, tmin, tmax, (tmax-tmin)/plotPoints}] 
      , AllTrue[#, RealValuedNumericQ]&];


 
      pts = sampler[#["Initial"] &/@ vars];


      widgetInstance["ResetStateFunction"] = With[{o = pts, init = (#["Initial"] &/@ vars)}, 
        wapi`Tools`safeFunction @ Function[Null, 
          pts = o;
          updateFunction @@ init;
        ]
      ];

      If[Length[pts] == 0,
        Message[manipulatePlot::nonreal];
        Return[$Failed];
      ];

      plotRange = Lookup[Association[opts], PlotRange, Automatic];

      If[plotRange === Automatic,
        plotRange = With[{p = {MinMax[pts[[All,1]]], MinMax[pts[[All,2]] // Flatten]}},
          {(p[[1]] - Mean[p[[1]]]) 1.1 + Mean[p[[1]]],  (p[[2]] - Mean[p[[2]]]) 1.1 + Mean[p[[2]]]}
        ];
      ];
      
      (* controls *)
      sliders = MapIndexed[With[{index = #2[[1]]}, Switch[#1["Controller"],
                  InputRange,
                    InputRange[#["Min"], #["Max"], #["Step"], #["Initial"], "Label"->(#["Label"]), "TrackedExpression"->passPart[index, Lookup[Association[opts], "TrackedExpression", Null] ] ],

                  InputSelect,
                    InputSelect[#["List"], #["Initial"], "Label"->(#["Label"]), "TrackedExpression"->passPart[index, Lookup[Association[opts], "TrackedExpression", Null] ] ],
                  
                  _,
                    Null
                ] ] &,  vars];

      widgetInstance["Ranges"] = Table[
        Switch[c[[1]]["Controller"],
          InputRange,

            With[{r=Table[i, {i, c[[1]]["Min"], c[[1]]["Max"], c[[1]]["Step"]}]}, wapi`Tools`RangeSet[
                  "Range"->r,
                  "Event"->{c[[2]][[1]]["Id"], "Default"},
                  "Initial"->SortBy[Transpose[{Range[Length[r] ], r}], Function[v, (v[[2]]-c[[1]]["Initial"])^2 ] ][[1,1]],
                  "Type"->"Range",
                  "Delay"->30
                ] ]

          ,
          InputSelect,

            wapi`Tools`RangeSet[
                  "Range"->c[[2]][[1]]["HashList"],
                  "Event"->{c[[2]][[1]]["InternalId"], "Default"},
                  "Initial"->FirstPosition[c[[2]][[1]]["HashList"], c[[2]][[1]]["HashSelected"] ],
                  "Type"->"Select",
                  "Delay"->30
            ]

          ,
          _,
          Nothing
        ]
      , {c, {vars, sliders} // Transpose}];  


      sliders = InputGroup[sliders, "Layout"->Lookup[Association[opts], "ControlsLayout", "Vertical"] ];
      
      (* update pts when dragged *)
      EventHandler[sliders, Function[data, 
        With[{r = updateFunction @@ data},
        
        
        Switch[r,
          True,
          pts =  sampler[data],

          False,
          Null,

          _,
          pts = r
        ];

      ] ] ];

      ManipulateHelper[
        sliders[[1, "View"]],
        Graphics[{AbsoluteThickness[2], style[[1]], Line[pts // Offload]}, PlotRange->plotRange, Sequence@@({opts}//Reverse)],
        "ViewChange"->widgetInstance["Hash"],
        "ControlsLayout" -> Lookup[Association[opts], "ControlsLayout", "Vertical"],
        Appearance -> Lookup[Association[opts], Appearance, "Default"]
      ]
]

multipleTraces[tracer_, anonymous_, traces_, t_, tmin_, tmax_, plotPoints_, style_, vars_, updateFunction_, widgetInstance_, opts__] := Module[{sliders, sampler, pts, plotRange},

      sampler[a_] := Select[
        Table[anonymous @@ Join[{t}, a]// N, {t, tmin, tmax, (tmax-tmin)/plotPoints}]
      , AllTrue[#, RealValuedNumericQ]&] // Transpose;



      pts = sampler[#["Initial"] &/@ vars];


      widgetInstance["ResetStateFunction"] = With[{o = pts, init = (#["Initial"] &/@ vars)}, 
        wapi`Tools`safeFunction @ Function[Null, 
          pts = o;
          updateFunction @@ init;
        ]
      ];

      plotRange = Lookup[Association[opts], PlotRange, Automatic];

      If[plotRange === Automatic,
        plotRange = {
          With[{p = {tmin, tmax}},
            (p - Mean[p]) 1.1 + Mean[p]
          ],
          With[{p = MinMax[pts // Flatten]},
            (p - Mean[p]) 1.1 + Mean[p]
          ]
        };
      ];      
      
      sliders = MapIndexed[With[{index = #2[[1]]}, Switch[#1["Controller"],
                  InputRange,
                    InputRange[#["Min"], #["Max"], #["Step"], #["Initial"], "Label"->(#["Label"]), "TrackedExpression"->passPart[index, Lookup[Association[opts], "TrackedExpression", Null] ] ],

                  InputSelect,
                    InputSelect[#["List"], #["Initial"], "Label"->(#["Label"]), "TrackedExpression"->passPart[index, Lookup[Association[opts], "TrackedExpression", Null] ] ],
                  
                  _,
                    Null
                ] ] &, vars ];


      widgetInstance["Ranges"] = Table[
        Switch[c[[1]]["Controller"],
          InputRange,

            With[{r=Table[i, {i, c[[1]]["Min"], c[[1]]["Max"], c[[1]]["Step"]}]}, wapi`Tools`RangeSet[
                  "Range"->r,
                  "Event"->{c[[2]][[1]]["Id"], "Default"},
                  "Initial"->SortBy[Transpose[{Range[Length[r] ], r}], Function[v, (v[[2]]-c[[1]]["Initial"])^2 ] ][[1,1]],
                  "Type"->"Range",
                  "Delay"->30
                ] ]

          ,
          InputSelect,

            wapi`Tools`RangeSet[
                  "Range"->c[[2]][[1]]["HashList"],
                  "Event"->{c[[2]][[1]]["InternalId"], "Default"},
                  "Initial"->FirstPosition[c[[2]][[1]]["HashList"], c[[2]][[1]]["HashSelected"] ],
                  "Type"->"Select",
                  "Delay"->30
            ]

          ,
          _,
          Nothing
        ]
      , {c, {vars, sliders} // Transpose}];                

      sliders = InputGroup[sliders, "Layout"->Lookup[Association[opts], "ControlsLayout", "Vertical"] ];
      
      EventHandler[sliders, Function[data, With[{r = updateFunction @@ data}, 
         Switch[r,
        
          True,
          pts = sampler[data],

          False,
          Null,

          _,
          pts = r
        ]; 
      
      ] ] ];


      ManipulateHelper[
          sliders[[1, "View"]],
          Graphics[{AbsoluteThickness[2], 
            (* combine contstant X axis list with different dynamic Y lists *)
            Table[With[{
              i = i,
              color = If[i > Length[style], style[[1]], style[[i]]],
              xaxis = Table[t, {t, tmin, tmax, (tmax-tmin)/plotPoints}]
            },
              
              {color, Line[With[{
                points = Transpose[{xaxis, pts[[i]]}]
              },
                points
              ] ] } // Offload
            ]
            , {i, traces}]
          }, PlotRange->plotRange, Sequence@@({opts}//Reverse)],
          "ViewChange"->widgetInstance["Hash"],
          "ControlsLayout" -> Lookup[Association[opts], "ControlsLayout", "Vertical"],
          Appearance -> Lookup[Association[opts], Appearance, "Default"]
      ]
]

SetAttributes[singleTrace, HoldAll]
SetAttributes[multipleTraces, HoldAll]

Options[Manipulate] = {"InitialValues"->Automatic, Appearance->"Default", "TrackedExpression"->Null, "UpdateFunction"->(True&), ContinuousAction->False, "ControlsLayout"->"Vertical", PerformanceGoal->"Speed", "JITFeature"->True}

Options[manipulatePlot] = Normal[ Join[Association[Options[Graphics] ], <|Appearance->"Default", "TrackedExpression"->Null, "ControlsLayout"->"Vertical", "UpdateFunction"->(True&), PlotRange -> Automatic, "SamplingPoints" -> 200.0, ImageSize -> {400, 300}, PlotStyle->ColorData[97, "ColorList"], TransitionType->"Linear", TransitionDuration->50, Epilog->{}, Prolog->{}, AxesLabel->{}|>] ]
Options[ManipulatePlot] = Options[manipulatePlot]
Options[ManipulateParametricPlot] = Options[manipulatePlot]

SetAttributes[ManipulatePlot, HoldAll]
SetAttributes[manipulatePlot, HoldAll]

animatePlot;
AnimatePlot;

SetAttributes[animatePlot, HoldAll]
SetAttributes[AnimatePlot, HoldAll]

Options[animatePlot] = Join[Options[manipulatePlot], {RefreshRate -> 24}];
Options[AnimatePlot] = Options[animatePlot];
Options[ListAnimatePlot] = Join[Options[animatePlot], {InterpolationOrder -> 1}];

AnimationCtl;

animatePlot[tracer_, f_, {t_Subscript, rest__}, rest2__] := With[{generated = Unique[]},
  Extract[Hold[f] /. {t->generated}, 1, Function[passed, 
    animatePlot[tracer, passed, {generated, rest}, rest2]
  , HoldAll] ]
]

animatePlot[tracer_, f_, any_, paramters:({_Subscript | _Symbol | {_Subscript, _?NumericQ} | {_Symbol, _?NumericQ} | {_Subscript, _?NumericQ, _String} | {_Symbol, _?NumericQ, _String}, ___?NumericQ} | {_Subscript | {_Subscript, _} | {_Subscript, _, _String}, _List} | {_Symbol | {_Symbol, _} | {_Symbol, _, _String}, _List}).., rawopts: OptionsPattern[] ] := With[{
  scripts = Cases[Hold[ List[paramters] ], _Subscript, Infinity]
},
{
  generated = Table[Unique[], {Length[scripts]} ]
},
{
  rules = Table[With[{
    original = scripts[[i]],
    replacement = generated[[i]]
  },
    {
      {original, initial_, label_String} :> {replacement, initial, label},
      {original, initial_} :> {replacement, initial, StringTemplate["``<sub>``</sub>"][original[[1]], original[[2]]]},
      {original} :> {replacement, Automatic, StringTemplate["``<sub>``</sub>"][original[[1]], original[[2]]]},
      original :> {replacement, Automatic, StringTemplate["``<sub>``</sub>"][original[[1]], original[[2]]]}
    }
  ], {i,1,Length[scripts]}] // Flatten,

  basicRules = Thread @ Rule[scripts, generated]
},
{
  newparams = Sequence @@ (List[paramters] /. rules), 
  function = If[Length[Cases[Hold[f], _CoffeeLiqueur`Extensions`Editor`Internal`$PreviousOut, Infinity] ] > 0, 
    With[{o=Evaluate[f]}, Hold[o] ]
  ,
    If[Length @ Cases[Hold[f], scripts//First, Infinity] > 0,
      Hold[f],
      With[{o=Evaluate[f]}, Hold[o] ]
    ]
  ]
},
  Extract[function  /. basicRules, 1, Function[passed, 
    animatePlot[tracer, passed, any, newparams]
  , HoldAll] ]  
] /; (Length[Cases[Hold[ List[paramters] ], _Subscript, Infinity] ] > 0)

animatePlot[tracer_, f_, {t_Symbol, tmin_?NumericQ, tmax_?NumericQ}, paramters:({_Symbol | {_Symbol, _?NumericQ | Automatic} | {_Symbol, _?NumericQ | Automatic, _String}, ___?NumericQ} | {_Symbol | {_Symbol, _} | {_Symbol, _, _String}, _List}).., rawopts: OptionsPattern[] ] := 
With[{
  vars = Map[makeVariableObject, Unevaluated @ List[paramters] ], 
  plotPoints = OptionValue["SamplingPoints"]
},

  If[!AllTrue[vars, !FailureQ[#] &] || vars === $Failed,
    Return[$Failed];
  ];

  If[Length[List[paramters] ] > 1, Return[ Message[Animate::usesingle]; $Failed ] ];

  With[{
    (* wrap f to a pure function *)
    anonymous = With[{s = Extract[#, "Symbol", Hold] &/@ Join[{<|"Symbol":>t|>}, vars]},
                  With[{vlist = Hold[s] /. {Hold[u_Symbol] :> u}},
                    makeFunction[vlist, f]
                  ]
              ],
    
    size = OptionValue[ImageSize],

    transitionType = OptionValue[TransitionType],
    transitionDuration = OptionValue[TransitionDuration],

    axes = OptionValue[AxesLabel],
    prolog = OptionValue[Prolog],
    epilog = OptionValue[Epilog],
    rate = OptionValue[RefreshRate],
    style = {OptionValue[PlotStyle]}//Flatten,
    rest = Sequence @@ Normal[KeyDrop[Association[rawopts], {ImageSize, TransitionType, "UpdateFunction", TransitionDuration, AxesLabel, Prolog, Epilog, PlotStyle, "TrackedExpression"}] ] 
  },
    Module[{pts, plotRange = OptionValue[PlotRange], sampler},

      
      sampler[args_] := Select[
        Table[tracer[t, anonymous @@ Join[{t}, args] ], {t, tmin, tmax, (tmax-tmin)/plotPoints}]
      , AllTrue[# // Flatten, RealValuedNumericQ]&];

      (* test sampling of f *)
      pts = sampler[#["Initial"] &/@ vars];

      If[plotRange === Automatic,
        plotRange = 1.1 {MinMax[pts[[All,1]]], MinMax[pts[[All,2]] // Flatten]};
      ];



      With[{
        opts = Sequence[
          ImageSize->size, 
          PlotRange->plotRange, 
          Axes->True, 
          TransitionType->transitionType, 
          TransitionDuration->transitionDuration, 
          Prolog -> prolog,
          AxesLabel -> axes,
          rest
        ],
        traces = Length[{pts[[1,2]]} // Flatten],
        length = plotPoints
      },
      
        (* two cases: single curve or multiple *)
        If[Depth[pts] === 3,
          singleAnimatedTrace[tracer, anonymous, t, tmin, tmax, length, style, vars, Epilog -> epilog, AnimationRate -> rate, opts]
        ,
          multipleAnimatedTraces[tracer, anonymous, traces, t, tmin, tmax, length, style, vars, Epilog -> epilog, AnimationRate -> rate, opts]
        ]

      ]


    ]
  ]
]

singleAnimatedTrace[tracer_, anonymous_, t_, tmin_, tmax_, plotPoints_, style_, vars_, Rule[Epilog, epilog_], Rule[AnimationRate, rate_], opts__] := With[{pts = Unique["animatePlot"]}, Module[{dataset = {}, sliders, sampler, ranges},
      (* sampling of f *)
      sampler[a_] := Select[
        Table[tracer[t, anonymous @@ Join[{t}, a] ], {t, tmin, tmax, (tmax-tmin)/plotPoints}]
      , AllTrue[#, RealValuedNumericQ]&];

      pts = sampler[#["Initial"] &/@ vars];
      
      (* ranges *)
      ranges = With[{j =First[vars]}, Table[{i}, {i, j["Min"], j["Max"], j["Step"]}] ];
      
      dataset = sampler /@ ranges;

      packedAnimation[Graphics[{ AbsoluteThickness[2], style[[1]], Line[pts // Offload]},  Epilog->{AnimationShutter[pts, dataset, rate], epilog}, opts], {"AnimatedTrace", 1, Length[dataset]} ]
] ] 

SetAttributes[AnimationShutter, HoldFirst];

multipleAnimatedTraces[tracer_, anonymous_, traces_, t_, tmin_, tmax_, plotPoints_, style_, vars_, Rule[Epilog, epilog_], Rule[AnimationRate, rate_], opts__] := With[{pts = Unique["animatePlotMulty"]}, Module[{sliders, ranges, dataset, sampler},

      sampler[a_] := Select[
        Table[anonymous @@ Join[{t}, a], {t, tmin, tmax, (tmax-tmin)/plotPoints}]
      , AllTrue[#, RealValuedNumericQ]&] // Transpose;

      pts = sampler[#["Initial"] &/@ vars];
      
      ranges = With[{j =First[vars]}, Table[{i}, {i, j["Min"], j["Max"], j["Step"]}] ];
      
      dataset = sampler /@ ranges;


      packedAnimation[Graphics[{AbsoluteThickness[2], 
            (* combine contstant X axis list with different dynamic Y lists *)
            Table[With[{
              i = i,
              color = If[i > Length[style], style[[1]], style[[i]]],
              xaxis = Table[t, {t, tmin, tmax, (tmax-tmin)/plotPoints}]
            },
              
              {color, Line[With[{
                points = Transpose[{xaxis, pts[[i]]}]
              },
                points
              ] ]} // Offload
            ]
            , {i, traces}]
      }, Epilog->{AnimationShutter[pts, dataset, rate], epilog}, opts], {"AnimatedTrace", 1, Length[dataset]} ]
] ] 

SetAttributes[singleAnimatedTrace, HoldAll]
SetAttributes[multipleAnimatedTraces, HoldAll]

AnimatePlot[all__] := animatePlot[yChannel, all]
SetAttributes[AnimatePlot, HoldAll]

AnimateParametricPlot[all__] := animatePlot[xyChannel, all]
SetAttributes[AnimateParametricPlot, HoldAll]


ListAnimatePlot[list_List, opts: OptionsPattern[] ] := With[{intOrder = OptionValue[InterpolationOrder]},
  Switch[ArrayDepth[list // First],
    1,
      (* single y traces *)
      With[{t = Interpolation[Transpose[{Range[Length[#] ], #}], InterpolationOrder->intOrder] &/@ list},
        Module[{func,x,i},
          func[x_?NumberQ, j_?NumberQ] := t[[j // Round]][x];
          AnimatePlot[func[x, i], {x, 1, Length[list // First]}, {i, 1, Length[list], 1}, opts]
        ]
        
      ]
    ,

    2,
      If[Length[list // First // First] > 2,
        (* multiple y traces *)
        
With[{t = Map[Function[{l}, Interpolation[Transpose[{Range[Length[#] ], #}], InterpolationOrder->intOrder] &/@ l], list]},
        Module[{func,x,i},
          func[xx_?NumberQ, jj_?NumberQ] := Map[Function[k, k[xx]], t[[jj // Round]]];
          AnimatePlot[func[x, i], {x, 1, Length[list // First // First]}, {i, 1, Length[list], 1}]
        ]
        
      ]
        
      ,
        (* single xy traces *)

      With[{t = Interpolation[#, InterpolationOrder->intOrder] &/@ list},
        Module[{func,x,i},
          func[x_?NumberQ, j_?NumberQ] := t[[j // Round]][x];
          AnimatePlot[func[x, i], {x, list[[1,All,1]] // Min, list[[1,All,1]] // Max}, {i, 1, Length[list], 1}, opts]
        ]
        
      ]

      ]

    ,

    3,
      (* multiple xy traces *)

With[{t = Map[Function[{l}, Interpolation[#, InterpolationOrder->intOrder] &/@ l], list]},
        Module[{func,x,i},
          func[xx_?NumberQ, jj_?NumberQ] := Map[Function[k, k[xx]], t[[jj // Round]]];
          AnimatePlot[func[x, i], {x, list[[1,1,All,1]] // Min, list[[1,1,All,1]] // Max}, {i, 1, Length[list], 1}]
        ]
        
      ]

      
  ]
]




Options[Animate] = {Appearance->Automatic, "UpdateFunction" -> (True&), RefreshRate->12, AnimationRate->Automatic, "TriggerEvent"->Null, 	AnimationRepetitions->1}


Animate[f_, paramters:({_Subscript | _Symbol | {_Subscript, _?NumericQ} | {_Symbol, _?NumericQ} | {_Subscript, _?NumericQ, _String} | {_Symbol, _?NumericQ, _String}, ___?NumericQ} | {_Subscript | {_Subscript, _} | {_Subscript, _, _String}, _List} | {_Symbol | {_Symbol, _} | {_Symbol, _, _String}, _List}).., rawopts: OptionsPattern[] ] := With[{
  scripts = Cases[Hold[ List[paramters] ], _Subscript, Infinity]
},
{
  generated = Table[Unique[], {Length[scripts]} ]
},
{
  rules = Table[With[{
    original = scripts[[i]],
    replacement = generated[[i]]
  },
    {
      {original, initial_, label_String} :> {replacement, initial, label},
      {original, initial_} :> {replacement, initial, StringTemplate["``<sub>``</sub>"][original[[1]], original[[2]]]},
      {original} :> {replacement, Automatic, StringTemplate["``<sub>``</sub>"][original[[1]], original[[2]]]},
      original :> {replacement, Automatic, StringTemplate["``<sub>``</sub>"][original[[1]], original[[2]]]}
    }
  ], {i,1,Length[scripts]}] // Flatten,

  basicRules = Thread @ Rule[scripts, generated]
},
{
  newparams = Sequence @@ (List[paramters] /. rules), 
  function = If[Length[Cases[Hold[f], _CoffeeLiqueur`Extensions`Editor`Internal`$PreviousOut, Infinity] ] > 0, 
    With[{o=Evaluate[f]}, Hold[o] ]
  ,
    If[Length @ Cases[Hold[f], scripts//First, Infinity] > 0,
      Hold[f],
      With[{o=Evaluate[f]}, Hold[o] ]
    ]
  ]
},
  Extract[function  /. basicRules, 1, Function[passed, 
    Animate[passed, newparams]
  , HoldAll] ]  
] /; (Length[Cases[Hold[ List[paramters] ], _Subscript, Infinity] ] > 0)

Animate::usesingle = "Use single parameter to animate"
AnimatedImage::noelectron = "WLJS Notebook Desktop application is required"

With[{
  joinedOptions = Join[Options[AnimatedImage], Options[renderAnimation], {"Asynchronous"->False, Asynchronous->False} ]
},


  AnimationHelper /: AnimatedImage[a_AnimationHelper, opts: OptionsPattern[joinedOptions] ] := (Message[AnimatedImage::noelectron]; $Failed) /; !TrueQ[Internal`Kernel`ElectronQ];

  AnimationHelper /: AnimatedImage[a_AnimationHelper, opts: OptionsPattern[joinedOptions] ] := With[{p = renderAnimation[a, Sequence @@ FilterRules[{opts}, Options[renderAnimation] ] ]},
    If[!Lookup[Association[opts], "Asynchronous", Lookup[Association[opts], Asynchronous, False] ],
      With[{result = WaitAll[p, 4 360]},
        If[FailureQ[result], $Failed,
          AnimatedImage[result, FrameRate->Lookup[Association[opts], FrameRate, (wapi`Tools`HashMap[a[[7]]]["FrameRate"])], Sequence @@ FilterRules[{opts}, Options[AnimatedImage] ] ]
        ]
      ]    
    ,
      With[{promise = Promise[]},
        Then[p, Function[result,
          EventFire[promise, Resolve, If[FailureQ[result], $Failed,
            AnimatedImage[result, FrameRate->Lookup[Association[opts], FrameRate, (wapi`Tools`HashMap[a[[7]]]["FrameRate"])], Sequence @@ FilterRules[{opts}, Options[AnimatedImage] ] ]
          ] ];        
        ] ];

        promise
      ]       
    ]
  ];

  packedAnimation /: AnimatedImage[a_packedAnimation, opts: OptionsPattern[joinedOptions] ]:= (Message[AnimatedImage::noelectron]; $Failed) /; !TrueQ[Internal`Kernel`ElectronQ];


  packedAnimation /: AnimatedImage[a_packedAnimation, opts: OptionsPattern[joinedOptions] ] := With[{p = renderAnimation[a, Sequence @@ FilterRules[{opts}, Options[renderAnimation] ] ]},
    If[!Lookup[Association[opts], "Asynchronous", Lookup[Association[opts], Asynchronous, False] ],
      With[{result = WaitAll[p, 4 360]},
        If[FailureQ[result], $Failed,
          AnimatedImage[result, FrameRate->Lookup[Association[opts], FrameRate, 12], Sequence @@ FilterRules[{opts}, Options[AnimatedImage] ] ]
        ]
      ]
    ,
      With[{promise = Promise[]},
        Then[p, Function[result,
          EventFire[promise, Resolve, If[FailureQ[result], $Failed,
            AnimatedImage[result, FrameRate->Lookup[Association[opts], FrameRate, 12], Sequence @@ FilterRules[{opts}, Options[AnimatedImage] ] ]
          ] ];        
        ] ];

        promise
      ] 
    ]
  ];

];


renderAnimation[widget_AnimationHelper, opts: OptionsPattern[] ] := Module[{
  task, run, index = 2, attemps = 0, exitAndCleanUp, collectFrames
}, With[{
  instance = wapi`Tools`HashMap[widget[[7]]],
  window = OptionValue["Window"],
  channel = CreateUUID[],
  promise = Promise[]
},
{
  range = instance["Ranges"][[1]]
},
{
  exposure = If[NumberQ[#], 1000 #, range["Delay"] ] &@ OptionValue["ExposureTime"]
},

  exitAndCleanUp := With[{},
    ClearAll[task];
    ClearAll[index];
    ClearAll[collectFrames];
    ClearAll[run];
    ClearAll[attemps];
    ClearAll[exitAndCleanUp];
  ];

  task = SetInterval[
    attemps++;
    If[attemps > 100,
      Echo["Widget instace is still offline. Aborting"];
      exitAndCleanUp; TaskRemove[task]; TaskAbort[task]; Return[];
    ];
    If[instance["Online"] === True,
      TaskRemove[task];
      TaskAbort[task];
      SetTimeout[
        instance["ResetStateFunction"][];
        SetTimeout[run, Max[1000, exposure] ];
      , Max[1000, exposure] ];
    ];, 300];

  run := With[{},
    task = SetInterval[
        FrontSubmit[RecorderView["Capture"], "Window" -> window];
        If[index > Length[range["Range"] ], 
          TaskRemove[task]; TaskAbort[task]; collectFrames; Return[] 
        ];    

        EventFire[range["Event"][[1]], range["Event"][[2]], range["Range"][[index]] ];
        index++;
    , exposure ];
  ];

  collectFrames := With[{spinner = EchoLabel["Spinner"]["Collecting data"]},
    
    Then[TableAsync[
      Module[{a},
        a = FrontFetchAsync[RecorderView["Pop"], "Window"->window] // Await;
        ImportString[StringDrop[a, StringLength["data:image/png;base64,"] ], "Base64"]
      ]
    , {i, 1, Length[range["Range"] ]}], Function[frames,
      FrontSubmit[RecorderView["Dispose"], "Window" -> window];
      exitAndCleanUp;
      Delete[spinner];
      EventFire[promise, Resolve, frames];
    ] ]
  ];

  Then[FrontFetchAsync[RecorderView[], "Window" -> window], Function[Null,
    FrontSubmit[RecorderView["Create", widget /. {Rule[Appearance, _]->Rule[Appearance, "UILess"]}, channel, 0 ], "Window" -> window];
  ] ]; 

  promise
] ]

renderAnimation::unkwn = "Unknown type of animated object"
renderAnimation[_, opts: OptionsPattern[] ] := (
  Message[renderAnimation];
  $Failed
)

renderAnimation[packedAnimation[body_, {"AnimatedTrace", start_Integer, end_Integer}], opts: OptionsPattern[] ] := Module[{
  task, run, index = 2, exitAndCleanUp, collectFrames
}, With[{
  window = OptionValue["Window"],
  channel = CreateUUID[],
  promise = Promise[],
  triggerId = CreateUUID[]
},
{
  range = Range[start, end]
},
{
  exposure = If[NumberQ[#], 1000 #, 100 ] &@ OptionValue["ExposureTime"]
},

  exitAndCleanUp := With[{},
    ClearAll[task];
    ClearAll[index];
    ClearAll[collectFrames];
    ClearAll[run];
    ClearAll[exitAndCleanUp];
  ];

  EventHandler[triggerId, {"Mounted" -> Function[Null,
    SetTimeout[run, 500];
    EventRemove[triggerId];
  ]}];

  run := With[{},
    task = SetInterval[
        FrontSubmit[RecorderView["Capture"], "Window" -> window];
        If[index > Length[range], 
          TaskRemove[task]; TaskAbort[task]; collectFrames; Return[] 
        ];    

        FrontSubmit[AnimationCtl[triggerId, range[[index]] ], "Window"->window];
        index++;
    , exposure ];
  ];

  collectFrames := With[{spinner = EchoLabel["Spinner"]["Collecting data"]},
    
    Then[TableAsync[
      Module[{a},
        a = FrontFetchAsync[RecorderView["Pop"], "Window"->window] // Await;
        ImportString[StringDrop[a, StringLength["data:image/png;base64,"] ], "Base64"]
      ]
    , {i, 1, Length[range ]}], Function[frames,
      FrontSubmit[RecorderView["Dispose"], "Window" -> window];
      exitAndCleanUp;
      Delete[spinner];
      EventFire[promise, Resolve, frames];
    ] ]
  ];

  Then[FrontFetchAsync[RecorderView[], "Window" -> window], Function[Null,
    FrontSubmit[RecorderView["Create", body /. {AnimationShutter[a_,b_,c_, rules___] :> AnimationShutter[a,b,c, "ManualTrigger"->triggerId, rules]}, channel, 0 ], "Window" -> window];
  ] ]; 

  promise
] ]

Options[renderAnimation] = {"Window" :> CurrentWindow[], "ExposureTime"->Automatic}



Animate[f_, parameters:({_Symbol | {_Symbol, _?NumericQ | Automatic} | {_Symbol, _?NumericQ | Automatic, _String}, ___?NumericQ} | {_Symbol | {_Symbol, _} | {_Symbol, _, _String}, _List}).., OptionsPattern[] ] := Module[{forcedStep = False, code, sliders, originalExpression, jitFailedQQ = True, protected = {} , noOffload = False}, With[{
  vars = Map[makeVariableObject, Unevaluated @ List[parameters] ],
  hash = Hash[{f//Hold, parameters}],
  eventId = CreateUUID[],
  updateFunction = OptionValue["UpdateFunction"],
  animationRepetitions = OptionValue[AnimationRepetitions],
  table = Unique["diffTable"],
  widgetInstance = wapi`Tools`WidgetLike["Interpolation"->False, "Notebook"->First[EvaluationNotebook[] ], "Meta"-><|"Description" -> "Animate expression widget"|> ]
},

{
  animationRate = Switch[{OptionValue["AnimationRate"], OptionValue["RefreshRate"]},
    {_?NumberQ, Automatic},
    OptionValue["AnimationRate"]/(vars[[1]]["Step"]),

    {Automatic, _?NumberQ},
    OptionValue["RefreshRate"],

    {_?NumberQ, _?NumberQ},
    forcedStep = OptionValue["AnimationRate"];
    OptionValue["RefreshRate"],

    _,
    12
  ]
},

  If[Length[List[parameters] ] > 1, Return[Message[Animate::usesingle]; $Failed ] ];

    EventHandler[widgetInstance["Hash"], {
      "Mounted" -> Function[Null,
        wapi`Tools`ChangeState[widgetInstance, "Online"];
        EventHandler[CurrentWindow[], {"Closed" -> Function[Null,
          wapi`Tools`ChangeState[widgetInstance, "Offline"];
        ]}];  
      ],

      "Destroy" -> Function[Null,
        wapi`Tools`ChangeState[widgetInstance, "Offline"];
      ]
    }];

    EventHandler[ResultCell[], {"Destroy" -> Function[Null,

        (* Echo["Unprotect all protected objects"]; *)
        (* FrontSubmit[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects["GarbageCollector", True] ]; *)
        ClearAll[protected];
        df`Private`clearTable[table];
        wapi`Tools`ChangeState[widgetInstance, "Offline"];
        EventRemove[widgetInstance["Hash"] ];
        Delete[ widgetInstance ];
    ]}];
 
    If[!AllTrue[vars, !FailureQ[#] &] || vars === $Failed,
      Return[$Failed];
    ];




    With[{
    (* wrap f into a pure function *)
    anonymous = With[{s = Extract[#, "Symbol", Hold] &/@ vars},

                  With[{vlist = Hold[s] /. {Hold[u_Symbol] :> u}},
                    makeFunction[vlist, f]
                  ]
              ]
    },



        With[{result = updateFunction @@ (#["Initial"] &/@ vars)},
        code = ToString[anonymous[vars[[1, "Initial"]]], StandardForm];

         If[result === False, 
          jitFailedQQ = False;
          noOffload = True;
          
          ,

         (* preoptimize *)
         With[{
          next = If[vars[[1, "Initial"]] + If[forcedStep===False, vars[[1, "StepRaw"]], forcedStep] > vars[[1, "MaxRaw"]], 
            vars[[1, "Initial"]] - If[forcedStep===False, vars[[1, "StepRaw"]], forcedStep], 
            vars[[1, "Initial"]] + If[forcedStep===False, vars[[1, "StepRaw"]], forcedStep] 
          ]
         },
          originalExpression = anonymous[ next ];

 

          With[
            {expr = anonymous[vars[[1, "Initial"]]]},
            {diffList = Flatten[{df`Private`diff[originalExpression, expr, 1, <||>]}]},

            jitFailedQQ = Or @@ (FailureQ/@diffList);

            df`Private`processDiffs[table, originalExpression, expr, diffList, Function[editorExpr,
              code = ToString[editorExpr, StandardForm];
              False
            ] ];

            originalExpression = expr;
          ];  
         ];    
         ];     
        ];


    widgetInstance["Ranges"] = With[{r=Table[i, {i, vars[[1]]["Min"], vars[[1]]["Max"], If[forcedStep === False, vars[[1]]["Step"], forcedStep]}]}, {wapi`Tools`RangeSet[
      "Range"->r,
      "Event"->{eventId, "Default"},
      "Type"->"Range",
      "Delay"->If[jitFailedQQ, Max[(2000.0/animationRate), 500], (2000.0/animationRate) ]
    ]}];

    widgetInstance["FrameRate"] = If[jitFailedQQ, Min[animationRate, 5], animationRate];


      widgetInstance["ResetStateFunction"] = With[{o = code}, 
        wapi`Tools`safeFunction @ Function[Null, 
          code = o;
          updateFunction @@ (#["Initial"] &/@ vars);
          df`Private`resetAll[table];
        ]
      ];
      
      (* controls *)


      
      If[OptionValue["TriggerEvent"] =!= Null,
        EventHandler[OptionValue["TriggerEvent"]//EventClone, {"Stop" -> Function[Null,
          FrontSubmit[AnimationHelperRun[eventId, "Stop"] ]
        ], _ -> Function[Null,
          FrontSubmit[AnimationHelperRun[eventId] ]
        ]} ];
      ];

      (* update expression when any slider is dragged *)
      With[{o = code}, EventHandler[eventId, Function[data, 
        (* FrontSubmit[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects["GarbageCollector", False] ]; *)

        With[{result = updateFunction @ data},
          Switch[result,
            True,
            
                With[
                  {expr = anonymous @ data},
                  {diffList = Flatten[{df`Private`diff[originalExpression, expr, 1, <||>]}]},

        

                  df`Private`processDiffsStateless[table, originalExpression, expr, diffList, Function[editorExpr,
                    code = ToString[editorExpr, StandardForm];
                    False
                  ], Function[Null,
                    code = o;
                  ] ];
                ];            
            
            ,

            False,
            Null,

            _,
            code = result
            
          ];
        ];
      ] ] ];

      If[jitFailedQQ, Message[Animate::frclip] ];


      AnimationHelper[
        EditorView[ code // Offload, "FullReset"->True, "KeepMaxHeight"->True, "KeepMaxWidth"->True] (* EditorView works only with strings, FullReset for the cleanest update *)
      , {vars[[1]]["Min"], vars[[1]]["Max"], If[forcedStep === False, vars[[1]]["Step"], forcedStep]}, eventId, If[jitFailedQQ, Min[animationRate, 5], animationRate], OptionValue["TriggerEvent"] === Null, If[animationRepetitions === Infinity, -1, animationRepetitions], widgetInstance["Hash"], "ViewChange"->widgetInstance["Hash"], "JIT"->Offload[code], Appearance->OptionValue[Appearance] ]
    ]
] ]

Animate::frclip = "JIT failed. RefreshRate will be limited to 5 FPS";

AnimationHelper;
AnimationHelperRun;

System`WLXForm;


AnimationHelper /: MakeBoxes[a_AnimationHelper, form: WLXForm | StandardForm] := With[{o = CreateFrontEndObject[a]},
  If[form === WLXForm,
    MakeBoxes[o, form]
  ,
    With[{out = MakeBoxes[o, StandardForm]},
      ViewBox[out, o]
    ]
  ]
]

SetAttributes[Animate, HoldAll]

useSecondaryKernel[function_, args_, Null] := ImageData[MMAView[
  function @@ args
], "Byte"]

useSecondaryKernel[expression_, Null, Null] := WaitAll[ParallelSubmitFunctionAsync[Function[{arguments, cbk},
  cbk @ ImageData[Rasterize[expression], "Byte"]
], {}], 2 60]

useSecondaryKernel[function_, args_, dims_] := ParallelSubmitFunctionAsync[Function[{arguments, cbk},
  cbk @ ImageData[ImageCrop[Rasterize[function @@ arguments], dims, Padding->White], "Byte"]
], args]

useSecondaryKernel[expression_, Null, dims_] := ParallelSubmitFunctionAsync[Function[{arguments, cbk},
  cbk @ ImageData[ImageCrop[Rasterize[expression], dims, Padding->White], "Byte"]
], {}]

(* polyfills for Mathematica *)

substituteViewPoint[Graphics3D[args__, opts: OptionsPattern[] ], v_ ] := Graphics3D[args, ViewPoint->v, opts]

Manipulate /: MMAView[Manipulate[f_, parameters:({_Symbol | {_Symbol, _?NumericQ} | {_Symbol, _?NumericQ, _String}, ___?NumericQ} | {_Symbol | {_Symbol, _} | {_Symbol, _, _String}, _List}).., opts: OptionsPattern[] ] ] := Module[{
  code, sliders, protected = {}, dims, buffer
}, With[{
  vars = Map[makeVariableObject, Unevaluated @ List[parameters] ]
},

    If[Length[Kernels[] ] == 0, LaunchKernels[1] ];

    EventHandler[ResultCell[], {"Destroy" -> Function[Null,

        (* Echo["Unprotect all protected objects"]; *)
        (* FrontSubmit[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects["GarbageCollector", True] ]; *)
        ClearAll[protected];

    
    ]}];
 
    If[!AllTrue[vars, !FailureQ[#] &] || vars === $Failed,
      Return[$Failed];
    ];

      (* controls *)
 
      sliders = MapIndexed[With[{index = #2[[1]]}, Switch[#1["Controller"],
                  InputRange,
                    InputRange[#["Min"], #["Max"], #["Step"], #["Initial"], "Label"->(#["Label"]), "Topic"->{Null, "Default"}, "TrackedExpression"->passPart[index, OptionValue[Manipulate, opts, "TrackedExpression"] ] ],

                  InputSelect,
                    InputSelect[#["List"], #["Initial"], "Label"->(#["Label"]), "TrackedExpression"->passPart[index, OptionValue[Manipulate, opts, "TrackedExpression"] ] ],
                  
                  _,
                    Null
                ] ] &,  vars];


      sliders = InputGroup[sliders, "Layout"->OptionValue[Manipulate, opts, "ControlsLayout"] ];


    With[{
    (* wrap f into a pure function *)
    anonymous = With[{s = Extract[#, "Symbol", Hold] &/@ vars},

                  With[{vlist = Hold[s] /. {Hold[u_Symbol] :> u}},
                    makeFunction[vlist, f]
                  ]
              ]
    },

    If[Head[(anonymous) @@ ((#["Initial"] &/@ vars))] === Graphics3D,
      Module[{
        target = {0,0}, start = {0,0}, moving = False,
        framesSkip = 0, viewPoint = getAngles[{Pi/2.6, Pi/3}], 
        angles = {Pi/2.6, Pi/3},
        cachedData  = ((#["Initial"] &/@ vars))   
      },

        With[{expr = substituteViewPoint[(anonymous) @@ ((#["Initial"] &/@ vars)), viewPoint]},
          buffer = useSecondaryKernel[expr, Null, Null];
          dims = (buffer // Dimensions)[[{2,1}]];
        ];      
      

      (* update expression when any slider is dragged *)
      EventHandler[sliders, Function[data, 
        cachedData = data;
        (* FrontSubmit[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects["GarbageCollector", False] ]; *)
        With[{expr = substituteViewPoint[(anonymous) @@ data, viewPoint]},
        Then[useSecondaryKernel[expr, Null, dims], Function[image,
          buffer = image;
        ] ];
      ] ] ];


      Column[{
          sliders,
          EventHandler[Graphics[{
          Inset[Image[buffer // Offload, "Byte"], {0,0}]
        }, 
          ImageSizeRaw -> dims, 
          PlotRange->{{-1,1}, {-1,1}},
          "Controls"->False
        ], {
          "mousemove" -> Function[xy, 
            target = xy; framesSkip++; 
            If[Mod[framesSkip, 3] == 0 && moving,
              With[{dir = (target - start)/5.0},
                angles += dir;
                viewPoint = getAngles[angles];
                
              ];
              With[{expr = substituteViewPoint[(anonymous) @@ cachedData, viewPoint]},
        Then[useSecondaryKernel[expr, Null, dims], Function[image,
          buffer = image;
        ] ];
      ]
            ]
          ],
          "mousedown" -> Function[xy, start = xy; moving = True],
          "mouseup" -> Function[xy, moving = False]
        }]
      }]


      ]
    ,
    
    

        With[{},
          buffer = useSecondaryKernel[anonymous, (#["Initial"] &/@ vars), Null];
          dims = (buffer // Dimensions)[[{2,1}]];
        ];
      

            (* update expression when any slider is dragged *)
      EventHandler[sliders, Function[data, 
        (* FrontSubmit[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects["GarbageCollector", False] ]; *)

        Then[useSecondaryKernel[anonymous, data, dims], Function[image,
          buffer = image;
        ] ];
      ] ];


      Column[{
          sliders,
          Image[buffer // Offload, "Byte"]
      }]
    ]
   ]
] ]


getAngles[angles_] := 3.0{Cos[-angles[[1]]]Sin[angles[[2]]], Sin[-angles[[1]]]Sin[angles[[2]]], Cos[angles[[2]]]}

Unprotect[Graphics3D]

Graphics3D /: MMAView[Graphics3D[args__, opts: OptionsPattern[] ] ] := With[{function = Function[vec, 
  Graphics3D[args, SphericalRegion->True, ViewPoint->vec, opts]
]},
 With[{firstImage = MMAView[function[getAngles[{Pi/2.6, Pi/3}] ] ]},
  With[{dims = ImageDimensions[firstImage]},
    Module[{
      buffer = ImageData[firstImage, "Byte"], 
      target = {0,0}, start = {0,0}, moving = False,
      framesSkip = 0, viewPoint = getAngles[{Pi/2.6, Pi/3}], recalc,
      angles = {Pi/2.6, Pi/3}
    },

      recalc := With[{},
        Then[ParallelSubmitFunctionAsync[Function[{arguments, cbk},
              cbk @ ImageData[ImageCrop[Rasterize[function @ arguments], dims, Padding->White], "Byte"]
            ], viewPoint], Function[imgData,
              buffer = imgData;
        ] ];          
      ];
    


        EventHandler[Graphics[{
          Inset[Image[buffer // Offload, "Byte"], {0,0}]
        }, 
          ImageSizeRaw -> ImageDimensions[firstImage], 
          PlotRange->{{-1,1}, {-1,1}},
          "Controls"->False
        ], {
          "mousemove" -> Function[xy, 
            target = xy; framesSkip++; 
            If[Mod[framesSkip, 3] == 0 && moving,
              With[{dir = (target - start)/5.0},
                angles += dir;
                viewPoint = getAngles[angles];
                
              ];
              recalc;
            ]
          ],
          "mousedown" -> Function[xy, start = xy; moving = True],
          "mouseup" -> Function[xy, moving = False]
        }]


    ]
  ]
 ]
]



Animate /: MMAView[Animate[f_, parameters:({_Symbol | {_Symbol, _?NumericQ} | {_Symbol, _?NumericQ, _String}, ___?NumericQ} | {_Symbol | {_Symbol, _} | {_Symbol, _, _String}, _List}).., opts: OptionsPattern[] ] ] := Module[{code, sliders, protected = {} , noOffload = False}, With[{
  vars = Map[makeVariableObject, Unevaluated @ List[parameters] ],
  hash = Hash[{f//Hold, parameters}],
  eventId = CreateUUID[],
  updateFunction = OptionValue[Animate, opts, "UpdateFunction"],
  animationRate = OptionValue[Animate, opts, "RefreshRate"],
  animationRepetitions = OptionValue[Animate, opts, AnimationRepetitions]
}, Module[{buffer, dims}, 

  If[Length[List[parameters] ] > 1, Return[Message[Animate::usesingle]; $Failed ] ];

 
    If[!AllTrue[vars, !FailureQ[#] &] || vars === $Failed,
      Return[$Failed];
    ];

  

    With[{
    (* wrap f into a pure function *)
    anonymous = With[{s = Extract[#, "Symbol", Hold] &/@ vars},

                  With[{vlist = Hold[s] /. {Hold[u_Symbol] :> u}},
                    makeFunction[vlist, f]
                  ]
              ]
    },


        buffer = useSecondaryKernel[anonymous, (#["Initial"] &/@ vars), Null];
        dims = (buffer // Dimensions)[[{2,1}]];

      
      (* controls *)


      
      If[OptionValue[Animate, opts, "TriggerEvent"] =!= Null,
        EventHandler[OptionValue[Animate, opts, "TriggerEvent"], Function[Null,
          FrontSubmit[AnimationHelperRun[eventId] ]
        ] ];
      ];

      (* update expression when any slider is dragged *)
      EventHandler[eventId, Function[data, 
        (* FrontSubmit[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects["GarbageCollector", False] ]; *)

        Then[useSecondaryKernel[anonymous, {data}, dims], Function[image,
          buffer = image;
        ] ];

      ] ];


      AnimationHelper[
        Image[buffer // Offload, "Byte"] 
      , {vars[[1]]["Min"], vars[[1]]["Max"], vars[[1]]["Step"]}, eventId, animationRate, OptionValue[Animate, opts, "TriggerEvent"] === Null, If[animationRepetitions === Infinity, -1, animationRepetitions] ]
    ]
] ] ] 


Unprotect[Monitor]
ClearAll[Monitor]
SetAttributes[Monitor, HoldAll];
Monitor[expr_, mon_, rate_:1.0] := expr;
Monitor[expr_, mon_, rate_:1.0] := With[{
  inputCell = EvaluationCell[]
}, {
  cell = NotebookWrite[NotebookLocationSpecifier[inputCell, "After"], ExpressionCell[Panel[Refresh[mon, rate] ], "Output"] ]
}, {
  result = expr
},
  NotebookDelete[cell];
  result
] /; MatchQ[EvaluationCell[], _RemoteCellObj]

End[]
EndPackage[]
