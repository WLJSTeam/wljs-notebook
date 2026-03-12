BeginPackage["CoffeeLiqueur`Extensions`ExportImport`Mathematica`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`Notebook`Transactions`",
    "CodeParser`"
}];

export;
decode;

Begin["`Internal`"];

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`LocalKernel`" -> "LocalKernel`"]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

(*Needs["CodeFormatter`" -> "cf`"];*)

Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

System`RowBoxFlatten; (* needed to fix Kernel and Master definitions *)

{saveNotebook, loadNotebook, renameNotebook, cloneNotebook}         = ImportComponent["Frontend/Loader.wl"];


(*cf`CodeFormatter`$DefaultLineWidth = 120;
SetOptions[cf`CodeFormatter`CodeFormatCST, cf`CodeFormatter`Airiness -> -0.75, cf`CodeFormatter`BreakLinesMethod -> "LineBreakerV2"];
*)

balancedBracesQ[str_String] := StringCount[str, "[*)"] === StringCount[str, "(*]"] 

formatString[any_] := any
(*
formatString[input_String] := Module[{string, rules, d, arg1, arg2},
  
  string = input;
  If[StringLength[StringTrim[string] ] == 0, Return[input] ];
  
  {string, rules} = Module[{index = 0}, With[{r = StringCases[
    string
    , 
    d:Shortest[
        "(*" ~~ (c: WordCharacter..) ~~ "[*)" ~~ (arg1__ /; balancedBracesQ[arg1]) ~~ "(*]" ~~ (c: WordCharacter..) ~~ "*)"
    ] :> (d -> (index++; StringTemplate["$UC[``]"][index]))
]},
  {StringReplace[string, r], r}
] ] // Quiet;

  string = cf`CodeFormat[string];

  string = StringReplace[string, Map[(Rule[#[[2]], #[[1]]])&, rules] ];

  
  string
] *)


(* better use this https://community.wolfram.com/groups/-/m/t/2142852 *)

transformHeadings[str_] := Which[
    StringMatchQ[str, "# "~~__],
    Cell[StringDrop[str, 2], "Title"],

    StringMatchQ[str, "## "~~__],
    Cell[StringDrop[str, 3], "Section"],

    StringMatchQ[str, "#### "~~__],
    Cell[StringDrop[str, 4], "Subsection"],

    StringMatchQ[str, "##### "~~__],
    Cell[StringDrop[str, 5], "Subsubsection"],

    True,
    str                
]

dropFirstLine[s_String] := With[{l = StringSplit[s, "\n"]},
    If[Length[l] > 1,
         StringRiffle[Drop[l, 1], "\n"]
    ,
        s
    ]
]

mergeMarkdown[list_List] := Replace[SequenceReplace[list, {s1_String, s2__String} :> StringRiffle[{s1,s2}, "\n"] ], s_String :> Cell[s, "Text"], 1];

splitMarkdown[cell_cell`CellObj] := mergeMarkdown[transformHeadings /@ StringSplit[cell["Data"], "\n"] ]

OutputMarkdownQ[cell_cell`CellObj] := (cell["Display"] === "markdown") && cell`OutputCellQ[cell];
InputWolframQ[cell_cell`CellObj] := cell`InputCellQ[cell] && (language[cell["Data"] ] === "wolfram");
InputCodeCellQ[cell_cell`CellObj] := cell`InputCellQ[cell] && (language[cell["Data"] ] =!= "markdown" && language[cell["Data"] ] =!= "wolfram");


convertCell[cell_cell`CellObj?OutputMarkdownQ] := splitMarkdown[cell];
convertCell[cell_cell`CellObj] := Nothing;

language[s_String] := Which[
    StringMatchQ[s, ".md\n"~~__],
    "markdown",

    StringMatchQ[s, ".wlx\n"~~__],
    "wlx",

    StringMatchQ[s, ".html\n"~~__],
    "html",        

    StringMatchQ[s, ".js\n"~~__],
    "js",  

    StringMatchQ[s, ".mermaid\n"~~__],
    "mermaid",     

    StringMatchQ[s, ".slide\n"~~__],
    "slides",      

    StringMatchQ[s, "."~~(WordCharacter..)~~"\n"~~___],
    "unknown",         

    StringMatchQ[s, (WordCharacter..)~~"."~~(WordCharacter..)~~"\n"~~___],
    "unknown", 

    True,
    "wolfram"
]

convertToBoxes[s_] := With[{m = ToString[Unevaluated[s], InputForm]}, Cell[m, "Input" ] ]
convertToBoxes[s__] := convertToBoxes /@ Unevaluated[{s}]
SetAttributes[convertToBoxes, HoldAllComplete];
SetAttributes[convertToBoxes, Listable];

SplitExpression[astr_] := With[{str = StringReplace[astr, {"$Pi$"->"\[Pi]"}]},
  Select[Select[(StringTake[str, Partition[Join[{1}, #, {StringLength[str]}], 2]] &@
   Flatten[{#1 - 1, #2 + 1} & @@@ 
     Sort@
      Cases[
       CodeParser`CodeConcreteParse[str, 
         CodeParser`SourceConvention -> "SourceCharacterIndex"][[2]], 
       LeafNode[Token`Newline, _, a_] :> Lookup[a, Source, Nothing]]]), StringQ], (StringLength[#]>0) &]
];

convertCell[cell_cell`CellObj?InputWolframQ] := With[{splt = Flatten[{SplitExpression[cell["Data"] ] }]},
  With[{tomerge = With[{res = ToExpression[#, InputForm, convertToBoxes] },
    If[MatchQ[res, Cell["Null", _] ],
      Cell[#, "Input"]
    ,
      res
    ]
  ] &/@ splt},
    Cell[StringRiffle[enshureString /@ tomerge[[All, 1]], "\n"], "Input"]
  ]
]

enshureString[s_String] := s
enshureString[expr_] := ToString[expr]

convertCell[cell_cell`CellObj?InputCodeCellQ] := Cell[ dropFirstLine[ cell["Data"] ], "CodeText" ] 

convertCell[_] := Nothing

export[path_, OptionsPattern[] ] := With[{
    notebook = OptionValue["Notebook"]
},
    With[{n = {Map[convertCell, notebook["Cells"] ] }// Flatten},
        Put[Notebook[n], path]
    ]
]

rootFolder = $InputFileName // DirectoryName // ParentDirectory // ParentDirectory;

export[outputPath_, notebookOnLine_nb`NotebookObj, path_, name_, ext_, settings_, proto_] := With[{},
    Module[{filename = outputPath},
        If[filename === Null, filename = path];
        If[DirectoryQ[filename], filename = FileNameJoin[{filename, name}] ];
        If[!StringMatchQ[filename, __~~".nb"],  filename = filename <> ".nb"];
        If[filename === ".nb", filename = name<>filename];
        If[DirectoryName[filename] === "", filename = FileNameJoin[{path, filename}] ];

        export[filename, "Root"->rootFolder, "Notebook" -> notebookOnLine, "Title"->name]
    ]
]

export[controls_, modals_, messager_, client_, notebookOnLine_nb`NotebookObj, path_, name_, ext_, _, _] := With[{

},
    With[{

    },
        
        With[{
            p = Promise[]
        },

       EventFire[modals, "SaveDialog", <|
           "Promise"->p,
           "title"->"Export as Mathematica notebook",
           "properties"->{"createDirectory", "dontAddToRecent"},
           "filters"->{<|"extensions"->"nb", "name"->"Mathematica Notebook"|>}
       |>];

       Then[p, Function[result, 
           Module[{filename = If[StringQ[result], URLDecode @ result, URLDecode @ result["filePath"] ] },
               If[!StringQ[filename] || TrueQ[result["canceled"] ] || StringLength[filename] === 0, 
                 Echo["Cancelled saving"]; Echo[result];
                 Return[];
               ];

                    If[!StringMatchQ[filename, __~~".nb"],  filename = filename <> ".nb"];
                    If[filename === ".nb", filename = name<>filename];
                    If[DirectoryName[filename] === "", filename = FileNameJoin[{path, filename}] ];

                    export[filename, "Root"->rootFolder, "Notebook" -> notebookOnLine, "Title"->name];
                    EventFire[messager, "Saved", "Exported to "<>filename];
                ];
            ], Function[result, Echo["Exported"]; Echo[result] ] ];
            
        ]
    ]
]

Options[export] = {"Root"->"", "Notebook" -> "", "Title"->""}



(* Importer *)

processString[str_String] := StringReplace[ExportString[str, "String"], {"\\[NoBreak]"->"", "Null"->""}]

convert[Cell[BoxData[boxes_List], type: ("Input" | "Output" | "Code"), ___], notebook_, kernel_] := Module[{buffer = {} }, With[{p = Promise[]},
  Echo["Multiple Boxes >> "<>ToString[boxes, InputForm] ];

  If[Length[Cases[boxes, _DynamicModuleBox, Infinity] ] > 0, Return[] ];

  ApplySync[Then, Function[{box}, With[{pn = Promise[]}, 
    Then[convertInPlace[box, kernel],
      Function[result,
        If[StringTrim[result ] != "Null", buffer = {buffer, filterBugs[result ]} ];
        EventFire[pn, Resolve, True];
      ]
    ];
    pn
  ] ], {#} &/@ boxes, Function[Null,
    cell`CellObj["Data"->formatString[processString[ StringRiffle[Flatten[buffer], ""] ] ], "Type"->(type/.{"Code"->"Input"}), "Notebook"->notebook ];
    EventFire[p, Resolve, True];
    ClearAll[buffer];
  ] ];

  p
] ]

convert[Cell[input_String, "Input", ___], notebook_, kernel_] := With[{},
  Echo["Plain input string >> "<>ToString[input, InputForm] ];
  cell`CellObj["Data"->formatString[processString[input ] ], "Type"->"Input", "Notebook"->notebook ];
]


filterBugs[s_String] := Module[{p = s},
  StringReplace[p, {
    "×" -> " * ",
    "(
)" -> "()"
  }]
]
 



convert[Cell[TextData[ c_Cell ], "Text", ___], notebook_, kernel_] := convert[c, notebook, kernel]

convert[Cell[BoxData[boxes_], type: ("Input" | "Output" | "Code"), ___], notebook_, kernel_] := With[{p = Promise[]},
  Echo["Single Box >> "<>ToString[boxes, InputForm] ];

  



  Then[convertInPlace[boxes, kernel], Function[reply,
    If[reply["Data"] =!= "Null", cell`CellObj["Data"->formatString[processString[filterBugs[reply  ] ] ], "Type"->(type/.{"Code"->"Input"}), "Notebook"->notebook ] ];
    EventFire[p, Resolve, True]; 
  ] ];
  p
]

convert[Cell[BoxData[boxes_String], "Input", ___], notebook_, kernel_] := With[{p = Promise[]},
  Echo["Plain input string >> "<>ToString[boxes, InputForm] ];
  cell`CellObj["Data"->formatString[processString[boxes ] ], "Type"->"Input", "Notebook"->notebook ];
]


takeFirst[expr_, ___] := expr

toStringFormExperimental[boxes_] := Module[{},
  Echo[ToString[boxes, InputForm] ];
  With[{r = ToExpression[boxes, StandardForm, HoldForm]},
    If[r == $Failed,
      Echo[">> Decoder >> Convertion Failed at: "];
      Echo[ToString[boxes, InputForm] ];
      If[MatchQ[boxes, StyleBox[_String, ___] ],
        Return[boxes[[1]]];
      ];
      Return[""];
    ];

    

    StringJoin[" ", ToString[r], " "]
  ]


]

toStringFormExperimental[s_String] := s

toStringFormExperimental[boxes_BoxData] := Module[{r},
  r = ToExpression[boxes[[1]], StandardForm, HoldForm];
  If[r == $Failed,
    Echo[">> Decoder >> Convertion Failed at: "];
    Echo[ToString[boxes, InputForm] ];
    
    Return[""];
  ];
  StringJoin[" $", ToString[r // TeXForm, InputForm], "$ "]
]

toStringFormExperimental[StyleBox[s_, FontWeight->"Bold"] ] := With[{str = toStringFormExperimental[s] },
  StringTemplate["<b>``</b>"][str]
]

toStringFormExperimental[StyleBox[s_, FontSlant->"Italic"] ] := With[{str = toStringFormExperimental[s] },
  StringTemplate["<i>``</i>"][str]
]

toStringFormExperimental[StyleBox[s_, ___] ] := toStringFormExperimental[s]

toStringFormExperimental[Cell[b_BoxData, ___] ] := toStringFormExperimental[b]

toStringFormExperimental[RowBox[b_List] ] := StringJoin @@ (toStringFormExperimental /@ b)

toStringFormExperimental[ButtonBox[s_, ___] ] := toStringFormExperimental[s]

toStringFormExperimental[ButtonBox[s_, BaseStyle->"Hyperlink", ButtonData->{URL[url_String], None}, ___] ] := With[{linkLabel = toStringFormExperimental[s] },
  StringTemplate["<a href=\"``\" style=\"color:blue\" target=\"blank_\">``</a>"][url, linkLabel]
]

toStringFormExperimental[list_List] := toStringFormExperimental /@ list

toStringFormExperimental[boxes_Cell] := toStringFormExperimental[boxes[[1]]]

finalizeString[s_String] := s 
finalizeString[s_] := StringJoin @@ (ToString /@ ({toStringFormExperimental[s]} // Flatten))

stringTest[s_String] := s
stringTest[_] := ""

convert[Cell[data_, "Text", ___], notebook_, kernel_] := Module[{r = finalizeString[data ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];

  cell`CellObj["Data"->stringTest[StringJoin[".md\n", r ] ], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->stringTest[r ], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];
  
]

convert[Cell[s_String, "Abstract", ___], notebook_, kernel_] := Module[{r = finalizeString[s ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];

  cell`CellObj["Data"->stringTest[StringJoin[".md\n", StringTemplate["<i>``</i>"][r]  ] ], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->stringTest[ StringTemplate["<i>``</i>"][r]  ], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];
]

convert[Cell[t: TextData[data_], "Text", ___], notebook_, kernel_] := Module[{r = finalizeString[data ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];

  cell`CellObj["Data"->stringTest[StringJoin[".md\n", r  ] ], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->stringTest[ r  ], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];
]

convert[Cell[t: TextData[data_List], "Text", ___], notebook_, kernel_] := Module[{r = finalizeString[data ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];

  cell`CellObj["Data"->stringTest[StringJoin[".md\n", r  ] ], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->stringTest[r ], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];
]

convert[Cell["", "Text", ___], notebook_, kernel_] := Null

convert[Cell[text_String, "Subsubsection", ___], notebook_, kernel_] := Module[{r = finalizeString[text ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];

  cell`CellObj["Data"->StringJoin[".md\n#### <span style=\"color:rgb(189, 117, 60)\">", r, "</span>"], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->StringJoin["#### <span style=\"color:rgb(189, 117, 60)\">", r, "</span>"], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];
]

convert[Cell[text_String, "Subsection", ___], notebook_, kernel_] := Module[{r = finalizeString[text ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];

  cell`CellObj["Data"->StringJoin[".md\n### <span style=\"color:rgb(189, 117, 60)\">", r, "</span>"], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->StringJoin["### <span style=\"color:rgb(189, 117, 60)\">", r, "</span>"], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];
]

convert[Cell[text_String, "Section", ___], notebook_, kernel_] := Module[{r = finalizeString[text ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];

  cell`CellObj["Data"->StringJoin[".md\n## <span style=\"color:rgb(182, 86, 36)\">", r, "</span>"], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->StringJoin["## <span style=\"color:rgb(182, 86, 36)\">", r, "</span>"], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];
]

toStrNoBx[data_] := ToString[data /. {RowBox -> StringJoin} /. {StyleBox[dta_, ___] :> dta}]

convert[Cell[text_String | TextData[StyleBox[text_, ___], ___], "Title", ___], notebook_, kernel_] := Module[{r = finalizeString[text ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];


  cell`CellObj["Data"->StringJoin[".md\n# <span style=\"color:rgb(140, 43, 29)\">", r , "</span>"], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->StringJoin["# <span style=\"color:rgb(140, 43, 29)\">", r , "</span>"], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];
]

convert[Cell[text_String | TextData[StyleBox[text_, ___], ___], "Subtitle", ___], notebook_, kernel_] := Module[{r = finalizeString[text ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];


  cell`CellObj["Data"->StringJoin[".md\n<span style=\"color:rgb(50, 50, 50); font-size:larger\">", r , "</span>"], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->StringJoin["<span style=\"color:rgb(50, 50, 50); font-size:larger\">", r , "</span>"], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];
]


convert[Cell[TextData[data_RowBox], "Text", ___], notebook_, kernel_] := Module[{r = finalizeString[data ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];

  cell`CellObj["Data"->stringTest[StringJoin[".md\n",   r] ], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->stringTest[ r  ], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];

]

convert[Cell[TextData[data_] | data_String, "Item", ___], notebook_, kernel_] := Module[{r = finalizeString[data ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];

  cell`CellObj["Data"->stringTest[StringJoin[".md\n",   StringTemplate["<ul><li>``</li></ul>"][r] ] ], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->stringTest[ StringTemplate["<ul><li>``</li></ul>"][r]  ], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];

]


ApplySync[f_, w_, {first_, rest___}, final_] := f[w@@first, Function[Null, Echo["Async >> Next"]; ApplySync[f,w, {rest}, final]]]
ApplySync[f_, w_, {}, final_] := final[];

convert[Cell[CellGroupData[list_List, ___], ___], notebook_, kernel_] := With[{p = Promise[]},
  ApplySync[Then, convert, {
          #, notebook, kernel
      } &/@ list, Function[Null,
      
      EventFire[p, Resolve, True];
  ] ];  
  p
]

convertInPlace[expr_, k_] := With[{ p = Promise[]},
    GenericKernel`Init[k,  (  
        Needs["BoxesConverter`"->None];
        EventFire[Internal`Kernel`Stdout[ p // First ], Resolve, 
          With[{},
            TimeConstrained[BoxesConverter`WLJSDisplayForm[expr], 10, "$Failed"]
          ]
        ];   
    )];
    p
]

lookup[obj_, prop_, default_] := With[{t = obj[prop]},
  If[MissingQ[t], default, t]
]

decode[opts__][path_String, secondaryOpts___] := Module[{
  str, cells, objects, notebook, nb, store, options
},
With[{
    dir = AppExtensions`QuickNotesDir,
    name = FileBaseName[path],
    promise = Promise[],
    spinner = Notifications`Spinner["Topic"->"Converting to notebook", "Body"->"Please, wait"](*`*)
}, 
    Echo["Convering Mathematica Notebook..."];
    nb = Import[path];


    notebook = nb`NotebookObj[];
    With[{n = notebook},
        n["Quick"] = True;
        n["HaveToSaveAs"] = True;    
        n["WorkingDirectory"] = DirectoryName[path];
        n["Path"] = FileNameJoin[{dir, name<>"-"<>StringTake[CreateUUID[], 3]<>".wln"}];
    ];

    
    options = Join[Association[List[opts] ], Association[ List[secondaryOpts] ] ]; 

    If[Length[options["Kernels"] //ReleaseHold ] === 0,
      EventFire[options["Messager"], "Error", "The converting process is not possible without working Kernels"];
      Return[promise];
    ];

    Print["requesting modal...."];
      With[{promiseRequest = Promise[]},
        Then[promiseRequest, Function[result,
          Switch[result,
              _Integer,
                With[{data = ReleaseHold[options["Kernels"] ][[result]], currentNotebook = notebook},
                  If[TrueQ[data["ContainerReadyQ"] ],
                    Echo[data];

                    currentNotebook["Evaluator"] = data["Container"];
                    EventFire[notebook, "AquairedKernel", True];

                    currentNotebook["AutoconnectKernel"] = data["Hash"];
                    Echo["Kernel hash:"<>data["Hash"] ]; 

                    EventFire[options["Messager"], spinner, True];

                    ApplySync[Then, convert, {
                      #, notebook, data
                    } &/@ nb[[1]], Function[Null,
      
                      If[Length[notebook["Cells"] ] > 110, 
                        Echo["Notebook is too long!"];
                        With[{cellList = Unique[], promiseList = Unique[], pathList = Unique[] },
                          cellList = notebook["Cells"];
                          promiseList = {}; pathList = {};

                          While[Length[cellList] > 0,
                                subnotebook = nb`NotebookObj[];
                                With[{n = subnotebook, taken = Take[cellList, Min[65, Length[cellList] ] ]},
                                    cellList = Drop[cellList, Length[taken] ];

                                    n["Quick"] = True;
                                    n["HaveToSaveAs"] = True;    
                                    n["WorkingDirectory"] = DirectoryName[path];
                                    n["Path"] = FileNameJoin[{dir, name<>"-"<>StringTake[CreateUUID[], 3]<>".wln"}];
                                    n["Evaluator"] = data["Container"];
                                    EventFire[n, "AquairedKernel", True];
                                    n["AutoconnectKernel"] = data["Hash"];

                                    If[taken[[1]]["Type"] === "Output",
                                      cell`CellObj["Notebook" -> n, "Type" -> "Input", "Data" -> "(* content from the previous part *)"]
                                    ];

                                    Map[
                                        cell`CellObj[
                                          "Notebook" -> n, 
                                          "Props" -> lookup[#, "Props", <||>], 
                                          "Type" -> #["Type"], "Display" -> lookup[#, "Display", "codemirror"], 
                                          "Data" -> #["Data"] 
                                        ]&
                                    , taken];

                                    AppendTo[promiseList, saveNotebook[n["Path"], n, "NoCache"->True] ];
                                    AppendTo[pathList, n["Path"] ];
                                    Delete /@ n["Cells"];
                                    Delete[n];
                                ];

         
                          ];

                                Delete /@ notebook["Cells"];
                                Delete[notebook];

                                Then[promiseList, Function[Null,
                                  EventFire[promise, Resolve, <|"Type"->"MultipleWindows", "Paths"->pathList|> ];
                                  ClearAll[promiseList];
                                  ClearAll[pathList];
                                  ClearAll[cellList];
                                ] ];
                        ]
                      ,
                      
                        Then[saveNotebook[notebook["Path"], notebook, "NoCache"->True], Function[Null,
                          EventFire[promise, Resolve, notebook["Path"] ];
                          Delete /@ notebook["Cells"];
                          Delete[notebook];
                        ] ];

                      ];
                    ] ]; 

                ,
                    EventFire[options["Messager"], "Error", "Container is not ready! Try again later"];
                ];
              ];
              ,
              _,
              EventFire[options["Messager"], "Error", "The process is not possible without a working kernel"];
          ];
        ] ];
        
        
        Print["fire!"];
        EventFire[options["Modals"], "SelectBox", <|
            "Promise"->promiseRequest, "message"->"Choose an evaluation kernel", 
            "title"->"Kernel list", "list"->Map[Function[k, k["Name"]], ReleaseHold[options["Kernels"]]]
        |>]; 
    ];

    (**)

   promise 
] ]

End[];
EndPackage[];