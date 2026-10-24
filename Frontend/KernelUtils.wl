BeginPackage["CoffeeLiqueur`Notebook`KernelUtils`", {
  "CoffeeLiqueur`Misc`Events`",
  "CoffeeLiqueur`Misc`Events`Promise`",
  "CoffeeLiqueur`CUSockets`",
  "CoffeeLiqueur`CUSockets`EventsExtension`",
  "CoffeeLiqueur`UInternal`",
  "CoffeeLiqueur`TCPUServer`",
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
  paths = {FileNameJoin[{Directory[], "modules"}], AppExtensions`ExtensionsDir}
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
        
        Module[{Internal`Kernel`wcp, Internal`Kernel`ws},
          Internal`Kernel`wcp = TCPUServer[];
          Internal`Kernel`wcp["CompleteHandler", "WebSocket"] = WebSocketUPacketQ -> WebSocketUPacketLength;
          
          Internal`Kernel`ws = WebSocketUHandler[];
          Internal`Kernel`wcp["MessageHandler", "WebSocket"]  = WebSocketUPacketQ -> Internal`Kernel`ws;

          (* configure the handler for WLJS communications *)
          Internal`Kernel`ws["MessageHandler", "Evaluate"]  = Function[True] -> WLJSTransportHandler;


          Off[Function::fpct]; (* fixme, when a symbol gets cleared, see  Experimental`ValueFunction *)
          Off[Function::slotn]; (* fixme they changed it in WL15 *)
          
          (* symbols tracking *)
          WLJSTransportHandler["AddTracking"] = Function[{symbolName, fullName, cli, callback},
              (*Print["Add tracking... for "<>name];*)
              Experimental`ValueFunction[ fullName ] = ( 
                If[FailureQ[callback[cli, #2] ], 
                  Experimental`ValueFunction[ fullName ] // Unset
                ];
              )&;
          , HoldFirst];

          WLJSTransportHandler["GetSymbol"] = Function[{exprString, client, callback},
              (*Print["evaluating the desired symbol on the Kernel"];*)
              If[ToExpression[exprString, InputForm, ValueQ],
                callback[ToExpression[exprString, InputForm]];
              ,
                callback[$Failed];
              ]
          ];

          (*Echo[StringTemplate["starting @ ``:port ``"][Internal`Kernel`Host, port] ];*)
          SocketListen[USocketOpen[host, port ], Internal`Kernel`wcp@#&, "SocketEventsHandler"->CSocketsClosingHandler];

          (*SocketListen[port, wcp@#&];*)
        ];
    ) ]
]

End[];

EndPackage[];

