BeginPackage["CoffeeLiqueur`Extensions`Editor`", {
    "CodeParser`", 
    "CoffeeLiqueur`Notebook`Transactions`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`",
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CoffeeLiqueur`Extensions`FrontendObject`"
}]


NotebookEditorChannel::usage = "used to transfer extra events"

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Begin["`Internal`"]

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];
Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"];

Needs["CoffeeLiqueur`Notebook`Loader`" -> "loader`"];

{saveNotebook, loadNotebook, renameNotebook, cloneNotebook}         = {loader`save, loader`load, loader`rename, loader`clone};


truncatedTemplate = ImportComponent[ FileNameJoin[{$InputFileName // DirectoryName // ParentDirectory, "templates", "truncated.wlx"}] ];
truncatedTemplate = truncatedTemplate["Data"->"``", "Size"->"``", "Ref"->"``"];

AppExtensions`TemplateInjection["SettingsFooter"] = ImportComponent[ FileNameJoin[{$InputFileName // DirectoryName // ParentDirectory, "templates", "Settings.wlx"}] ];

AppExtensions`TemplateInjection["CellDropdown"] = ImportComponent[ FileNameJoin[{$InputFileName // DirectoryName // ParentDirectory, "templates", "CopyDropdown.wlx"}] ];
AppExtensions`TemplateInjection["CellDropdown"] = ImportComponent[ FileNameJoin[{$InputFileName // DirectoryName // ParentDirectory, "templates", "CopyTextDropdown.wlx"}] ];


With[{
    t = ImportComponent[ FileNameJoin[{$InputFileName // DirectoryName // ParentDirectory, "templates", "SplitNotebook.wlx"}] ][<|"saveNotebook" -> saveNotebook|>]
},
    AppExtensions`TemplateInjection["CellDropdown"] = t;
];

Needs["CoffeeLiqueur`Notebook`SettingsUtils`"->"settings`", FileNameJoin[{"Frontend", "Settings.wl"}] ];
{loadSettings, storeSettings}        = {settings`initialize, settings`storeConfiguration};

settings = <||>;

NotebookEditorChannel = CreateUUID[];

rootFolder = $InputFileName // DirectoryName;

specialCharsFix[s_String] := With[{},
    s
]

evaluator  = StandardEvaluator`StandardEvaluator["Name" -> "Wolfram Evaluator", "InitKernel" -> init, "Priority"->(999)];

    StandardEvaluator`TerminateTransactions[evaluator, token_] := token[];

    StandardEvaluator`ReadyQ[evaluator, k_] := (
        If[! TrueQ[k["ReadyQ"] ] || ! TrueQ[k["ContainerReadyQ"] ],
            EventFire[t, "Error", "Kernel is not ready"];
            Print[evaluator, "Kernel is not ready"];
            False
        ,


            True
        ]
    );

    StandardEvaluator`EvaluateTransaction[evaluator, k_, t_] := Module[{list},
     t["Evaluator"] = CoffeeLiqueur`Extensions`Editor`Internal`WolframEvaluator;

     If[StringLength[StringTrim[t["Data"] ] ] === 0,
        EventFire[t, "Error", "No input"];
        Echo["Syntax Error!"];
        Return[$Failed];
     ];

     t["Data"] = specialCharsFix[t["Data"] ];

     With[{check = CheckSyntax[t["Data"] ]},
        If[! TrueQ[check],
            EventFire[t, "Error", check];
            Echo["Syntax Error!"];
            Return[$Failed];
        ];

        If[! TrueQ[k["ReadyQ"] ],
            Echo[k["ReadyQ"] ];
            EventFire[t, "Error", "Kernel is not ready"];
            Return[$Failed];
        ];

        list = SplitExpression[t["Data"] ];
        MapIndexed[
            With[{message = StringTrim[#1], index = #2[[1]], transaction = Transaction[]},
                If[StringTake[message, -1] === ";", 
                    transaction["Nohup"] = True;
                    transaction["EvaluationContext"] = t["EvaluationContext"];
                    transaction["Data"] = StringDrop[message, -1];
                ,
                    transaction["EvaluationContext"] = t["EvaluationContext"];
                    transaction["Data"] = message;
                ];
                (*  FIXME TODO Normal OUT Support *)
                (*  FIXME TODO Normal OUT Support *)
                (*  FIXME TODO Normal OUT Support *)
                (*  FIXME TODO Normal OUT Support *)
                
                transaction["Evaluator"] = CoffeeLiqueur`Extensions`Editor`Internal`WolframEvaluator;
                
                (* check if it is the last one *)
                If[index === Length[list],
                    EventHandler[transaction, {
                        (* capture successfull event of the last transaction to end the process *)  
                        "Result" -> Function[data, 
                            EventFire[t, "Result", data];
                            EventFire[t, "Finished", True];
                        ],
                        (* fwd the rest *)
                        name_ :> Function[data, EventFire[t, name, data] ]
                    }];          
                ,
                    EventHandler[transaction, {
                        name_ :> Function[data, EventFire[t, name, data] ]
                    }];                
                ];

                Print[evaluator, "GenericKernel`SubmitTransaction!"];
                GenericKernel`SubmitTransaction[k, transaction];
            ]&
        ,  list];
    ];      
  ];  

init[k_] := Module[{},
    Print["Kernel init..."];
    loadSettings[settings];

    With[{channel = NotebookEditorChannel, autocompleteRebuild = Lookup[settings, "EnableAutocompleteScan", False], tt = truncatedTemplate, charLim = Lookup[settings, "OutputCharactersLimit", 6000], summaryBox = Lookup[settings, "SummaryBoxSizeLimit", 2 8 2500], objectLimit = Lookup[settings, "FrontEndObjectSizeLimit", 8]},
        GenericKernel`Send[k,
            Print["Init internal communication"];
            Internal`Kernel`TruncatedOutputTemplate = tt;
            Internal`Kernel`$OutputCharactersLimit = charLim;
            Internal`Kernel`$FrontEndObjectSizeLimit = objectLimit;
            Internal`Kernel`AutocompleteRescan = autocompleteRebuild;
            BoxForm`$SummaryBoxSizeLimit = summaryBox;
            Internal`Kernel`CommunicationChannel = Internal`Kernel`RemoteEvent[channel];
            Internal`Kernel`TruncatedOutputLastItem = Null;
            Internal`Kernel`TruncatedOutputReveal[_] := With[{o = Internal`Kernel`TruncatedOutputLastItem},
                If[o === Null, Return[] ];
                (* FIXME Intersection of different sub-packages!!!  See RemoteCells *)
                With[{cell = CoffeeLiqueur`Extensions`RemoteCells`RemoteCellObj[o["Cell"] ], parent = CoffeeLiqueur`Extensions`RemoteCells`RemoteCellObj[o["Ref"] ]},
                    Delete[cell];
                    CellPrint[o["Result"], "After" -> parent, "Type"->"Output"];
                    Internal`Kernel`TruncatedOutputLastItem = Null;
                ];
            ];
        ];
    ];
    GenericKernel`Send[k, 
        Print["Init normal Kernel (Local)"];
        CoffeeLiqueur`Extensions`Editor`Internal`WolframEvaluator = Function[t, 
        With[{hash = CreateUUID[]},
          Internal`Kernel`Watchdog["QuickTest"];
          
          Block[{
            System`$EvaluationContext = Join[t["EvaluationContext"], <|"ResultCellHash" -> hash|>]
          },
            With[{result = CheckAbort[(ToExpression[ t["Data"], InputForm, Hold] /. Out -> $PreviousOut) // ReleaseHold, $Aborted] },
                If[KeyExistsQ[t, "Nohup"],
                    EventFire[Internal`Kernel`RemoteEvent[ t["Hash"] ], "Result", <|"Data" -> Null |> ];
                ,   
                    (* check length *)
                    With[{string = ToString[result, StandardForm]},
                        If[StringLength[string] < Internal`Kernel`$OutputCharactersLimit || Lookup[t, "IgnoreOverflow", False],
                            EventFire[Internal`Kernel`RemoteEvent[ t["Hash"] ], "Result", <|"Data" -> string, "Meta"->Sequence["Hash"->hash] |> ];
                        ,
                            With[{truncated = ToString[result, InputForm], ref = CreateUUID[]},
                                Internal`Kernel`TruncatedOutputLastItem = <|"Event"->ref, "Result"->string, "Cell"->hash, "Ref"->t["EvaluationContext"]["Ref"]|>;
                                EventHandler[ref, Internal`Kernel`TruncatedOutputReveal];

                                EventFire[Internal`Kernel`RemoteEvent[ t["Hash"] ], "Result", <|"Data" -> StringTemplate[Internal`Kernel`TruncatedOutputTemplate][StringLength[string], StringTake[truncated, Min[StringLength[truncated], 5000] ], ref, ref, ref ], "Overflow"->True, "Meta"->Sequence["Hash"->hash, "Display"->"html", "Overflow"->True] |> ];
                            ]
                        ]
                    ]
                    
                ];
                
                (*  FIXME TODO Normal OUT Support *)
                $PreviousOut[_] = result;
                $PreviousOut[]  = result;
            ];
          ];
        ] ];
    ];

    (* !!!! Unknown bug with Boxes... have to do it separately
    With[{p = Import[FileNameJoin[{rootFolder, "Boxes.wl"}], "String"]},
        Kernel`Init[k,   ToExpression[p, InputForm]; , "Once"->True];
    ];*)
]

SplitExpression[astr_] := With[{str = StringReplace[astr, {"$Pi$"->"\[Pi]"}]},
  Select[Select[(StringTake[str, Partition[Join[{1}, #, {StringLength[str]}], 2]] &@
   Flatten[{#1 - 1, #2 + 1} & @@@ 
     Sort@
      Cases[
       CodeParser`CodeConcreteParse[str, 
         CodeParser`SourceConvention -> "SourceCharacterIndex"][[2]], 
       LeafNode[Token`Newline, _, a_] :> Lookup[a, Source, Nothing]]]), StringQ], (StringLength[#]>0) &]
];

testQuestionMarks[s_String] := StringMatchQ[StringTrim[s], StartOfString~~("?" | "??")~~__]
testQuestionMarks[_] := False

CheckSyntax[_?testQuestionMarks] := True

CheckSyntax[str_String] := 
    Module[{syntaxErrors = Cases[CodeParser`CodeParse[str],(ErrorNode|AbstractSyntaxErrorNode|UnterminatedGroupNode|UnterminatedCallNode)[___],Infinity]},
        If[Length[syntaxErrors]=!=0 ,
            

            Return[StringRiffle[
                TemplateApply["Syntax error `` at line `` column ``",
                    {ToString[#1],Sequence@@#3[CodeParser`Source][[1]]}
                ]&@@@syntaxErrors

            , "\n"], Module];
        ];
        Return[True, Module];
    ];





SHQ[t_Transaction] := (StringMatchQ[t["Data"], ".sh\n"~~___] )

sh  = StandardEvaluator`StandardEvaluator["Name" -> "Shell Evaluator", "InitKernel" -> (#&), "Pattern" -> (_?SHQ), "Priority"->(3)];

StandardEvaluator`ReadyQ[sh, k_] := (True)

processEnv = Inherited;
If[$OperatingSystem === "MacOSX", processEnv = <|"PATH"->Import["!source ~/.bash_profile; echo $PATH", "Text"]|>];


limitString[_] := "$Failed";
limitString[s_String, lim_:1000] := StringTake[s, Min[StringLength[s], lim]];

SystemShellRun[exec : {___String}, opts : OptionsPattern[]] := 
 SystemShellRun[StringRiffle[exec, " "], All, opts]
 
SystemShellRun[exec_String, opts : OptionsPattern[]] := 
 SystemShellRun[exec, All, opts]
 
SystemShellRun[exec_String, prop : _String | All, 
  opts : OptionsPattern[]] := 
 StartProcess[{$SystemShell, 
   If[StringContainsQ[$OperatingSystem, "Windows"], "/c", "-c"], exec}, 
   opts]
 
SystemShellRun[exec_String, props_List, opts : OptionsPattern[]] := 
 With[{run = SystemShellRun[exec, All, opts]}, 
  run[[props]] /; AssociationQ[run]]
 
Options[SystemShellRun] = {ProcessEnvironment -> Inherited, 
  ProcessDirectory -> Inherited}

processes = {};

StandardEvaluator`TerminateTransactions[sh, _] := With[{},
    (#[Null]) &/@ processes;
    processes = {};
]

StandardEvaluator`EvaluateTransaction[sh, k_, t_] := Module[{list, task},
    t["Data"] = StringTrim[StringDrop[t["Data"], 4]];

    If[MemberQ[t["Properties"], "EvaluationContext"],
        With[{refCell = cell`HashMap[t["EvaluationContext"]["Ref"] ]},
            If[MatchQ[refCell, _cell`CellObj],
                With[{path = If[DirectoryQ[#], #, DirectoryName[#] ] &@ refCell["Notebook"]["Path"]},
                    With[{process = SystemShellRun[t["Data"], ProcessDirectory->path, ProcessEnvironment->processEnv]},
                         {checkProcess := With[{errors = ReadString[process["StandardError"], EndOfBuffer]},
                                    Echo["Checking the process..."];

                                    With[{r = ReadString[process, EndOfBuffer]}, If[TrueQ[StringLength[r] > 0],
                                        Echo["ReadString"];
                                        EventFire[t, "Result", <|"Data" -> (limitString[r, 10000]), "Meta" -> Sequence["Display"->"shell"] |> ];
                                    ] ];                                    
                                    
                                    If[errors =!= EndOfBuffer,
                                        Echo["Error detected?"]; If[TrueQ[StringLength[errors] > 0],
                                        EventFire[t, "Result", <|"Data" -> (limitString[errors, 10000]), "Meta" -> Sequence["Display"->"shell"] |> ];
                                    ] ];
                                    
                                    If[ProcessStatus[process]==="Finished", 
                                        Echo["Process finished"];
                                        If[MatchQ[task, _TaskObject], TaskRemove[task] ];
                                        ClearAll[task];
                                        EventFire[t, "Finished", True];
                                        Return[];
                                    ];


                                ]
                        },
                        
                            If[ProcessStatus[process]==="Finished",
                                checkProcess;
                            ,
                                task = SetInterval[checkProcess, 600];
                                processes = Append[processes, Function[Null,
                                    If[MatchQ[task, _TaskObject], TaskRemove[task] ];
                                    Echo["Process killed"];
                                    If[ProcessStatus[process] =!= "Finished", KillProcess[process] ];
                                    EventFire[t, "Finished", True];
                                    ClearAll[task];
                                ] ];
                            ];
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



FrontendDevQ[t_Transaction] := (StringMatchQ[t["Data"], "fautorun.wl\n"~~___] )

frontendDev  = StandardEvaluator`StandardEvaluator["Name" -> "Frontend Dev Evaluator", "InitKernel" -> (#&), "Pattern" -> (_?FrontendDevQ), "Priority"->(3)];
StandardEvaluator`ReadyQ[frontendDev, k_] := (True)


StandardEvaluator`EvaluateTransaction[frontendDev, k_, t_] := Module[{list},
    t["Data"] = StringTrim[StringDrop[t["Data"], 12] ];

    If[MemberQ[t["Properties"], "EvaluationContext"],
        With[{refCell = cell`HashMap[t["EvaluationContext"]["Ref"] ]},
            If[MatchQ[refCell, _cell`CellObj],
                With[{notebook = refCell["Notebook"]},
                    notebook["AutorunScript"] = t["Data"];
                    notebook["PublicFields"] = Join[notebook["PublicFields"], {"AutorunScript"}] // DeleteDuplicates;
                    ToExpression[t["Data"], InputForm ];   

                    EventFire[t, "Result", <|"Data" -> " ", "Meta" -> Sequence["Display"->"shell"] |> ];
                    EventFire[t, "Finished", True];
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