BeginPackage["CoffeeLiqueur`Extensions`NeuralNet`", {
    "CoffeeLiqueur`Extensions`Graphics`",
    "CoffeeLiqueur`Extensions`Plotly`",
    "CoffeeLiqueur`Extensions`InputsOutputs`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Language`",
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CoffeeLiqueur`Extensions`Boxes`",
    "CoffeeLiqueur`Extensions`EditorView`"
}]

Begin["`Private`"]

neuralNetLoadedQ;
If[OwnValues[libPath] === {}, libPath = $RemotePackageDirectory];

With[{file = FileNameJoin[{libPath, "src", "Kernel.wl"}]},
(* deferred evaluation. Applies only when a package has been loaded *)
If[neuralNetLoadedQ =!= True,
  Internal`AddHandler["GetFileEvent",
   If[MatchQ[#, HoldComplete["NeuralNetworks`",_,_] ] && (neuralNetLoadedQ =!= True),
      Echo["Loading neural nets..."];
      Pause[1];
      neuralNetLoadedQ = True;
      Get[file];
      (* TODO: remove this handler!!! *)
   ]&
  ]
] ];



If[neuralNetLoadedQ === True,

  Unprotect[ClassifierFunction];
  FormatValues[ClassifierFunction]={};

  ClassifierFunction /: MakeBoxes[c_ClassifierFunction, StandardForm] := 
      Module[{above, below},
          above = Take[With[{w = Information[c, #]}, If[MatchQ[w, _?NumberQ | _String | _Quantity | True | False | Automatic | Null], {BoxForm`SummaryItem[{TextString[#], w}]}, Nothing] ] &/@ Information[c, "Properties"] // Quiet, UpTo[10] ];

          BoxForm`ArrangeSummaryBox[
             ClassifierFunction, (* head *)
             c,      (* interpretation *)
             None,    (* icon, use None if not needed *)
             (* above and below must be in a format suitable for Grid or Column *)
             above,    (* always shown content *)
             Null (* expandable content. Currently not supported!*)
          ]
  ];

  Unprotect[PredictorFunction];
  FormatValues[PredictorFunction]={};

  PredictorFunction /: MakeBoxes[c_PredictorFunction, StandardForm] := 
      Module[{above, below},
          above = Take[With[{w = Information[c, #]}, If[MatchQ[w, _?NumberQ | _String | _Quantity | True | False | Automatic | Null], {BoxForm`SummaryItem[{TextString[#], w}]}, Nothing] ] &/@ Information[c, "Properties"] // Quiet, UpTo[10] ];

          BoxForm`ArrangeSummaryBox[
             PredictorFunction, (* head *)
             c,      (* interpretation *)
             None,    (* icon, use None if not needed *)
             (* above and below must be in a format suitable for Grid or Column *)
             above,    (* always shown content *)
             Null (* expandable content. Currently not supported!*)
          ]
  ];  

  Unprotect[ClassifierMeasurementsObject];
  FormatValues[ClassifierMeasurementsObject]={};

  ClassifierMeasurementsObject /: MakeBoxes[c_ClassifierMeasurementsObject, StandardForm] := 
      Module[{above, below},
          above = Take[With[{w = Information[c, #]}, If[MatchQ[w, _?NumberQ | _String | _Quantity | True | False | Automatic | Null], {BoxForm`SummaryItem[{TextString[#], w}]}, Nothing] ] &/@ Information[c, "Properties"] // Quiet, UpTo[10] ];

          BoxForm`ArrangeSummaryBox[
             ClassifierMeasurementsObject, (* head *)
             c,      (* interpretation *)
             None,    (* icon, use None if not needed *)
             (* above and below must be in a format suitable for Grid or Column *)
             above,    (* always shown content *)
             Null (* expandable content. Currently not supported!*)
          ]
  ]; 

  


  Unprotect[NetTrain];
  SetOptions[NetTrain, 
    TrainingProgressReporting->Function[assoc, 
        neuralPrinter[AssociationMap[assoc[#]&, {"RoundLoss", "Net", "TimeElapsed","TimeRemaining", "TargetDevice", "LearningRate", "RoundLossList"}]
    ]
  ] ] // Quiet;

    Unprotect[NeuralNetworks`Private`MakeLayerBoxes];
    ClearAll[NeuralNetworks`Private`MakeLayerBoxes];
    Unprotect[LinearLayer];

    LinearLayer /: NeuralNetworks`Private`MakeLayerBoxes[l_LinearLayer] := Module[{above, below},
            above = { 
              {BoxForm`SummaryItem[{"Output dimensions: ", l[["Parameters"]]["OutputDimensions"]}]},
              {BoxForm`SummaryItem[{"Input dimensions: ", l[["Parameters"]]["$InputDimensions"]}]}
            };

            BoxForm`ArrangeSummaryBox[
               LinearLayer, (* head *)
               l,      (* interpretation *)
               None,    (* icon, use None if not needed *)
               (* above and below must be in a format suitable for Grid or Column *)
               above,    (* always shown content *)
               Null (* expandable content. Currently not supported!*)
            ]
        ];  

    Unprotect[NeuralNetworks`Private`DefineDecoder`MakeEncoderBoxes];
    ClearAll[NeuralNetworks`Private`DefineDecoder`MakeEncoderBoxes];

    NeuralNetworks`Private`DefineEncoder`MakeEncoderBoxes[l_] := With[{keys = Select[Keys[l[[All]]], (Head[l[[#]]] =!= NumericArray && ByteCount[l[[#]]] < 1024)&]}, Module[{above, below},
            above = Table[{
              {BoxForm`SummaryItem[{StringJoin[k, ": "], l[[k]]}]}
            }, {k, keys}];

            BoxForm`ArrangeSummaryBox[
               Head[l], (* head *)
               l,      (* interpretation *)
               None,    (* icon, use None if not needed *)
               (* above and below must be in a format suitable for Grid or Column *)
               above,    (* always shown content *)
               Null (* expandable content. Currently not supported!*)
            ]
        ] ];

    Unprotect[NeuralNetworks`Private`DefineDecoder`MakeDecoderBoxes];
    ClearAll[NeuralNetworks`Private`DefineDecoder`MakeDecoderBoxes];

    NeuralNetworks`Private`DefineDecoder`MakeDecoderBoxes[l_] := With[{keys = Select[Keys[l[[All]]], (Head[l[[#]]] =!= NumericArray && ByteCount[l[[#]]] < 1024)&]}, Module[{above, below},
            above = Table[{
              {BoxForm`SummaryItem[{StringJoin[k, ": "], l[[k]]}]}
            }, {k, keys}];

            BoxForm`ArrangeSummaryBox[
               Head[l], (* head *)
               l,      (* interpretation *)
               None,    (* icon, use None if not needed *)
               (* above and below must be in a format suitable for Grid or Column *)
               above,    (* always shown content *)
               Null (* expandable content. Currently not supported!*)
            ]
        ] ];

    NeuralNetworks`Private`MakeLayerBoxes[l_] := With[{keys = Select[Keys[l[[All]]], (Head[l[[#]]] =!= NumericArray && ByteCount[l[[#]]] < 1024)&]}, Module[{above, below},
            above = Table[{
              {BoxForm`SummaryItem[{StringJoin[k, ": "], l[[k]]}]}
            }, {k, keys}];

            BoxForm`ArrangeSummaryBox[
               Head[l], (* head *)
               l,      (* interpretation *)
               None,    (* icon, use None if not needed *)
               (* above and below must be in a format suitable for Grid or Column *)
               above,    (* always shown content *)
               Null (* expandable content. Currently not supported!*)
            ]
        ] ];


        Unprotect[NeuralNetworks`Private`NetChain`makeNetChainBoxes];
        ClearAll[NeuralNetworks`Private`NetChain`makeNetChainBoxes];

        NeuralNetworks`Private`NetChain`makeNetChainBoxes[c_NetChain] :=             BoxForm`ArrangeSummaryBox[
               NetChain, (* head *)
               c,      (* interpretation *)
               None,    (* icon, use None if not needed *)
               (* above and below must be in a format suitable for Grid or Column *)
               {
                 BoxForm`SummaryItem[{"Chain", TableForm[Head /@ c[[All]]]}]
               },    (* always shown content *)
               Null (* expandable content. Currently not supported!*)
            ];

        Unprotect[NeuralNetworks`Private`NetGraph`makeNetGraphBoxes];
        ClearAll[NeuralNetworks`Private`NetGraph`makeNetGraphBoxes];

        NeuralNetworks`Private`NetGraph`makeNetGraphBoxes[c_] := With[{msg = Style["We are looking for volunteers to implement NetGraph", Italic, Background->Yellow]},
          MakeBoxes[msg, StandardForm]
        ];            

If[!AssociationQ[associatedNets], associatedNets = <||>];

neuralPrinter[assoc_Association] := If[!AssociationQ[System`$EvaluationContext], Null, With[{callId = Hash[System`$EvaluationContext["ResultCellHash"]]},
  If[KeyExistsQ[associatedNets, callId],
  
    associatedNets[callId][assoc["RoundLossList"], {
        assoc["TimeElapsed"], assoc["TimeRemaining"],
        assoc["RoundLoss"], assoc["LearningRate"]
    }];

    Null;
  ,
    Module[{generator, length, plot, params, cellContent},
      associatedNets[callId] = Function[{data, p}, 
          PlotlyExtendTraces[plot, <|"y" -> {Drop[data, length]}|>, {0}];
          length = Length[data];
          params = p;

          If[p[[2]] < 3,
            cellContent = ToString[Style["Complete", Background->LightGreen], StandardForm];
            associatedNets[callId] = Null;
          ];
      ];

      length = Length[assoc["RoundLossList"] ];

      params = {
        assoc["TimeElapsed"], assoc["TimeRemaining"],
        assoc["RoundLoss"], assoc["LearningRate"]
      };

      cellContent = ToString[{
        {Style["Target device", 10], Style[assoc["TargetDevice"], Italic, 10]} // Row,
        {{
          TextView[params[[1]] // Offload, "Label"->"Time elapsed", ImageSize->100],
          TextView[params[[2]] // Offload, "Label"->"Time remaining", ImageSize->100]
        },
        {
          TextView[params[[3]] // Offload, "Label"->"Round loss", ImageSize->100],
          TextView[params[[4]] // Offload, "Label"->"Learning rate", ImageSize->100]  
        }} // Grid,
        plot = Plotly[<|
          "y" -> assoc["RoundLossList"],
          "mode" -> "line"
      |>, <|
          "width"->250, "height"->300
        |>]
      } // Column, StandardForm];
    
      EditorView[cellContent // Offload]

    ]
    
  ] ]
  ]; 

  (* WL14 with no reason reloads the definitons of some symbols *)
  (* In this example to reproduce see issue https://github.com/WLJSTeam/wolfram-js-frontend/issues/396  *)

  If[Internal`Kernel`Watchdog["Enabled"],
    With[{
      file = FileNameJoin[{libPath, "src", "Kernel.wl"}],
      tag = "NeuralNet"
    },
      Internal`Kernel`Watchdog["Assertion", "ClassifierFunction",
        FormatValues[ClassifierFunction]//Hash
      ,
        Get[file]
      , tag];
      Internal`Kernel`Watchdog["Assertion", "NetChain",
        DownValues[NeuralNetworks`Private`NetChain`makeNetChainBoxes]//Hash
      ,
        Get[file]
      , tag];
    
    ]
  ];

];

End[]
EndPackage[]