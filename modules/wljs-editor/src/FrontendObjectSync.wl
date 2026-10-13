BeginPackage["CoffeeLiqueur`Extensions`FrontendObject`Sync`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`", 
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`", 
    "CoffeeLiqueur`WLJS`Tools`","CoffeeLiqueur`WLJS`Transport`",
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
                    With[{c =  result},
                        GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, c ] ];
                    ];
                ];
           ];       
    ]
}];

fetchFromKernel[keys_, kernel_, test_, default_, function_] := With[{promise = Promise[], prePromise = Promise[]}, {
    watchdog = SetTimeout[
            Echo["Kernel fetch request timed out!"];
            EventFire[promise, Resolve, $TimedOut], 
        1000 12]
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

WLJSTransportHandler["GetSymbol"] = Function[{exprString, client, callback},
              Echo["Getting cached symbol"];
              With[{name = exprString},
                If[KeyExistsQ[CoffeeLiqueur`Extensions`FrontendObject`Internal`Symbols, name],
                    Echo[name];
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
        "OnBeforeSave" -> AsyncFunction[opts, Module[{objects, missing, kernel, extra, timedOut = False},
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

                If[missing === $TimedOut,
                    timedOut = True;
                    missing = <||>;
                    
                    EventFire[opts["Log"], "Warning", "Some objects could not be saved since the kernel link had been lost"];
                ];
                
                CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects = Join[CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects, missing];
                missing = Keys[missing];
                StringTemplate["Fetched: `` "][Length[missing]] // Echo;
            ];

            missing = Complement[objects, Keys@CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects];
            objects = Complement[objects, missing];

            Echo["Last sweep. Check all input and output cells for uids."];
            (* This would not cover hidden UIDs in compressed expr *)
            (* Why do we do that? An editor does not render the content, which is too far from the scroll, i.e. virtual rendering *)
            (* May be we should consider removing this feature *)
            With[{
                cellData = Map[(#["Data"])&, notebook["Cells"]],
                allUIDs = Keys @ CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects,
                oldLength = Length[objects]
            },
                extra = Select[allUIDs, Function[key, Or @@ StringContainsQ[cellData, key]]];
                objects = Join[objects, extra] // DeleteDuplicates;
                
                StringTemplate["Found in addition: ``"][Length[objects] - oldLength] // Echo;
            ];
            (* Nah... 100 uids x 30-50 cells = too much? *)

            notebook["Objects"] = Map[<|"Public"->#["Public"]|>&, KeyTake[objects][CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects]];

            Echo["Getting symbols from the frontend"];
            objects = WebUIFetch[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects["GetAllSymbols"] , opts["Client"]] // Await;
            
            Echo[StringTemplate["``: ``"]["Resolved names", objects]];
            missing = Complement[objects, Keys@CoffeeLiqueur`Extensions`FrontendObject`Internal`Symbols];
            
            StringTemplate["Total: `` Missing: ``"][Length[objects], Length[missing]] // Echo;

            kernel = notebook["Evaluator"]["Kernel"];
            If[TrueQ[kernel["ReadyQ"]] && !timedOut,
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
            ClearAll[objects, missing, kernel, extra, timedOut];
        ] ]
    }]; 
]

script = "<script type=\"module\">" <> Import[ FileNameJoin[{rootDir, "templates", "script.js"}], "Text"] <> "</script>";
AppExtensions`TemplateInjection["NotebookScript"] = Function[Null, script];

End[]
EndPackage[]