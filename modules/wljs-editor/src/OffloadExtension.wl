BeginPackage["CoffeeLiqueur`Extensions`OffloadTools`", {
    "CoffeeLiqueur`Extensions`FrontendObject`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`WLJS`Tools`","CoffeeLiqueur`WLJS`Transport`"
}]

Begin["`Internal`"]

FromEventObject[o_EventObject] := With[{view = o[[1]]["View"], sym = Unique["OffloadGenerated"]}, 
  EventHandler[o, Function[x, sym = x]] // EventFire;
  Interpretation[CreateFrontEndObject[view], Offload[sym]]
]


End[]

EndPackage[]

$ContextAliases["Offload`"] = "CoffeeLiqueur`Extensions`OffloadTools`Internal`"
