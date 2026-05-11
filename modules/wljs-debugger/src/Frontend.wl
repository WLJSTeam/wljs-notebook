BeginPackage["CoffeeLiqueur`Extensions`Debugger`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`", 
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`",
    "CoffeeLiqueur`WLX`WLJS`",
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CoffeeLiqueur`HTTPHandler`",
    "CoffeeLiqueur`HTTPHandler`Extensions`",
    "CoffeeLiqueur`Internal`",
    "CoffeeLiqueur`Extensions`CommandPalette`"
}]


Begin["`Private`"]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];
Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

Needs["CoffeeLiqueur`ExtensionManager`" -> "WLJSPackages`"];

Needs["CoffeeLiqueur`Notebook`SettingsUtils`"->"settings`", FileNameJoin[{"Frontend", "Settings.wl"}] ];


root = $InputFileName // DirectoryName // ParentDirectory;

utils = Get[ FileNameJoin[{root, "src", "Utils.wl"}] ];

gui  = ImportComponent[FileNameJoin @ {root, "templates", "GUI.wlx"}];
gui  = gui[utils];

With[{http = AppExtensions`HTTPUHandler},
    http["MessageHandler", "Debugger"] = AssocUMatchQ[<|"Path" -> ("/debugger/"~~___)|>] -> gui;
];

getNotebook[controls_] := EventFire[controls, "NotebookQ", True] /. {{___, n_nb`NotebookObj, ___} :> n};


listener[OptionsPattern[] ] := 
With[{
    Controls = OptionValue["Controls"],
    Modals = OptionValue["Modals"],
    Messanger = OptionValue["Messanger"],
    Path = If[DirectoryQ[#], #, DirectoryName[#] ] &@ OptionValue["Path"],
    Type = OptionValue["Type"]
},
    EventHandler[EventClone[Controls], {
        "open_debugger" -> Function[Null, 
            With[{
                notebook = getNotebook[Controls],
                cli = Global`$Client
            },
                If[!MatchQ[notebook, _nb`NotebookObj],
                    EventFire[Messanger, "Warning", "Notebook not found"];
                    Return[];
                ]; 

                If[!(notebook["Evaluator"]["Kernel"]["State"] === "Initialized") || !TrueQ[notebook["WebSocketQ"] ],
                    EventFire[Messanger, "Warning", "Kernel is not attached / ready"];  
                    Return[];
                ];

                If[TrueQ[notebook["Evaluator"]["Kernel"]["DebuggerSymbol"]["ValidQ"] ],
                    EventFire[Messanger, "Warning", "Debugger is already attached to this Kernel"];  
                    Return[];
                ];

                With[{state = Unique["debuggerState"]},
                    state["Notebook"] = notebook;
                    state["Origin"] = cli;
                    state["Messanger"] = Messanger;
                    
                    state["Kernel"] = notebook["Evaluator"]["Kernel"];

                    With[{k = notebook["Evaluator"]["Kernel"]},
                        k["DebuggerSymbol"] = state;
                    ];

                    WebUILocation[StringJoin["/debugger/", URLEncode[ BinarySerialize[state] // BaseEncode ]  ], cli, "Target"->_, "Features"->"width=600,height=500,right=200"];
                ];
            ]
        ] 
    }];

    ""
];

Options[listener] = {"Path"->"", "Type"->"", "Parameters"->"", "Modals"->"", "AppEvent"->"", "Controls"->"", "Messanger"->""}
AppExtensions`TemplateInjection["AppTopBar"] = listener;


SnippetsCreateItem[
    "openDebugger", 

    "Template"->ImportComponent[ FileNameJoin @ {root, "templates", "Ico.wlx"} ] , 
    "Title"->"Debug"
];

(* just fwd *)
EventHandler[SnippetsEvents, {
    "openDebugger" -> Function[assoc, EventFire[assoc["Controls"], "open_debugger", True] ]
}];


End[]
EndPackage[]