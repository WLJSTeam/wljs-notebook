BeginPackage["CoffeeLiqueur`Extensions`ExportImport`BlackBox`AnimationMachine`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`", 
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CoffeeLiqueur`Objects`"
}]


Begin["`Private`"]



parent = DirectoryName[$InputFileName] // ParentDirectory;

infoWindow = ImportComponent[FileNameJoin[{parent, "Info.wlx"}] ];


Needs["CoffeeLiqueur`Extensions`ExportImport`Proto`" -> "proto`", FileNameJoin[{parent, "Proto.wl"}] ]
Needs["CoffeeLiqueur`Extensions`ExportImport`KernelSniffer`" , FileNameJoin[{parent, "KernelSniffer.wl"}] ]

Needs["CoffeeLiqueur`Extensions`ExportImport`BlackBox`" -> "blackBox`" , FileNameJoin[{parent, "BlackBox.wl"}] ]

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];

Echo["BlackBox :: AnimationMachine"];

CreateUType[animationMachine, blackBox`BlackBox];

blackBox`definedBoxes = Append[blackBox`definedBoxes, animationMachine];

animationMachine /: blackBox`priority[animationMachine] := 10;

animationMachine /: blackBox`test[animationMachine, group_Association] := (

    If[(Length[group["Summary"]["Symbols"] ] > 0 && Length[group["Summary"]["Events"] ] == 1),
    group["Summary"]["Events"][[1]]["Duplicates"] > 0.8 && group["Summary"]["Events"][[1]]["Count"] > 20
,
    False    
]
)

animationMachine /: blackBox`test[animationMachine, _] := False

animationMachine /: blackBox`construct[animationMachine, group_, kernel_] := With[{symbols = group["Summary"]["Symbols"]},
  Map[Function[symbol,
    With[{machine = animationMachine[]},
      machine["Kernel"] = kernel;
      machine["Aborted"] = False;
      EventHandler[machine, {"Abort" -> Function[Null, Echo["Abort machine!"]; machine["Aborted"] = True]}];

      machine["Symbol"] = symbol;
      machine["Event"] = group["Summary"]["Events"][[1]];
      machine["Values"] = Select[group["Raw"], Function[item, MatchQ[item[[2]], {"Symbol", symbol, _}] ] ][[All, 2, 3]];

      machine
    ]
  ], symbols]
]

CalculateHash;

animationMachine /: blackBox`process[machine_animationMachine, {controls_, modals_, messager_, client_, notebookOnLine_, path_, name_, ext_, settings_}] := With[{promise = Promise[], channel = CreateUUID[]},
  With[{
    notification = Notifications`Custom["Topic"->"Animation Machine", "Body"->infoWindow["Channel"->channel, "Message"->"Your animated frames were collected", "Client"->client, "Log"->messager, "Notebook"->notebookOnLine], "Controls"->False]
  },

    machine["Interpolation"] = Lookup[settings, "HTMLExportStatesInterpolation", True];
  
    Block[{Global`$Client = client},
        EventFire[messager, notification, True];
    ];

    EventHandler[channel, {
        "Abort" -> Function[Null,
            Delete[notification];
            machine["Values"]=.;
            EventFire[promise, Reject, True];
        ],

        "Continue" -> Function[Null,
            Delete[notification];
            EventFire[promise, Resolve, True];
        ]
    }];

    EventFire[channel, "Progress", <|"Size"->(ByteCount[ machine["Values"] ]/1024 // N), "Bar"->1.0, "Max"->1.0, "Info"->StringJoin[ToString[Length[machine["Values"] ] ], " frames"]|>];
    EventFire[channel, "Done", True];

    machine["HashState"] = Null;
  ];

  promise
]

animationMachine /: blackBox`delete[machine_animationMachine] := (
    machine["Values"]=.;
)


compress[expr_] := With[{arr = Normal[ExportByteArray[expr /. {n_NumericArray :> Normal[n]}, "JSON"] ]},
  With[{data = BaseEncode[ByteArray[Developer`RawCompress[arr] ] ]},
    data
  ]
]


animationMachine /: blackBox`export[machine_animationMachine] := With[{},
With[{data = <|"Compressed" -> compress[ machine["Values"] ],
  "Class" -> "AnimationMachine",
  "Symbol" -> machine["Symbol"],
  "Interpolation" -> machine["Interpolation"],
  "Event" -> machine["Event"]["FullForm"],
  "HashState" -> machine["HashState"]
|>},

    machine["Values"]=.;
    Delete[machine];
    data
  ]
]


End[]
EndPackage[]