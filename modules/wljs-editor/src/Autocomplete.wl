BeginPackage["CoffeeLiqueur`Extensions`Autocomplete`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`", 
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`", 
    "CoffeeLiqueur`WLJS`Tools`","CoffeeLiqueur`WLJS`Transport`",    
    "CoffeeLiqueur`HTTPUHandler`",
    "CoffeeLiqueur`HTTPUHandler`Extensions`",
    "CoffeeLiqueur`UInternal`",
    "CoffeeLiqueur`UObjects`"
}]


Begin["`Private`"]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];



rootDir = $InputFileName // DirectoryName // ParentDirectory;

defaults = Get[FileNameJoin[{rootDir, "src", "AutocompleteDefaults.wl"}] ];

testEndpoint[path_] := TimeConstrained[With[{test = Import[path, "Text"]},
  TrueQ[StringContainsQ[test, "# Map"]]
], 6, False];

endpoint := endpoint = SelectFirst[{
    "https://wljs.io/llms-full.txt",
    FileNameJoin[{rootDir, "dist", "llm.txt"}]
}, testEndpoint];

EventHandler[AppExtensions`AppEvents// EventClone, {
    "Autocomplete:llm.txt" -> Function[Null,
        File[ endpoint ]
    ]
}];

defaults = Map[Function[p,
    If[KeyExistsQ[p, "info"], 
        Join[p, <|"info"->StringReplace[p["info"], {"\n"->"<br/>", "\[InvisibleSpace]"->""}]|>]
    ,
        p
    ]
], defaults];

EventHandler[AppExtensions`AppEvents// EventClone, {
    "Loader:NewNotebook" ->  (Once[ attachListeners[#] ] &),
    "Loader:LoadNotebook" -> (Once[ attachListeners[#] ] &)
}];


GetDefaults := With[{},
    <|"hash" -> Hash[defaults], "data" -> defaults|>
]

UIAutocompleteConnect; (* private frontend symbol *)

attachListeners[notebook_nb`NotebookObj] := With[{},
    Echo["Attach event listeners to notebook from EXTENSION"];
    EventHandler[notebook // EventClone, {
        "OnWebSocketConnected" -> Function[payload,
            GenericKernel`Send[notebook["Evaluator"]["Kernel"], Unevaluated[
                CoffeeLiqueur`Extensions`Autocomplete`Private`BuildVocabularAsync;
                CoffeeLiqueur`Extensions`Autocomplete`Private`StartTracking;
            ], "Once"->True];
         

            WebUISubmit[UIAutocompleteConnect[Hash[defaults] ], payload["Client"] ];
        ]
    }]; 
]


makeURL[name_] := With[{},
        "https://wljs.io/search?q="<>URLEncode[StringTrim[name] ]
]

DocWindowHashMap = <||>;
initWindow[o_] := With[{uid = CreateUUID[]},
    o["UId"] = uid;
    DocWindowHashMap[uid] = o;
    o
];

CreateUType[DocWindow, initWindow, {}];

DocWindow /: DeleteObject[d_DocWindow] := With[{uid = d["UId"]},
    DocWindowHashMap[uid] = .;
    Delete[d];
]

findDocWindow[cli_] := SelectFirst[Values[DocWindowHashMap], Function[d, d["AssociatedSocket"] === cli] ];

EventHandler["autocompleteFindDoc", Function[label, With[{cli = $CurrentWebSocket}, {w = findDocWindow[cli]},
    If[MissingQ[w],
        With[{doc = DocWindow["Label"->label, "URL"->makeURL[label], "AssociatedSocket"->cli]},
            WebUILocation["/docFind/"<>doc["UId"], cli, "Target"->_];
        ];
    ,
        w["URL"] = makeURL[label];
        w["Refresh"][];
    ]
] ] ];

docsWindow = ImportComponent[FileNameJoin[{rootDir, "templates", "Docs.wlx"}] ];

With[{http = AppExtensions`HTTPUHandler},
    http["MessageHandler", "DocsFinder"] = AssocUMatchQ[<|"Path" -> ("/docFind/"~~___)|>] -> docsWindow;
];


End[]
EndPackage[]
