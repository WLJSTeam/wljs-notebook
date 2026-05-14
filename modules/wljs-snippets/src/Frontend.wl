BeginPackage["CoffeeLiqueur`Extensions`CommandPalette`", {
    "CoffeeLiqueur`Notebook`Transactions`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`", 
    "CoffeeLiqueur`CUSockets`EventsExtension`"
}]


Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Needs["CoffeeLiqueur`ExtensionManager`" -> "WLJSPackages`"];


SnippetsDatabase;
SnippetsDatabaseEvents;
SnippetsCreateItem;
SnippetsDatabaseIndices;

SnippetsGenericTemplate;

SnippetsEvents;

Begin["`Internal`"]

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"];
Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];


rootFolder = $InputFileName // DirectoryName // ParentDirectory;
iTemplate  = FileNameJoin[{$InputFileName // DirectoryName // ParentDirectory, "template", "Components", "Items"}];

NotebookQ[path_String] := FileExtesion[path] === "wln"

SnippetsDatabase = <||>;
SnippetsEvents = CreateUUID[];
SnippetsCreateItem[tag_, opts__] := With[{list = List[opts] // Association},
    SnippetsDatabase[tag] = <|"Title" -> list["Title"], "Template" -> (list["Template"][opts, "Tag"->tag])|>;
];

SnippetsDatabaseIndices := (ToLowerCase[#["Title"]] &/@ SnippetsDatabase);

SnippetsGenericTemplate = ImportComponent[FileNameJoin[{iTemplate, "Generic.wlx"}] ];

Get[FileNameJoin[{rootFolder, "src", "Defaults.wl"}] ];
Get[FileNameJoin[{rootFolder, "src", "Library.wl"}] ];
(* Get[FileNameJoin[{rootFolder, "src", "AI.wl"}] ]; *)
Get[FileNameJoin[{rootFolder, "src", "Github.wl"}] ];

AppExtensions`TemplateInjection["AppTopBar"] = ImportComponent[FileNameJoin[{rootFolder, "template", "Overlay.wlx"}] ];



End[]
EndPackage[]