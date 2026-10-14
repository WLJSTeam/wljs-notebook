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

(* Just a fast parser for Compressed data *)
(* main feature: it does not evaluate any symbols *)

stringsFromCompressed[compressed_String] := Module[{
    badTag
    ,
    stringTag
    ,
    fields
    ,
    bytes
    ,
    data
    ,
    dataLength
    ,
    position = 1
    ,
    require
    ,
    readInt32LE
    ,
    decodeString
    ,
    readObject
    ,
    harvested
    ,
    isFrontEndExecutableHead
    ,
    frontEndExecutableBytes
},
    Catch[
        fields = StringSplit[StringTrim[compressed], ":", 2];
        If[Length[fields] =!= 2 || First[fields] =!= "1",
            Throw["expected a version-1 prefix", badTag]
        ];
        bytes = Quiet @ Check[Developer`RawUncompress[Normal @ BaseDecode[Last[fields]]], $Failed];
        If[!MatchQ[bytes, {_Integer..}],
            Throw["bad zlib stream", badTag]
        ];
        If[Take[bytes, UpTo[4]] =!= ToCharacterCode["!boR"],
            Throw["missing !boR header", badTag]
        ];
        data = Drop[bytes, 4];
        dataLength = Length[data];
        require[p_, count_] := If[!IntegerQ[p] || !IntegerQ[count] || p < 1 || count < 0 || p + count - 1 > dataLength,
            Throw["truncated object", badTag]
        ];
        readInt32LE[p_] := Module[{u},
            require[p, 4];
            u = data[[p]] + 256 data[[p + 1]] + 65536 data[[p + 2]] + 16777216 data[[p + 3]];
            If[u >= 2^31,
                u - 2^32
                ,
                u
            ]
        ];
        frontEndExecutableBytes = ToCharacterCode["FrontEndExecutable"];
        isFrontEndExecutableHead[p_] := Module[{length},
            require[p, 1];
            (* A symbol is tagged with lowercase s. *)
            If[data[[p]] =!= 115,
                Return[False]
            ];
            length = readInt32LE[p + 1];
            require[p + 5, length];
            data[[p + 5 ;; p + 4 + length]] === frontEndExecutableBytes
        ];
(* Strings in !boR use doubled backslashes and octal-escaped
   UTF-8 bytes. *)
        decodeString[raw_] := Module[{i = 1, n = Length[raw], output = {}, octal, byte},
            While[
                i <= n
                ,
                Which[
                    raw[[i]] =!= 92,
                        byte = raw[[i]]; i++
                    ,
                    i < n && raw[[i + 1]] === 92,
                        byte = 92; i += 2
                    ,
                    i + 3 <= n && AllTrue[raw[[i + 1 ;; i + 3]], 48 <= # <= 55&],
                        octal = raw[[i + 1 ;; i + 3]] - 48; byte = octal . {64, 8, 1}; i += 4
                    ,
                    True,
                        Throw["bad string escape", badTag]
                ];
                If[byte > 127,
                    Throw["non-ASCII string", badTag]
                ];
                AppendTo[output, byte];
            ];
            FromCharacterCode[output]
        ];
        readObject[p_, collectString_:False] := Module[{tag, length, arity, q, rank, dimensions, targetExpression},
            require[p, 1];
            tag = data[[p]];
            Switch[tag,
                105,(* i: machine integer *)require[p + 1, 4]; p + 5
                ,
                114,(* r: machine real *)require[p + 1, 8]; p + 9
                ,
                73 | 82 | 115 | 83,
(* I: arbitrary integer
   R: arbitrary real
   s: symbol
   S: string *)length = readInt32LE[p + 1];
                    require[p + 5, length];
                    If[tag === 83 && TrueQ[collectString],
                        Sow[decodeString[data[[p + 5 ;; p + 4 + length]]], stringTag]
                    ];
                    p + 5 + length
                ,
                102,(* f: expression *)arity = readInt32LE[p + 1];
                    If[arity < 0,
                        Throw["negative expression arity", badTag]
                    ];
                    q = p + 5;
                    (* Exact equivalent of System`FrontEndExecutable[_String]. *)
                    targetExpression = arity === 1 && isFrontEndExecutableHead[q];
                    (* Read the expression head. *)
                    q = readObject[q];
                    (* Only a direct string argument is collected. *)
                    Do[q = readObject[q, targetExpression], arity];
                    q
                ,
                101, (* e: packed real array *)rank = readInt32LE[p + 1];
                    If[rank <= 0,
                        Throw["invalid packed-array rank", badTag]
                    ];
                    require[p + 5, 4 rank];
                    dimensions = Table[readInt32LE[p + 5 + 4 k], {k, 0, rank - 1}];
                    If[AnyTrue[dimensions, # < 0&],
                        Throw["negative packed-array dimension", badTag]
                    ];
                    q = p + 5 + 4 rank;
                    require[q, 8 Times @@ dimensions];
                    q + 8 Times @@ dimensions
                ,
                _,
                    Throw["unknown type tag " <> ToString[tag], badTag]
            ]
        ];
        harvested = Reap[While[position <= dataLength, position = readObject[position]], stringTag][[2]];
        If[harvested === {},
            {}
            ,
            First[harvested]
        ]
        ,
        badTag
        ,
        ($Failed)&
    ]
]

captureStringFromCells[notebook_] := Module[{cellData, allUIDs, compressed, extra1, extra2},
    cellData = Map[(#["Data"])&, notebook["Cells"]];
    allUIDs = Keys @ CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects;

    (* Scan the cells once with all known UIDs instead of scanning every cell once per UID. *)
    extra1 = If[allUIDs === {},
        {}
        ,
        StringCases[cellData, Alternatives @@ allUIDs, Overlaps -> All] // Flatten // DeleteDuplicates
    ];

    (* Decode each distinct compressed expression only once. Base64 padding is significant. *)
    compressed = StringCases[cellData, RegularExpression["1:[A-Za-z0-9+/]+={0,2}"]] // Flatten // DeleteDuplicates;
    extra2 = Select[Flatten[stringsFromCompressed /@ compressed], StringQ] // DeleteDuplicates;

    StringTemplate["Found in cells text & master kernel: ``"][Length[extra1]] // Echo;
    StringTemplate["Found in compressed text (needs to be verified!): ``"][Length[extra2]] // Echo;
    {extra1, extra2}
];

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

            extra = captureStringFromCells[notebook];

            (* Why do we do that? An editor does not render the content, which is too far from the scroll, i.e. virtual rendering *)
            (* May be we should consider removing this feature *)

            With[{
                oldLength = Length[objects]
            },
                objects = Join[objects, extra[[1]]] // DeleteDuplicates;
                StringTemplate["Found in addition from cell's text: ``"][Length[objects] - oldLength] // Echo;
            ];

            With[{masterObjects = Keys[CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects]},
                With[{oldLength = Length[objects]},
                    objects = Join[objects, Intersection[extra[[2]], masterObjects]] // DeleteDuplicates;
                    StringTemplate["Found in addition from compressed text on master kernel: ``"][Length[objects] - oldLength] // Echo;
                ];

                extra[[2]] = Complement[extra[[2]], objects];
                StringTemplate["Found missing from compressed text: ``"][Length[extra[[2]]]] // Echo;
            ];

            If[TrueQ[kernel["ReadyQ"]] && Length[extra[[2]]] > 0 && !timedOut,
                Echo["Kernel is available, fetching from it"];
                extra[[2]] = fetchFromKernel[extra[[2]], kernel, AssociationQ, <||>, Function[x, KeyTake[x][CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects] ]] // Await;

                If[extra[[2]] === $TimedOut,
                    timedOut = True;
                    extra[[2]] = <||>;

                    EventFire[opts["Log"], "Warning", "Some objects could not be saved since the kernel link had been lost"];
                ];

                CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects = Join[CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects, extra[[2]]];
                extra[[2]] = Keys[extra[[2]]];
                StringTemplate["Fetched in addition: `` "][Length[extra[[2]]]] // Echo;
                objects = Join[objects, extra[[2]]] // DeleteDuplicates;
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
