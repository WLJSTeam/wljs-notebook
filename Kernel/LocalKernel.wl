BeginPackage["CoffeeLiqueur`Notebook`LocalKernel`", {"CoffeeLiqueur`Misc`Async`", "CoffeeLiqueur`Misc`Events`", "CoffeeLiqueur`Misc`Events`Promise`", "CoffeeLiqueur`UObjects`", "CoffeeLiqueur`UInternal`",  "CoffeeLiqueur`TCPUServer`", "CoffeeLiqueur`CUSockets`"}]

LocalKernel;


Begin["`Private`"]

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`ExtensionManager`" -> "af`"];

CreateUType[LocalKernelObject, GenericKernel`Kernel, {"RootDirectory"->Directory[], "CreatedQ"->False, "StandardOutput"->Null, "InitList"-> {}, "Host"->"127.0.0.1",  "ReadyQ"->False, "State"->"Undefined", "wolframscript" -> ("\""<>First[$CommandLine]<>"\" -wstp")}]


LocalKernel[opts___] := LocalKernelObject[opts]

heartBeat[k_] := Module[{ok = True, orig}, With[{secret = CreateUUID[]},
    EventHandler[secret, {_ -> Function[Null, ok = True]}];

    (* SetInterval[MicrotaskSubmit[ Print@"Hey there! Microtasks are running!" ];, 3000]; *)

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

HoldRemotePacket[any_] := any // Hold // Compress // HeldRemotePacket
SetAttributes[HoldRemotePacket, HoldFirst]

generateConnectFunction[o_LocalKernelObject] := With[{
    shared = af`SharedDir, host = o["Host"], uid = o["Hash"], 
    env = System`$Env, electronQ = (System`$Env["ElectronCode"] === 1),
    promise = Promise[],
    asyncLinkId = StringTake[StringReplace[CreateUUID[], "-"->""],4]
}, {
    expression = With[{},  
        Print["Link to the host was established. Setting up async link..."];

        With[{Internal`Kernel`AsyncLink = LinkCreate[asyncLinkId]},
            SetInterval[If[ LinkReadyQ[Internal`Kernel`AsyncLink],
                LinkRead[ Internal`Kernel`AsyncLink ];
            ];, 150];
        ];

        Internal`Kernel`Host = host;
        
        (* Internal`Kernel`RemoteEvent = USocketConnect[addr] // LTPTransport; *)

        Internal`Kernel`RemoteEvent /: EventFire[Internal`Kernel`RemoteEvent[ev_], topic_, payload_] := LinkWrite[$ParentLink, Internal`Kernel`EvaluationPacketAsync[ Hold[ EventFire[ev, topic, payload] ] ] ];
        Internal`Kernel`RemoteEvent /: EventFire[Internal`Kernel`RemoteEvent[ev_], payload_] := LinkWrite[$ParentLink, Internal`Kernel`EvaluationPacketAsync[ Hold[ EventFire[ev, payload] ] ] ];
        

        Internal`Kernel`Apply[e_, t_] := e[t];
        Internal`Kernel`Type = "LocalKernel";
        Internal`Kernel`Hash = uid;
        Internal`Kernel`WLJSQ = True;
        Internal`Kernel`$Env = env;
        Internal`Kernel`ElectronQ = electronQ;

        Off[Unset::norep];
        Off[TagUnset::norep];

        AppendTo[$Path, shared]; (* add shared directory *)

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
    If[Length[Cases[$CommandLine, "-entitlement"] ] > 0 || Length[Cases[$CommandLine, "-tcplink"] ] > 0, Module[{addr = "36831"},
        Echo["LocalKernel >> WARNING: WSTP Link is TCPIP / Entitlement mode detected"];
        Echo["LocalKernel >> WARNING: WSTP Link is TCPIP / Entitlement mode detected"];
        Echo["LocalKernel >> WARNING: WSTP Link is TCPIP / Entitlement mode detected"];
        Echo["LocalKernel >> WARNING: Evaluation might be slow"];
        Echo["LocalKernel >> WARNING: Print outputs might not work"];

        With[{tcplink = Position[$CommandLine, "-tcplink"]},
            If[Length[tcplink] > 0,
                link = LinkCreate[$CommandLine[[tcplink[[1]] + 1]], LinkProtocol -> "TCPIP"];
            ,
                link = LinkCreate[addr, LinkProtocol -> "TCPIP"];
                Echo["LocalKernel >> starting secondary wolframscript process"];

                With[{e = $CommandLine[[Flatten[{Position[$CommandLine, "-entitlement"]}][[1]] + 1]]},
                    StartProcess[{"wolframscript", "-tcplink", addr,  "-entitlement", e, "-f", FileNameJoin[{"Scripts", "link.wls"}] } ] // Echo ;
                ];
            ]
        ];

        

        Print["LocalKernel >> Waiting the client to respond."];
        LinkActivate[link];
        Print["LocalKernel >> Got IT!"];
    ],
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
        LinkWrite[link, Unevaluated[ PacletDirectoryUnload /@ PacletDirectoryLoad[]; ] ];
        LinkWrite[link, Unevaluated[ SetDirectory[path] ] ] ;
        LinkWrite[link, Unevaluated[ Set[Internal`Kernel`RootDirectory, path] ] ];
        LinkWrite[link, Unevaluated[ PacletDirectoryLoad[Directory[] ] ] ];
        LinkWrite[link, Unevaluated[ PacletDirectoryLoad[FileNameJoin[{Directory[], "Packages"}] ] ] ];

        LinkWrite[link, Unevaluated[ Get[FileNameJoin[{Directory[], "Common", "Patches", "NoWR.wl"}] ] ] ];

        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`CUSockets`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`UObjects`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`UInternal`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`TCPUServer`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`Misc`Events`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`Misc`Async`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`Misc`Language`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`Misc`Events`Promise`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`Misc`Parallel`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`Misc`Workers`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`WebUSocketHandler`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`Misc`WLJS`Transport`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`CUSockets`EventsExtension`"] ];
        LinkWrite[link, EnterTextPacket["<<LetWL`"] ];
        LinkWrite[link, EnterTextPacket["Off[Most::argx]; Off[FrontEndObject::notavail];"] ];
        LinkWrite[link, EnterTextPacket["$Inspector = Dialog[]&;"] ];
        
        

        (* unknown WL bug, doesn't work in initialization ... *)
        LinkWrite[link, EnterTextPacket["Unprotect[Interpretation, InterpretationBox]"] ];

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
