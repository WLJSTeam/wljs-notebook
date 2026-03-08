BeginPackage["CoffeeLiqueur`Notebook`Loader`", {
    "CoffeeLiqueur`Misc`Events`", 
    "CoffeeLiqueur`Misc`Events`Promise`", 
    "CoffeeLiqueur`WLX`WebUI`"
}];

    Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
    Needs["CoffeeLiqueur`Notebook`" -> "nb`"];
    Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];
    
    Begin["`Internal`"];

    scache = <||>;

    cache[key_] := scache[ ToLowerCase[key] ];

    cache /: Set[cache[key_], val_] := With[{l = ToLowerCase[key]},
        scache[l] = val
    ];
    cache /: Unset[cache[key_] ] := With[{l = ToLowerCase[key]},
        scache[l] = .
    ];
    cache /: KeyExistsQ[cache, key_] := With[{l = ToLowerCase[key]},
        KeyExistsQ[scache, l]
    ];

    rename[old_String, new_String] := With[{notebook = cache[old]},
        cache[new] = notebook;
        notebook["Path"] = new;
        cache[old] = .;
        Echo["Loader >> renamed."];
    ];

    rename[notebook_nb`NotebookObj, new_String] := With[{path = notebook["Path"]},
        cache[path] = .;
        notebook["Path"] = new;
        cache[new] = notebook;
        Echo["Loader >> renamed."];
    ];    

    clone[notebook_nb`NotebookObj, newPath_String, opts: OptionsPattern[] ] := With[{oldPath = notebook["Path"]},
        cache[oldPath] = .;
        cache[newPath] = notebook;
        notebook["Path"] = newPath;
        save[notebook, opts]
    ];
    
    save[path_String, notebook_nb`NotebookObj, opts: OptionsPattern[] ] := With[{modals = OptionValue["Modals"], promise = Promise[], client = OptionValue["Client"]}, Module[{dir = path},
        If[DirectoryQ[dir],
            dir = FileNameJoin[{dir, RandomWord[]<>".wln"}];
        ];

        If[!TrueQ[OptionValue["NoCache"] ],
            cache[dir] = notebook;
        ];
        
        notebook["Path"] = dir;

        If[OptionValue["Props"] =!= Null,
            Map[(notebook[#] = OptionValue["Props"][#]) &, Keys[OptionValue["Props"] ] ];
        ];

        EventFire[OptionValue["Events"], "Loader:NewNotebook", notebook];

        Print["filepath:"]
        Print[dir];
        Print["end"];

        If[OptionValue["Temporal"],
            With[{r = Put[<| 
                "Notebook" -> nb`Serialize[notebook], 
                "Cells" -> ( cell`Serialize /@ notebook["Cells"]), 
                "serializer" -> "jsfn4" 
            |>, makeHashPath[dir] ]},
                If[!StringQ[r] && (r =!= Null), Echo["Loader >> Put >> error"]; Echo[r]; EventFire[promise, Reject, r],
                    EventFire[promise, Resolve, notebook];
                ];
            ];

            
        ,
            With[{h = checkbackups[notebook]}, If[h =!= False, moveBackupSomewhere[h] ] ];

            saveByPath := (
                With[{r = Put[<| 
                    "Notebook" -> nb`Serialize[notebook], 
                    "Cells" -> ( cell`Serialize /@ notebook["Cells"]), 
                    "serializer" -> "jsfn4" 
                |>, dir] },
                    If[!StringQ[r] && (r =!= Null), Echo["Loader >> Put >> error"]; Echo[r]; EventFire[promise, Reject, r],
                        EventFire[promise, Resolve, notebook];
                    ];
                ];
                
            );

            saveByPath; 
        ];

        

        promise
    ] ];

    checkbackups[notebook_nb`NotebookObj] := notebook["Path"] // checkbackups
    checkbackups[p_String] := With[{
        path = makeHashPath[p]
    },
        If[FileExistsQ[path], path, False]
    ];

    moveBackupSomewhere[file_] := With[{
        dir = FileNameJoin[{AppExtensions`BackupsDir, "overwritten"}]
    },
        If[!FileExistsQ[dir], CreateDirectory[dir] ];
        With[{target = FileNameJoin[{dir, FileNameTake[file]} ]},
            Echo["Moving backup to "<>target ];
            CopyFile[file, target, OverwriteTarget->True ];
        ];

        DeleteFile[file];
    ];

    makeHashPath[path_String, secret_String:""] := FileNameJoin[{AppExtensions`BackupsDir, StringTemplate["``.wln"][{path, secret} // Hash]}]

    save[notebook_nb`NotebookObj, opts: OptionsPattern[] ] := With[{},
        If[ StringQ[notebook["Path"] ],
            save[notebook["Path"], notebook, opts]
        ,
            Echo["Loader >> Provide PATH!"];
            $Failed["PATH is not provided"]
        ]
    ];

    save[path_String, opts: OptionsPattern[] ] := With[{notebook = nb`NotebookObj[]},
        Echo["Loader >> Created new notebook"];
        

        cell`CellObj["Notebook" -> notebook, "Data" -> ""];
        save[path, notebook, opts]
    ];

    load[path_String, opts: OptionsPattern[] ] := Module[{},
        If[!FileExistsQ[path], 
            Echo["Loader >> file noex!!!"]; 
            Echo[path];
            Return[$Failed["File does not exists"] ] 
        ];
        If[KeyExistsQ[cache, path], 
            Echo["Loader >> cached >> restoring"];
            If[TrueQ[ cache[path]["Opened"] ],
                EventFire[OptionValue["Events"], "Loader:Error", "Notebook was already opened!"];
                While[TrueQ[ cache[path]["Opened"] ],
                    (* wow such a hack... we have to rely on sockets in order to detect if window was closed... *)
                    EventFire[OptionValue["Events"], "Loader:Error", "Closing previous connection..."];
                    EventFire[cache[path]["Socket"], "Closed", True];
                    WebUIClose[cache[path]["Socket"] ];
                    EventRemove[ cache[path]["Socket"] ];
                ];
                
            ];

            Return[ cache[path] ];
        ];

        Echo["Loader >> loading..."];

        With[{h = checkbackups[path]}, 
            If[h =!= False, 
                If[FileDate[h, "Modification"] > FileDate[path, 	"Modification"],
                    Echo["Loader >> found a backup copy!"];
                    With[{requestPromise = Promise[]},
                        Then[requestPromise, Function[result,
                            If[TrueQ[result] || result["response"] === 0,
                                EventRemove[request];
                                loadToCache[h, path, path, opts];
                                WebUILocation[URLEncode[path] , Global`$Client ];                            
                            ,
                                EventRemove[request];
                                loadToCache[path, path, path, opts];
                                WebUILocation[URLEncode[path] , Global`$Client ];                            
                            ]
                        ] ];

                        With[{
                            date = TextString[Round[ Now - FileDate[h, "Modification"] ] ]
                        },
                        
                        
                            Return[<|
                                "Type" -> "MessageBox", "Promise" -> requestPromise, "type" -> "question",
                                "title" -> "Restore backup",
                                "message" -> "We found an autosaved notebook "<>date<>" ago",
                                "buttons" -> {"Restore", "Use file"},
                                "cancelId" -> 1,
                                "Client" -> Null (* to prevent from adding *)
                            |>]
                        ];
                    ];
                ,
                    Echo["Temporal copy is outdated... removing"];
                    DeleteFile[h];
                ];
            ];
        ];


        loadToCache[path, path, path, opts]


    ];

    Options[load] = {"Events"->"Blackhole"}
    Options[save] = {"Events"->"Blackhole", "NoCache"->False, "Temporal"->False, "Modals"->"Nulll", "Props"->Null}
    Options[loadToCache] = {"Events"->"Blackhole", "Temporal"->False, "Modals"->"Nulll"}

    loadToCache[path_String, pathcache_String, pathnotebook_String, OptionsPattern[] ] := Module[{data = Get[path]},
        Echo["Loading to cache..."];
        
        With[{notebook = nb`Deserialize[ data ]},
            If[!MatchQ[notebook, _nb`NotebookObj], Return[notebook] ];

            
            notebook["Path"] = pathnotebook;
            cache[pathcache] = notebook;

            Echo["Loader >> Done!"];
            EventFire[OptionValue["Events"], "Loader:LoadNotebook", notebook];

            notebook
        ]    
    ]

    End[];
    
EndPackage[];

{CoffeeLiqueur`Notebook`Loader`Internal`save, CoffeeLiqueur`Notebook`Loader`Internal`load, CoffeeLiqueur`Notebook`Loader`Internal`rename, CoffeeLiqueur`Notebook`Loader`Internal`clone}