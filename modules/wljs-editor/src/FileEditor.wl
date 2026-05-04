BeginPackage["CoffeeLiqueur`Extensions`FileEditor`WL`", { 
    "CoffeeLiqueur`Notebook`Transactions`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`",
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CoffeeLiqueur`Extensions`FrontendObject`",
    "CoffeeLiqueur`Misc`Async`"
}]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Begin["`Internal`"]

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];
Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"];


root = $InputFileName // DirectoryName // ParentDirectory;

AppExtensions`SidebarIcons = ImportComponent[FileNameJoin[{root, "templates", "Icons.wlx"}] ];

editorView = ImportComponent[ FileNameJoin[{root, "templates", "FileEditor.wlx"}] ];

WLFileQ[path_] := With[{w = FileExtension[path]}, w === "wl" || w === "m" || w === "wlt" || w === "wls"] 

CoffeeLiqueur`Notebook`Views`Router[any_?WLFileQ, appevents_String, _] := With[{},
    Echo["WL File"];
    Echo[any];

    {editorView[any, ##], ""}
]&

End[]
EndPackage[]