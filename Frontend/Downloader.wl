BeginPackage["CoffeeLiqueur`Notebook`HTTPDownLoader`", {
    "CoffeeLiqueur`HTTPHandler`",
    "CoffeeLiqueur`HTTPHandler`Extensions`",
    "CoffeeLiqueur`Internal`"
}]
    module;
    
    Begin["`Internal`"]

    Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

    parseBytesRange[str_String] := Module[{matches},
      matches = StringCases[
        str,
        {
          "bytes=" ~~ a : DigitCharacter .. ~~ "-" ~~ b : DigitCharacter .. :> {a, b},
          "bytes=" ~~ a : DigitCharacter .. ~~ "-" :> {a, "Infinity"}
        }
      ];
      If[matches === {}, Missing["NoMatch"], ToExpression[matches[[1]]]]
    ]

    handler[m_][k_] := (
        Echo["Unsupported method!"];
        Echo[m];
        Echo[k];
    )

    wljsPackages = FileNameJoin[{Directory[], "modules"}];


    handler["GET"][request_] := With[{
        rawPath = URLDecode[request["Query", "path"] ], rangesString = Lookup[request["Headers"], "Range", False]
    }, Module[{
        path = rawPath
    },
        path = SelectFirst[If[# === Null, rawPath, FileNameJoin[{#, rawPath}] ] &/@ {wljsPackages, AppExtensions`ExtensionsDir, Directory[], Null}, FileExistsQ ];
        Echo["Downloader >> Get request"];

        If[MissingQ[path],
            Echo["File: "<>path<>" does not exist"];
                    <|
                        "Code" -> 404, 
                        "Headers" -> <|
                            "Content-Length" -> 0,
                            "Connection"-> "Keep-Alive"
                        |>
                    |>  // Return;                 
        ];

        If[rangesString === False,

            With[{file = ReadByteArray[path]},
                    <|
                        "Body" -> file,
                        "Code" -> 200, 
                        "Headers" -> <|
                            "Content-Type" -> GetMIMEUType[path], 
                            "Content-Length" -> Length[file],
                            "Connection"-> "Keep-Alive", 
                            "Keep-Alive" -> "timeout=5, max=1000"
                        |>
                    |>  // Return;            
            ];
        ];

        With[{
            ranges = parseBytesRange[rangesString // StringTrim],
            size = Round[QuantityMagnitude[FileSize[path], "Bytes"] ]
        },
            Echo["Downloader >> Ranges: "<>ToString[ranges] ];
            

            With[{file = OpenRead[path, BinaryFormat->True]},
                ReadByteArray[file, ranges[[1]]];
                With[{body = ReadByteArray[file, Min[ranges[[2]], size-1]+1 ]},
                    Close[file];
                    Echo["Downloader >> Content-Length: "<>ToString[Length[body] ] ];
                    Echo["Downloader >> Content-Range: "<>(StringTemplate["bytes ``-``/``"][ranges[[1]], Min[ranges[[2]], size-1], size]) ];
                   
                    <|
                        "Body" -> body,
                        "Code" -> 206, 
                        "Headers" -> <|
                            "Content-Type" -> GetMIMEUType[path], 
                            "Content-Length" -> Length[body],
                            "Content-Range" -> StringTemplate["bytes ``-``/``"][ranges[[1]], Min[ranges[[2]], size-1], size],
                            "Connection"-> "Keep-Alive", 
                            "Accept-Ranges" -> "bytes",
                            "Keep-Alive" -> "timeout=5, max=1000"
                        |>
                    |>                    
                ]
            ]
        ]
    
        
    ] ]

    handler["HEAD"][request_] := With[{
        rawPath = URLDecode[request["Query", "path"] ]
    }, Module[{
        path
    },
        Echo["Downloader >> Head request"];
        path = SelectFirst[If[# === Null, rawPath, FileNameJoin[{#, rawPath}] ] &/@ {wljsPackages, AppExtensions`ExtensionsDir, Directory[], Null}, FileExistsQ ];

        If[!MissingQ[path],
            <|
                "Code" -> 200, 
                "Headers" -> <|
                    "Content-Type" -> GetMIMEUType[path], 
                    "Accept-Ranges" -> "bytes",
                    "Content-Length" -> Round[QuantityMagnitude[FileSize[path], "Bytes"] ], 
                    "Connection"-> "Keep-Alive", 
                    "Keep-Alive" -> "timeout=5, max=1000"
                |>
            |>  
        ,
            <|
                "Code" -> 404, 
                "Headers" -> <|
                    "Content-Type" -> GetMIMEUType[path], 
                    "Accept-Ranges" -> "bytes",
                    "Content-Length" -> 0, 
                    "Connection"-> "Keep-Alive", 
                    "Keep-Alive" -> "timeout=5, max=1000"
                |>
            |>  
        ]      
    ] ]

    module[OptionsPattern[] ] := With[{http = OptionValue["HTTPUHandler"]},
        Echo["Downloads module was attached"];
        http["MessageHandler", "Downloader"] = AssocUMatchQ[<|"Path" -> "/downloadFile/"|>] -> (handler[ #["Method"] ][#]&);
    ]

    Options[module] = {"HTTPUHandler" -> Null}

    End[]

EndPackage[]