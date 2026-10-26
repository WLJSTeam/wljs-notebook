BeginPackage["CoffeeLiqueur`Extensions`DemosArchive`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`WLX`WebUI`"
}];

Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

Begin["`Internal`"]

firstLaunch = False;
updatedQ = False;

checkReleaseNotes[assoc_] := Module[{client = assoc["Client"], env = AppExtensions`FrontendEnv},  
  ClearAll[checkReleaseNotes];

  With[{version = env["AppJSON", "version"]},
    If[firstLaunch,
      With[{path = FileNameJoin[{AppExtensions`DemosDir, "Welcome.wln"}]},
        If[FileExistsQ[path],
          If[!Lookup[assoc, "IFrameQ", False],
            WebUILocation[StringJoin["/", URLEncode[ path ] ], client, "Target"->_];
          ];
          Return[];
        ];
      ];

    ,

    If[updatedQ, With[{files = FileNames["*.wln", FileNameJoin[{AppExtensions`DemosDir, "Release notes"}] ]},
      With[{
          books = If[StringQ[ version ], 
            Select[files, Function[name, StringMatchQ[FileNameTake[name], version~~__] ] ]
          ,
            {}
          ]
        },
        Echo[StringJoin["[wljs-demos-archive/Frontend] Checking release notes for version ", version]];
        Echo[books, "[wljs-demos-archive/Frontend] notebook library: "];
        If[Length[books] > 0,
          If[!Lookup[assoc, "IFrameQ", False],
            WebUILocation[StringJoin["/", URLEncode[books[[1]] ] ], client, "Target"->_]
          ];
        ];



      ];
    ] ];
  ] ] ];


root = $InputFileName // DirectoryName;

syncDemoFolder := With[{},
  Echo["[wljs-demos-archive/Frontend] Syncing demo folders."];

  If[Length[FileNames["*", AppExtensions`DemosDir] ] > 4,
    Echo["[wljs-demos-archive/Frontend] Demo directory is not empty; backing it up to \"Demos old\"."];
    DeleteDirectory[FileNameJoin @ {ParentDirectory[AppExtensions`DemosDir], "Demos old"}, DeleteContents->True];
    Echo[CopyDirectory[AppExtensions`DemosDir, FileNameJoin @ {ParentDirectory[AppExtensions`DemosDir], "Demos old"}], "[wljs-demos-archive/Frontend] Demo backup path: "];
    Echo["[wljs-demos-archive/Frontend] Removing an old one"];
    DeleteDirectory[AppExtensions`DemosDir, DeleteContents->True];
    Echo["[wljs-demos-archive/Frontend] Processing completed."];
  ];

  Echo["[wljs-demos-archive/Frontend] Purge the original Demos dir"];
  If[FileExistsQ[AppExtensions`DemosDir],
    Echo["[wljs-demos-archive/Frontend] File I/O is blocked; waiting before retrying."];
    Pause[10];
    DeleteDirectory[AppExtensions`DemosDir, DeleteContents->True];
    If[FileExistsQ[AppExtensions`DemosDir] ,
      Echo["[wljs-demos-archive/Frontend] File I/O is blocked; the file may be locked by a synchronization service."];
      Pause[10];
      DeleteDirectory[AppExtensions`DemosDir, DeleteContents->True];
      If[FileExistsQ[AppExtensions`DemosDir] ,
        Echo["[wljs-demos-archive/Frontend] File I/O is still blocked; making the final retry."];
        Pause[10];
        DeleteDirectory[AppExtensions`DemosDir, DeleteContents->True];
      ];
    ];
  ];

  Echo["[wljs-demos-archive/Frontend] Copying a new one to:"];
  Echo[AppExtensions`DemosDir, "[wljs-demos-archive/Frontend] app extensions demos dir: "];
  Echo[FileNameJoin[{root, "Demos"}], "[wljs-demos-archive/Frontend] Source demo directory: "];
  If[FailureQ[CopyDirectory[FileNameJoin[{root, "Demos"}], AppExtensions`DemosDir] ],
    Echo["[wljs-demos-archive/Frontend] File I/O is blocked; the file may be locked by a synchronization service."];
    Pause[10];
    Echo["[wljs-demos-archive/Frontend] trying again (1 trial)"];
    DeleteDirectory[AppExtensions`DemosDir, DeleteContents->True];
    Echo[CopyDirectory[FileNameJoin[{root, "Demos"}], AppExtensions`DemosDir], "[wljs-demos-archive/Frontend] Synchronized demo directory: "];
  ]; 
];


Needs["CoffeeLiqueur`Notebook`SettingsUtils`"->"settings`", FileNameJoin[{"Frontend", "Settings.wl"}] ];

settings = <||>;
settings`initialize[settings];

If[settings["FirstLaunch"] =!= False,
  firstLaunch = True;
  settings["FirstLaunch"] = False;
];

If[
  AppExtensions`FrontendEnv["AppJSON", "version"] =!= settings["CurrentVersion"],
  syncDemoFolder;
  updatedQ = True;
  settings["CurrentVersion"] = AppExtensions`FrontendEnv["AppJSON", "version"];
  settings`storeConfiguration[settings];
];


EventHandler[EventClone[AppExtensions`AppEvents], {
    "AfterUILoad" -> checkReleaseNotes
}];


End[]
EndPackage[]
