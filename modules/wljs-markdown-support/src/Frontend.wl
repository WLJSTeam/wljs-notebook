BeginPackage["CoffeeLiqueur`Extensions`MarkdownCells`", {
    "CodeParser`", 
    "CoffeeLiqueur`Notebook`Transactions`",
    "CoffeeLiqueur`Misc`Events`"
}]


Begin["`Internal`"]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"];


MarkdownQ[t_Transaction] := (Echo[t["Data"]]; Echo[StringMatchQ[t["Data"], ".md\n"~~___]]; StringMatchQ[t["Data"], ".md"~~___] )
    
rootFolder = $InputFileName // DirectoryName;

evaluator  = StandardEvaluator`StandardEvaluator["Name" -> "Markdown Evaluator", "InitKernel" -> init, "Pattern"-> (_?MarkdownQ), "Priority"->(1)];

    StandardEvaluator`ReadyQ[evaluator, k_] := (
        If[! TrueQ[k["ReadyQ"] ] || ! TrueQ[k["ContainerReadyQ"] ],
            EventFire[t, "Error", "Kernel is not ready"];
            Print[evaluator, "Kernel is not ready"];
            False
        ,
            True
        ]
    );

StandardEvaluator`EvaluateTransaction[evaluator, k_, t_] := Module[{list},
    t["Evaluator"] = Internal`Kernel`MarkdownEvaluator;

    t["Data"] = "<dummy>"<>StringDrop[t["Data"], 4]<>"</dummy>";

    Print[evaluator, "Kernel`SubmitTransaction!"];
    GenericKernel`SubmitTransaction[k, t];  
];

init[k_] := Module[{},
    Print["nothing to do..."];
]


LaTeXQ[t_Transaction] := (StringMatchQ[t["Data"], ".latex"~~___] )
 
evaluator2  = StandardEvaluator`StandardEvaluator["Name" -> "LateX Evaluator", "InitKernel" -> init, "Pattern"-> (_?LaTeXQ), "Priority"->(1)];
StandardEvaluator`EvaluateTransaction[evaluator2, _, t_] := Module[{list},
    t["Data"] = StringDrop[t["Data"], 7];

    EventFire[t, "Result", <|"Data" -> t["Data"], "Meta" -> Sequence["Display"->"latex", "Hash"->CreateUUID[] ] |>];
    EventFire[t, "Finished", True];
];

StandardEvaluator`ReadyQ[evaluator2, _] := True 


End[]
EndPackage[]