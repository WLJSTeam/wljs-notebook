BeginPackage["CoffeeLiqueur`Extensions`NotebookDirectory`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`", 
    "CoffeeLiqueur`WLX`WebUI`"
}]


Begin["`Private`"]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

SetKernelDirectory; (* Private frontend symbol *)

rootDir = $InputFileName // DirectoryName // ParentDirectory;

EventHandler[AppExtensions`AppEvents// EventClone, {
    "Loader:NewNotebook" ->  (Once[ attachListeners[#] ] &),
    "Loader:LoadNotebook" -> (Once[ attachListeners[#] ] &)
}];

attachListeners[notebook_nb`NotebookObj] := With[{},
    Echo["[wljs-editor/SetDirectory] Attaching extension event listeners to the notebook."];
    EventHandler[notebook // EventClone, {
        "OnWebSocketConnected" -> Function[payload,
            With[{dir = notebook["Path"] // DirectoryName},
                Echo["[wljs-editor/SetDirectory] Forced the notebook working-directory update."];
                GenericKernel`Send[notebook["Evaluator"]["Kernel"], CoffeeLiqueur`Extensions`NotebookDirectory`Private`NotebookDirectorySet[dir]; ];
            ];
            (*With[{dir = FileNameSplit[ notebook["Path"] // DirectoryName ]},
                GenericKernel`Send[notebook["Evaluator"]["Kernel"], Unevaluated[
                    CoffeeLiqueur`Extensions`NotebookDirectory`Private`NotebookDirectoryAppend[dir];
                ] ];
            ];*)
            (*With[{dir = FileNameSplit[ notebook["Path"] // DirectoryName ]},
                WebUISubmit[SetKernelDirectory[dir // FileNameJoin // URLEncode, "KernelDir"], payload["Client"] ]
            ];*) 
        ],
        "OnBeforeLoad" -> Function[payload,
            If[MemberQ[notebook["Properties"], "AutorunScript"],
                Echo["[wljs-editor/SetDirectory] Executing the notebook autorun script."];
                ToExpression[notebook["AutorunScript"], InputForm];
            ];

            With[{dir = If[MemberQ[notebook["Properties"], "WorkingDirectory"],
                    FileNameSplit[ notebook["WorkingDirectory"] ]
                ,
                    FileNameSplit[ notebook["Path"] // DirectoryName ]
                ]
            },
                WebUISubmit[SetKernelDirectory[dir // FileNameJoin // URLEncode, "KernelDir"], payload["Client"] ];
            ];       
        ],
        "OnClose" -> Function[payload,
            Print[""];
            (*With[{dir = FileNameSplit[ notebook["Path"] // DirectoryName ]},
                GenericKernel`Send[notebook["Evaluator"]["Kernel"], Unevaluated[
                    CoffeeLiqueur`Extensions`NotebookDirectory`Private`NotebookDirectoryRemove[dir];
                ] ];
            ];*)            
        ]
    }]; 
]


End[]
EndPackage[]
