(* Captures kernel-side symbol changes and frontend submissions during sampling. *)

BeginPackage["CoffeeLiqueur`Extensions`ExportImport`KernelSniffer`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`WLJS`Tools`","CoffeeLiqueur`WLJS`Transport`"
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

            Internal`Kernel`CaptureEventPool = {};

            Internal`Kernel`CaptureWrapperBlock[expr_] :=  Block[{
                Internal`Kernel`CaptureEvent = Function[changes,
                    AppendTo[Internal`Kernel`CaptureEventPool, {"", "", ""} -> changes]
                ]
            },
                expr
            ];

            SetAttributes[Internal`Kernel`CaptureWrapperBlock, HoldFirst];


            (* Capture custom transport events, then preserve normal handler behavior. *)
            With[{w = WLJSTransportEventHandler}, 
                w[69, uid_, object_, pattern_] := Block[{
                    Internal`Kernel`CaptureEvent = Function[changes,
                        AppendTo[Internal`Kernel`CaptureEventPool, {uid, pattern, object} -> changes]
                    ]
                },
                    (* Just FWD *)
                    w[1, uid, object, pattern]
                ];
                w[70, uid_] := Block[{
                    Internal`Kernel`CaptureEvent = Function[changes,
                        AppendTo[Internal`Kernel`CaptureEventPool, {uid, "Default", True} -> changes]
                    ]
                },
                    (* Just FWD *)
                    w[1, uid, True, "Default"]
                ];
            ];            

            (* Mirrors AddTracking; keep it aligned with Frontend/KernelUtils.wl. *)
            WLJSTransportHandler["AddTracking"] = Function[{symbolName, fullName, cli, callback},
                Experimental`ValueFunction[ fullName ] = ( 
                  Internal`Kernel`CaptureEvent[{"Symbol", StringReplace[fullName, {"Global`" -> "", "System`" -> ""}], #2}];
                  If[FailureQ[callback[cli, #2] ], 
                    Experimental`ValueFunction[ fullName ] // Unset
                  ];
                )&;
            , HoldFirst]; 
            
        ,
            Internal`Kernel`CaptureEventPool = {};
        ];

        (* Wrap all FrontSubmit overloads without depending on DownValues order. *)
        If[!(Internal`Kernel`oldFrontSubmitQ === True),
            With[{definitions = DownValues[CoffeeLiqueur`Extensions`Communication`FrontSubmit]},
                If[Length[definitions] > 0,
                    (* Preserve exact definitions for transparent delegation and restoration. *)
                    Internal`Kernel`oldFrontSubmit = definitions;
                    Internal`Kernel`oldFrontSubmitQ = True;

                    ClearAll[Internal`Kernel`frontSubmitOriginal];
                    Options[Internal`Kernel`frontSubmitOriginal] = Options[CoffeeLiqueur`Extensions`Communication`FrontSubmit];
                    DownValues[Internal`Kernel`frontSubmitOriginal] =
                        definitions /.
                            HoldPattern[CoffeeLiqueur`Extensions`Communication`FrontSubmit] :>
                                Internal`Kernel`frontSubmitOriginal;

                    DownValues[CoffeeLiqueur`Extensions`Communication`FrontSubmit] = {};
                    CoffeeLiqueur`Extensions`Communication`FrontSubmit[expr_, rest___] := (
                        If[Head[Internal`Kernel`CaptureEvent] === Function,
                            Internal`Kernel`CaptureEvent[{"FrontSubmit", expr, Null}]
                        ];
                        Internal`Kernel`frontSubmitOriginal[expr, rest]
                    );
                ];
            ];
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
            Internal`Kernel`oldWLJSTrackingHandlerQ = False;
        ];

        If[Internal`Kernel`oldFrontSubmitQ === True,
            DownValues[CoffeeLiqueur`Extensions`Communication`FrontSubmit] = Internal`Kernel`oldFrontSubmit;
            Internal`Kernel`oldFrontSubmitQ = False;
            ClearAll[Internal`Kernel`frontSubmitOriginal];
            Internal`Kernel`oldFrontSubmit =.;
        ];

        Internal`Kernel`CaptureEventPool = {};

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
        Echo[StringJoin["[wljs-export-html/KernelSniffer] ", StringTemplate["Fetching ``"][symbol]]];
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
        Echo[StringJoin["[wljs-export-html/KernelSniffer] ", StringTemplate["Fetching ``"][symbols]]];
        GenericKernel`SendAsync[kernel, EventFire[Internal`Kernel`RemoteEvent[ s ], Resolve, Table[ToExpression[symbol, InputForm], {symbol, symbols}] ] ];
    ];

    promise
]



End[]
EndPackage[]
