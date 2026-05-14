BeginPackage["CoffeeLiqueur`Extensions`ExportImport`BlackBox`PavlovMachine`", {
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

Echo["BlackBox :: PavlovMachine"];

CreateUType[pavlovMachine, blackBox`BlackBox];

blackBox`definedBoxes = Append[blackBox`definedBoxes, pavlovMachine];

pavlovMachine /: blackBox`test[pavlovMachine, group_Association] := (Length[group["Summary"]["FrontSubmit"] ] > 0)

pavlovMachine /: blackBox`test[pavlovMachine, _] := False

pavlovMachine /: blackBox`construct[pavlovMachine, group_, kernel_] := With[{submits = group["Summary"]["FrontSubmit"]},
    With[{machine = pavlovMachine[]},
      machine["Kernel"] = kernel;
      machine["Aborted"] = False;
      EventHandler[machine, {"Abort" -> Function[Null, Echo["Abort machine!"]; machine["Aborted"] = True]}];

      machine["Symbol"] = symbol;
      machine["Events"] = (#["FullForm"]&/@(group["Summary"]["Events"]));
      machine["HashTable"] = CreateDataStructure["HashTable"];

      With[{filtered = Select[group["Raw"], Function[item, MatchQ[item[[2]], {"FrontSubmit", __}] ] ]},
        machine["Raw"] = filtered // DeleteDuplicates;
      ];

      machine
    ]
]



compress[expr_] := With[{arr = Normal[ExportByteArray[expr, "JSON"] ]},
  With[{data = BaseEncode[ByteArray[Developer`RawCompress[arr] ] ]},
    data
  ]
]

pavlovMachine /: blackBox`export[machine_pavlovMachine] := With[{},
With[{data = <|"CompressedMap" -> compress[KeyValueMap[Function[{key, val}, {key, ExportString[val, "ExpressionJSON", "Compact"->1]}], Normal[machine["HashTable"] ] ] ],
  "Class" -> "PavlovMachine",
  "Interpolation" -> machine["Interpolation"],
  "Events" -> machine["Events"]
|>},
    machine["HashTable"]["KeyDropAll"];
    Delete[machine["HashTable"] ];
    Delete[machine];
    data
  ]
]

CalculateHash;

pavlovMachine /: blackBox`process[machine_pavlovMachine, {controls_, modals_, messager_, client_, notebookOnLine_, path_, name_, ext_, settings_}] := With[{promise = Promise[], channel = CreateUUID[]},
  With[{
    notification = Notifications`Custom["Topic"->"Pavlov Machine", "Body"->infoWindow["Channel"->channel, "Message"->"FrontSubmit records were collected", "Client"->client, "Log"->messager, "Notebook"->notebookOnLine], "Controls"->False]
  },

    machine["Interpolation"] = Lookup[settings, "HTMLExportStatesInterpolation", True];

    Block[{Global`$Client = client},
        EventFire[messager, notification, True];
    ];

    EventHandler[channel, {
        "Abort" -> Function[Null,
            Delete[notification];
            machine["Raw"] = .;
            EventFire[promise, Reject, True];
        ],

        "Continue" -> Function[Null,
            Delete[notification];
            EventFire[promise, Resolve, True];
        ]
    }];

    EventFire[channel, "Progress", <|"Size"->(ByteCount[ machine["Raw"][[All, 2, 2]] ]/1024 // N), "Bar"->1.0, "Max"->1.0, "Info"->StringJoin[ToString[Length[machine["Raw"][[All, 2, 2]] ] ], " calls"]|>];
    


    Then[WebUIFetch[CalculateHash[machine["Raw"][[All, 1]] ], client, "Format"->"RawJSON"], Function[hashes,
      Echo["Got hashes:: "]; Echo[hashes];

      MapThread[Function[{hash, data},
        machine["HashTable"]["Insert", hash -> data];
      ], {hashes, machine["Raw"][[All, 2, 2]]} ];

      machine["Raw"] = .;
      
      EventFire[channel, "Done", True];

    ] ];
  ];

  promise
]

pavlovMachine /: blackBox`delete[machine_pavlovMachine] := (
    machine["Raw"]=.;
)


End[]
EndPackage[]