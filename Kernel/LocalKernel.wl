BeginPackage["CoffeeLiqueur`Notebook`LocalKernel`", {"CoffeeLiqueur`Misc`Async`", "CoffeeLiqueur`Misc`Events`", "CoffeeLiqueur`Misc`Events`Promise`", "CoffeeLiqueur`UObjects`", "CoffeeLiqueur`UInternal`",  "CoffeeLiqueur`TCPUServer`", "CoffeeLiqueur`CUSockets`"}]

(*
	Implementation of generic kernel
	as a local Wolfram Kernel

	This sets the communication links, loads packages and controls evaluation
*)

LocalKernel;

Begin["`Private`"]

$loadedPackages = {
  "<<CoffeeLiqueur`CUSockets`",
  "<<CoffeeLiqueur`UObjects`",
  "<<CoffeeLiqueur`UInternal`",
  "<<CoffeeLiqueur`TCPUServer`",
  "<<CoffeeLiqueur`Misc`Events`",
  "<<CoffeeLiqueur`Misc`Async`",
  "<<CoffeeLiqueur`Misc`Language`",
  "<<CoffeeLiqueur`Misc`Events`Promise`",
  "<<CoffeeLiqueur`Misc`Parallel`",
  "<<CoffeeLiqueur`Misc`Workers`",
  "<<CoffeeLiqueur`WebUSocketHandler`",
  "<<CoffeeLiqueur`Misc`WLJS`Transport`",
  "<<CoffeeLiqueur`CUSockets`EventsExtension`",
  "<<LetWL`"
};

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`ExtensionManager`" -> "af`"];

CreateUType[LocalKernelObject, GenericKernel`Kernel, {"RootDirectory"->Directory[], "CreatedQ"->False, "StandardOutput"->Null, "InitList"-> {}, "Host"->"127.0.0.1",  "ReadyQ"->False, "State"->"Undefined", "wolframscript" -> ("\""<>First[$CommandLine]<>"\" -wstp")}]

(* just a legacy alias, harmless *)
LocalKernel[opts___] := LocalKernelObject[opts]

heartBeat[k_] := Module[{ok = True, orig}, With[{secret = CreateUUID[]},
    EventHandler[secret, {_ -> Function[Null, ok = True]}];
    (* just ping-pong every 8 seconds to check if the link is alive *)

    SetInterval[
        If[!ok,
            orig = k["State"];
            EventFire[k, "State", k["State"] ];
        ,
            If[k["ReadyQ"],
                EventFire[k, "State", k["State"] ];
            ];
        ];
        ok = False;
        LinkWrite[k["Link"], EvaluatePacket[ Internal`Kernel`Ping[secret] ] ]
    , 8000]
] ]

HeldRemotePacket /: LinkWrite[lnk_, HeldRemotePacket[p_String] ] := With[{pp = p},
    LinkWrite[lnk, Unevaluated[ pp // Uncompress // ReleaseHold ] ]
]

(* a tricky way of preserving contexts of symbols passed *)
HoldRemotePacket[any_] := any // Hold // Compress // HeldRemotePacket
SetAttributes[HoldRemotePacket, HoldFirst]

generateConnectFunction[o_LocalKernelObject] := With[{
    shared = af`SharedDir, host = o["Host"], uid = o["Hash"], 
    env = System`$Env, electronQ = (System`$Env["ElectronCode"] === 1),
    promise = Promise[],
    asyncLinkId = StringTake[StringReplace[CreateUUID[], "-"->""],4],
    woxiQ = Internal`WoxiQ,
    symjaQ = Internal`SymjaQ
}, {
    expression = With[{},  
        Print["Link to the host was established. Setting up async link..."];

        (* start backlink *)
        With[{Internal`Kernel`AsyncLink = LinkCreate[asyncLinkId]},
            SetInterval[If[ LinkReadyQ[Internal`Kernel`AsyncLink],
                LinkRead[ Internal`Kernel`AsyncLink ];
            ];, 150];
        ];

        (* helper constants *)
        Internal`Kernel`Host = host;

        Internal`WoxiQ = woxiQ;
        Internal`SymjaQ = symjaQ;
        Internal`WolframQ = !Internal`WoxiQ && !Internal`SymjaQ;
        Internal`Kernel`WoxiQ = woxiQ;
        Internal`Kernel`SymjaQ = symjaQ;
        Internal`Kernel`WolframQ = Internal`WolframQ;
        
        (* event forwarder Evaluation Kernel -> Master *)
        Internal`Kernel`RemoteEvent /: EventFire[Internal`Kernel`RemoteEvent[ev_], topic_, payload_] := LinkWrite[$ParentLink, Internal`Kernel`EvaluationPacketAsync[ Hold[ EventFire[ev, topic, payload] ] ] ];
        Internal`Kernel`RemoteEvent /: EventFire[Internal`Kernel`RemoteEvent[ev_], payload_] := LinkWrite[$ParentLink, Internal`Kernel`EvaluationPacketAsync[ Hold[ EventFire[ev, payload] ] ] ];
        
        (* helper symbols *)
        Internal`Kernel`Apply[e_, t_] := e[t];
        Internal`Kernel`Type = "LocalKernel";
        Internal`Kernel`Hash = uid;
        Internal`Kernel`WLJSQ = True;
        Internal`Kernel`$Env = env;
        Internal`Kernel`ElectronQ = electronQ;

        Off[Unset::norep];
        Off[TagUnset::norep];

        AppendTo[$Path, shared]; (* add shared directory *)

        (* this whole WatchDog thingy is only for preventing WL from reloading system defenitions *)
        (* it loads and reloads them at random moments *)
        (* no matter if we protect them or redefine *)
        (* however, this mostly happens for Graphics output forms, TemplateBox, Dataset, NeuralNets and Audio objects *)
        (* therefore we have to contineously test if our FormatValues are still ours, and if not - then reload some of the system packages on-fly *)
        (* i guess this is a price of closed systems *)
        (* in practice it happens 1-2 times per long evaluation sessions and it is cured immediately *)

        Internal`Kernel`Watchdog;
        Internal`Kernel`Watchdog`store = <||>;
        Internal`Kernel`Watchdog`state = <||>;
        Internal`Kernel`Watchdog["Enabled"] := True;
        SetAttributes[Internal`Kernel`Watchdog, HoldAll];

        Internal`Kernel`Ping[secret_] := (
            Internal`Kernel`Watchdog["Test"];
            EventFire[Internal`Kernel`RemoteEvent[secret], "Pong", True];
        );
        
        Internal`Kernel`Watchdog["Assertion", name_String, test_, action_] := With[{uid = CreateUUID[]},
            Internal`Kernel`Watchdog["Assertion", name, test, action, uid ];
        ];
        Internal`Kernel`Watchdog["Assertion", name_String, test_, action_, tag_] := (
           If[!KeyExistsQ[Internal`Kernel`Watchdog`store, name],
             Internal`Kernel`Watchdog`store[name] = {Hold[test], Hold[action], tag};
             Internal`Kernel`Watchdog`state[name] = ReleaseHold[test];
           ];
        );

        Internal`Kernel`Watchdog::assert = "Assertion failed ``. Actions were applied";

        Internal`Kernel`Watchdog`$Journal = {};

        Internal`Kernel`Watchdog["Test"] := Module[{firedTags},
            KeyValueMap[Function[{key, value},
                If[Internal`Kernel`Watchdog`state[key] =!= ReleaseHold[value[[1]]],
                    Internal`Kernel`Watchdog`$Journal = Append[Internal`Kernel`Watchdog`$Journal, {StringTemplate[Internal`Kernel`Watchdog::assert][key], Now} ];
                    
                    If[!TrueQ[firedTags[value[[3]] ] ], value[[2]] // ReleaseHold];
                    With[{v = value[[3]]}, firedTags[v] = True];
                    
                    Internal`Kernel`Watchdog`state[key] = ReleaseHold[value[[1]]];
                ];
            ], Internal`Kernel`Watchdog`store ];
            
            ClearAll[firedTags];
        ];

        Internal`Kernel`Watchdog["QuickTest"] := Internal`Kernel`Watchdog["Test"];

        With[{pid = $ProcessID},  
            EventFire[Internal`Kernel`RemoteEvent[promise], Resolve, pid];
        ];

    ] // HoldRemotePacket},

    Then[promise, Function[pid, 
        Echo["Local kernel link connected!"];
        Echo["Local kernel PID: "<>ToString[pid] ];

        
        o["PID"] = pid;
        o["SecondaryLink"] = LinkConnect[asyncLinkId];

        If[FailureQ[LinkActivate[o["SecondaryLink"] ] ],
            o["State"]  = "Problem";
            Echo["LocalKernel 2nd link failed!!!"];
            LinkClose[k["Link"] ];
        ,
            o["ReadyQ"] = True;
            TaskRemove[o["WatchDog"] ];
            o["HeartBeat"] = heartBeat[o];

            EventFire[o, "State", o["State"] ];
            EventFire[o, "Connected", "Please wait until initialization is complete!"]; 
            GenericKernel`SendAsync[o, 1+1]; (* there is a bug, that it gets frozen if no data is sent in the first place. 
            Why?! [FIXME]*)
        ];   
    ] ];

    expression
]


(* launch kernel *)
restart[k_LocalKernelObject] := With[{},
    k["InitList"] = {};

    LinkClose[k["Link"] ];
    LinkClose[k["SecondaryLink"] ];
    TaskRemove[k["HeartBeat"] ];
    k["ReadyQ"] = False;

    k["State"] = "Stopped";
    EventFire[k, "State", k["State"] ];
    

    If[Check[ProcessObject[k["PID"] ], False] =!= False,
        ProcessObject[k["PID"] ] // KillProcess; 
    ];

    SetTimeout[start[k], 1500];
]

setProp[any_[sym_], assoc_] := (
    sym = Join[sym, assoc];
    Echo[ sym["State"] ];
);
SetAttributes[setProp, HoldFirst];

unlink[k_LocalKernelObject] := With[{},
    k["InitList"] = {};
    LinkClose[k["Link"] ];
    LinkClose[k["SecondaryLink"] ];
    TaskRemove[k["HeartBeat"] ];
    k["ReadyQ"] = False;

    k["State"] = "Stopped";
    k["Dead"] = True;
    EventFire[k, "State", k["State"] ];

    If[Check[ProcessObject[k["PID"] ], False] === False,
        EventFire[k, "Exit", True ];
    ,
        ProcessObject[k["PID"] ] // KillProcess;
        EventFire[k, "Exit", True ];    
    ];

    
]

start[k_LocalKernelObject] := Module[{link},
    If[Length[Cases[$CommandLine, "-entitlement"] ] > 0 || Length[Cases[$CommandLine, "-tcplink"] ] > 0,
        Echo["LocalKernel >> Entitlement mode is not supported!!!"];
        link = $Failed;
    ,
        Echo["LocalKernel >> Starting using path: "<>k["wolframscript"] ];
        link = LinkLaunch[ k["wolframscript"] ];
    ];

    k["Dead"] = False;

    Print[k];

    EventFire[k, "State", "Checking the link"];
    EventFire[k, "State", k["State"] ];

    If[FailureQ[link], 
        EventFire[k, "Error", "Kernel link failed. Trying legacy methods..."]; 
        link = LinkLaunch["math -mathlink"];

        If[FailureQ[link], 
            EventFire[k, "Error", "Kernel link failed."]; 
        ];

        k["State"] = "Link failed!";
        EventFire[k, "State", k["State"] ];

        Return[$Failed];
    ];

    k["Link"] = link;
    k["State"] = "Starting";
    EventFire[k, "State", k["State"] ];
    

    k["ReadyQ"] = False;

    LinkWrite[link, Unevaluated[$HistoryLength = 0] ];
    (* LinkWrite[link, Unevaluated[$AllowDataUpdates = False] ]; *)
    With[{path = k["RootDirectory"]},
    
        (* set directories *)
        LinkWrite[link, Unevaluated[ PacletDirectoryUnload /@ PacletDirectoryLoad[]; ] ];
        LinkWrite[link, Unevaluated[ SetDirectory[path] ] ] ;
        LinkWrite[link, Unevaluated[ Set[Internal`Kernel`RootDirectory, path] ] ];
        LinkWrite[link, Unevaluated[ PacletDirectoryLoad[Directory[] ] ] ];
        LinkWrite[link, Unevaluated[ PacletDirectoryLoad[FileNameJoin[{Directory[], "Packages"}] ] ] ];

        (* services patches *)
        LinkWrite[link, Unevaluated[ Get[FileNameJoin[{Directory[], "Common", "Patches", "NoWR.wl"}] ] ] ];

        (* core and optional packages *)
        LinkWrite[link, EnterTextPacket[#] ] &/@ $loadedPackages;

        (* various workarounds *)
        LinkWrite[link, EnterTextPacket["Off[Most::argx]; Off[FrontEndObject::notavail];"] ];
        LinkWrite[link, EnterTextPacket["$Inspector = Dialog[]&;"] ];
        
        (* unknown WL bug, doesn't work in initialization ... *)
        LinkWrite[link, EnterTextPacket["Unprotect[Interpretation, InterpretationBox]"] ];

        (* standard LPM package *)
        LinkWrite[link, Unevaluated[ Get[FileNameJoin[{Directory[], "Common", "LPM", "LPM.wl"}] ] ] ];
    ];


    If[!TrueQ[k["CreatedQ"] ], With[{kernel = k},
        k["StandardOutput"] = CreateUUID[];
        
        With[{stdout = EventClone[k["StandardOutput"] ]},

            EventHandler[stdout, {
                Internal`Kernel`EvaluationPacketAsync[data_] :> Function[Null, With[{
                    payload = data
                }, 
                        ReleaseHold[payload];
                    ]
                ],
                TextPacket[s_] :> ((
                    EchoLabel["KernelPrint"][s];
                    EventFire[kernel, "Print", s]
                )&),
                MessagePacket[symbol_, type_] :> ((
                    EchoLabel["KernelWarning"][StringTemplate["``::``"][symbol, type]];
                    EventFire[kernel, "Warning", StringTemplate["``::``"][symbol, type] ]
                )&),
                any_ :> (Echo[any]&)
            }];

            k["PrintTask"] = MicrotaskSubmit[
                If[LinkReadyQ[kernel["Link"] ], EventFire[kernel["StandardOutput"], LinkRead[kernel["Link"] ], kernel] ];
                If[LinkReadyQ[kernel["SecondaryLink"] ], Echo["2nd link >> ", LinkRead[kernel["SecondaryLink"] ] ] (* just flush the buffer *) ] // Quiet;
            , "Continuous" -> True];
        ];
    ] ];

    kernel["CreatedQ"] = True;


    LinkWrite[link, generateConnectFunction[ k ]  ];

    k["WatchDog"] = SetTimeout[ checkState[k], 32 * 1000];
    k
]

checkState[k_LocalKernelObject] := Module[{},
    k["State"] = "Timeout";
    EventFire[k, "Error", "Kernel initialization timeout"];
]

LocalKernelObject /: GenericKernel`SubmitTransaction[k_LocalKernelObject, t_] := With[{ev = t["Evaluator"], s = Transaction`Serialize[t]},
    LinkWrite[k["Link"], EnterExpressionPacket[ Internal`Kernel`Apply[ ev, s ] ] // Unevaluated  ]
]

LocalKernelObject /: GenericKernel`SendAsync[k_LocalKernelObject, expr_] := With[{},
    LinkWrite[k["SecondaryLink"],  expr // Unevaluated  ]
]


SetAttributes[GenericKernel`SendAsync, HoldRest]

LocalKernelObject /: GenericKernel`Send[k_LocalKernelObject, expr_, OptionsPattern[] ] := With[{once = OptionValue["Once"], tracker = OptionValue["TrackingProgress"]},
    If[!once,
        With[{
                value = expr // Hold // Compress // HeldRemotePacket
            },
                Echo["LocalKernel Init >> Normal"];
                
                LinkWrite[k["Link"], value];
        ];    
    , 
        If[!MemberQ[k["InitList"], Hash[expr // Hold] ] ,
            Echo["LocalKernel Init >> Once"];
            With[{
                value = expr // Hold // Compress // HeldRemotePacket
            },
                
                LinkWrite[k["Link"], value];
            ];

            k["InitList"] = Append[k["InitList"], Hash[expr // Hold] ];
        ,
            Echo["LocalKernel Init >> Already initialized..."];
        ];
    ];
]

SetAttributes[GenericKernel`Send, HoldRest]


LocalKernelObject /: GenericKernel`Start[k_LocalKernelObject] := start[k];
LocalKernelObject /: GenericKernel`Unlink[k_LocalKernelObject] := unlink[k];
LocalKernelObject /: GenericKernel`Restart[k_LocalKernelObject] := restart[k];

LocalKernelObject /: GenericKernel`AbortEvaluation[k_LocalKernelObject] := With[{},
    LinkInterrupt[k["Link"], 3]; 
    Print["localkernel >> aborted"];
    LinkWrite[k["Link"], Unevaluated[$Aborted] ];     
];

End[]
EndPackage[]
