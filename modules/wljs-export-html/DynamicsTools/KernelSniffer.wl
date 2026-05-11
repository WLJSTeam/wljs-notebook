BeginPackage["CoffeeLiqueur`Extensions`ExportImport`KernelSniffer`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`Misc`WLJS`Transport`"
}]

KernelSniffer;

Begin["`Private`"]

Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];
Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];

KernelSniffer[kernel_, expr_, "EvaluateHeld"] := With[{
    p = Promise[]
},
    If[!TrueQ[kernel["ContainerReadyQ"] ], 
        EventFire[p, Reject, "Kernel is not ready!"];
        Return[];
    ];

    GenericKernel`Send[kernel,  (  
        Internal`Kernel`CaptureWrapperBlock[expr // ReleaseHold];
        EventFire[Internal`Kernel`RemoteEvent[ p // First ], Resolve, True];     
    )];

    p
]

KernelSniffer[kernel_, "Inject"] := With[{
    p = Promise[]
},
    If[!TrueQ[kernel["ContainerReadyQ"] ], 
        EventFire[p, Reject, "Kernel is not ready!"];
        Return[];
    ];

    GenericKernel`Send[kernel,  (  
        (* symbols tracking *)
        If[!(Internal`Kernel`oldWLJSTrackingHandlerQ === True),
            Internal`Kernel`oldWLJSTrackingHandler = WLJSTransportHandler["AddTracking"];
            Internal`Kernel`oldWLJSTrackingHandlerQ = True;

            Internal`Kernel`oldFrontSubmit = DownValues[CoffeeLiqueur`Extensions`Communication`FrontSubmit];



            Internal`Kernel`CaptureEventPool = {};
            Internal`Kernel`CaptureEventFunction[ev_, value_] := Internal`Kernel`CaptureEventFunction[ev, "Default", value];
            Internal`Kernel`CaptureEventFunction[ev_, pattern_, value_] := Block[{
                Internal`Kernel`CaptureEvent = Function[changes,
                    AppendTo[Internal`Kernel`CaptureEventPool, {ev, pattern, value} -> changes]
                ]
            },
                EventFire[ev, pattern, value]
            ];

            Internal`Kernel`CaptureWrapperBlock[expr_] :=  Block[{
                Internal`Kernel`CaptureEvent = Function[changes,
                    AppendTo[Internal`Kernel`CaptureEventPool, {"", "", ""} -> changes]
                ]
            },
                expr
            ];

            SetAttributes[Internal`Kernel`CaptureWrapperBlock, HoldFirst];

            (*** SPY #1 ***)
            WLJSTransportHandler["AddTracking"] = Function[{symbol, name, cli, callback},
                (*Print["Add tracking... for "<>name];*)
                With[{fullName = StringJoin[If[StringMatchQ[#, "System`" | "Global`"], "", # ]&@ (Context[Unevaluated[symbol] ]), SymbolName[Unevaluated[symbol] ] ]}, 
                    Experimental`ValueFunction[ Unevaluated[symbol] ] = Function[{y,x}, 
                        Internal`Kernel`CaptureEvent[{"Symbol", fullName, x}];

                        If[FailureQ[callback[cli, x] ], 
                          Experimental`ValueFunction[ Unevaluated[symbol] ] // Unset
                        ];
                    ];
                ];

            , HoldFirst];  

            (*** SPY #2 ***)
            DownValues[CoffeeLiqueur`Extensions`Communication`FrontSubmit] = Join[{With[{originalExpr = DownValues[CoffeeLiqueur`Extensions`Communication`FrontSubmit][[1]]},          
              With[{
                exprVar = originalExpr[[1,1,1,1]]
              },
                  ReplacePart[originalExpr, {2} -> List[Internal`Kernel`CaptureEvent[{"FrontSubmit", exprVar, Null}], Extract[originalExpr, 2, Hold] ] ]
              ]
            ] /. {Hold[heldx_] :> heldx}}, Drop[DownValues[CoffeeLiqueur`Extensions`Communication`FrontSubmit], 1] ];
            
        ,
            Internal`Kernel`CaptureEventPool = {};
        ];

        EventFire[Internal`Kernel`RemoteEvent[ p // First ], Resolve, True];      
    )];

    p
]

KernelSniffer[kernel_, "Reset"] := With[{
    p = Promise[]
},
    If[!TrueQ[kernel["ContainerReadyQ"] ], 
        EventFire[p, Reject, "Kernel is not ready!"];
        Return[];
    ];

    GenericKernel`Send[kernel,  (  
        Internal`Kernel`CaptureEventPool = {};
        EventFire[Internal`Kernel`RemoteEvent[ p // First ], Resolve, True ];   
    )];

    p
]

KernelSniffer[kernel_, "Eject"] := With[{
    p = Promise[]
},
    If[!TrueQ[kernel["ContainerReadyQ"] ], 
        EventFire[p, Reject, "Kernel is not ready!"];
        Return[];
    ];

    GenericKernel`Send[kernel,  (  
        (* symbols tracking *)
        If[Internal`Kernel`oldWLJSTrackingHandlerQ === True,
            WLJSTransportHandler["AddTracking"] = Internal`Kernel`oldWLJSTrackingHandler;
            DownValues[CoffeeLiqueur`Extensions`Communication`FrontSubmit] = Internal`Kernel`oldFrontSubmit;
            Internal`Kernel`oldWLJSTrackingHandlerQ = False;

            Internal`Kernel`CaptureEventPool = {};
        ];

        EventFire[Internal`Kernel`RemoteEvent[ p // First ], Resolve, True];      
    )];

    p
]

KernelSniffer[kernel_, "GetCompressed"] := With[{
    p = Promise[]
},
    If[!TrueQ[kernel["ContainerReadyQ"] ], 
        EventFire[p, Reject, "Kernel is not ready!"];
        Return[];
    ];

    GenericKernel`Send[kernel,  (  
        EventFire[Internal`Kernel`RemoteEvent[ p // First ], Resolve, Compress[Internal`Kernel`CaptureEventPool] ];      
    )];

    p
]

KernelSniffer[kernel_, "SelectCompressed", function_] := With[{
    p = Promise[]
},
    If[!TrueQ[kernel["ContainerReadyQ"] ], 
        EventFire[p, Reject, "Kernel is not ready!"];
        Return[];
    ];

    GenericKernel`Send[kernel,  (  
        EventFire[Internal`Kernel`RemoteEvent[ p // First ], Resolve, Compress[Select[Internal`Kernel`CaptureEventPool, function] ] ];      
    )];

    p
]

KernelSniffer[kernel_, "SelectCompressed", function_, after_] := With[{
    p = Promise[]
},
    If[!TrueQ[kernel["ContainerReadyQ"] ], 
        EventFire[p, Reject, "Kernel is not ready!"];
        Return[];
    ];

    GenericKernel`Send[kernel,  (  
        EventFire[Internal`Kernel`RemoteEvent[ p // First ], Resolve, Compress[Map[after, Select[Internal`Kernel`CaptureEventPool, function] ] ] ];      
    )];

    p
]

KernelSniffer[kernel_, "FetchSymbol", symbol_String] := With[{
    promise = Promise[]
},
    With[{s = promise // First},
        GenericKernel`SendAsync[kernel, EventFire[Internal`Kernel`RemoteEvent[ s ], Resolve, ToExpression[symbol, InputForm] ] ];
    ];

    promise
]

KernelSniffer[kernel_, "ListSymbols"] := With[{
    promise = Promise[]
},
    With[{s = promise // First},
        GenericKernel`SendAsync[kernel, EventFire[Internal`Kernel`RemoteEvent[ s ], Resolve, Select[Internal`Kernel`CaptureEventPool, Function[item, item[[2,1]] === "Symbol"] ][[All,2,2]]//DeleteDuplicates
 ] ];
    ];

    promise
]

KernelSniffer[kernel_, "FetchSymbols", symbols_List] := With[{
    promise = Promise[]
},
    With[{s = promise // First},
        GenericKernel`SendAsync[kernel, EventFire[Internal`Kernel`RemoteEvent[ s ], Resolve, Table[ToExpression[symbol, InputForm], {symbol, symbols}] ] ];
    ];

    promise
]



End[]
EndPackage[]