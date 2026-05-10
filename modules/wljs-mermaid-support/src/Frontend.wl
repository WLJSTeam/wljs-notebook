BeginPackage["CoffeeLiqueur`Extensions`MermaidCells`", {
    "CoffeeLiqueur`Notebook`Transactions`",
    "CoffeeLiqueur`Misc`Events`"
}]


Begin["`Internal`"]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"];


Q[t_Transaction] := (StringMatchQ[t["Data"], ".mermaid\n"~~___] )

evaluator  = StandardEvaluator`StandardEvaluator["Name" -> "Mermaid Evaluator", "InitKernel" -> init, "Pattern" -> (_?Q), "Priority"->(5)];

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
    t["Evaluator"] = Internal`Kernel`MermaidEvaluator;
    t["Data"] = StringDrop[t["Data"], 9];

    Print[evaluator, "Kernel`SubmitTransaction!"];
    GenericKernel`SubmitTransaction[k, t];    
];  

init[k_] := Module[{},
    Print["Kernel init..."];
    GenericKernel`Send[k, 
        Print["Init js Kernel (Local)"];
        Internal`Kernel`MermaidEvaluator = Function[t, 
            EventFire[Internal`Kernel`RemoteEvent[ t["Hash"] ], "Result", <|"Data" -> t["Data"], "Meta" -> Sequence["Display"->"mermaid"] |> ];
            EventFire[Internal`Kernel`RemoteEvent[ t["Hash"] ], "Finished", True];
        ];
    ]
]


End[]

EndPackage[]