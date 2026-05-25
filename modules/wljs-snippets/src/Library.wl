BeginPackage["CoffeeLiqueur`Extensions`CommandPalette`Library`", {
    "CoffeeLiqueur`Notebook`Transactions`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`",     
    "CoffeeLiqueur`Extensions`CommandPalette`"
}]


Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Begin["`Private`"]

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"];
Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];


Print[">> Snippets >> Library loading..."];


$userLibraryPath = FileNameJoin[{AppExtensions`DefaultDocumentsDir, "User palette"}];
$libraryPath = FileNameJoin[{$InputFileName // DirectoryName // ParentDirectory, "library", ""}]

iTemplate  = FileNameJoin[{$InputFileName // DirectoryName // ParentDirectory, "template", "Components", "Items"}];

If[!FileExistsQ[ $userLibraryPath ], CreateDirectory[$userLibraryPath] ];


findCell[nb_, tag_String] := SelectFirst[nb["Cells"], ((StringSplit[#["Data"], "\n"] // First // StringTrim) === tag && #["Type"] === "Input")&]



Parse[a_Association, path_] := With[{notebook = nb`LoadFromFile[ path ]}, With[{icon = findCell[notebook, "icon.wlx"]},
    Echo["Snippets >> Deserialize notebook >> "<>path];

    notebook["Path"] = path;
    notebook["Directory"] = DirectoryName[path];

    Module[{title = "", decription = "", template = Automatic, action = {}},
        With[{t = findCell[notebook, ".md"]},
  
            If[!StringMatchQ[t["Data"], (".md\n"~~__) | (".md\r\n"~~__)], 
                Echo["Snippets >> Library >> Title is missing!"]; Exit[-1]; 
                
            ];
            
            {title, decription} = StringCases[t["Data"], RegularExpression["\\.md(?:\\r\\n|\\n|\\r)[#| ]*([^\\r\\n]*)(?:\\r\\n|\\n|\\r)?(.*)?"] :> {"$1", "$2"}] // First;
        ] // Quiet;

        If[!MissingQ[icon], template = StringRiffle[Drop[StringSplit[icon["Data"], "\n"],1], "\n"] ];

        Echo[title];
        Echo[decription];

        {"Title" -> title, "Decription" -> decription, "Notebook" -> notebook, "RawTemplate" -> template, "Path" -> path}
    ]
] ] // Quiet


ApplySync[f_, w_, {first_, rest___}] := f[w@@first, Function[Null, Echo["Async >> Next"]; ApplySync[f,w, {rest}] ] ]
ApplySync[f_, w_, {}] := Null;

books = <||>;

bookHandler[tag_String][assoc_] := With[{book = books[tag]},
  Echo["Book hander"];
  With[{result = EventFire[assoc["Controls"], "NotebookQ", True] /. {{___, n_nb`NotebookObj, ___} :> n} , controls = assoc["Controls"]},
    Print[result];
    If[MatchQ[result, _nb`NotebookObj],
            Null;
    ,
            Echo["rejected"];
            EventFire[assoc["Messanger"], "Warning", "There is no opened notebook" ];
            Return[];
    ];

    With[{notebook = result, hash = Hash[book]},   
         {notebookId = book["Notebook"]["Hash"], notebookContext = <|"Ref"->notebook["FocusedCell"]["Hash"], "Notebook" -> notebook["Hash"], "KernelWebSocket" -> notebook["KernelWebSocket"]|>}, 
          If[
              TrueQ[notebook["WebSocketQ"] ] && notebook["Evaluator"]["Kernel"]["State"] === "Initialized" && TrueQ[notebook["Evaluator"]["Kernel"]["ContainerReadyQ"] ]
          ,
              Echo["Context:"]; Echo[notebookContext];

              GenericKernel`Send[notebook["Evaluator"]["Kernel"], 
                  Then[CoffeeLiqueur`Extensions`RemoteCells`NotebookEvaluateAsync[
                          CoffeeLiqueur`Extensions`RemoteCells`RemoteNotebook[notebookId]
                        , EvaluationElements->All, "EvaluationContext"->notebookContext,
                        "ContextIsolation"->True
                      ], Function[Null, Null ] ];
              ];
          ,
              Echo["rejected"];
              EventFire[assoc["Messanger"], "Warning", "The kernel isn't ready or connected to a notebook yet. Try running a cell" ];
          ];
    ];
  ]
]

bookOpen[tag_String][assoc_] := Module[{},
  Echo["Book open hander"];
  With[{cli = assoc["Client"]},
    Echo["Open path: "<>books[tag, "Path"] ];
    WebUILocation[books[tag, "Path"] // URLEncode, cli, "Target"->_];
  ]
]

With[{book = Parse[<||>, #]},
  With[{temp = ("RawTemplate" /. book)},
   
    With[{
        template = If[temp === Automatic, 
            ImportComponent[FileNameJoin[{iTemplate, "Generic.wlx"}] ]
        , 
            ProcessString[temp, "Localize"->True] // ReleaseHold
        ],

        tag = "snippet-"<>StringTake[CreateUUID[], 6],
        btag = "shelp-"<>StringTake[CreateUUID[], 6]
    },
        
        

        SnippetsCreateItem @@ Join[{tag, "Button"->btag}, book, {"Template"->template}];
        books[tag] = List[book] // Association;
        EventHandler[SnippetsEvents, {
            tag -> bookHandler[tag],
            btag -> bookOpen[tag]
        }];

    ]
  ]
] &/@ Flatten[{FileNames["*.wln", $libraryPath], FileNames["*.wln", $userLibraryPath]}]


(*EventFire[assoc["Controls"], "NotebookQ", True] /. {{___, n_nb`NotebookObj, ___} :> n}*)

End[]
EndPackage[]