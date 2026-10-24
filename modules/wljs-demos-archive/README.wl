BeginPackage["CoffeeLiqueur`Extensions`FileEditor`README`", { 
    "CoffeeLiqueur`Notebook`Transactions`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`",
    "CoffeeLiqueur`WLJS`Tools`","CoffeeLiqueur`WLJS`Transport`",
    "CoffeeLiqueur`Misc`Async`"
}]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Begin["`Internal`"]

Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

root = $InputFileName // DirectoryName;

readmeView = ImportComponent[ FileNameJoin[{root, "README.wlx"}] ];

ReadmeQ[path_] := FileNameTake[path] === "README.md"

CoffeeLiqueur`Notebook`Views`Router[any_?ReadmeQ, appevents_String, _] := With[{},
    Echo["[wljs-demos-archive/README] README File"];
    Echo[any, "[wljs-demos-archive/README] README file routed to the custom view: "];

    {readmeView[any, ##], ""}
]&

End[]
EndPackage[]
