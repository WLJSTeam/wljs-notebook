BeginPackage["CoffeeLiqueur`Extensions`DemosArchive`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`WLX`WebUI`"
}];

Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

Begin["`Internal`"]



checkReleaseNotes[assoc_] := With[{client = assoc["Client"], settings = assoc["Settings"], env = AppExtensions`FrontendEnv}, If[env["AppJSON", "version"] =!= settings["CurrentVersion"], 
  syncDemoFolder;

  With[{version = env["AppJSON", "version"]},
    If[settings["FirstLaunch"] =!= False,
      With[{path = FileNameJoin[{AppExtensions`DemosDir, "Welcome.wln"}]},
        If[FileExistsQ[path],
          If[!Lookup[assoc, "IFrameQ", False],
            WebUILocation[StringJoin["/", URLEncode[ path ] ], client, "Target"->_];
          ];
          Return[];
        ];
      ];

    ,

    With[{files = FileNames["*.wln", FileNameJoin[{AppExtensions`DemosDir, "Release notes"}] ]},
      With[{
          books = If[StringQ[settings["CurrentVersion"] ], 
            Select[files, Function[name, StringMatchQ[FileNameTake[name], version~~__] ] ]
          ,
            {Last[SortBy[files, FileDate] ]}
          ]
        },
        Echo[StringJoin["Checking release notes for ", version] ];
        Echo[books];
        If[Length[books] > 0,
          If[!Lookup[assoc, "IFrameQ", False],
            WebUILocation[StringJoin["/", URLEncode[books[[1]] ] ], client, "Target"->_]
          ];
        ];



      ];

      ClearAll[checkReleaseNotes];
    ]
  ] ] 
,
  (* check if Demos folder exists *)
  (* or not ... *)
  Echo["Demos >> nothing to do. Up to date"];
] ];


root = $InputFileName // DirectoryName;

syncDemoFolder := With[{},
  Echo["Syncing demo folders..."];

  If[Length[FileNames["*", AppExtensions`DemosDir] ] > 2,
    Echo["Not empty, backing up to \"Demos old\""];
    DeleteDirectory[FileNameJoin @ {ParentDirectory[AppExtensions`DemosDir], "Demos old"}, DeleteContents->True];
    CopyDirectory[AppExtensions`DemosDir, FileNameJoin @ {ParentDirectory[AppExtensions`DemosDir], "Demos old"}] // Echo;
    Echo["Removing an old one"];
    DeleteDirectory[AppExtensions`DemosDir, DeleteContents->True];
    Echo["Done!"];
  ];

  Echo["Purge the original Demos dir"];
  If[FailureQ[DeleteDirectory[AppExtensions`DemosDir, DeleteContents->True] && FileExistsQ[AppExtensions`DemosDir] ],
    Echo["File IO is blocked for some reason... Waiting"];
    Pause[10];
    DeleteDirectory[AppExtensions`DemosDir, DeleteContents->True];
    If[FailureQ[DeleteDirectory[AppExtensions`DemosDir, DeleteContents->True] && FileExistsQ[AppExtensions`DemosDir] ],
      Echo["File IO is blocked for some reason... it could be OneDrive or something"];
      Pause[10];
      If[FailureQ[DeleteDirectory[AppExtensions`DemosDir, DeleteContents->True] && FileExistsQ[AppExtensions`DemosDir] ],
        Echo["File IO is blocked for some reason... it could be OneDrive or something. Last try"];
        Pause[10];
        DeleteDirectory[AppExtensions`DemosDir, DeleteContents->True];
      ];
    ];
  ];

  Echo["Copying a new one to:"];
  Echo[AppExtensions`DemosDir];
  Echo["From: "]; Echo[FileNameJoin[{root, "Demos"}] ];
  If[FailureQ[CopyDirectory[FileNameJoin[{root, "Demos"}], AppExtensions`DemosDir] ],
    Echo["File IO is blocked for some reason... it could be OneDrive or something"];
    Pause[10];
    Echo["trying again"];
    CopyDirectory[FileNameJoin[{root, "Demos"}], AppExtensions`DemosDir] // Echo;
  ]; 
]


EventHandler[EventClone[AppExtensions`AppEvents], {
    "AfterUILoad" -> checkReleaseNotes
}];


End[]
EndPackage[]
