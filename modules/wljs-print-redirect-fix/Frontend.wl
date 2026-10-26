BeginPackage["CoffeeLiqueur`Extensions`PrintRedirect`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`", 
    "CoffeeLiqueur`WLX`WebUI`"
}]


Begin["`Private`"]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];


EventHandler[AppExtensions`AppEvents// EventClone, {
    "Loader:NewNotebook" ->  (Once[ attachListeners[#] ] &),
    "Loader:LoadNotebook" -> (Once[ attachListeners[#] ] &)
}];

attachListeners[notebook_nb`NotebookObj] := With[{},
    Echo["[wljs-print-redirect-fix/Frontend] Attaching extension event listeners to the notebook."];
    EventHandler[notebook // EventClone, {
        "OnWebSocketConnected" -> Function[payload,
            GenericKernel`Send[notebook["Evaluator"]["Kernel"], Unevaluated[
                    CoffeeLiqueur`Extensions`PrintRedirect`Internal`OverrideListener;
            ], "Once"->True];
        ]
    }]; 
]


End[]
EndPackage[]