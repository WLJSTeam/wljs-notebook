BeginPackage["CoffeeLiqueur`Notebook`KernelUtils`", {
  "CoffeeLiqueur`Misc`Events`",
  "CoffeeLiqueur`Misc`Events`Promise`",
  "CoffeeLiqueur`CSockets`",
  "CoffeeLiqueur`CSockets`EventsExtension`",
  "CoffeeLiqueur`Internal`",
  "CoffeeLiqueur`TCPServer`",
  "CoffeeLiqueur`WebSocketHandler`",
  "CoffeeLiqueur`Misc`WLJS`Transport`"
}];

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
  paths = {FileNameJoin[{Directory[], "modules"}], AppExtensions`ExtensionsDir}
},
  Print["Init Kernel!!!"];
  EventFire[kernel, spinner, Null];  

  (* load to evaluation kernel *)
  With[{files = With[{
    filename = #
  },
    Echo[StringJoin["Loading to Evaluation Kernel... ", #] ];
    filename
  ] &/@ WLJSPackages`Includes["kernel"]},
    GenericKernel`Send[kernel, Get[#, Path->paths]&/@files // Quiet;];
  ];

  (* GenericKernel`SendAsync[kernel, 1]; *)

  Echo["Starting WS link"];
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
  Echo["Cleaning up..."];

  kernel["ContainerReadyQ"] = False;
  kernel["WebSocket"] = .;
]

wsStartListerning[kernel_, port_, host_] := With[{},
    
    GenericKernel`Send[kernel,  (  
        (*Print["Establishing WS link..."];*)
        System`$DefaultSerializer = ExportByteArray[#, "ExpressionJSON"]&;
        Module[{Internal`Kernel`wcp, Internal`Kernel`ws},
          Internal`Kernel`wcp = TCPUServer[];
          Internal`Kernel`wcp["CompleteHandler", "WebSocket"] = WebSocketUPacketQ -> WebSocketUPacketLength;
          
          Internal`Kernel`ws = WebSocketUHandler[];
          Internal`Kernel`wcp["MessageHandler", "WebSocket"]  = WebSocketUPacketQ -> Internal`Kernel`ws;

          (* configure the handler for WLJS communications *)
          Internal`Kernel`ws["MessageHandler", "Evaluate"]  = Function[True] -> WLJSTransportHandler;


          Off[Function::fpct]; (* fixme, when a symbol gets cleared, see  Experimental`ValueFunction *)
          
          (* symbols tracking *)
          WLJSTransportHandler["AddTracking"] = Function[{symbol, name, cli, callback},
              (*Print["Add tracking... for "<>name];*)
              Experimental`ValueFunction[ Unevaluated[symbol] ] = Function[{y,x}, 
                If[FailureQ[callback[cli, x] ], 
                  Experimental`ValueFunction[ Unevaluated[symbol] ] // Unset
                ];
              ];
          , HoldFirst];

          WLJSTransportHandler["GetSymbol"] = Function[{expr, client, callback},
              (*Print["evaluating the desired symbol on the Kernel"];*)
              callback[expr // ReleaseHold];
          ];

          (*Echo[StringTemplate["starting @ ``:port ``"][Internal`Kernel`Host, port] ];*)
          SocketListen[USocketOpen[host, port ], Internal`Kernel`wcp@#&, "SocketEventsHandler"->CSocketsClosingHandler];

          (*SocketListen[port, wcp@#&];*)
        ];
    ) ]
]

End[];

EndPackage[];

