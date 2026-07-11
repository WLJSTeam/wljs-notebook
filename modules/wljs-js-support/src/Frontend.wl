BeginPackage["CoffeeLiqueur`Extensions`JSCells`", {
    "CoffeeLiqueur`Notebook`Transactions`",
    "CoffeeLiqueur`Misc`Events`"
}]


Begin["`Internal`"]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"];
Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];


JSQ[t_Transaction] := (StringMatchQ[t["Data"], ".js\n"~~___] )

evaluator  = StandardEvaluator`StandardEvaluator["Name" -> "JS Evaluator", "InitKernel" -> init, "Pattern" -> (_?JSQ), "Priority"->(3)];

StandardEvaluator`ReadyQ[evaluator, k_] := (
    If[! TrueQ[k["ReadyQ"] ] || ! TrueQ[k["ContainerReadyQ"] ],
        EventFire[t, "Error", "Kernel is not ready"];
        Print[evaluator, "Kernel is not ready"];
        False
    ,
        GenericKernel`Send[k, 
                Notebook`Kernel`JSEvaluator = Function[t, 
                    EventFire[Internal`Kernel`RemoteEvent[ t["Hash"] ], "Result", <|"Data" -> t["Data"], "Meta" -> Sequence["Display"->"js"] |> ];
                    EventFire[Internal`Kernel`RemoteEvent[ t["Hash"] ], "Finished", True];
                ];
        , "Once"->True];

        True
    ]
);

StandardEvaluator`EvaluateTransaction[evaluator, k_, t_] := Module[{list},
    t["Evaluator"] = Notebook`Kernel`JSEvaluator;
    t["Data"] = StringDrop[t["Data"], 4];

    Print[evaluator, "Kernel`SubmitTransaction!"];
    GenericKernel`SubmitTransaction[k, t];    
];  

init[k_] := Module[{},
    Print["Kernel init..."];
    
]


MJSQ[t_Transaction] := (StringMatchQ[t["Data"], ".mjs\n"~~___] )

mjs  = StandardEvaluator`StandardEvaluator["Name" -> "MJS Evaluator", "InitKernel" -> (#&), "Pattern" -> (_?MJSQ), "Priority"->(3)];

StandardEvaluator`ReadyQ[mjs, k_] := (True)

SystemShellRun[exec : {___String}, opts : OptionsPattern[]] := 
 SystemShellRun[StringRiffle[exec, " "], All, opts]
 
SystemShellRun[exec_String, opts : OptionsPattern[]] := 
 SystemShellRun[exec, All, opts]
 
SystemShellRun[exec_String, prop : _String | All, 
  opts : OptionsPattern[]] := 
 RunProcess[{$SystemShell, 
   If[StringContainsQ[$OperatingSystem, "Windows"], "/c", "-c"], exec}, 
  prop, opts]
 
SystemShellRun[exec_String, props_List, opts : OptionsPattern[]] := 
 With[{run = SystemShellRun[exec, All, opts]}, 
  run[[props]] /; AssociationQ[run]]
 
Options[SystemShellRun] = {ProcessEnvironment -> Inherited, 
  ProcessDirectory -> Inherited}

processEnv = Inherited;
If[$OperatingSystem === "MacOSX", processEnv = <|"PATH"->Import["!source ~/.bash_profile; echo $PATH", "Text"]|>];

checkPackageJSON[path_] := Module[{jsonPath = FileNameJoin[{path, "package.json"}], res = True},
    If[!FileExistsQ[jsonPath], 
        Echo["No package.json found"];
        Echo["Making one..."];
        res = SystemShellRun["npm i esbuild --prefix .", ProcessDirectory->path, ProcessEnvironment->processEnv];
        If[res["ExitCode"] =!= 0, Return[res["StandardError"]] ];
        If[!FileExistsQ[jsonPath], Return["Failed to create package.json"] ];
        Return[True];
    ];

    Echo["Found package.json"];

    json = Import[jsonPath, "Text"];
    If[StringCases[json, ___~~"esbuild"~~___] === {},
        Echo["Adding esbuild to dependencies..."];
        res = SystemShellRun["npm i esbuild", ProcessDirectory->path, ProcessEnvironment->processEnv];
        If[res["ExitCode"] =!= 0, Return[res["StandardError"]] ];
        Return[True];
    ];

    Echo["esbuild is already in dependencies"];
    Return[True];
];

limitString[s_, rest___] := limitString[ToString[s], rest];
limitString[s_String, lim_:1000] := StringTake[s, Min[StringLength[s], lim]];

buildESM[cmd_, All, stdin_, opts__] := RunProcess[Join[{FileNameJoin[{"node_modules", "esbuild", "bin", "esbuild"}]}, cmd], All, stdin, opts];

If[StringContainsQ[$OperatingSystem, "Windows"],
    buildESM[cmd_, All, stdin_, opts__] := With[{},
      Print[{$SystemShell, "/c", FileNameJoin[{"node_modules", "@esbuild", "bin", "esbuild.exe"}]<>" "<>StringRiffle[cmd, " "]}];
      RunProcess[{$SystemShell, "/c", FileNameJoin[{"node_modules", "@esbuild", "win32-x64", "esbuild.exe"}]<>" "<>StringRiffle[cmd, " "]}, All, stdin, opts]  
    ]
];

StandardEvaluator`EvaluateTransaction[mjs, k_, t_] := Module[{list},
    t["Data"] = StringTrim[StringDrop[t["Data"], 5]];

    If[MemberQ[t["Properties"], "EvaluationContext"],
        With[{refCell = cell`HashMap[t["EvaluationContext"]["Ref"]]},
            If[MatchQ[refCell, _cell`CellObj],
                With[{path = If[DirectoryQ[#], #, DirectoryName[#] ] &@ refCell["Notebook"]["Path"]},
                    
                    With[{check = checkPackageJSON[path]},
                        If[!TrueQ[check],
                            EventFire[t, "Error", check];
                            Return[];
                        ];
                    ];


                    With[{result = buildESM[{"--bundle", "--format=esm", "--define:this=g0this"}, All, t["Data"], ProcessDirectory->path, ProcessEnvironment->processEnv]},
                        If[result["ExitCode"] === 0,
                            EventFire[t, "Result", <|"Data" -> result["StandardOutput"], "Meta" -> Sequence["Display"->"mjs"] |> ];
                            EventFire[t, "Finished", True];
                        ,
                            EventFire[t, "Error", limitString @ result["StandardError"]];
                        ]
                    ]
                ]
            ,
                EventFire[t, "Error", "Reference cell not found"];
            ]
        ]
    ,
        EventFire[t, "Error", "EvaluationContext is missing"];
    ];

]; 


End[]

EndPackage[]