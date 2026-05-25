BeginPackage["CoffeeLiqueur`Notebook`Windows`", {"CoffeeLiqueur`Notebook`AppExtensions`", "CoffeeLiqueur`Misc`Events`", "CoffeeLiqueur`UObjects`", "CoffeeLiqueur`Notebook`Transactions`"}]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

WindowObj::usage = ""
Serialize;

HashMap;

Begin["`Private`"]

NullQ[any_] := any === Null

HashMap = <||>





CreateUType[WindowObj, init, {"Title"->"Application", ImageSize->Automatic, "Display"->"codemirror", "EvaluatedQ"->False, "Hash"->Null, "Data"->"", "Notebook"->Null}]

WindowObj /: EventHandler[n_WindowObj, opts__] := EventHandler[n["Hash"], opts] 
WindowObj /: EventFire[n_WindowObj, opts__] := EventFire[n["Hash"], opts]
WindowObj /: EventClone[n_WindowObj] := EventClone[n["Hash"] ]
WindowObj /: EventRemove[n_WindowObj, opts__] := EventRemove[n["Hash"], opts] 

init[o_] := Module[{uid = If[o["Hash"] =!= Null, o["Hash"], CreateUUID[] ]},
    Print["Init WindowObj"];

    o["Hash"] = uid;
    o["Date"] = AbsoluteTime[];
    HashMap[uid] = o;

    EventFire[AppEvents, "WindowObj::NewWindow", o];

    o
]


WindowObj /: Serialize[n_WindowObj, OptionsPattern[] ] := Module[{props},
    props = {# -> n[#]} &/@ If[OptionValue["MetaOnly"], Complement[n["Properties"], {"KernelWebSocket", "Notebook", "Socket", "Cell", "Ref", "WebSocket","Evaluator", "EvaluationContext", "Format", "Socket","Properties","Icon","Self","Data", "Notebook", "Init", "After", "Before"}], Complement[n["Properties"], {"KernelWebSocket", "Notebook", "Socket", "Cell", "Ref", "WebSocket","Socket", "Format", "EvaluationContext", "Properties","Icon","Self", "Notebook", "Init", "After", "Before"}] ];
    props = Join[props, {"Notebook" -> n["Notebook", "Hash"]}];
    props // Flatten // Association
]

Options[Serialize] = {"MetaOnly" -> False}

End[]
EndPackage[]
