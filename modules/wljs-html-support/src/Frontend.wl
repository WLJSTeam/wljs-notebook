BeginPackage["CoffeeLiqueur`Extensions`HTMLCells`", {
    "CoffeeLiqueur`Notebook`Transactions`",
    "CoffeeLiqueur`Misc`Events`"
}]


Begin["`Internal`"]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];


Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"];


HTMLQ[t_Transaction] := (StringMatchQ[t["Data"], ".html"~~___] )

rootFolder = $InputFileName // DirectoryName;

evaluator  = StandardEvaluator`StandardEvaluator["Name" -> "HTML/WSP Evaluator", "InitKernel" -> init, "Pattern" -> (_?HTMLQ), "Priority"->(3)];

    StandardEvaluator`ReadyQ[evaluator, k_] := (
        If[! TrueQ[k["ReadyQ"] ] || ! TrueQ[k["ContainerReadyQ"] ],
            EventFire[k, "Error", "Kernel is not ready"];
            Print[evaluator, "Kernel is not ready"];
            False
        ,
            (* load kernels stuff. i.e. do it on demand, otherwise it takes too long on the startup *)
            With[{p = Import[FileNameJoin[{rootFolder, "Preload.wl"}], "String"]},
                Module[{},

                    GenericKernel`Send[k,   ToExpression[p, InputForm]; , "Once"->True];
                ];
            ];

            True
        ]
    );

StandardEvaluator`EvaluateTransaction[evaluator, k_, t_] := Module[{list},
    t["Evaluator"] = Internal`Kernel`HTMLEvaluator;
    t["Data"] = StringDrop[t["Data"], 6];

    Print[evaluator, "Kernel`SubmitTransaction!"];
    GenericKernel`SubmitTransaction[k, t];    
];  

init[k_] := Module[{},
    Print["nothing to do..."];
]


End[]

EndPackage[]