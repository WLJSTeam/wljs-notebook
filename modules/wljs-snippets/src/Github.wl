BeginPackage["CoffeeLiqueur`Extensions`CommandPalette`Github`", {
    "CoffeeLiqueur`Notebook`Transactions`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`Misc`Parallel`",
    "CoffeeLiqueur`Misc`Language`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`WLJS`",
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`",     
    "CoffeeLiqueur`Extensions`CommandPalette`",
    "CoffeeLiqueur`Extensions`EditorViewMinimal`",
    "CoffeeLiqueur`LPM`"
}]

Needs["CoffeeLiqueur`ExtensionManager`" -> "WLJSPackages`"];
Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Begin["`Private`"]

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"];
Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];


$rootDir =  ParentDirectory[ DirectoryName[$InputFileName] ];

getNotebook[assoc_Association] := With[{result = EventFire[assoc["Controls"], "NotebookQ", True] /. {{___, n_nb`NotebookObj, ___} :> n}},
    Print[result];
    Echo["Getting notebook"];
    If[MatchQ[result, _nb`NotebookObj],
            Echo["Got"];
            Echo[result];
            result
    ,
            Echo["rejected"];
            EventFire[assoc["Messanger"], "Warning", "There is no opened notebook" ];
            $Failed
    ]
]

printCell[assoc_, content_String] := With[{
    new = cell`CellObj["Notebook"->assoc["Notebook"], "Type"->"Input", "Data"->content]
},
    new
];



handle[data_Association] := Module[{spinner, promise}, With[{
    
},
    Echo["Install package"];
  
    With[{assoc = Join[data, <|"Notebook" -> getNotebook[data]|> ]},
        If[FailureQ[assoc["Notebook"] ], Return[Null, Module] ];

        spinner = Notifications`Spinner["Topic"->"Installation", "Body"->"Please, wait"];
        EventFire[assoc["Messanger"], spinner, True];

        With[{url = StringTrim[ assoc["Promt"] ], dir = DirectoryName[assoc["Notebook"]["Path"] ]},
            With[{
                oldPaclets = <|"Paclet"->Import[#, "WL"], "Dir"->DirectoryName[#]|> &/@ (DeleteDuplicatesBy[FileNames["PacletInfo.wl" | "PacletInfo.m", {#}, {2}], DirectoryName]& @ FileNameJoin[{dir, "wl_packages"}]),
                client = assoc["Client"],
                uid = CreateUUID[]
            },


                promise = Promise[];
                
                MicrotaskSubmit[ 
                    Module[{},
                        With[{e=EvaluationData[LPMRepositories[{
                            If[StringMatchQ[url, __~~".paclet"],
                                url
                            ,
                                "Github" -> url -> "master"
                            ]
                        }, "Directory"->dir, "PreserveConfiguration"->True, "Deffered"->True] ]},
                                Echo["Done!!!"];
                                EventFire[promise, Resolve, e];
                        ];
                    ];               
                ];

                Then[promise, Function[result, Module[{},
                    Echo["Installer Resolved!"];

                    If[FailureQ[result["Result"] ],
                        Block[{Global`$Client = client}, EventFire[spinner["Promise"], Resolve, Null] ];
                        Block[{Global`$Client = client}, EventFire[assoc["Messanger"], "Error", StringRiffle[result["MessagesText"] ] ] ];
                        Return[Null, Module];
                    ];

                    With[{newPaclets = Complement[<|"Paclet"->Import[#, "WL"], "Dir"->DirectoryName[#]|> &/@ (DeleteDuplicatesBy[FileNames["PacletInfo.wl" | "PacletInfo.m", {#}, {2}], DirectoryName]& @ FileNameJoin[{dir, "wl_packages"}]), oldPaclets]},
                            Block[{Global`$Client = client}, EventFire[spinner["Promise"], Resolve, Null] ];

                            If[Length[newPaclets] == 0, 
                                Block[{Global`$Client = client}, EventFire[assoc["Messanger"], "Warning", "Already installed" ] ];
                                Return[Null, Module];
                            ];

                            Module[{paclet = newPaclets[[1]]["Paclet"], dir = newPaclets[[1]]["Dir"]},

                                If[MatchQ[paclet, _PacletObject],
                                    Block[{Global`$Client = client}, EventFire[assoc["Messanger"], "Info", "Installation was succesfull" ] ];
                                    printCell[assoc, StringTemplate["PacletDirectoryLoad[FileNameJoin[{\"wl_packages\", \"``\"}]];\n\n``"][
                                        FileNameSplit[dir][[-1]],
                                        Echo["New paclet: "];
                                        Echo[paclet];
                                        If[KeyExistsQ[paclet[[1]], "PrimaryContext"], "<<"<>newPaclets[[1]][[1]]["PrimaryContext"], ""]
                                    ] ]
                                ,
                                    Block[{Global`$Client = client}, EventFire[assoc["Messanger"], "Error", "Installation was not succesfull" ] ];
                                ]
                            ]
                        ]
                    ] ]
                ];
            ]
        ];
    ];

] ]

EventHandler[SnippetsEvents, {"InstallPackage" -> handle}];

End[]
EndPackage[]