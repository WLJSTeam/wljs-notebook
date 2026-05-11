BeginPackage["CoffeeLiqueur`Extensions`RevealCells`", {
    "CoffeeLiqueur`Notebook`Transactions`",
    "CoffeeLiqueur`Misc`Events`"
}]


Begin["`Internal`"]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"];


Q[t_Transaction] := (StringMatchQ[t["Data"], ".slide\n"~~___] || StringMatchQ[t["Data"], ".slides\n"~~___] )

rootFolder = $InputFileName // DirectoryName;


evaluator  = StandardEvaluator`StandardEvaluator["Name" -> "RevealJS Evaluator", "InitKernel" -> init, "Pattern" -> (_?Q), "Priority"->(3)];

    StandardEvaluator`ReadyQ[evaluator, k_] := (
        If[! TrueQ[k["ReadyQ"] ] || ! TrueQ[k["ContainerReadyQ"] ],
            EventFire[t, "Error", "Kernel is not ready"];
            Print[evaluator, "Kernel is not ready"];
            False
        ,

            With[{p = Import[FileNameJoin[{rootFolder, "Preload.wl"}], "String"]},
                GenericKernel`Send[k,   ImportString[p, "WL"]; , "Once"->True];
            ];

            True
        ]
    );

StandardEvaluator`EvaluateTransaction[evaluator, k_, t_] := Module[{list},
    t["Evaluator"] = Internal`Kernel`RevealEvaluator;

    If[StringMatchQ[t["Data"], ".slides\n"~~___],
        Print[evaluator, "Multiples slides will be merged"];
        (* remova other output slides. make sure it won't interfere *)
        Delete /@ Select[nb`HashMap[ t["EvaluationContext", "Notebook"] ]["Cells"], (#["Display"]==="slide" && cell`OutputCellQ[#])& ];

        t["Data"] = "<dummy>"<>StringRiffle[{Map[
            Function[cell,
                StringDrop[cell["Data"], 7]
            ]
        , 
            Select[nb`HashMap[ t["EvaluationContext", "Notebook"] ]["Cells"], (StringMatchQ[#["Data"], ".slide\n"~~___] && cell`InputCellQ[#])& ] 
        ], StringDrop[t["Data"], 8]} // Flatten, "\n---\n"]<>"</dummy>";

        Print[evaluator, "GenericKernel`SubmitTransaction!"];
        GenericKernel`SubmitTransaction[k, t]; 
    ,
        t["Data"] = "<dummy>"<>StringDrop[t["Data"], 7]<>"</dummy>";

        Print[evaluator, "GenericKernel`SubmitTransaction!"];
        GenericKernel`SubmitTransaction[k, t];     
    ]   
];


init[k_] := Module[{},
    Print["Kernel init..."];
]


End[]

EndPackage[]