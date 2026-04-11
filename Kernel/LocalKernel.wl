BeginPackage["CoffeeLiqueur`Notebook`LocalKernel`", {"CoffeeLiqueur`Misc`Async`", "CoffeeLiqueur`Misc`Events`", "CoffeeLiqueur`Misc`Events`Promise`", "CoffeeLiqueur`Objects`", "CoffeeLiqueur`Internal`",  "CoffeeLiqueur`LTP`", "CoffeeLiqueur`TCPServer`", "CoffeeLiqueur`CSockets`"}]

LocalKernel;


Begin["`Private`"]

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`ExtensionManager`" -> "af`"];

CreateType[LocalKernelObject, GenericKernel`Kernel, {"RootDirectory"->Directory[], "CreatedQ"->False, "StandardOutput"->Null, "InitList"-> {}, "Host"->"127.0.0.1", "Port"->36808, "ReadyQ"->False, "State"->"Undefined", "wolframscript" -> ("\""<>First[$CommandLine]<>"\" -wstp")}]


LocalKernel[opts___] := LocalKernelObject[opts]

ltpRunning = False;
LTPServerStart[port_:36800] := With[{},
    If[ltpRunning, Return[] ];
    ltpRunning = True;
    Echo[">> Starting local LTP server ..."];

    tcp = TCPUServer[];
    tcp["CompleteHandler", "LTP"] = LTPQ -> LTPLength;
    tcp["MessageHandler", "LTP"]  = LTPQ -> LTPHandler;

    SocketListen[SocketOpen[ StringTemplate["127.0.0.1:``"][port] ], tcp@#&];
    lkPort = port;
]

(*  internal function that will be called by other kernel remotely *)
Internal`Kernel`LTPConnected[uid_String, pid_] := With[{o = GenericKernel`HashMap[uid]},
    Echo["LocalKernel >> local kernel link connected!"];
    Echo["LocalKernel >> PID: "<>ToString[pid] ];
    o["LTPSocket"] = SocketConnect[ "127.0.0.1:"<>ToString[o["Port"] ] ] ;
    Echo[o["LTPSocket"] ];

    If[FailureQ[o["LTPSocket"] ],
        Echo["Cound not connect to a local kernel!"];
        Echo["PANIK"];
        Exit[-1];
    ];

    o["LTPSocket"] = o["LTPSocket"] // LTPTransport;

    o["ReadyQ"] = True;
    o["PID"] = pid;
    
    o["State"]  = "Connected";

    o["HeartBeat"] = heartBeat[o];

    TaskRemove[o["WatchDog"] ];

    EventFire[o, "State", o["State"] ];
    EventFire[o, "Connected", "Please wait until initialization is complete!"];
    Print["Ok!"];
]


heartBeat[k_] := Module[{ok = True, orig}, With[{secret = CreateUUID[]},
    EventHandler[secret, {_ -> Function[Null, ok = True]}];

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
        LTPEvaluate[k["LTPSocket"], Internal`Kernel`Ping[secret] ];
        
    , 8000]
] ]

HeldRemotePacket /: LinkWrite[lnk_, HeldRemotePacket[p_String] ] := With[{pp = p},
    LinkWrite[lnk, Unevaluated[ pp // Uncompress // ReleaseHold ] ]
]

HoldRemotePacket[any_] := any // Hold // Compress // HeldRemotePacket
SetAttributes[HoldRemotePacket, HoldFirst]

tcpConnect[port_, o_LocalKernelObject] := With[{shared = af`SharedDir, host = o["Host"], uid = o["Hash"], p = o["Port"], addr = "127.0.0.1:"<>ToString[port], env = System`$Env, electronQ = (System`$Env["ElectronCode"] === 1)},
    (  
        Print["Establishing LTP link... using "<>addr];
        Internal`Kernel`Host = host;
        
        Internal`Kernel`Stdout = USocketConnect[addr] // LTPTransport;
        Print["Establishing starting LTP server for backlink... using "<>(StringTemplate["127.0.0.1:``"][p])];
        Module[{Internal`Kernel`ltcp},
            Internal`Kernel`ltcp = TCPUServer[];
     
            Internal`Kernel`ltcp["CompleteHandler", "LTP"] = LTPQ -> LTPLength;
            Internal`Kernel`ltcp["MessageHandler", "LTP"]  = LTPQ -> LTPHandler;

            SocketListen[USocketOpen["127.0.0.1:"<>ToString[p] ], Internal`Kernel`ltcp@#&];
            
        ];

        Internal`Kernel`Apply[e_, t_] := e[t];
        Internal`Kernel`Type = "LocalKernel";
        Internal`Kernel`Hash = uid;
        Internal`Kernel`WLJSQ = True;
        Internal`Kernel`$Env = env;
        Internal`Kernel`ElectronQ = electronQ;
        System`$FrontEndWLJSQ = True; (* DEPRICATED *)

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
            EventFire[Internal`Kernel`Stdout[secret], "Pong", True];
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

        Unprotect[FileNameJoin];
        FileNameJoin[{Internal`RemoteFS[url_], any__}] := With[{parsed = URLParse[url]},
          With[{r = Join[parsed, <|"Query" -> {"path" -> URLEncode[FileNameJoin[{URLDecode["path" /. parsed["Query"] ], any}] ]}|>] // URLBuild // Internal`RemoteFS},
            r
          ]
        ];

        Protect[FileNameJoin];   
        
           

        Internal`RemoteFS /: Get[Internal`RemoteFS[url_] ] := Get[url];   
        Internal`RemoteFS /: StringTake[Internal`RemoteFS[url_], n_] := StringTake[url,n]; 
        Internal`RemoteFS /: Import[Internal`RemoteFS[url_], w_] := Import[url, w];

        With[{pid = $ProcessID}, LTPEvaluate[Internal`Kernel`Stdout, Internal`Kernel`LTPConnected[uid, pid] ] ];
    ) // HoldRemotePacket
]


(* launch kernel *)
restart[k_LocalKernelObject] := With[{},
    k["InitList"] = {};

    LinkClose[k["Link"] ];
    TaskRemove[k["HeartBeat"] ];
    k["ReadyQ"] = False;
    Close[k["LTPSocket"][[1]]];

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
    TaskRemove[k["HeartBeat"] ];
    k["ReadyQ"] = False;
    Close[k["LTPSocket"][[1]]];

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
    LTPServerStart[];

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

        If[TrueQ @ Internal`$NoWRServices, 
             LinkWrite[link, Unevaluated[ Get[FileNameJoin[{Directory[], "Common", "Patches", "NoWR.wl"}] ] ] ];
        ];

        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`CSockets`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`Objects`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`Internal`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`LTP`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`TCPServer`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`Misc`Events`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`Misc`Async`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`Misc`Language`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`Misc`Events`Promise`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`Misc`Parallel`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`WebSocketHandler`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`Misc`WLJS`Transport`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`CSockets`EventsExtension`"] ];
        LinkWrite[link, EnterTextPacket["<<CoffeeLiqueur`LTP`Events`"] ];
        LinkWrite[link, EnterTextPacket["<<LetWL`"] ];
        LinkWrite[link, EnterTextPacket["Off[Most::argx]"] ];
        LinkWrite[link, EnterTextPacket["$Inspector = Dialog[]&;"] ];
        
        

        (* unknown WL bug, doesn't work in initialization ... *)
        LinkWrite[link, EnterTextPacket["Unprotect[Interpretation, InterpretationBox]"] ];

        LinkWrite[link, Unevaluated[ Get[FileNameJoin[{Directory[], "Common", "LPM", "LPM.wl"}] ] ] ];
    ];


    If[!TrueQ[k["CreatedQ"] ], With[{kernel = k},
        k["StandardOutput"] = CreateUUID[];
        
        With[{stdout = EventClone[k["StandardOutput"] ]},

            EventHandler[stdout, {
                TextPacket[s_] :> (EventFire[kernel, "Print", s]&),
                MessagePacket[symbol_, type_] :> (EventFire[kernel, "Warning", StringTemplate["``::``"][symbol, type] ]&),
                any_ :> (Echo[any]&)
            }];

            k["PrintTask"] = MicrotaskSubmit[
                If[LinkReadyQ[kernel["Link"] ], EventFire[kernel["StandardOutput"], LinkRead[kernel["Link"] ], kernel] ];
            , "Continuous" -> True];
        ];
    ] ];

    kernel["CreatedQ"] = True;


    LinkWrite[link, tcpConnect[ lkPort, k ]  ];

    k["WatchDog"] = SetTimeout[ checkState[k], 12 * 1000];
    k
]

checkState[k_LocalKernelObject] := Module[{},
    k["State"] = "Timeout";
    EventFire[k, "Error", "Kernel initialization timeout"];
]

(* [NOTE] You may easily overload the evaluation que on Windows machines *)
(* It will stall during LinkWrite *)
(* Mostly affects the initial start, then works without issues *)

LocalKernelObject /: GenericKernel`SubmitTransaction[k_LocalKernelObject, t_] := With[{ev = t["Evaluator"], s = Transaction`Serialize[t]},
    LinkWrite[k["Link"], EnterExpressionPacket[ Internal`Kernel`Apply[ ev, s ] ] // Unevaluated  ]
]

LocalKernelObject /: GenericKernel`Async[k_LocalKernelObject, expr_] := With[{},
    LTPEvaluate[k["LTPSocket"], expr]
]

GenericKernel`Stdout[k_LocalKernelObject][any_] := k["LTPSocket"][any]

SetAttributes[GenericKernel`Async, HoldRest]

(* [NOTE] You may easily overload the evaluation que on Windows machines *)
(* It will stall during LinkWrite *)
(* Mostly affects the initial start, then works without issues *)

LocalKernelObject /: GenericKernel`Init[k_LocalKernelObject, expr_, OptionsPattern[] ] := With[{once = OptionValue["Once"], tracker = OptionValue["TrackingProgress"]},
    If[!once,
        With[{
                value = expr // Hold // Compress // HeldRemotePacket
            },
                Echo["LocalKernel Init >> Normal"];
                tracker["Start"];
                LinkWrite[k["Link"], value];
                With[{promise = Promise[]},
                    Then[promise, Function[Null,
                        tracker["End"];
                    ] ];

                    With[{s = promise // First},
                        LinkWrite[k["Link"], Unevaluated[EventFire[Internal`Kernel`Stdout[ s ], Resolve, "Ok" ];] ];
                    ];
                ];
                
        ];    
    , 
        If[!MemberQ[k["InitList"], Hash[expr // Hold] ] ,
            Echo["LocalKernel Init >> Once"];
            EventFire[k, "Info", "Initialization has started. Please, wait a bit..."];
            With[{
                value = expr // Hold // Compress // HeldRemotePacket
            },
                tracker["Start"];
                LinkWrite[k["Link"], value];
                With[{promise = Promise[]},
                    Then[promise, Function[Null,
                        tracker["End"];
                    ] ];

                    With[{s = promise // First},
                        LinkWrite[k["Link"], Unevaluated[EventFire[Internal`Kernel`Stdout[ s ], Resolve, "Ok" ];] ];
                    ];
                ];
            ];

            k["InitList"] = Append[k["InitList"], Hash[expr // Hold] ];
        ,
            Echo["LocalKernel Init >> Already initialized..."];
        ];
    ];
]



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
