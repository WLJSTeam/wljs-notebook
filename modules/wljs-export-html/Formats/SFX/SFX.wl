BeginPackage["CoffeeLiqueur`Extensions`ExportImport`SFX`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`"
}];


extract;
embedArchive;
applyToNotebook;

Begin["`Private`"];

Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

folder = DirectoryName[$InputFileName];
fileListModal = ImportComponent[FileNameJoin[{folder, "Modal.wlx"}] ];

applyToNotebook[controls_, modals_, messager_, client_, notebookOnLine_nb`NotebookObj, path_, name_, ext_, _, _] := Module[{
    files, spinner
}, With[{

},

    With[{dir = If[DirectoryQ[#], #, DirectoryName[#] ]& @ notebookOnLine["Path"], notebook = FileNameTake[ notebookOnLine["Path"] ] },
        files = Select[FileNames["*", dir], Function[p, notebook =!= p] ]
    ];


    With[{
        p = Promise[]
    },
        EventFire[modals, "HTMLWindow", <|
            "Promise"->p,
            "Data" -> <|"Files" -> files|>,
            "Content" -> fileListModal,
            "Client"->client
        |>];

        Then[p, Function[result, 
            spinner = Notifications`Spinner["Topic"->"Collecting all files", "Body"->"Please, wait"];
            EventFire[messager, spinner, True];
            embedArchive[notebookOnLine, result];
            Delete[spinner];
            EventFire[messager, "Saved", "All data now is in the notebook"];
            ClearAll[files]; ClearAll[spinner];

        ], Function[Null,
            ClearAll[files]; ClearAll[spinner];
        ] ]
    ];

    (*embedArchive[notebookOnLine];
    Delete[spinner];

    EventFire[messager, "Saved", "All data now is in the notebook"];*)
] ]

MergeDirectories[source_String, target_String] := (
  Echo[StringTemplate["Copy directory `` to ``"][source, target]];
  If[!DirectoryQ[target], CreateDirectory[target]; ];
  
  With[{names = FileNames[All, source]},
    With[{folders = Select[names, DirectoryQ[#] &], files = Select[names, !DirectoryQ[#] &]},

    
      Map[Function[folder,
        With[{folderName = FileNameTake[folder, -1] },
          MergeDirectories[folder, FileNameJoin[{target, folderName}]]
        ]], folders];

      Map[Function[file,
        CopyFile[file, FileNameJoin[{target, FileNameTake[file, -1]}], OverwriteTarget->True];
        Echo[StringTemplate["Copied `` to ``"][file, FileNameJoin[{target, FileNameTake[file, -1]}]]];
      ], files];
    ]
  ];
);

extract[n_nb`NotebookObj] := If[MemberQ[n["Properties"], "ZIPArchive"] && Length[ n["ZIPArchive"] ] > 0, With[{blob = n["ZIPArchive"]["Main"], dir = If[DirectoryQ[#], #, DirectoryName[#] ]& @ n["Path"]},
    n["ZIPArchive"] = <||>;
    With[{arvx = FileNameJoin[{dir, "_wljs_arxv.zip"}]},
        BinaryWrite[arvx, BaseDecode[blob] ] // Close;
        CreateDirectory[FileNameJoin @ {dir, "__extracted"}];
        ExtractArchive[arvx, FileNameJoin @ {dir, "__extracted"}, "OverwriteTarget"->True];
        DeleteFile[arvx];

        With[{src = FileNames["*", FileNameJoin @ {dir, "__extracted"}] // First},
            MergeDirectories[src, dir];
        ];

        DeleteDirectory[FileNameJoin @ {dir, "__extracted"}, DeleteContents -> True];
    ]
    
] ]

embedArchive[n_nb`NotebookObj, files_List] := With[{
    dir = If[DirectoryQ[#], #, DirectoryName[#] ]& @ n["Path"]
},
    With[{
        intermediate = CreateDirectory[FileNameJoin @ {$TemporaryDirectory, "__selected_"<>(Internal`NoWR`RandomWord[])}]
    },
        If[FailureQ[intermediate],
            Echo["Failed to copy project files!!!"];
            Return[$Failed];
        ];

        Map[If[DirectoryQ[#],
            CopyDirectory[#, FileNameJoin[{intermediate, FileNameTake[#] }] ];
            Echo["Copying dir"<>#<>" >> "<>FileNameJoin[{intermediate, FileNameTake[#] }] ];
        ,
            CopyFile[#, FileNameJoin[{intermediate, FileNameTake[#] }] ];
            Echo["Copying file"<>#<>" >> "<>FileNameJoin[{intermediate, FileNameTake[#] }] ];
        ]&, files];

        With[{p = CreateArchive[intermediate, $TemporaryDirectory, "OverwriteTarget"->True]},
            DeleteDirectory[intermediate, DeleteContents -> True];

            With[{encoded = ReadByteArray[p] // BaseEncode},
                DeleteFile[p];

                n["ZIPArchive"] = <|"Default"->encoded|>;
                n["ObjectFields"] = Join[n["ObjectFields"], {"ZIPArchive"}] // DeleteDuplicates;
            ]
        ]
    ]
]

End[]
EndPackage[]