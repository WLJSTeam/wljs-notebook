BeginPackage["CoffeeLiqueur`Extensions`ExportImport`Markdown`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`", 
    "CoffeeLiqueur`Misc`WLJS`Transport`"
}];


export;
decode;

Begin["`Private`"]

Needs["CoffeeLiqueur`ExtensionManager`" -> "WLJSPackages`"];
Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

folder = $InputFileName // DirectoryName;
rootFolder = folder // ParentDirectory // ParentDirectory;

localRoot = DirectoryName[$InputFileName];

Needs["CoffeeLiqueur`Notebook`Loader`" -> "loader`"];

{saveNotebook, loadNotebook, renameNotebook, cloneNotebook}         = {loader`save, loader`load, loader`rename, loader`clone};


generateMarkdown = ImportComponent[FileNameJoin[{localRoot, "Markdown.wlx"}] ];

export[outputPath_, notebookOnLine_nb`NotebookObj, path_, name_, ext_, settings_, proto_] := With[{},
    Module[{filename = outputPath},
        If[filename === Null, filename = path];
        If[DirectoryQ[filename], filename = FileNameJoin[{filename, name}] ];
        If[!StringMatchQ[filename, __~~".md"],  filename = filename <> ".md"];
        If[filename === ".md", filename = name<>filename];
        If[DirectoryName[filename] === "", filename = FileNameJoin[{path, filename}] ];

        Export[filename, generateMarkdown["Settings"->settings, "Notebook" -> notebookOnLine, "Title"->name] // ToStringRiffle, "Text"]
    ]
]

export[controls_, modals_, messager_, client_, notebookOnLine_nb`NotebookObj, path_, name_, ext_, settings_, proto_] := With[{

},
    With[{

    },
        
        With[{
            p = Promise[]
        },

       EventFire[modals, "SaveDialog", <|
           "Promise"->p,
           "title"->"Export as markdown document",
           "properties"->{"createDirectory", "dontAddToRecent"},
           "filters"->{<|"extensions"->"md", "name"->"Markdown Document"|>}
       |>];

       Then[p, Function[result, 
           Module[{filename = If[StringQ[result], URLDecode @ result, URLDecode @ result["filePath"] ] },
               If[!StringQ[filename] || TrueQ[result["canceled"] ] || StringLength[filename] === 0, 
                 Echo["Cancelled saving"]; Echo[result];
                 Return[];
               ];
               
                    If[!StringMatchQ[filename, __~~".md"],  filename = filename <> ".md"];
                    If[filename === ".md", filename = name<>filename];
                    If[DirectoryName[filename] === "", filename = FileNameJoin[{path, filename}] ];

                    Export[filename, generateMarkdown["Settings"->settings, "Notebook" -> notebookOnLine, "Title"->name] // ToStringRiffle, "Text"];
                    EventFire[messager, "Saved", "Exported to "<>filename];
                ];
            ], Function[result, Echo["Exported Markdown"]; Echo[result] ] ];
            
        ]
    ]
]



lang["mathematica"] := ""
lang["wolfram"] := ""
lang["wl"] := ""
lang["js"] := ".js\n"
lang["javascript"] := ".js\n"
lang["jsx"] := ".wlx\n"
lang["html"] := ".html\n"
lang["reveal"] := ".slide\n"
lang["bash"] := ".sh\n"
lang["shell"] := ".sh\n"
lang["mermaid"] := ".mermaid\n"
lang["sh"] := ".sh\n"
lang["revealjs"] := ".slide\n"
lang["markdown"] := ".md\n"
lang[any_String] := StringJoin[".", any, "\n"]

codeBlock;
codeBlock["mermaid", rest_] := codeBlockInPlace["mermaid", rest] 

findFile[filename_, d_] := With[{},
  Echo["Trying to find ..."];
  Echo[filename];
  Echo["at"];
  Echo[d];  

  With[{result = {FileNames[filename, d, 3], "Missing"} // Flatten // First},
      With[{splitted = FileNameSplit[result]},
        StringRiffle[URLEncode /@ (Drop[splitted, Min[FileNameSplit[d] // Length, Length[splitted]-1] ]), "/"] 
      ]
  ] 
]

fixImages[s_String, r_] := With[{},
  StringReplace[s, {
    RegularExpression["!(\\[[\\w|\\d|\\-| |_]*\\])\\(([^\\[\\]]*)\\)"] :> With[{
    label = "$1",
    url = "$2"
},
      Echo["Fixing..."<>" $1"<>" with $2"];
      Echo[r];

      If[StringTake[url, 1] == "/",
        With[{
            dest = findFile[Last[ URLParse[url]["Path"] ], r]
          },
            StringTemplate["![``](/``)"]["image", dest]
        ]        
      ,
        If[StringTake[url, Min[4, StringLength[url] ] ] === "http",
          StringTemplate["![``](``)"][label, url]
        ,
          With[{
            dest = findFile[Last[ URLParse[url]["Path"] ], r]
          },
            StringTemplate["![``](/``)"]["image", dest]
          ]
        ]
        
      ]
    ]

  ,

    RegularExpression["!\\[\\[([\\w|\\d|\\-| |\\.|\\||_]*)\\]\\]"] :> With[{
      url = First[ StringSplit["$1", "|"] ]
    },
      With[{
        dest = findFile[Last[ URLParse[url]["Path"] ],r ]
      },
        StringTemplate["![``](/``)"]["image", dest]
      ]
    ]
  
  }]
]

decode[path_String, OptionsPattern[] ] := Module[{str, cells, objects, notebook, store, root},
With[{
    dir = DirectoryName[path],
    name = FileBaseName[path],
    promise = Promise[],
    query = OptionValue["Query"],
    msg = OptionValue["Messager"],
    client = OptionValue["Client"],
    spinner = Notifications`Spinner["Topic"->"Converting to notebook", "Body"->"Please, wait"](*`*)
}, 
    EventFire[msg, spinner, True];

    str = Import[path, "Text"];

    Echo["Query"];
    Echo[query];

    root = DirectoryName[path];
    Echo["Root: "];
    Echo[root];

    If[KeyExistsQ[query, "root"],
      Echo["Decoder. found root"];
      Echo[  URLDecode[query["root"] ] ];
      root = URLDecode[query["root"] ];
    ];

    Echo["Root: "];
    Echo[root];

    notebook = nb`NotebookObj[];
    With[{n = notebook},
        n["Quick"] = True;
        n["HaveToSaveAs"] = True;
        n["Path"] = FileNameJoin[{dir, name<>".wln"}];
        n["ObjectFields"] = {"Objects", "Symbols", "Storage", "ExcalidrawImages", "RuntimeCache", "ZIPArchive"};
    ];


    With[{list = With[{s = StringSplit[
          str, 
          p : (("```"~~WordCharacter..~~"\n") | ("```")) -> p
        ]},
          SequenceReplace[Map[Function[ss,
            With[{t = StringTrim[ss]},
              With[{tag = StringTake[t, Min[3, StringLength[t]]]},
                {StringTrim[tag] === "```", t}
              ]
            ]
          ], s] // Flatten, {True, c_, False, b_, True, d_} :> codeBlock[StringDrop[c, 3], b] ]
      ]},
      Map[
        Function[
          item, 
          Switch[
            Head[item],
            codeBlock,

              cell`CellObj[
                "Data" -> StringJoin[lang[item[[1]] // StringTrim], item[[2]]], 
                "Type" -> "Input", 
                "Notebook" -> notebook
              ],

            codeBlockInPlace,
              cell`CellObj[
                "Data" -> StringJoin[lang[item[[1]] // StringTrim], item[[2]]], 
                "Type" -> "Input", 
                "Notebook" -> notebook, 
                "Props" -> <|"Hidden" -> True|>
              ];
              cell`CellObj[
                "Data" -> item[[2]], 
                "Type" -> "Output", 
                "Display" -> "mermaid", 
                "Notebook" -> notebook
              ];
            ,


            String,
              cell`CellObj[
                "Data" -> StringJoin[".md\n", fixImages[item, root] ], 
                "Type" -> "Input", 
                "Notebook" -> notebook, 
                "Props" -> <|"Hidden" -> True|>
              ];
              cell`CellObj[
                "Data" -> fixImages[item, root], 
                "Type" -> "Output", 
                "Display" -> "markdown", 
                "Notebook" -> notebook
              ];
            ,
            _,
              Echo["skip"];
          ]
        ], 
        list
      ]
    ];    

    Echo["SAVING////////"];
    Then[saveNotebook[notebook["Path"], notebook, "NoCache"->True], Function[Null,

      EventFire[spinner["Promise"], Resolve, True];
      EventFire[promise, Resolve, notebook["Path"] ];
      Delete /@ notebook["Cells"];
      Delete[notebook];
    ] ];

   promise 
] ]

Options[decode] = {"Messager"->"", "Client"->Null, "Query" -> <||>}


End[]
EndPackage[]
