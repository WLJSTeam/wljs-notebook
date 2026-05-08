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
        Echo[StringJoin["Checking release notes for ", version] ];
        Echo[books];
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
  Echo["Syncing demo folders..."];

  If[Length[FileNames["*", AppExtensions`DemosDir] ] > 4,
    Echo["Not empty, backing up to \"Demos old\""];
    DeleteDirectory[FileNameJoin @ {ParentDirectory[AppExtensions`DemosDir], "Demos old"}, DeleteContents->True];
    CopyDirectory[AppExtensions`DemosDir, FileNameJoin @ {ParentDirectory[AppExtensions`DemosDir], "Demos old"}] // Echo;
    Echo["Removing an old one"];
    DeleteDirectory[AppExtensions`DemosDir, DeleteContents->True];
    Echo["Done!"];
  ];

  Echo["Purge the original Demos dir"];
  If[FileExistsQ[AppExtensions`DemosDir],
    Echo["File IO is blocked for some reason... Waiting"];
    Pause[10];
    DeleteDirectory[AppExtensions`DemosDir, DeleteContents->True];
    If[FileExistsQ[AppExtensions`DemosDir] ,
      Echo["File IO is blocked for some reason... it could be OneDrive or something"];
      Pause[10];
      DeleteDirectory[AppExtensions`DemosDir, DeleteContents->True];
      If[FileExistsQ[AppExtensions`DemosDir] ,
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
    Echo["trying again (1 trial)"];
    DeleteDirectory[AppExtensions`DemosDir, DeleteContents->True];
    CopyDirectory[FileNameJoin[{root, "Demos"}], AppExtensions`DemosDir] // Echo;
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
