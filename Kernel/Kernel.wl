BeginPackage["CoffeeLiqueur`Notebook`Kernel`", {"CoffeeLiqueur`Misc`Events`", "CoffeeLiqueur`Objects`"}]

Kernel;
KernelQ;

Start;
Send;
SubmitTransaction;
Async;
Stdout;
AbortEvaluation;

HashMap;

Begin["`Private`"]

HashMap = <||>

init[o_] := With[{uid = CreateUUID[]},
    o["Hash"] = uid;
    HashMap[uid] = o;
    o
];

CreateType[Kernel, init, {"Packages"->{}, "Name"->"Unknown Kernel", "Dead"->True}]

Kernel /: KernelQ[_Kernel] := True

Kernel /: EventHandler[n_Kernel, opts__] := EventHandler[n["Hash"], opts] 
Kernel /: EventFire[n_Kernel, opts__] := EventFire[n["Hash"], opts]
Kernel /: EventClone[n_Kernel] := EventClone[n["Hash"] ]
Kernel /: EventRemove[n_Kernel, opts__] := EventRemove[n["Hash"], opts] 

SubmitTransaction[k_, t_] := Print["Dummy SubmitTransaction"]

SendAsync[k_, e_] := Print["Dummy Async"]
SetAttributes[SendAsync, HoldRest]

Send[k_, expr_, OptionsPattern[] ] := Print["Dummy Send"]

Options[Send] = {"Once" -> False, "TrackingProgress"->Null}
SetAttributes[Send, HoldRest]

Start[k_] := Print["Dummy start"];
Restart[k_] := Print["Restart start"];
Unlink[k_] := Print["Unlink start"];

AbortEvaluation[k_] := Print["Dummy abort"];

End[]
EndPackage[]