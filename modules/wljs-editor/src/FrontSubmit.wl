BeginPackage["CoffeeLiqueur`Extensions`Communication`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`", 
    "CoffeeLiqueur`WLX`WebUI`"
}]


Begin["`Private`"]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`Windows`" -> "win`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];


rootDir = $InputFileName // DirectoryName // ParentDirectory;

EventHandler[AppExtensions`AppEvents// EventClone, {
    "Loader:NewNotebook" ->  (Once[ attachListeners[#] ] &),
    "Loader:LoadNotebook" -> (Once[ attachListeners[#] ] &),
    "WindowObj::NewWindow" -> attachListeners
}];



attachListeners[win_win`WindowObj] := With[{},
    Echo["Attach event listeners to window from EXTENSION FrontSubmit"];
    EventHandler[win // EventClone, {
        "OnWebSocketConnected" -> Function[data,
            Echo["Requesting socket object for client window object..."];
            With[{p = Promise[]},
                Then[WebUIFetch[System`FSAskKernelSocket[], data["Client"] ], Function[dp,
                    win["KernelWebSocket"] = dp;
                    win["EvaluationContext"] = <|"KernelWebSocket"->dp, "OriginKernelWebSocket"->dp|>;
                    Echo["Obtained!"];
                    EventFire[p, Resolve, True];
                ] ];
                p
            ]
        ]
    }];
]

attachListeners[notebook_nb`NotebookObj] := With[{},
    Echo["Attach event listeners to notebook from EXTENSION FrontSubmit"];
    EventHandler[notebook // EventClone, {
        "OnWebSocketConnected" -> Function[payload,
            With[{p = Promise[]},
                Echo["Requesting socket object for client..."];
                Then[WebUIFetch[System`FSAskKernelSocket[], payload["Client"] ], Function[data,
                    notebook["EvaluationContext"] = Join[notebook["EvaluationContext"], <|"KernelWebSocket"->data, "OriginKernelWebSocket"->data|>];
                    EventFire[p, Resolve, True];
                ] ];
                p
            ]
        ]
    }]; 
]


End[]
EndPackage[]