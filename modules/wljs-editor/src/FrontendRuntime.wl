
BeginPackage["CoffeeLiqueur`Extensions`RuntimeTools`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CoffeeLiqueur`Extensions`Editor`",
    "CoffeeLiqueur`WLX`WebUI`"  
}]


Begin["`Private`"]

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

frontEndRuntime = <||>;
routes = <||>;

fired = False;
cacheFile = FileNameJoin[{AppExtensions`AppDataDir, "runtime_cache.wl"}];
cacheRoutesFile = FileNameJoin[{AppExtensions`AppDataDir, "routes_cache.wl"}];

If[FileExistsQ[cacheFile], 
    Echo["FrontendRuntime >> restoring cached 3rd party assets"];
    frontEndRuntime = Get[cacheFile];    
];

loadOnce;
If[FileExistsQ[cacheRoutesFile], 
    Echo["FrontendRuntime >> restoring cached 3rd party routes"];
    routes = Get[cacheRoutesFile];    
    loadOnce := (
        loadOnce = Null;
        EventFire[AppExtensions`AppEvents, "App:ExtendRoute", routes ];
    );
];

cacheRuntime := (
    Echo["FrontendRuntime >> backing up cached 3rd party assets"];
    Put[frontEndRuntime, cacheFile ];
);

cacheRoutes := (
    Echo["FrontendRuntime >> backing up cached 3rd party routes"];
    Put[routes, cacheRoutesFile ];
);

setTimer := If[!fired,
    fired = True;
    SetTimeout[
        cacheRuntime;
        cacheRoutes;
        fired = False;    
    , Quantity[10, "Seconds"] ];
];

getAssets[key_, frontEndRuntime_, "Bundles"] := Flatten[With[{
    modules = KeySelect[frontEndRuntime, MatchQ[#, {"Modules", key, ___}]& ],
    bundles = KeySelect[frontEndRuntime, MatchQ[#, {"Bundles", key, ___}]& ]
},

    With[{keyA = Key @ Join[{"Modules"}, #], keyB = Key @ Join[{"Bundles"}, # ] },
        If[!MissingQ[keyB[frontEndRuntime] ], 
            keyB[frontEndRuntime],
            keyA[frontEndRuntime]
        ]
    ] &/@ DeleteDuplicates[
        Join[Keys[modules], Keys[bundles] ][[All, 2;;]]
    ]
] ] 

getAssets[key_, frontEndRuntime_, "Modules"] := Flatten[With[{
    modules = KeySelect[frontEndRuntime, MatchQ[#, {"Modules", key, ___}]& ],
    bundles = KeySelect[frontEndRuntime, MatchQ[#, {"Bundles", key, ___}]& ]
},

    With[{keyA = Key @ Join[{"Modules"}, #], keyB = Key @ Join[{"Bundles"}, # ] },
        If[!MissingQ[keyA[frontEndRuntime] ], 
            keyA[frontEndRuntime],
            keyB[frontEndRuntime]
        ]
    ] &/@ DeleteDuplicates[
        Join[Keys[modules], Keys[bundles] ][[All, 2;;]]
    ]
] ] 

checkHealth := With[{modules = KeySelect[frontEndRuntime, MatchQ[#, {"Modules", __}]& ]},

    With[{broken = Select[Keys[modules], Function[key,
        !With[{files = Flatten[{modules[key]}]}, If[Length[files]>0, And @@ (If[!StringQ[#], FileExistsQ[ FileNameJoin[ #["Path"] ] ], True ] &/@ files), True] ]
    ] ]},
        If[Length[broken] > 0,
            Echo["FrontendRuntime >> found broken modules!"];
            Echo /@ broken;
            frontEndRuntime = KeyDrop[frontEndRuntime, broken];
            Echo["FrontendRuntime >> rebuilding..."];
            rebuild; 
            setTimer;       
        ];
    ];


];

buildString[frontEndRuntime_, type_:"Modules"] := {
        StringRiffle[If[StringQ[#], 
            StringJoin["<script type=\"module\">", #, "</script>"],
            If[type==="Bundles",
                StringJoin["<script type=\"module\">", Import[FileNameJoin[ #["Path"] ], "Text"], "</script>"]
            ,
                StringJoin["<script type=\"module\" src=\"/", #["URL"],"\">", "</script>"]
            ]
        ] &/@  getAssets["Javascript", frontEndRuntime, type] ],

        StringRiffle[If[StringQ[#],
            StringJoin["<style>", #, "</style>"],
            If[type==="Bundles",
                StringJoin["<style>", Import[FileNameJoin[ #["Path"] ], "Text"], "</style>"]
            ,
                StringJoin["<link rel=\"stylesheet\" type=\"text/css\" href=\"/", #["URL"], "\"/>"]
            ]
        ] &/@ getAssets["CSS", frontEndRuntime, type] ]
       
} // StringRiffle;

buildBundleString[frontEndRuntime_] := buildString[frontEndRuntime, "Bundles"]

rebuild := (
    compiledString = buildString[frontEndRuntime];
);

rebuild;

component[__] := compiledString

AppExtensions`TemplateInjection["AppHead"] = component

UIHeadInject;

injectInRuntime[key_, data_] := With[{notebooks = Select[Values[nb`HashMap], (Complement[{"Opened", "Path", "Hash"}, #["Properties"] ] === {}) &]},
    WebUISubmit[ UIHeadInject[key, data ], #["Socket"] ] &/@ notebooks;
]


EventHandler[NotebookEditorChannel // EventClone,
    {
        "RequestRuntimeExtensions" -> Function[assoc,
            With[{result = frontEndRuntime, kernel = GenericKernel`HashMap[assoc["Kernel"] ], promise = assoc["Promise"]},
                 GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, result] ];
            ]
        ],

        "UpdateRuntimeExtensions" -> Function[assoc,
            With[{promise = assoc["Promise"], assets = assoc["Data"], kernel = GenericKernel`HashMap[assoc["Kernel"] ], key = assoc["Key"]},

                With[{
                    new = Complement[Keys[assets][[All, 2;;]], Keys[frontEndRuntime][[All, 2;;]] ] // DeleteDuplicates
                },
                    Echo["FrontEndRuntime >> Loaded live >> Will be injected now:"];
                    Echo[new];

                    KeyValueMap[injectInRuntime, KeySelect[assets, Function[key, key[[1]] =!= "Bundles" && MemberQ[new, key[[2;;]]] ] ] ];
                ];

                frontEndRuntime = Join[frontEndRuntime, assets];

                rebuild;
                GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, True] ];

                setTimer;
            ]
        ],

        "GetRuntimeAssets" -> buildString,
        "GetRuntimeAssetsTextNames" -> (Flatten[{(If[Length[#]>2, StringRiffle[Flatten[{Drop[#,2]}],"/"], Nothing]&/@Keys[frontEndRuntime])}]&),
        "GetRuntimeAssetsBundle" -> buildBundleString,
        "RestoreRuntimeAssets" -> Function[assets, 
            frontEndRuntime = Join[frontEndRuntime, assets];
            rebuild;
        ],

        "ClearRuntimeAssets" -> Function[Null, routes=<||>; frontEndRuntime = <||>; rebuild; cacheRuntime;],
        "ClearNotebooksRuntimeAssets" -> Function[Null, 
            Map[
                Function[notebook, 
                    If[TrueQ[notebook["Opened"] ], 
                        Echo["FrontendRuntime >> clear notebook "<>notebook["Hash"] ];
                        notebook["RuntimeCache"] = .;
                    ]; 
                ], 
                Select[Values[nb`HashMap], (Complement[{"Opened", "Path", "Hash"}, #["Properties"] ] === {}) &]
            ];        
        ],
        "PutRuntimeAssets" -> Function[candidate, 
            Map[
                Function[notebook, 
                    If[TrueQ[notebook["Opened"] ], 
                        Echo["FrontendRuntime >> storing to notebook "<>notebook["Hash"] ];

                        (* prioritize bundles over modules, so it is easier to other people to import *)
                        notebook["RuntimeCache"] = Association[With[{keyA = Key @ Join[{"Modules"}, #], keyB = Key @ Join[{"Bundles"}, # ] },
                                                        If[!MissingQ[keyB[frontEndRuntime] ], 
                                                            Join[{"Bundles"}, # ] -> keyB[frontEndRuntime],
                                                            Join[{"Modules"}, #] -> keyA[frontEndRuntime]
                                                        ]
                                                    ] &/@ DeleteDuplicates[Keys[frontEndRuntime][[All,2;;]]] ];
                                                    
                        notebook["ObjectFields"] = Join[notebook["ObjectFields"], {"RuntimeCache"}] // DeleteDuplicates;
                    ]; 
                ], 
                If[MatchQ[candidate, _nb`NotebookObj], {candidate}, Select[Values[nb`HashMap], (Complement[{"Opened", "Path", "Hash"}, #["Properties"] ] === {}) &] ]
            ];
        ],

        "UpdateRuntimeHTTPPaths" -> Function[assoc,
            With[{kernel = GenericKernel`HashMap[assoc["Kernel"] ], promise = assoc["Promise"]},
                 Echo["Runtime >> added to HTTP path >> "<>ToString[assoc["Path"] ] ];
                 EventFire[AppExtensions`AppEvents, "App:ExtendPath", assoc["Path"] ];
                 GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, True] ];
            ]        
        ],

        "UpdateRuntimeHTTPRoutes" -> Function[assoc,
            With[{kernel = GenericKernel`HashMap[assoc["Kernel"] ], promise = assoc["Promise"]},
                 Echo["Runtime >> added to HTTP route >> "<>ToString[assoc["Route"] ] ];
                 routes = Join[routes, assoc["Route"] ]; (* duplicate to save for later *)

                 EventFire[AppExtensions`AppEvents, "App:ExtendRoute", assoc["Route"] ];
                 GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, True] ];
            ]        
        ]
        
    }
]

EventHandler[AppExtensions`AppEvents// EventClone, {
    "Loader:NewNotebook" ->  (Once[ attachListeners[#] ] &),
    "Loader:LoadNotebook" -> (Once[ attachListeners[#] ] &)
}];

attachListeners[notebook_nb`NotebookObj] := With[{},
    Echo["Attach event listeners to notebook from EXTENSION"];
    loadOnce;
    
    EventHandler[notebook // EventClone, {
        "OnBeforeLoad" -> Function[opts,
            If[MemberQ[notebook["Properties"], "RuntimeCache"],
                Echo["FrontendRuntime >> restored from the notebook"];
                
                With[{new = KeySelect[notebook["RuntimeCache"], Function[keyB,
                        With[{o = Key[Join[{"Modules"}, keyB[[2;;]]] ]},
                            MissingQ[o[frontEndRuntime] ]
                        ]
                    ] ] },

                    Echo["FrontendRuntime >> new, which were not installed: "];
                    Echo[new // Keys];
                    Echo["Inject them live"];
                    KeyValueMap[injectInRuntime, new ];
                ];
            ];
        ]
    }]
];

SetInterval[checkHealth, 30000];




End[]
EndPackage[]