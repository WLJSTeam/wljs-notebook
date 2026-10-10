BeginPackage["CoffeeLiqueur`Extensions`FrontendObject`Sync`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`", 
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`", 
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CoffeeLiqueur`Misc`Language`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`Extensions`Editor`"
}]

Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];

Begin["`Private`"]

rootDir = $InputFileName // DirectoryName // ParentDirectory;

EventHandler[NotebookEditorChannel // EventClone, {
    "FetchFrontEndObject" -> Function[data,
           Echo["Sync >> requested from master kernel"];
           With[{promise = data["Promise"],  kernel = GenericKernel`HashMap[ data["Kernel"] ]}, 
                (* [FIXME] Include these symbols normally using Needs[] *)
                (* we release any possible deferred compression wrappers *)
                With[{result = CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects[data["UId"] ]["Public"]},
                    With[{c =  CoffeeLiqueur`Extensions`FrontendObject`Internal`releaseCompression[result]},
                        GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, c ] ];
                    ];
                ];
           ];       
    ]
}];

fetchFromKernel[keys_, kernel_, test_, default_, function_] := With[{promise = Promise[], prePromise = Promise[]}, {
    watchdog = SetTimeout[
            Echo["Kernel fetch request timed out!"];
            EventFire[promise, Resolve, default], 
        1000 45]
}, 
    Then[prePromise, Function[results,
        TaskRemove[watchdog];
        EventFire[promise, Resolve, If[test[results], results, default]];
    ]];
    
    GenericKernel`SendAsync[kernel, 
        EventFire[
            Internal`Kernel`RemoteEvent[prePromise // First], 
            Resolve, 
            function[keys]
        ] 
    ];

    promise
]; 

WLJSTransportHandler["GetSymbol"] = Function[{expr, client, callback},
              Print["evaluating cached symbol"];
              With[{name = StringDrop[StringDrop[ToString[expr], StringLength["Hold["] ], -1]},
                If[KeyExistsQ[CoffeeLiqueur`Extensions`FrontendObject`Internal`Symbols, name],
                    Print[name];
                    callback[CoffeeLiqueur`Extensions`FrontendObject`Internal`Symbols[name] ]
                ,
                    callback[$Failed]
                ]
              ]
          ];

EventHandler[AppExtensions`AppEvents// EventClone, {
    "Loader:NewNotebook" ->  (Once[ attachListeners[#] ] &),
    "Loader:LoadNotebook" -> (Once[ attachListeners[#] ] &)
}];

filterEmptyOrFailed[keys_, values_] := With[{t = {keys, values} // Transpose},
    Select[t, Function[val, !FailureQ[val[[2]]] && val[[2]] =!= False ] ] // Transpose
]

(* Good enough*)

attachListeners[notebook_nb`NotebookObj] := With[{},
    Echo["Attach event listeners to notebook from EXTENSION"];
    EventHandler[notebook // EventClone, {
        "OnBeforeLoad" -> Function[opts,
            If[MemberQ[notebook["Properties"], "Objects"],
                Echo["FrontendObject`Sync >> restored!"];
                CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects = Join[CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects, notebook["Objects"] ];
            ,
                Echo["FrontendObject`Sync >> nothing to restore "];
            ];
            If[MemberQ[notebook["Properties"], "Symbols"],
                CoffeeLiqueur`Extensions`FrontendObject`Internal`Symbols = Join[CoffeeLiqueur`Extensions`FrontendObject`Internal`Symbols, notebook["Symbols"] ];
                Echo["FrontendObject`Sync`Symbols >> restored!"];
            ,
                Echo["FrontendObject`Sync >> nothing to restore "];
            ];
        ],
        "OnBeforeSave" -> AsyncFunction[opts, Module[{objects, missing, kernel},
            Echo["OnBefore Save!"];

            If[!MemberQ[notebook["Properties"], "Objects"], 
                notebook["Objects"] = <||>;
                notebook["ObjectFields"] = Join[notebook["ObjectFields"], {"Objects"}] // DeleteDuplicates;
            ];
            If[!MemberQ[notebook["Properties"], "Symbols"], 
                notebook["Symbols"] = <||>;
                notebook["ObjectFields"] = Join[notebook["ObjectFields"], {"Symbols"}] // DeleteDuplicates;
            ]; 
 
            Echo["Getting objects from the frontend"];
            objects = WebUIFetch[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects["GetAllObjects"] , opts["Client"]] // Await;
            
            Echo[StringTemplate["``: ``"]["Resolved uids", objects]];
            missing = Complement[objects, Keys@CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects];
            
            StringTemplate["Total: `` Missing: ``"][Length[objects], Length[missing]] // Echo;

            kernel = notebook["Evaluator"]["Kernel"];
            If[TrueQ[kernel["ReadyQ"]],
                Echo["Kernel is available, fetching from it"];
                missing = fetchFromKernel[missing, kernel, AssociationQ, <||>, Function[x, KeyTake[x][CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects] ]] // Await;
                
                CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects = Join[CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects, missing];
                missing = Keys[missing];
                StringTemplate["Fetched: `` "][Length[missing]] // Echo;
            ];

            missing = Complement[objects, Keys@CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects];
            objects = Complement[objects, missing];

            notebook["Objects"] = Map[<|"Public"->#["Public"]|>&, KeyTake[objects][CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects]];

            Echo["Getting symbols from the frontend"];
            objects = WebUIFetch[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects["GetAllSymbols"] , opts["Client"]] // Await;
            
            Echo[StringTemplate["``: ``"]["Resolved names", objects]];
            missing = Complement[objects, Keys@CoffeeLiqueur`Extensions`FrontendObject`Internal`Symbols];
            
            StringTemplate["Total: `` Missing: ``"][Length[objects], Length[missing]] // Echo;

            kernel = notebook["Evaluator"]["Kernel"];
            If[TrueQ[kernel["ReadyQ"]],
                Echo["Kernel is available, fetching from it"];
                
                missing = fetchFromKernel[missing, kernel, AssociationQ, <||>, Function[names, 
                    AssociationMap[Function[name, With[{r = ToExpression[name]},
                        If[MatchQ[_Symbol][r], $Failed, r]
                    ]], names]
                ]] // Await;

                missing = Select[missing, Not@*FailureQ];
                
                CoffeeLiqueur`Extensions`FrontendObject`Internal`Symbols = Join[CoffeeLiqueur`Extensions`FrontendObject`Internal`Symbols, missing];
                missing = Keys[missing];
                StringTemplate["Fetched: `` "][Length[missing]] // Echo;                
            ];

            missing = Complement[objects, Keys@CoffeeLiqueur`Extensions`FrontendObject`Internal`Symbols];
            objects = Complement[objects, missing];

            notebook["Symbols"] = KeyTake[objects][CoffeeLiqueur`Extensions`FrontendObject`Internal`Symbols];

            Echo["Almost done"];
            ClearAll[objects, missing, kernel];
        ] ]
    }]; 
]

script = "<script type=\"module\">" <> Import[ FileNameJoin[{rootDir, "templates", "script.js"}], "Text"] <> "</script>";
AppExtensions`TemplateInjection["NotebookScript"] = Function[Null, script];

End[]
EndPackage[]