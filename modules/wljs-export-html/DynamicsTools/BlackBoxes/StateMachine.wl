BeginPackage["CoffeeLiqueur`Extensions`ExportImport`BlackBox`StateMachine`", {
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


Needs["CoffeeLiqueur`Extensions`ExportImport`Proto`" -> "proto`", FileNameJoin[{parent, "Proto.wl"}] ]
Needs["CoffeeLiqueur`Extensions`ExportImport`KernelSniffer`" , FileNameJoin[{parent, "KernelSniffer.wl"}] ]

Needs["CoffeeLiqueur`Extensions`ExportImport`BlackBox`" -> "blackBox`" , FileNameJoin[{parent, "BlackBox.wl"}] ]

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];

Echo["BlackBox :: StateMachine"];

CreateUType[stateMachine, blackBox`BlackBox];

blackBox`definedBoxes = Append[blackBox`definedBoxes, stateMachine];

stateMachine /: blackBox`test[stateMachine, group_Association] := (Length[group["Summary"]["Symbols"] ] > 0)

stateMachine /: blackBox`test[stateMachine, _] := False

stateMachine /: blackBox`construct[stateMachine, group_, kernel_] := With[{symbols = group["Summary"]["Symbols"]},
  Map[Function[symbol,
    With[{machine = stateMachine[]},
      machine["Kernel"] = kernel;
      machine["Aborted"] = False;
      EventHandler[machine, {"Abort" -> Function[Null, Echo["Abort machine!"]; machine["Aborted"] = True]}];

      machine["Symbol"] = symbol;
      machine["Events"] = With[{allEventsForSymbol = proto`event[#]["Id"] &/@ (Select[group["Raw"], Function[item, item[[2, 2]] == symbol ] ][[All, 1, {1,2}]] // DeleteDuplicates)},
        Select[group["Summary"]["Events"], Function[ev, 
          MemberQ[allEventsForSymbol, ev["Id"] ]
        ] ]
      ];

      machine
    ]
  ], symbols]
]


runOverNested[array_, depth_, res_] := If[depth == Length[array], 
  Table[With[{i=i},Flatten[{res, Hold[i]}] ], {i, array[[depth, "Values"]]}]
, 
  Table[With[{i=i}, runOverNested[array, depth+1, {res, Hold[i]} ] ], {i, array[[depth, "Values"]]}]
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

probeState[action_, kernel_, symbol_, aborted_, {values_, events_}, client_] := With[{
  promise = Promise[]
},

  Then[WebUIFetch[SubmitState[values, events, "Internal`Kernel`LoopBackTrueMessage"], client, "Format"->"RawJSON"], Function[hash,

    Then[KernelSniffer[kernel, "FetchSymbol", symbol], Function[data,

      action[hash -> data];
      If[aborted//ReleaseHold,
        EventFire[promise, Reject, True];
      ,
        EventFire[promise, Resolve, True ];
      ];
    ] ];
  ] ];
  

  promise
]

compress[expr_] := With[{arr = Normal[ExportByteArray[expr /. {n_NumericArray :> Normal[n]} , "JSON"] ]},
  With[{data = BaseEncode[ByteArray[Developer`RawCompress[arr] ] ]},
    data
  ]
]

stateMachine /: blackBox`export[machine_stateMachine] := With[{},
With[{data = <|"CompressedMap" -> compress[KeyValueMap[List, Normal[machine["HashTable"] ] ] ],
  "Basis" -> machine["Basis"],
  "Class" -> "StateMachine",
  "Interpolation" -> machine["Interpolation"],
  "Symbol" -> machine["Symbol"],
  "Events" -> machine["Events"][[All, "FullForm"]],
  "InitialValues" -> Table[i["Values"][[-1]], {i, machine["Events"]}]|>},
    machine["HashTable"]["KeyDropAll"];
    machine["Basis"] = {};
    Delete[machine["HashTable"] ];
    Delete[machine];
    data
  ]
]

stateMachine /: blackBox`process[machine_stateMachine, {controls_, modals_, messager_, client_, notebookOnLine_, path_, name_, ext_, settings_}] := Module[{store = {}, counter = 0}, With[{promise = Promise[], channel = CreateUUID[]},
  With[{
    total = Product[Length[i["Values"] ], {i, machine["Events"]}],
    initialValues = Table[i["Values"][[1]], {i, machine["Events"]}],
    events = machine["Events"][[All, "FullForm"]],
    notification = Notifications`Custom["Topic"->"State Machine", "Body"->infoWindow["Channel"->channel, "Message"->"Sampling states", "Client"->client, "Log"->messager, "Notebook"->notebookOnLine], "Controls"->False]
  },
    Block[{Global`$Client = client},
      Echo["Total states: "<>ToString[total] ];
      EventFire[messager, notification, True];
      EventFire[channel, "Progress", <|"Bar"->0, "Max"->1.0, "Info"->StringJoin[ToString[total], " to be sampled"]|>];
    ];

    machine["Interpolation"] = Lookup[settings, "HTMLExportStatesInterpolation", True];

    Pause[0.3];


    EventHandler[channel, {
        "Abort" -> Function[Null,
            EventFire[channel, "Progress", <|"Info"->"Aborting..."|>];
            machine["Aborted"] = True;
            Echo["Aborting..."];
        ],

        "Continue" -> Function[Null,
            Delete[notification];
            EventFire[promise, Resolve, True];
        ]
    }];




    prepareFeedbackSignal[machine["Kernel"] ];

    Debug`machine = machine;

    machine["HashTable"] = CreateDataStructure["HashTable"];

    With[{
      states = ReleaseHold[Flatten[runOverNested[machine["Events"], 1, {}], Length[machine["Events"] ]-1] ],
      append = Function[val, 
        counter++;
        If[Mod[counter, 5] == 0,
          EventFire[channel, "Progress", <|"Bar"->counter, "Max"->total|>];
        ];
        machine["HashTable"]["Insert", val]; 
      ]
    },


      machine["Basis"] = states;
      Pause[0.1];

                        With[{p = Promise[]},
                          ApplySync[Then, probeState, {
                                  append, machine["Kernel"], machine["Symbol"], Hold[machine["Aborted"] ], {#, events}, client
                              } &/@ states, Function[Null,

                              EventFire[p, Resolve, True];
                          ], Function[Null,
                            Echo["Rejected!"];
                            EventFire[p, Reject, True];
                          ] ];  

                          Then[p, Function[Null, 
                            Echo["DONE"];
                            EventFire[channel, "Progress", <|"Bar"->1, "Max"->1, "Info"->"Finished!", "Size"->(ByteCount[machine["HashTable"]["Values"] ]/1024//N)|>];
                            EventFire[channel, "Done", True];
                            

                          ], Function[Null,
                            Echo["Abort"];
                            Delete[notification];
                            EventFire[promise, Reject, True];
                          ] ];
                        ]       
    ]
  ];

  promise
] ]


End[]
EndPackage[]