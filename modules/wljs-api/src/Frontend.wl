BeginPackage["CoffeeLiqueur`Extensions`API`", {
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Notebook`Transactions`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`",     
    "CoffeeLiqueur`HTTPUHandler`",
    "CoffeeLiqueur`HTTPUHandler`Extensions`",
    "CoffeeLiqueur`UInternal`",
    "CoffeeLiqueur`Extensions`FrontendObject`"
}]


Begin["`Internal`"]

Needs["CoffeeLiqueur`ExtensionManager`" -> "WLJSPackages`"];

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"];
Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];


Needs["CoffeeLiqueur`Extensions`CommandPalette`VFX`" -> "vfx`", FileNameJoin[{DirectoryName[$InputFileName], "VFX.wl"}] ];

Needs["CoffeeLiqueur`Notebook`Loader`" -> "loader`"];

{saveNotebook, loadNotebook, renameNotebook, cloneNotebook}         = {loader`save, loader`load, loader`rename, loader`clone};


failure;

failureQ[failure[message_] ] := message
failureQ[_] := False

EventHandler[AppExtensions`AppEvents// EventClone, {
    "WLJSAPI:ApplyFunctionRequest" -> Function[handlerFunction,
        handlerFunction[apiCall, failureQ];
    ]
}];

getLLMFile := SelectFirst[Flatten[{ EventFire[AppExtensions`AppEvents, "Autocomplete:llm.txt", Null] } ], MatchQ[#, _File]&]

makeResponce[raw_] := If[MatchQ[raw, _failure],
        With[{},
            Echo["API Error >>"]; Echo[raw // First];
            <|
                "Body" -> ExportByteArray[raw // First, "JSON"], 
                "Code" -> 409, 
                "Headers" -> <|
                    "Content-Length" -> Length[ExportByteArray[raw // First, "JSON"] ], 
                    "Connection"-> "Keep-Alive", 
                    "Keep-Alive" -> "timeout=5, max=1000", 
                    "Access-Control-Allow-Origin" -> "*"
                |>
            |>
        ]       
      ,
        With[{r = ExportByteArray[raw, "JSON"]},
            <|
                "Body" -> r, 
                "Code" -> 200, 
                "Headers" -> <|
                    "Content-Length" -> Length[r], 
                    "Connection"-> "Keep-Alive", 
                    "Keep-Alive" -> "timeout=5, max=1000", 
                    "Access-Control-Allow-Origin" -> "*"
                |>
            |>
        ]      
      ];

HTTPAPICall[request_] := With[{type = request["Path"]},
    Echo["HTTP API Request >> "<>type];
    Echo["HTTP API Request Body >> "<>(request["Body"] // ByteArrayToString)];

    With[{raw = apiCall[Join[request, <|"Body"->ImportByteArray[request["Body"], "RawJSON", CharacterEncoding -> "UTF-8"] |> ] ]},
      If[PromiseQ[raw], With[{id = raw[[1]]},
        $promises[id] = <|"ReadyQ" -> False|>;
        Then[raw, Function[result,
            $promises[id] = <|"ReadyQ" -> True, "Result"->result|>;
        ] ];

        makeResponce[<|"Promise"->id|>]
      ],
        makeResponce[raw]
      ]
    ]
]

apiCall[request_] := With[{type = request["Path"]},
    apiCall[request, type]
]


apiCall[_, _] := "Undefined API pattern"

apiCall[request_, "/api/"] := {
    "/api/ready/",
    "/api/notebook/",
    "/api/kernel/",
    "/api/alphaRequest/",
    "/api/promise/",
    "/api/docs/"
}

$promises = <||>;

(* 
   /api/promise/ - Check status of async operations
   
   Some API calls return a Promise ID instead of immediate results.
   Use this endpoint to poll for the result.
   
   Request: {"Promise": "promise-id-string"}
   Response (pending): {"ReadyQ": false}
   Response (ready): {"ReadyQ": true, "Result": <actual result>}
   Error: "Missing promise or already resolved"
*)
apiCall[request_, "/api/promise/"] := With[{id = request["Body"]["Promise"]},
    If[MissingQ[$promises[id] ], failure["Missing promise or already resolved"],
        If[TrueQ[$promises[id]["ReadyQ"] ] ,
            With[{res = $promises[id]},
                $promises[id] = .;
                res
            ]
        ,
            $promises[id]
        ]
    ]
]

wolframAlphaRequest[query_String] := With[{str = ImportString[ExportString[
 WolframAlpha[query, "ShortAnswer"], 
  "Table",   CharacterEncoding -> "ASCII"
 ],  "String"]},
  If[!StringQ[str], failure["Failed request"],
    If[StringLength[str] > 1000, 
      StringTake[str, Min[StringLength[str], 1000] ]<>"..."
    ,
      str
    ]
  ]
];

(* 
   /api/alphaRequest/ - Query Wolfram Alpha for short answers
   
   Request: {"Query": "what is the capital of France"}
   Response: "Paris, Île-de-France, France" (string, max 1000 chars)
   Error: "Failed request"
*)
apiCall[request_, "/api/alphaRequest/"] := With[{query = request["Body"]["Query"]},
    wolframAlphaRequest[query]
]

(* 
   /api/ready/ - Check if the API server is ready
   
   Request: {} (empty body)
   Response: {"ReadyQ": true}
*)
apiCall[request_, "/api/ready/"] := <|"ReadyQ" -> True|>


apiCall[request_, "/api/notebook/"] := {
    "/api/notebook/list/",
    "/api/notebook/focused/",
    "/api/notebook/cells/",
    "/api/notebook/new/"
}

apiCall[request_, "/api/docs/"] := {
    "/api/docs/find/"
}

getNLinesAfter[url_, query_, n_:40] := Module[{stream = OpenRead[url], skipping = False},
  If[!StringQ[Find[stream, query]], Close[stream]; Return[$Failed]];
  With[{res = StringRiffle[Table[With[{line = ReadLine[stream]},
    If[StringMatchQ[line, (StartOfString~~"# "~~___) | "Please visit the official [Wolfram Language Reference]"~~___] || skipping, skipping = True; Nothing, line]
  ], {n}], "\n"]},
    Close[stream];
    res
  ]
]


apiCall[request_, "/api/docs/find/"] := With[{
    query = request["Body"]["Query"], 
    number = ToExpression@Lookup[request["Body"], "LinesCount", 40]
}, {
    found = getNLinesAfter[getLLMFile, "# "<>StringTrim[query], number]
},
    If[!StringQ[found], failure["No results"], found]
]

(* 
   /api/notebook/list/ - List all notebooks known to the application
   
   Request: {} (empty body)
   Response: [{"Id": "notebook-hash", "Opened": true/false, "Path": "/path/to/file.wln"}, ...]
*)
apiCall[request_, "/api/notebook/list/"] := With[{},
    <|
        "Id"-> #["Hash"],
        "Opened" -> #["Opened"],
        "Path" -> #["Path"]
    |> &/@ Select[Values[nb`HashMap], (Complement[{"Opened", "Path", "Hash"}, #["Properties"] ] === {}) &]
]

apiCall[request_, "/api/notebook/new/"] := With[{body = request["Body"], nb = nb`NotebookObj["Quick"->True, "HaveToSaveAs"->True]},
    If[!TrueQ[body["NoCells"] ],
        cell`CellObj["Data"->"", "Notebook"->nb];
    ];

    nb["Path"] = FileNameJoin[{ AppExtensions`QuickNotesDir, "llm-"<>StringTake[CreateUUID[], 3]<>".wln"}];
    Then[saveNotebook[nb], Echo];
    <|"Id"->nb["Hash"], "PathEncoded"->URLEncode[nb["Path"] ]|>
]


apiCall[request_, "/api/notebook/readyQ/"] := With[{body = request["Body"]},
    If[TrueQ[nb`HashMap[body["Id"] ]["Opened"] ],
        <|"ReadyQ"->True, "Path"->URLEncode[nb`HashMap[body["Id"] ]["Path"] ], "Name"->FileNameTake[nb`HashMap[body["Id"] ]["Path"] ]|>
    ,
        False
    ]
]

(* 
   /api/notebook/focused/ - Return the hash/ID of the currently focused notebook
   
   Request: {} (empty body)
   Response: "notebook-hash"
   Failure: failure["No focused notebook found"]
*)
apiCall[request_, "/api/notebook/focused/"] := With[
   {nb = AppExtensions`AppGlobals["CurrentNotebook"]},
   If[
      TrueQ[nb["Opened"]],
      nb["Hash"],
      failure["No focused notebook found"]
   ]
]


apiCall[request_, "/api/notebook/cells/"] := {
    "/api/notebook/cells/list/",
    "/api/notebook/cells/getlines/",
    "/api/notebook/cells/setlines/",
    "/api/notebook/cells/setlines/batch/",
    "/api/notebook/cells/insertlines/",
    "/api/notebook/cells/focused/",
    "/api/notebook/cells/add/",
    "/api/notebook/cells/add/batch/",
    "/api/notebook/cells/evaluate/",
    "/api/notebook/cells/project/",
    "/api/notebook/cells/delete/"
}


(* 
   /api/notebook/cells/list/ - List all cells in a notebook
   
   Returns metadata for each cell including type, display format, and line count.
   Use this to get cell IDs for subsequent operations.
   
   Request: {"Notebook": "notebook-hash-id"}
   Response: [
     {
       "Id": "cell-hash-id",
       "Type": "Input" | "Output",
       "Display": "codemirror" | "markdown" | "js" | "html" | ...,
       "Lines": 5,
       "FirstLine": "Plot[Sin[x], {x, 0, 2Pi}]"
     },
     ...
   ]
   Error: "Notebook is missing"
*)
apiCall[request_, "/api/notebook/cells/list/"] := Module[{body = request["Body"]},
    With[
        {notebook = nb`HashMap[ body["Notebook"] ]},
        If[!MatchQ[notebook, _nb`NotebookObj], Return[failure["Notebook is missing"], Module] ];
        With[{cells = notebook["Cells"]},
            <|
                "Id"-> #["Hash"],
                "Type" -> #["Type"],
                "Display" -> #["Display"],
                "Lines" -> StringCount[#["Data"], "\n"]+1,
                "FirstLine" -> If[TrueQ[#["Overflow"] ], "[TOO LONG TO BE RENDERED]", StringExtract[#["Data"], "\n"->1] ]
            |> &/@ cells    
        ]
    ]
]



(* 
   /api/notebook/cells/focused/ - Get the currently focused cell and selection
   
   Returns information about the cell that has user focus, including
   which lines are selected (useful for targeted edits).
   Lines start from 1, not from 0.
   
   Request: {"Notebook": "notebook-hash-id"}
   Response: {
     "Id": "cell-hash-id",
     "Type": "Input",
     "Display": "codemirror",
     "Lines": 10,
     "FirstLine": "f[x_] := ...",
     "SelectedLines": [3, 5] or null  // [startLine, endLine] if text selected
   }
   Error: "Notebook is missing" | "Nothing is focused"
*)
apiCall[request_, "/api/notebook/cells/focused/"] := Module[{body = request["Body"]},
    With[
        {notebook = nb`HashMap[ body["Notebook"] ]},
        If[!MatchQ[notebook, _nb`NotebookObj], Return[failure["Notebook is missing"], Module] ];
        With[{cell = notebook["FocusedCell"], ranges = notebook["FocusedCellSelection"]},
            If[MatchQ[cell, _cell`CellObj], With[{data = cell["Data"]}, <|
                "Id"-> cell["Hash"],
                "Type" -> cell["Type"],
                "Display" -> cell["Display"],
                "Lines" -> StringCount[data, "\n"]+1,
                "FirstLine" -> StringExtract[data, "\n"->1],
                "SelectedLines" -> If[ListQ[ranges], 
                    {
                        StringCount[StringTake[data, Min[ranges[[1]], StringLength[data] ] ], "\n"] + 1,
                        StringCount[StringTake[data, Min[ranges[[2]], StringLength[data] ] ], "\n"] + 1
                    },
                    Null
                ]
            |>],
                failure["Nothing is focused"]
            ]
        ]
    ]
]

(* 
   /api/notebook/cells/getlines/ - Read specific lines from a cell
   
   Retrieves content from a range of lines in a cell.
   Line numbers are 1-indexed.
   From and To are 1-indexed and inclusive
   
   Request: {"Cell": "cell-hash-id", "From": 1, "To": 5}
   Response: "line1\nline2\nline3\nline4\nline5" (string with newlines)
   Error: "Cell not found" | "From or To is not a number"
*)
apiCall[request_, "/api/notebook/cells/getlines/"] := Module[{body = request["Body"]},
    With[
        {
            cell = cell`HashMap[ body["Cell"] ],
            from = body["From"],
            to = body["To"]
        },
        If[!MatchQ[cell, _cell`CellObj], Return[failure["Cell not found"], Module] ];
        If[!NumberQ[from] || !NumberQ[to], Return[failure["From or To is not a number"], Module] ];
        StringRiffle[StringSplit[cell["Data"], "\n", All][[from ;; UpTo[to] ]], "\n"]
    ]
]

deleteCell[cell_] := If[TrueQ[cell["Notebook"]["Opened"] ],
                (* use interactive notebook API. for ex. for collecting trashed cell *)
                EventFire[cell["Notebook"]["Controller"], "DeleteACell", cell ];
            ,
                (* do it directly *)
                Delete[cell ];
            ];

updateCellContent[cell_, newData_] :=  If[TrueQ[cell["Notebook"]["Opened"] ],
                (* use interactive notebook API. for updating lively *)
                EventFire[cell, "ChangeContent", newData ];
            ,
                (* directly set the property *)
                cell["Data"] = newData;
            ];


makeMagic[cell_] := With[{notebook = cell["Notebook"]},
    If[TrueQ[notebook["Opened"] ],
        WebUISubmit[vfx`MagicWand[ "frame-"<>cell["Hash"] ], notebook["Socket"] ];
    ];
]


(* 
   /api/notebook/cells/setlines/ - Replace a range of lines in a cell
   
   Replaces lines From (inclusive) through To (inclusive) with new content.
   Line numbers are 1-indexed. Content replaces the entire range.
   
   Request: {
     "Cell": "cell-hash-id",
     "From": 3,
     "To": 5,
     "Content": "new line 3\nnew line 4"  // can be fewer/more lines than replaced
   }
   Response: "Lines were set"
   Error: "Cell not found" | "From or To is not a number" | "Cannot edit output cells"
*)
apiCall[request_, "/api/notebook/cells/setlines/"] := Module[{body = request["Body"]},
    With[
        {
            cell = cell`HashMap[ body["Cell"] ],
            from = body["From"],
            to = body["To"],
            content = body["Content"]
        },
        If[!MatchQ[cell, _cell`CellObj], Return[failure["Cell not found"], Module] ];
        If[!NumberQ[from] || !NumberQ[to], Return[failure["From or To is not a number"], Module] ];
        If[cell["Type"] === "Output", Return[failure["Cannot edit output cells"], Module] ];

        
        With[{lines = StringSplit[cell["Data"], "\n", All] }, With[{
            before = If[from-1 > 0, Take[lines, from-1], {}],
            after = If[to==Length[lines], {}, Drop[lines, to] ]
        },
        {
            newData = StringRiffle[Flatten[{before, content, after}], "\n"]   
        },
            
            updateCellContent[cell, newData];
            makeMagic[cell];
            
            "Lines were set"
        ] ]
    ]
]

(* 
   /api/notebook/cells/insertlines/ - Insert new lines without replacing existing content
   
   Inserts content after the specified line number.
   After: 0 inserts at the beginning, After: n inserts after line n.
   
   Request: {
     "Cell": "cell-hash-id",
     "After": 5,           // insert after line 5 (0 = beginning)
     "Content": "new line 1\nnew line 2"
   }
   Response: "Lines were inserted"
   Error: "Cell not found" | "After must be a number" | "Content must be a string" | "Cannot edit output cells"
*)
apiCall[request_, "/api/notebook/cells/insertlines/"] := Module[{body = request["Body"]},
    With[
        {
            cell = cell`HashMap[ body["Cell"] ],
            after = body["After"],
            content = body["Content"]
        },
        If[!MatchQ[cell, _cell`CellObj], Return[failure["Cell not found"], Module] ];
        If[!NumberQ[after], Return[failure["After must be a number"], Module] ];
        If[!StringQ[content], Return[failure["Content must be a string"], Module] ];
        If[cell["Type"] === "Output", Return[failure["Cannot edit output cells"], Module] ];

        With[{lines = StringSplit[cell["Data"], "\n", All]},
            With[{
                before = If[after > 0, Take[lines, Min[after, Length[lines]]], {}],
                afterLines = If[after >= Length[lines], {}, Drop[lines, after]]
            },
            With[{
                newData = StringRiffle[Flatten[{before, content, afterLines}], "\n"]
            },
                updateCellContent[cell, newData];
                makeMagic[cell];

                "Lines were inserted"
            ] ]
        ]
    ]
]

(* 
   /api/notebook/cells/setlines/batch/ - Apply multiple non-overlapping edits in one call
   
   Efficiently applies multiple line replacements to a single cell.
   Changes must not have overlapping line ranges.
   Changes are automatically sorted and applied bottom-to-top to preserve indices.
   From and To are 1-indexed and inclusive
   
   Request: {
     "Cell": "cell-hash-id",
     "Changes": [
       {"From": 10, "To": 12, "Content": "replaced lines 10-12"},
       {"From": 5, "To": 5, "Content": "replaced line 5"},
       {"From": 1, "To": 2, "Content": "replaced lines 1-2"}
     ]
   }
   Response: {"Applied": 3, "Message": "Batch lines were set"}
   Error: "Cell not found" | "Changes must be a list" | "Cannot edit output cells" |
          "Each change must have numeric From, To and string Content" |
          "Changes have overlapping line ranges"
*)
apiCall[request_, "/api/notebook/cells/setlines/batch/"] := Module[{body = request["Body"]},
    With[
        {
            cell = cell`HashMap[ body["Cell"] ],
            changes = body["Changes"]
        },
        If[!MatchQ[cell, _cell`CellObj], Return[failure["Cell not found"], Module] ];
        If[!ListQ[changes], Return[failure["Changes must be a list"], Module] ];
        If[cell["Type"] === "Output", Return[failure["Cannot edit output cells"], Module] ];
        If[Length[changes] === 0, Return["No changes to apply", Module] ];
        
        (* Validate all changes have required fields *)
        If[!AllTrue[changes, (NumberQ[#["From"]] && NumberQ[#["To"]] && StringQ[#["Content"]]) &],
            Return[failure["Each change must have numeric From, To and string Content"], Module]
        ];
        
        (* Sort changes by From line descending to apply from bottom to top *)
        With[{sortedChanges = SortBy[changes, -#["From"] &]},
            (* Check for overlapping ranges *)
            If[Length[sortedChanges] > 1 && !AllTrue[Partition[sortedChanges, 2, 1], (#[[1]]["From"] > #[[2]]["To"]) &],
                Return[failure["Changes have overlapping line ranges"], Module]
            ];
            
            (* Apply changes from bottom to top *)
            With[{lines = StringSplit[cell["Data"], "\n", All]},
                With[{newLines = Fold[
                    Function[{currentLines, change},
                        With[{
                            from = change["From"],
                            to = change["To"],
                            content = change["Content"]
                        },
                            With[{
                                before = If[from - 1 > 0, Take[currentLines, from - 1], {}],
                                after = If[to >= Length[currentLines], {}, Drop[currentLines, to]]
                            },
                                Flatten[{before, content, after}]
                            ]
                        ]
                    ],
                    lines,
                    sortedChanges
                ]},
                    updateCellContent[cell, StringRiffle[newLines, "\n"]];
                    makeMagic[cell];

                    <|"Applied" -> Length[changes], "Message" -> "Batch lines were set"|>
                ]
            ]
        ]
    ]
]

(* 
   /api/notebook/cells/delete/ - Delete a cell from the notebook
   
   Removes the specified input cell. Output cells cannot be deleted directly;
   delete their parent input cell instead.
   
   Request: {"Cell": "cell-hash-id"}
   Response: "Removed 1 cell"
   Error: "Cell is missing" | "Cannot delete output cell. Delete parent input cell"
*)
apiCall[request_, "/api/notebook/cells/delete/"] := Module[{body = request["Body"]},
    With[
        {cell = cell`HashMap[ body["Cell"] ]},
        If[!MatchQ[cell, _cell`CellObj], Return[failure["Cell is missing"], Module] ];
        If[cell["Type"] === "Output", Return[failure["Cannot delete output cell. Delete parent input cell"], Module] ];
        deleteCell[cell];
        "Removed 1 cell"
    ]
]


(* 
   /api/notebook/cells/add/ - Add a new cell to the notebook
   
   Creates a new cell with the specified content. Position is determined by
   After (insert after cell) or Before (insert before cell) parameters.
   If neither specified, appends to notebook.
   
   Request: {
     "Notebook": "notebook-hash-id",
     "Content": "Plot[Sin[x], {x, 0, 2Pi}]",
     "After": "cell-hash-id",      // optional: insert after this cell
     "Before": "cell-hash-id",     // optional: insert before this cell
     "Type": "Input",              // optional, default: "Input"
     "Display": "codemirror",      // optional, default: "codemirror"
     "Hidden": false,              // optional, default: false
     "Id": "custom-uuid"           // optional: specify cell ID
   }
   Response: "created-cell-hash-id"
   Error: "Notebook is missing"
*)
apiCall[request_, "/api/notebook/cells/add/"] := Module[{body = request["Body"], uuid = CreateUUID[]},
    With[
        {notebook = nb`HashMap[ body["Notebook"] ]},
        If[!MatchQ[notebook, _nb`NotebookObj], Return[failure["Notebook is missing"], Module] ];

        If[MatchQ[body["Id"], _String], uuid = body["Id"] ];

        With[{
            after = cell`HashMap[ body["After"] ], 
            before = cell`HashMap[ body["Before"] ],
            display = Lookup[body, "Display", "codemirror"],
            type = Lookup[body, "Type", "Input"],
            hidden = Lookup[body, "Hidden", False]
        },
            If[!MatchQ[after, _cell`CellObj], 
                If[!MatchQ[before, _cell`CellObj],
                    With[{new = cell`CellObj["Notebook"->notebook, "Type"->type, "Display"->display, "Props"-><|"Hidden"->hidden|>, "Data"->body["Content"], "Hash"->uuid ]},
                        makeMagic[new];
                        uuid
                    ]                
                ,
                    With[{new = cell`CellObj["Notebook"->notebook, "Type"->type, "Display"->display, "Props"-><|"Hidden"->hidden|>, "Data"->body["Content"], "Hash"->uuid, "Before"->before]},
                         makeMagic[new];
                        uuid
                    ] 
                ]                                        
            ,
                With[{new = cell`CellObj["Notebook"->notebook, "Type"->type, "Display"->display, "Props"-><|"Hidden"->hidden|>, "Data"->body["Content"], "Hash"->uuid, "After"->after]},
                     makeMagic[new];
                    uuid
                ] 
            ]
        ]

    ]
]

(* 
   /api/notebook/cells/add/batch/ - Add multiple cells in sequence
   
   Creates multiple cells in a single call. Cells are inserted sequentially,
   each after the previous one. Useful for adding related blocks of code.
   
   Request: {
     "Notebook": "notebook-hash-id",
     "After": "anchor-cell-id",    // optional: insert after this cell
     "Before": "anchor-cell-id",   // optional: first cell before this, rest chain after
     "Cells": [
       {"Content": "cell 1 code", "Type": "Input", "Display": "codemirror"},
       {"Content": "cell 2 code"},  // Type/Display/Hidden are optional per cell
       {"Content": "cell 3 code", "Id": "custom-id", "Hidden": true}
     ]
   }
   Response: {"Created": ["uuid-1", "uuid-2", "uuid-3"], "Count": 3}
   Error: "Notebook is missing" | "Cells must be a list" | "Cells list is empty" |
          "Each cell must have a string Content field"
*)
apiCall[request_, "/api/notebook/cells/add/batch/"] := Module[{body = request["Body"], createdIds = {}},
    With[
        {notebook = nb`HashMap[ body["Notebook"] ]},
        If[!MatchQ[notebook, _nb`NotebookObj], Return[failure["Notebook is missing"], Module] ];
        
        With[{
            cells = body["Cells"],
            anchorAfter = cell`HashMap[ body["After"] ],
            anchorBefore = cell`HashMap[ body["Before"] ]
        },
            If[!ListQ[cells], Return[failure["Cells must be a list"], Module] ];
            If[Length[cells] === 0, Return[failure["Cells list is empty"], Module] ];
            
            (* Validate all cells have Content *)
            If[!AllTrue[cells, StringQ[#["Content"]] &],
                Return[failure["Each cell must have a string Content field"], Module]
            ];
            
            (* Determine starting anchor *)
            Module[{currentAnchor = Null, insertMode = "after"},
                If[MatchQ[anchorAfter, _cell`CellObj],
                    currentAnchor = anchorAfter;
                    insertMode = "after";
                ,
                    If[MatchQ[anchorBefore, _cell`CellObj],
                        currentAnchor = anchorBefore;
                        insertMode = "before";
                    ]
                ];
                
                (* Create cells sequentially *)
                Do[
                    With[{
                        cellData = cells[[i]],
                        uuid = If[StringQ[cells[[i]]["Id"]], cells[[i]]["Id"], CreateUUID[]]
                    },
                        With[{
                            display = Lookup[cellData, "Display", "codemirror"],
                            type = Lookup[cellData, "Type", "Input"],
                            hidden = Lookup[cellData, "Hidden", False]
                        },
                            If[currentAnchor === Null,
                                (* No anchor - append to notebook *)
                                With[{new = cell`CellObj["Notebook"->notebook, "Type"->type, "Display"->display, "Props"-><|"Hidden"->hidden|>, "Data"->cellData["Content"], "Hash"->uuid]},
                                    AppendTo[createdIds, uuid];
                                    currentAnchor = new;
                                     makeMagic[new];
                                    insertMode = "after";
                                ]
                            ,
                                If[insertMode === "after",
                                    With[{new = cell`CellObj["Notebook"->notebook, "Type"->type, "Display"->display, "Props"-><|"Hidden"->hidden|>, "Data"->cellData["Content"], "Hash"->uuid, "After"->currentAnchor]},
                                        AppendTo[createdIds, uuid];
                                         makeMagic[new];
                                        currentAnchor = new;
                                    ]
                                ,
                                    (* First cell goes before anchor, rest chain after it *)
                                    With[{new = cell`CellObj["Notebook"->notebook, "Type"->type, "Display"->display, "Props"-><|"Hidden"->hidden|>, "Data"->cellData["Content"], "Hash"->uuid, "Before"->currentAnchor]},
                                        AppendTo[createdIds, uuid];
                                        currentAnchor = new;
                                         makeMagic[new];
                                        insertMode = "after"; (* subsequent cells go after the first *)
                                    ]
                                ]
                            ]
                        ]
                    ],
                    {i, Length[cells]}
                ];
                
                <|"Created" -> createdIds, "Count" -> Length[createdIds]|>
            ]
        ]
    ]
]

(* create directly an output cell with the content *)
apiCall[request_, "/api/notebook/cells/add/markdown/"] := Module[{body = request["Body"], uuid = CreateUUID[]},
    With[
        {notebook = nb`HashMap[ body["Notebook"] ]},
        If[!MatchQ[notebook, _nb`NotebookObj], Return[failure["Notebook is missing"], Module] ];

        If[MatchQ[body["Id"], _String], uuid = body["Id"] ];

        With[{after = cell`HashMap[ body["After"] ], before = cell`HashMap[ body["Before"] ]},
            If[!MatchQ[after, _cell`CellObj], 
                If[!MatchQ[before, _cell`CellObj],
                    With[{new = cell`CellObj["Notebook"->notebook, "Type"->"Input", "Data"->StringJoin[".md\n", body["Content"] ], "Props"-><|"Hidden"->True|>, "Hash"->uuid ]},
                        cell`CellObj["Notebook"->notebook, "After"->new, "Type"->"Output", "Data"->body["Content"], "Display"->"markdown" ];
                        new["Hash"]
                    ]                 
                ,
                    With[{new = cell`CellObj["Notebook"->notebook, "Type"->"Input", "Data"->StringJoin[".md\n", body["Content"] ], "Before"->before, "Props"-><|"Hidden"->True|>, "Hash"->uuid ]},
                        cell`CellObj["Notebook"->notebook, "After"->new, "Type"->"Output", "Data"->body["Content"], "Display"->"markdown"];
                        new["Hash"]
                    ]                
                ]                                       
            ,
                With[{new = cell`CellObj["Notebook"->notebook, "Type"->"Input", "Data"->StringJoin[".md\n", body["Content"] ], "After"->after, "Props"-><|"Hidden"->True|>, "Hash"->uuid ]},
                    cell`CellObj["Notebook"->notebook, "After"->new, "Type"->"Output", "Data"->body["Content"], "Display"->"markdown"];
                    new["Hash"]
                ]             
            ]
        ]

    ]
]

(* create directly an output cell with the content *)
apiCall[request_, "/api/notebook/cells/add/js/"] := Module[{body = request["Body"], uuid = CreateUUID[]},
    With[
        {notebook = nb`HashMap[ body["Notebook"] ]},
        If[!MatchQ[notebook, _nb`NotebookObj], Return[failure["Notebook is missing"], Module] ];

        If[MatchQ[body["Id"], _String], uuid = body["Id"] ];

        With[{after = cell`HashMap[ body["After"] ], before = cell`HashMap[ body["Before"] ]},
            If[!MatchQ[after, _cell`CellObj], 
                If[!MatchQ[before, _cell`CellObj], 
                    With[{new = cell`CellObj["Notebook"->notebook, "Type"->"Input", "Data"->StringJoin[".js\n", body["Content"] ], "Props"-><|"Hidden"->True|>, "Hash"->uuid ]},
                        cell`CellObj["Notebook"->notebook, "After"->new, "Type"->"Output", "Data"->body["Content"], "Display"->"js" ];
                        new["Hash"]
                    ]
                ,
                    With[{new = cell`CellObj["Notebook"->notebook, "Type"->"Input", "Data"->StringJoin[".js\n", body["Content"] ], "Before"->before, "Props"-><|"Hidden"->True|>, "Hash"->uuid ]},
                        cell`CellObj["Notebook"->notebook, "After"->new, "Type"->"Output", "Data"->body["Content"], "Display"->"js" ];
                        new["Hash"]
                    ]
                ]                                        
            ,
                With[{new = cell`CellObj["Notebook"->notebook, "Type"->"Input", "Data"->StringJoin[".js\n", body["Content"] ], "After"->after, "Props"-><|"Hidden"->True|>, "Hash"->uuid ]},
                    cell`CellObj["Notebook"->notebook, "After"->new, "Type"->"Output", "Data"->body["Content"], "Display"->"js"];
                    new["Hash"]
                ]             
            ]
        ]

    ]
]

(* create directly an output cell with the content *)
apiCall[request_, "/api/notebook/cells/add/html/"] := Module[{body = request["Body"], uuid = CreateUUID[]},
    With[
        {notebook = nb`HashMap[ body["Notebook"] ]},
        If[!MatchQ[notebook, _nb`NotebookObj], Return[failure["Notebook is missing"], Module] ];

        If[MatchQ[body["Id"], _String], uuid = body["Id"] ];

        With[{after = cell`HashMap[ body["After"] ], before = cell`HashMap[ body["Before"] ]},
            If[!MatchQ[after, _cell`CellObj], 
                If[!MatchQ[before, _cell`CellObj], 
                    With[{new = cell`CellObj["Notebook"->notebook, "Type"->"Input", "Data"->StringJoin[".html\n", body["Content"] ], "Props"-><|"Hidden"->True|>, "Hash"->uuid ]},
                        cell`CellObj["Notebook"->notebook, "After"->new, "Type"->"Output", "Data"->body["Content"], "Display"->"html" ];
                        new["Hash"]
                    ]
                ,
                    With[{new = cell`CellObj["Notebook"->notebook, "Type"->"Input", "Data"->StringJoin[".html\n", body["Content"] ], "Before"->before, "Props"-><|"Hidden"->True|>, "Hash"->uuid ]},
                        cell`CellObj["Notebook"->notebook, "After"->new, "Type"->"Output", "Data"->body["Content"], "Display"->"html"];
                        new["Hash"]
                    ]
                ]                                        
            ,
                With[{new = cell`CellObj["Notebook"->notebook, "Type"->"Input", "Data"->StringJoin[".html\n", body["Content"] ], "After"->after, "Props"-><|"Hidden"->True|>, "Hash"->uuid ]},
                    cell`CellObj["Notebook"->notebook, "After"->new, "Type"->"Output", "Data"->body["Content"], "Display"->"html"];
                    new["Hash"]
                ]             
            ]
        ]

    ]
]

(* 
   /api/notebook/cells/evaluate/ - Evaluate a cell and get output cell IDs
   
   Executes the specified input cell in the notebook's kernel.
   Returns a Promise that resolves to the list of output cell IDs.
   The notebook must be open for evaluation.
   
   Request: {"Cell": "input-cell-hash-id"}
   Response: {"Promise": "promise-id"} - poll /api/promise/ for result
   Final result: [{
       "Id": "cell-hash-id-1",
       "Type": "Input" | "Output",
       "Display": "codemirror" | "markdown" | "js" | "html" | ...,
       "Lines": 5,
       "FirstLine": "Sin[5.3]"
     },
     ...]
   Error: "Cell is missing" | "Can't evaluate cell in a closed notebook. Use /api/kernel/evaluate/ path"
*)
apiCall[request_, "/api/notebook/cells/evaluate/"] := Module[{body = request["Body"]},
    With[
        {cell = cell`HashMap[ body["Cell"] ]},
        {notebook = cell["Notebook"]},
        If[!MatchQ[cell, _cell`CellObj], Return[failure["Cell is missing"], Module] ];
        If[TrueQ[notebook["Opened"] ], 
            With[{controller = notebook["Controller"], socket = notebook["Socket"], promise = Promise[]},
                (*fixme*)
                Block[{Global`$Client = socket}, With[{
                    timer = SetTimeout[
                        EventFire[controller, "Abort", Null];
                        EventFire[promise, Resolve, failure["ERROR: 20 sec timeout. Long evaluation was aborted"] ];                        
                    , 20000]
                },
  
                    Then[EventFire[controller, "NotebookCellEvaluateTemporal", cell], Function[Null,
                        TaskRemove[timer];

                        With[{
                            out = Select[cell`SelectCells[notebook["Cells"], Sequence[cell, __?cell`OutputCellQ] ], cell`OutputCellQ]
                        },
                            EventFire[promise, Resolve, Map[Function[c, <|
                                <|
                                    "Id"-> c["Hash"],
                                    "Type" -> c["Type"],
                                    "Display" -> c["Display"],
                                    "Lines" -> StringCount[c["Data"], "\n"]+1,
                                    "FirstLine" -> If[TrueQ[c["Overflow"] ], "[TOO LONG TO BE RENDERED]", StringExtract[c["Data"], "\n"->1] ]
                                |> 
                            |> ], out] ];
                        ]
                    ] ];
                    promise
                ] ]
            ]
        ,
            (* Can't evaluate cell in a closed notebook *)
            failure["Can't evaluate cell in a closed notebook. Use /api/kernel/evaluate/ path"]
        ]
    ]
]

(* 
   /api/notebook/cells/project/ - Open cell content in a separate window
   
   Projects the cell's content into a standalone window (useful for slides,
   presentations, or focused viewing of graphics/content).
   
   Request: {"Cell": "cell-hash-id"}
   Response: "Window was created"
   Error: "Cell is missing" | "Output cells cannot be projected" | "Can't project cell in a closed notebook"
*)
apiCall[request_, "/api/notebook/cells/project/"] := Module[{body = request["Body"]},
    With[
        {cell = cell`HashMap[ body["Cell"] ]},
        {notebook = cell["Notebook"]},
        If[!MatchQ[cell, _cell`CellObj], Return[failure["Cell is missing"], Module] ];
        If[cell["Type"] === "Output", Return[failure["Output cells cannot be projected"], Module] ];
        If[TrueQ[notebook["Opened"] ], 
            With[{controller = notebook["Controller"], socket = notebook["Socket"]},
                (*fixme*)
                Block[{Global`$Client = socket},
                    EventFire[controller, "NotebookCellProject", cell];
                    "Window was created"
                ]
            ]
        ,
            (* Can't evaluate cell in a closed notebook *)
            failure["Can't project cell in a closed notebook"]
        ]
    ]
]


apiCall[request_, "/api/kernel/"] := {
    "/api/kernel/evaluate/"
}

(* 
   /api/kernel/evaluate/ - Evaluate an expression in the kernel directly
   
   Evaluates a Wolfram Language expression without needing an open notebook.
   Uses the first available ready kernel, or a specific kernel if specified.
   Returns a Promise that resolves to the result as a string.
   
   Request: {
     "Expression": "1 + 1",           // Wolfram Language expression to evaluate
     "Kernel": "kernel-hash-id"       // optional: use specific kernel
   }
   Response: {"Promise": "promise-id"} - poll /api/promise/ for result
   Final result: "2" (string representation of the result)
   Error: "No kernel is ready for evaluation"
*)
apiCall[request_, "/api/kernel/evaluate/"] := Module[{body = request["Body"]},
    With[
        {k = If[StringQ[body["Kernel"] ], 
            SelectFirst[AppExtensions`KernelList, (#["Hash"] === body["Kernel"]) &],  
            SelectFirst[AppExtensions`KernelList, (TrueQ[#["ContainerReadyQ"] ] && TrueQ[#["ReadyQ"] ]) &]
        ],
            expr = body["Expression"],
            promise = Promise[],

            dir = Lookup[body, "Directory", Null]
        },

        If[MissingQ[k], Return[failure["No kernel is ready for evaluation"], Module] ];

        If[dir === Null,
            GenericKernel`Send[k, 
                EventFire[Internal`Kernel`RemoteEvent[ promise // First ], Resolve, ToString[CheckAbort[TimeConstrained[ToExpression[expr, InputForm], 20, $TimedOut], $Aborted ], InputForm] ];
            ];        
        ,
            GenericKernel`Send[k, 
                With[{prev = Directory[]}, 
                    SetDirectory[dir];
                    EventFire[Internal`Kernel`RemoteEvent[ promise // First ], Resolve, ToString[CheckAbort[TimeConstrained[ToExpression[expr, InputForm], 20, $TimedOut], $Aborted ], InputForm] ];
                    SetDirectory[prev];
                ];
            ];        
        ];

        promise
    ]
]


existsOrEmpty[settings_, field_] := If[KeyExistsQ[settings, field], settings[field], {}]

existsOrTrue[settings_, field_] := If[KeyExistsQ[settings, field], settings[field], True]

With[{http = AppExtensions`HTTPUHandler},
    http["MessageHandler", "ExternalAPI"] = AssocUMatchQ[<|"Path" -> ("/api/"~~___)|>] -> HTTPAPICall;
];

End[]
EndPackage[]

