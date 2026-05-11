BeginPackage["CoffeeLiqueur`Extensions`NotebookStorage`", {
    "CoffeeLiqueur`Extensions`Editor`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`"
}]

Begin["`Internal`"]

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"];

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

EventHandler[NotebookEditorChannel // EventClone,
    {
        "NotebookStoreGetKeys" -> Function[data,
           Echo["NotebookStore :: Get keys"];
           Echo[data];
           With[{promise = data["Promise"], notebook = nb`HashMap[ data["Ref"] ], kernel = GenericKernel`HashMap[ data["Kernel"] ]},
                If[!MemberQ[notebook["Properties"], "Storage"],
                    notebook["Storage"] = <||>;
                    notebook["ObjectFields"] = Join[notebook["ObjectFields"], {"Storage"}] // DeleteDuplicates;
                ];

                With[{keys = notebook["Storage"] // Keys},
                    GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, keys] ];
                ];
           ];
        ],

        "NotebookStoreGet" -> Function[data,
           With[{promise = data["Promise"], notebook = nb`HashMap[ data["Ref"] ], kernel = GenericKernel`HashMap[ data["Kernel"] ]},
                With[{value = notebook["Storage", data["Key"] ]},
                    GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, value] ];
                ];
           ];
        ],

        "NotebookStoreSet" -> Function[data,
           With[{promise = data["Promise"], payload = data["Data"], notebook = nb`HashMap[ data["Ref"] ], kernel = GenericKernel`HashMap[ data["Kernel"] ]},
                If[!MemberQ[notebook["Properties"], "Storage"],
                    notebook["Storage"] = <||>;
                    notebook["ObjectFields"] = Join[notebook["ObjectFields"], {"Storage"}] // DeleteDuplicates;
                ];

                notebook["Storage"] = Join[notebook["Storage"], <|data["Key"] -> payload|>];
                
                With[{value = data["Key"]},
                    GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, value] ];
                ];
           ];
        ],

        "NotebookStoreUnset" -> Function[data,
           With[{promise = data["Promise"], key = data["Key"], notebook = nb`HashMap[ data["Ref"] ], kernel = GenericKernel`HashMap[ data["Kernel"] ]},
                If[!MemberQ[notebook["Properties"], "Storage"],
                    notebook["Storage"] = <||>;
                    notebook["ObjectFields"] = Join[notebook["ObjectFields"], {"Storage"}] // DeleteDuplicates;
                ];

                notebook["Storage"] = KeyDrop[notebook["Storage"], key];
                
                With[{value = data["Key"]},
                    GenericKernel`SendAsync[kernel, EventFire[promise, Resolve, value] ];
                ];
           ];
        ]              
    }
]

End[]
EndPackage[]