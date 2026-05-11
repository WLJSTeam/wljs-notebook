BeginPackage["CoffeeLiqueur`Extensions`Excalidraw`", {
    "CoffeeLiqueur`Misc`Events`", 
    "CoffeeLiqueur`Misc`Events`Promise`", 
    "CoffeeLiqueur`Extensions`Communication`", 
    "CoffeeLiqueur`Extensions`FrontendObject`", 
    "CoffeeLiqueur`Misc`WLJS`Transport`"
}]

Begin["`Private`"]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

findNotebook[n_] := Lookup[nb`HashMap, n, Missing[] ]
findNotebook[n_, uid_String] := With[{},
    If[MatchQ[nb`HashMap[n], _nb`NotebookObj],
        nb`HashMap[n]
    ,
        SelectFirst[Values[nb`HashMap], Function[t, KeyExistsQ[t["ExcalidrawImages"], uid] ] ] 
    ]
]

searchAll[uid_String] := With[{r = SelectFirst[(#["ExcalidrawImages"]) &/@ Values[nb`HashMap], Function[t, KeyExistsQ[t, uid] ] ]},
    If[!MissingQ[r], r[uid], Missing[]]
]

get[uid_String, notebook_] := With[{n = findNotebook[notebook, uid]},
    If[MissingQ[n], 
         Echo["ExcalidrawStore >> Notebook is missing"];
        Return[$Failed]
    ];
    Echo["ExcalidrawStore >> Get"];
    With[{w = n["ExcalidrawImages"][uid]},
        If[!StringQ[w],
            Echo["ExcalidrawStore >> Not found, checking all loaded notebooks"];
            With[{f = searchAll[uid]},
                If[!MissingQ[f],
                    Echo["ExcalidrawStore >> Copying image from one notebook to another"];
                    upload[uid, f, n];
                    
                    f
                ,
                    $Failed
                ]
            ]
        ,
            w
        ]
    ]
];

dispose[uid_String, notebook_] := With[{n = findNotebook[notebook, uid]},
    If[MissingQ[n], Echo["ExcalidrawStore >> Notebook is missing"]; Return[$Failed] ];
    Echo["ExcalidrawStore >> Disposed"];
    n["ExcalidrawImages"] = KeyDrop[n["ExcalidrawImages"], uid];
];

upload[uid_String, file_String, notebook_String] := With[{n = findNotebook[notebook]},
    If[MissingQ[n], Echo["ExcalidrawStore >> Notebook is missing"]; Return[$Failed] ];
    Echo["ExcalidrawStore >> Uploaded"];
    If[!AssociationQ[n["ExcalidrawImages"] ], 
        n["ExcalidrawImages"] = <||>;
        n["ObjectFields"] = Join[n["ObjectFields"], {"ExcalidrawImages"}] // DeleteDuplicates;
    ];
    n["ExcalidrawImages"] = Join[n["ExcalidrawImages"] , <|uid -> file|> ];
];


End[]
EndPackage[]
