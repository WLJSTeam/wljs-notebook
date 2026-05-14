BeginPackage["CoffeeLiqueur`Extensions`ExportImport`BlackBox`WidgetStateMachine`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`", 
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CoffeeLiqueur`UObjects`"
}]


Begin["`Private`"]

parent = DirectoryName[$InputFileName] // ParentDirectory;

infoWindow = ImportComponent[FileNameJoin[{parent, "Info.wlx"}] ];

Needs["CoffeeLiqueur`Extensions`ExportImport`WidgetAPI`" -> "wapi`", FileNameJoin[{parent, "ESP.wl"}] ];


Needs["CoffeeLiqueur`Extensions`ExportImport`Proto`" -> "proto`", FileNameJoin[{parent, "Proto.wl"}] ]
Needs["CoffeeLiqueur`Extensions`ExportImport`KernelSniffer`" , FileNameJoin[{parent, "KernelSniffer.wl"}] ]

Needs["CoffeeLiqueur`Extensions`ExportImport`BlackBox`" -> "blackBox`" , FileNameJoin[{parent, "BlackBox.wl"}] ]

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];

Needs["CoffeeLiqueur`Extensions`ExportImport`DynamicAnalyzer`" -> "dynamicAnalyzer`", FileNameJoin[{parent, "DynamicAnalyzer.wl"}] ];

Echo["BlackBox :: WidgetStateMachine"];

CreateUType[stateMachine, blackBox`BlackBox];

blackBox`definedBoxes = Append[blackBox`definedBoxes, stateMachine];

stateMachine /: blackBox`test[stateMachine, _wapi`Tools`WidgetLike] := True

stateMachine /: blackBox`test[stateMachine, _] := False

stateMachine /: blackBox`construct[stateMachine, w_, kernel_] := With[{},
    With[{machine = stateMachine[]},
      machine["Kernel"] = kernel;
      machine["Aborted"] = False;
      EventHandler[machine, {"Abort" -> Function[Null, Echo["Abort machine!"]; machine["Aborted"] = True]}];

      machine["Symbol"] = symbol;
      machine["Widget"] = w;

      machine
    ]
]


runOverNested[array_, depth_, res_, key_] := If[depth == Length[array], 
  Table[With[{i=i},Flatten[{res, Hold[i]}] ], {i, array[[depth]][key]}]
, 
  Table[With[{i=i}, runOverNested[array, depth+1, {res, Hold[i]}, key ] ], {i, array[[depth]][key]}]
]

SubmitState;



prepareFeedbackSignal[kernel_] := With[{},
    Echo["Prepare feedback loop handlers"];
    GenericKernel`Send[kernel,  (  
        Internal`Kernel`LoopBackTrueMessage = True;
    ), "Once"->True];
]

ApplySync[f_, w_, {first_, rest___}, final_, reject_] := f[w@@first, Function[Null, ApplySync[f,w, {rest}, final, reject] ], Function[Null, reject[] ] ]
ApplySync[f_, w_, {}, final_, reject_] := final[];

probeState[action_, kernel_, symbols_, delay_, aborted_, {values_, events_}, client_] := With[{
  promise = Promise[]
},

  Then[WebUIFetch[SubmitState[values, events, "Internal`Kernel`LoopBackTrueMessage", "Delay"->delay], client, "Format"->"RawJSON"], Function[hash,

    Then[KernelSniffer[kernel, "FetchSymbols", symbols], Function[data,

      action[hash -> Map[Function[idata, {processTyped[idata], Hash[idata], checkType[idata]}], data] ]; (* added HASH!!! *)
      If[aborted//ReleaseHold,
        EventFire[promise, Reject, True];
      ,
        EventFire[promise, Resolve, True ];
      ];
    ] ];
  ] ];
  

  promise
]

checkType[type_?Developer`PackedArrayQ | type_?NumericArrayQ] := "PackedArray";
checkType[type_] := "JS";

processTyped[data_?Developer`PackedArrayQ | data_?NumericArrayQ] := ExportByteArray[NumericArray[data], "WXF"]//BaseEncode 
processTyped[data_] := data

compress[expr_] := With[{arr = Normal[ExportByteArray[expr /. {n_NumericArray :> Normal[n]} , "JSON"] ]},
  With[{data = BaseEncode[ByteArray[Developer`RawCompress[arr] ] ]},
    data
  ]
]

stateMachine /: blackBox`export[machine_stateMachine] := With[{},
With[{data = <|"CompressedMap" -> compress[KeyValueMap[List, Normal[machine["HashTable"] ] ] ],
  "Basis" -> machine["Basis"],
  "Class" -> "WidgetStateMachine",
  "Symbols" -> machine["Symbols"],
  "Events" -> machine["Events"],
  "Interpolation"->machine["Interpolation"],
  "InitialValues" -> machine["InitialValues"]|>},
    machine["HashTable"]["KeyDropAll"];
    machine["Basis"] = {};
    Delete[machine["HashTable"] ];
    Delete[machine];
    data
  ]
]

stateMachine /: blackBox`process[machine_stateMachine, {controls_, modals_, messager_, client_, notebookOnLine_, path_, name_, ext_, settings_}] := Module[{
  store = {}, counter = 0, total, reducedQ = False
}, With[{
  widget = machine["Widget"],
  channel = CreateUUID[],
  promise = Promise[]
},
{
  ranges = widget["Ranges"]
},
  With[{
    notification = Notifications`Custom["Topic"->widget["Meta"]["Description"], "Body"->infoWindow["Channel"->channel, "Message"->"Sampling states", "Client"->client, "Log"->messager, "Notebook"->notebookOnLine], "Controls"->False]
  },

    total = Product[Length[i["Range"] ], {i, ranges}];


    If[total > 750,

      Block[{Global`$Client = client},
        EventFire[messager, "Warning", StringTemplate["Too many states (``) to sample! Try to reduce step sizes or use manual sampling"][total] ];
      ];

      Delete[notification];
      EventFire[promise, Reject, True];
      Return[promise];
    ];

    GenericKernel`Send[machine["Kernel"],  wapi`Tools`SetFlag["PreserveSymbols"] ];

    machine["Interpolation"] = widget["Interpolation"] && Lookup[settings, "HTMLExportStatesInterpolation", True];



    Block[{Global`$Client = client},
      Echo["Total states: "<>ToString[total] ];
      EventFire[messager, notification, True];
      If[reducedQ,
        EventFire[channel, "Progress", <|"Bar"->0, "Max"->1.0, "Info"->StringJoin[ToString[total], " to be sampled. Precision decreased because many states had to be sampled."]|>];
      ,
        EventFire[channel, "Progress", <|"Bar"->0, "Max"->1.0, "Info"->StringJoin[ToString[total], " to be sampled"]|>];
      ];
    ];

    Pause[0.3];


    EventHandler[channel, {
        "Abort" -> Function[Null,
            EventFire[channel, "Progress", <|"Info"->"Aborting..."|>];
            machine["Aborted"] = True;
            Echo["Aborting..."];
            KernelSniffer[machine["Kernel"], "Eject"];
            WebUISubmit[dynamicAnalyzer`Sniffer["Eject"], client];
            WebUISubmit[dynamicAnalyzer`Sniffer["Retrack"], client];            
            GenericKernel`Send[machine["Kernel"],  wapi`Tools`ResetFlag["PreserveSymbols"] ];
            EventFire[promise, Reject, True];
            Delete[notification];
        ],

        "Continue" -> Function[Null,   
            KernelSniffer[machine["Kernel"], "Eject"];
            WebUISubmit[dynamicAnalyzer`Sniffer["Eject"], client];
            WebUISubmit[dynamicAnalyzer`Sniffer["Retrack"], client];
            GenericKernel`Send[machine["Kernel"],  wapi`Tools`ResetFlag["PreserveSymbols"] ];
            Delete[notification];

            With[{reset = widget["ResetStateFunction"]},
              Then[KernelSniffer[machine["Kernel"], Hold[reset[] ], "EvaluateHeld"], Function[Null,
                SetTimeout[EventFire[promise, Resolve, True], 1000]
              ] ];
            ];
            
        ]
    }];


    With[{
      socket = EventClone[client]
    },
      EventHandler[socket, {"Closed" -> Function[Null,
        EventRemove[socket];
        KernelSniffer[machine["Kernel"], "Eject"];
        GenericKernel`Send[machine["Kernel"],  wapi`Tools`ResetFlag["PreserveSymbols"] ]; 
        Echo["Unexpected abortion >> !!!"];       
      ]}];
    ];

    prepareFeedbackSignal[machine["Kernel"] ];

    Debug`machine = machine;

    machine["HashTable"] = CreateDataStructure["HashTable"];

    Echo["Injecting sniffers"];

    Then[KernelSniffer[machine["Kernel"], "Inject"], Function[Null,
            
      Echo["Injecting sniffers on frontend"];


      Then[WebUIFetch[{
        dynamicAnalyzer`Sniffer["Retrack"],
        dynamicAnalyzer`Sniffer["Inject"],
        dynamicAnalyzer`Sniffer["Confirm"]
      }, client, "Format"->"Raw"], Function[Null,

      Echo["Reset pool"];
      KernelSniffer[machine["Kernel"], "Reset"];

      Echo["Reset widget state"];
      With[{reset = widget["ResetStateFunction"]},


        Then[KernelSniffer[machine["Kernel"], Hold[reset[] ], "EvaluateHeld"], Function[Null,
          Echo["Done!"];
          Then[KernelSniffer[machine["Kernel"], "ListSymbols"], Function[report,
            Echo["Report:"]; Echo[report];
            With[{symbols = report},
              machine["Symbols"] = symbols;
              Echo["Symbols:"];
              Echo[symbols];

              KernelSniffer[machine["Kernel"], "Reset"];
              KernelSniffer[machine["Kernel"], "Eject"];

              WebUISubmit[dynamicAnalyzer`Sniffer["Eject"], client];
              WebUISubmit[dynamicAnalyzer`Sniffer["Retrack"], client];


              machine["InitialValues"] = Table[r["Range"][[ r["Initial"] ]], {r, ranges}];
              Echo["Initial values: "]; Echo[machine["InitialValues"] ];


              With[{
                states = ReleaseHold[Flatten[runOverNested[ranges, 1, {}, "Range"], Length[ranges ]-1] ],
                events = Table[r["Event"], {r, ranges}],
                maxDelay = Max[Table[r["Delay"], {r, ranges}] ],
                append = Function[val, 
                  counter++;
                  If[Mod[counter, 5] == 0,
                    EventFire[channel, "Progress", <|"Bar"->counter, "Max"->total|>];
                  ];
                  machine["HashTable"]["Insert", val]; 
                ]
              },
                
                        machine["Basis"] = states;
                        machine["Events"] = events;

                        With[{p = Promise[]},
                          ApplySync[Then, probeState, {
                                  append, machine["Kernel"], machine["Symbols"], maxDelay, Hold[machine["Aborted"] ], {#, events}, client
                              } &/@ states, Function[Null,

                              EventFire[p, Resolve, True];
                          ], Function[Null,
                            Echo["Rejected!"];
                            EventFire[p, Reject, True];
                          ] ];  

                          Then[p, Function[Null, 
                            Echo["DONE"];
                            EventFire[channel, "Progress", <|"Bar"->1, "Max"->1, "Info"->"Finished!", "Size"->(ByteCount[machine["HashTable"]["Values"] ]/1024.0//N)|>];
                            EventFire[channel, "Done", True];

                            Echo["Machine is ready!!!"];

                          ], Function[Null,

                            Echo["Aborted machine"];

                          ] ];
                        ]  

              ]
            ];
          ] ]
        ] ];
      ];
  ]];

    ] ];

    promise
] ] ]


End[]
EndPackage[]