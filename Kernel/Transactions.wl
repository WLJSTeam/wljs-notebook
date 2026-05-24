BeginPackage["CoffeeLiqueur`Notebook`Transactions`", {"CoffeeLiqueur`UObjects`", "CoffeeLiqueur`Misc`Events`"}]

Transaction::usage = "creates transaction for Notebook <-> Kernel / Evaluator communication"

Begin["`Private`"]

initTransaction[t_] := With[{},
    Print["Create transaction"];
    t["Hash"] = CreateUUID[];
    t
]

CreateUType[Transaction, initTransaction, {"EvaluationContext"-><||>, "Data"->""}]

Transaction /: EventHandler[n_Transaction, opts__] := EventHandler[n["Hash"], opts] 
Transaction /: EventFire[n_Transaction, opts__] := EventFire[n["Hash"], opts]
Transaction /: EventRemove[n_Transaction, opts__] := EventRemove[n["Hash"], opts] 
Transaction /: EventClone[n_Transaction] := EventClone[n["Hash"] ] 

Transaction /: Transaction`Serialize[n_Transaction, OptionsPattern[] ] := Module[{props},
    props = {# -> n[#]} &/@ Complement[n["Properties"], {"Properties","Icon","Format","Self","Init"}];
    props // Flatten // Association
]

End[]
EndPackage[]