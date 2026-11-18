BeginPackage["CoffeeLiqueur`Notebook`KernelUtils`", {
  "CoffeeLiqueur`Misc`Events`",
  "CoffeeLiqueur`Misc`Events`Promise`",
  "CoffeeLiqueur`CUSockets`",
  "CoffeeLiqueur`CUSockets`EventsExtension`",
  "CoffeeLiqueur`UInternal`",
  "CoffeeLiqueur`WebUSocketHandler`",
  "CoffeeLiqueur`WLJS`Tools`","CoffeeLiqueur`WLJS`Transport`"
}];

(* 
    Kernel Initialization helpers
    Sets up websocket connection and loads extensions
*)

deinitializeKernel; 
initializeKernel;


Begin["`Internal`"];

Needs["CoffeeLiqueur`ExtensionManager`" -> "WLJSPackages`"];
Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"]

Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];


initializeKernel[parameters_][kernel_] := With[{
  wsPort = parameters["env", "ws2"], 
  hash = kernel["Hash"],
  spinner = Notifications`Spinner["Topic"->"Initialization of the Kernel", "Body"->"Please, wait"],
  paths = {FileNameJoin[{Directory[], "modules"}], AppExtensions`ExtensionsDir},
  pacletsDir = AppExtensions`PacletsDir
},
  Print["Init Kernel!!!"];
  EventFire[kernel, spinner, Null];  

  (* load to evaluation kernel *)
  With[{files = With[{
    filename = #
  },
    Echo[StringJoin["[Frontend/KernelUtils] Loading expression into the evaluation kernel: ", #]];
    filename
  ] &/@ WLJSPackages`Includes["kernel"]},
    GenericKernel`Send[kernel, Get[#, Path->paths]&/@files // Quiet;];
  ];

  (* load shared paclets *)
  Echo[StringJoin["[Frontend/KernelUtils] Loading paclets directory: ", pacletsDir]];
  GenericKernel`Send[kernel, 
     Map[PacletDirectoryLoad] @  Map[DirectoryName] @  DeleteDuplicatesBy[FileNames["PacletInfo.wl" | "PacletInfo.m", {#}, {2}], DirectoryName]& @ pacletsDir
  ];
  

  (* GenericKernel`SendAsync[kernel, 1]; *)

  Echo["[Frontend/KernelUtils] Starting WS link"];
  wsStartListerning[kernel,  wsPort, parameters["env", "host"] ];

  kernel["WebSocket"] = wsPort;

  kernel["Container"] = StandardEvaluator`Container[kernel](*`*);
  kernel["ContainerReadyQ"] = True;

  kernel["State"] = "Initialized";

  With[{s = spinner["Promise"] // First},
    GenericKernel`Send[kernel,  EventFire[Internal`Kernel`RemoteEvent[ hash ], "State", "Initialized" ]; ];
    GenericKernel`Send[kernel,  EventFire[Internal`Kernel`RemoteEvent[ s ], Resolve, True ]; ];
  ];
]

deinitializeKernel[kernel_] := With[{},
  Echo["[Frontend/KernelUtils] Cleaning up."];

  kernel["ContainerReadyQ"] = False;
  kernel["WebSocket"] = .;
]

wsStartListerning[kernel_, port_, host_] := With[{},
    
    GenericKernel`Send[kernel,  (  
        (*Print["Establishing WS link..."];*)
        
        With[{Internal`Kernel`ws = Unique["Internal`Kernel`ws"], Internal`Kernel`updateSymbol = Unique["Internal`Kernel`updateSymbol"]},
          Internal`Kernel`ws = WebSocketUHandler[];

          (* configure the handler for WLJS communications *)
          Internal`Kernel`ws["MessageHandler", "Evaluate"]  = Function[True] -> WLJSTransportHandler;


          Internal`Kernel`updateSymbol[fullName_, cli_, callback_][_] := Experimental`ValueFunction[ fullName ] // Unset;

          Internal`Kernel`updateSymbol[fullName_, cli_, callback_][_, value_] := If[FailureQ[callback[cli, value] ],
            Internal`Kernel`updateSymbol[fullName, cli, callback][fullName];
          ];


          (* symbols tracking *)
          WLJSTransportHandler["AddTracking"] = Function[{symbolName, fullName, cli, callback},
              (*Print["Add tracking... for "<>name];*)
              Experimental`ValueFunction[ fullName ] = Internal`Kernel`updateSymbol[fullName, cli, callback];
          , HoldFirst];

          WLJSTransportHandler["GetSymbol"] = Function[{exprString, client, callback},
              (*Print["evaluating the desired symbol on the Kernel"];*)
              If[ToExpression[exprString, InputForm, ValueQ],
                callback[ToExpression[exprString, InputForm]];
              ,
                callback[$Failed];
                LinkWrite[$ParentLink, MessagePacket["Silent", "Failed attempt to fetch "<>exprString<>" as symbol"]];
              ]
          ];

          (*Echo[StringTemplate["starting @ ``:port ``"][Internal`Kernel`Host, port] ];*)
          SocketListen[USocketOpen[host, port ], Function[packet,
              WebSocketUStreamHandler[Internal`Kernel`ws,
                packet["SourceSocket"], packet["DataByteArray"]]
            ],
            "SocketEventsHandler" -> Function[{event, client},
              If[MemberQ[{"Closed", "Error"}, event],
                WebSocketUDisconnect[Internal`Kernel`ws, client]];
              CSocketsClosingHandler[event, client]
            ]
          ];

        ];
    ) ]
]

End[];

EndPackage[];

