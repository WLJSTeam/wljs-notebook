

BeginPackage["CoffeeLiqueur`Extensions`Communication`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`Misc`WLJS`Transport`"
}]

(*Offload::usage = "Offload[exp] to keep it from evaluation on Kernel"*)

FrontSubmit::usage = "FrontSubmit[expr] _FrontEndInstanceGroup (taken from global stack) to evaluation on frontend"
CurrentWindow::usage = "Gets current window representation"

FrontFetch::usage = "FrontFetch[expr] fetches an expression from frontend"
FrontFetchAsync::usage = "FrontFetchAsync[expr] fetches an expression from frontend and returns Promise"


FrontInstanceGroup::usage = "FrontInstanceGroup[] a constructor for a frontend instance group wrapper"
FrontInstanceReference::usage = "FrontInstanceReference[] a constructor to make a pointer to a frontend instance"

FrontInstanceGroupRemove::usage = "Removes FrontInstanceGroup similar to Delete"

WindowObj::usage = "Represenation of a current window"

Begin["`Private`"]

CoffeeLiqueur`Extensions`Communication`$lastClient;

CurrentWindow[] := WindowObj[<|"Socket" -> If[AssociationQ[System`$EvaluationContext], System`$EvaluationContext["KernelWebSocket"], If[Head[Global`$Client] === Symbol, CoffeeLiqueur`Extensions`Communication`$lastClient, Global`$Client] ] |>]
CurrentWindow["Origin"] := WindowObj[<|"Socket" -> System`$EvaluationContext["OriginKernelWebSocket"]|>]


WindowObj[data_][key_String] := data[key]


FrontInstanceReference[] := With[{uid = CreateUUID[] // Hash},
    FrontInstanceReference[uid]
]

FrontInstanceReference /: MakeBoxes[f: FrontInstanceReference[uid_], StandardForm] := Module[{above, below},
        above = { 
          {BoxForm`SummaryItem[{"Ref: ", uid}]}
        };

        BoxForm`ArrangeSummaryBox[
           FrontInstanceReference, (* head *)
           f,      (* interpretation *)
           None,     (* icon, use None if not needed *)
           (* above and below must be in a format suitable for Grid or Column *)
           above,    (* always shown content *)
           Null (* expandable content. Currently not supported!*)
        ]
    ];

FrontInstanceGroup::nonexists = "Frontend instance group `` does not exist on the frontend"
FrontInstanceGroup[] := With[{uid = Hash @ CreateUUID[]},
    FrontInstanceGroup[uid]
]

FrontInstanceGroup[uid_][payload_] := FrontInstanceGroup[uid, payload]

groupRemove;

FrontInstanceGroup /: Delete[FrontInstanceGroup[uid_, ___] ] := With[{},
    With[{cli = CurrentWindow[]["Socket"]},
        WLJSTransportSend[groupRemove[uid], cli ]
    ]
]

groupRemoveAll;

FrontInstanceGroup /: Delete[list__FrontInstanceGroup ] := With[{l = List[list]},
    With[{cli = CurrentWindow[]["Socket"], uids = l[[All,1]]},
            WLJSTransportSend[groupRemoveAll[uids], cli ]
    ]
]

FrontInstanceGroupRemove[FrontInstanceGroup[uid_, ___], OptionsPattern[] ] := With[{},
    With[{cli = OptionValue["Window"]["Socket"]},
        WLJSTransportSend[groupRemove[uid], cli ]
    ]
]

FrontInstanceGroupRemove[list__FrontInstanceGroup, OptionsPattern[] ] := With[{l = List[list]},
    With[{cli = OptionValue["Window"]["Socket"], uids = l[[All,1]]},
            WLJSTransportSend[groupRemoveAll[uids], cli ]
    ]
]

FrontInstanceGroupRemove[list_List, OptionsPattern[] ] := With[{l = list},
    With[{cli = OptionValue["Window"]["Socket"], uids = l[[All,1]]},
            WLJSTransportSend[groupRemoveAll[uids], cli ]
    ]
]

Options[FrontInstanceGroupRemove] = {"Window" :> CurrentWindow[] }


FrontInstanceGroup /: MakeBoxes[f: FrontInstanceGroup[uid_], StandardForm] := Module[{above, below},
        above = { 
          {BoxForm`SummaryItem[{"State: ", "Empty"}]}
        };

        BoxForm`ArrangeSummaryBox[
           FrontInstanceGroup, (* head *)
           f,      (* interpretation *)
           None,     (* icon, use None if not needed *)
           (* above and below must be in a format suitable for Grid or Column *)
           None,    (* always shown content *)
           Null (* expandable content. Currently not supported!*)
        ]
    ]; 


exec;

FrontFetchAsync[expr_, OptionsPattern[] ] := With[{cli = OptionValue["Window"]["Socket"], format = OptionValue["Format"], event = CreateUUID[], promise = Promise[]},
    EventHandler[event, Function[payload,
        EventRemove[event];

        With[{result = Switch[format,
            "Raw",
                FromCharacterCode@ToCharacterCode[URLDecode[payload], "UTF-8"],
            "ExpressionJSON",
                ImportString[FromCharacterCode@ToCharacterCode[URLDecode[payload], "UTF-8"], "ExpressionJSON"], 
            "JSON",
                ImportString[FromCharacterCode@ToCharacterCode[URLDecode[payload], "UTF-8"], "JSON"],
            _,
                ImportString[FromCharacterCode@ToCharacterCode[URLDecode[payload], "UTF-8"], "RawJSON"]
        ]},
            If[FailureQ[result],
                EventFire[promise, Reject, result]
            ,
                EventFire[promise, Resolve, result]
            ]
        ]
    ] ];

    WLJSTransportSend[System`FSAsk[expr, event], cli];

    promise
]

FrontFetchAsync[expr_, FrontInstanceReference[m_], opts___] := FrontFetchAsync[exec[expr, m], opts]

FrontFetch[expr_, rest___] := WaitAll[FrontFetchAsync[expr, rest], 60]

Options[FrontFetch] = {"Format"->"RawJSON", "Window" :> CurrentWindow[]};
Options[FrontFetchAsync] = {"Format"->"RawJSON", "Window" :> CurrentWindow[]};

FrontSubmit[expr_String, opts: OptionsPattern[] ] := FrontSubmit[execJS[expr], opts ] 
FrontSubmit[expr_, OptionsPattern[] ] := With[{win = OptionValue["Window"]},
    If[Head[win] =!= WindowObj,     
        $Failed
    ,
        
        If[FailureQ[WLJSTransportSend[expr, win["Socket"] ] ], $Failed,
            CoffeeLiqueur`Extensions`Communication`$lastClient = win["Socket"];
            Null
        ]          
    ]
]


FrontSubmit[expr_, FrontInstanceReference[m_], opts___] := FrontSubmit[exec[expr, m], opts]


Options[FrontSubmit] = {"Window" :> CurrentWindow[], "Tracking" -> False}

End[]
EndPackage[]