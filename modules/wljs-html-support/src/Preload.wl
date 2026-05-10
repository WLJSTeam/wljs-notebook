BeginPackage["CoffeeLiqueur`Extensions`HTMLCells`", {
    "CoffeeLiqueur`Notebook`Transactions`",
    "CoffeeLiqueur`Misc`Events`",
    "WSP`"
}]


Begin["`Private`"]

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];


Internal`Kernel`HTMLEvaluator = Function[t, 
            
            With[{result = LoadString[ t["Data"] ]},
                EventFire[Internal`Kernel`RemoteEvent[ t["Hash"] ], "Result", <|"Data" -> result, "Meta" -> Sequence["Display"->"html"] |> ];
                EventFire[Internal`Kernel`RemoteEvent[ t["Hash"] ], "Finished", True];
            ];
];

End[]

EndPackage[]



