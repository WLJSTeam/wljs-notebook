BeginPackage["CoffeeLiqueur`Extensions`NotebookTemplates`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`",
    "CoffeeLiqueur`Extensions`CommandPalette`"
}]

Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

Begin["`Internal`"]

database = <||>;

$userLibraryPath = FileNameJoin[{AppExtensions`DefaultDocumentsDir, "User templates"}];
$libraryPath = FileNameJoin[{$InputFileName // DirectoryName, "Library"}]
$root = $InputFileName // DirectoryName

If[!FileExistsQ[ $userLibraryPath ], CreateDirectory[$userLibraryPath] ];

scan[filename_] := With[{name = FileBaseName[filename]},
    database[name] = filename
]

scan /@ Flatten[{FileNames["*.wln", $libraryPath, Infinity], FileNames["*.wln", $userLibraryPath, Infinity]}];

listener[OptionsPattern[] ] := 
With[{
    Controls = OptionValue["Controls"],
    Modals = OptionValue["Modals"],
    Path = If[DirectoryQ[#], #, DirectoryName[#] ] &@ OptionValue["Path"],
    Type = OptionValue["Type"]
},
    EventHandler[EventClone[Controls], {"new_from_template" -> Function[Null, 
        With[{
            promise = Promise[],
            cli = $CurrentWebSocket
        }, 
            EventFire[Modals, "SelectBox", <|"Promise"->promise, "title"->"Template", "message"->"Choose one below", "list"->Keys[database]|>];
            Echo["Promise SelectBox:"]; Echo[promise];

            Then[promise, Function[choise, Module[{},
                Echo["Choise:"]; Echo[choise];
                With[{
                    p = Promise[]
                },

                
                If[!MatchQ[choise, _Integer], Return[] ];

                EventFire[Modals, "SaveDialog", <|
                    "Promise"->p,
                    "title"->"Save notebook template",
                    "properties"->{"createDirectory", "dontAddToRecent"},
                    "filters"->{<|"extensions"->"wln", "name"->"WLJS Notebook"|>}
                |>];

               

                    Then[p, Function[result, 
                     Module[{filename = If[StringQ[result], URLDecode @ result, URLDecode @ result["filePath"] ] },
                       If[!StringQ[filename] || TrueQ[result["canceled"] ] || StringLength[filename] === 0, 
                         Echo["Cancelled saving"]; Echo[result];
                         Return[];
                       ]; 
                                    If[!StringMatchQ[filename, __~~".wln"], filename = filename<>".wln"];
                                    If[filename === ".wln", filename = name<>filename];
                                    If[DirectoryName[filename] === "", filename = FileNameJoin[{Path, filename}] ];

                                    With[{name = filename, template = Values[database][[choise ]]},
                                        CopyFile[template,  name];

                                        With[{dir = FileNameJoin[{template // DirectoryName, "attachments"}], targetDir =  FileNameJoin[{name // DirectoryName, "attachments"}]},
                                            If[FileExistsQ[dir],
                                                If[!FileExistsQ[targetDir ], CreateDirectory[ targetDir ] ] ;
                                                Map[Function[n, CopyFile[n, FileNameJoin[{targetDir, FileNameTake[n] }] ] ],  
                                                    FileNames["*.*", dir ]
                                                ];
                                            ]
                                        ];

                                        If[Type === "ExtendedApp", 
                                            WebUILocation[StringJoin["/folder/", URLEncode[name] ], cli, "Target"->_];
                                        ,
                                            WebUILocation[StringJoin["/", URLEncode[name] ], cli, "Target"->_];
                                        ];
                                    ]
                                ];
                            ], Function[result, Echo["!!!R!!"]; Echo[result] ] ];

                ]

            ] ]
        ]  ]       
    ]}];
    ""
]

Options[listener] = {"Path"->"", "Parameters"->"", "Modals"->"", "AppEvent"->"", "Controls"->"", "Messanger"->""}


AppExtensions`TemplateInjection["AppTopBar"] = listener;


SnippetsCreateItem[
    "newFileFromTemplate", 

    "Template"->ImportComponent[FileNameJoin[{$root,"Ico.wlx"}] ] , 
    "Title"->"New notebook from template"
];

(* just fwd *)
EventHandler[SnippetsEvents, {
    "newFileFromTemplate" -> Function[assoc, EventFire[assoc["Controls"], "new_from_template", True] ]
}];

End[]
EndPackage[]
