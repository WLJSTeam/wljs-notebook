BeginPackage["CoffeeLiqueur`Extensions`Terminal`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`Notebook`Transactions`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`", 
    "CoffeeLiqueur`HTTPHandler`",
    "CoffeeLiqueur`HTTPHandler`Extensions`",
    "CoffeeLiqueur`Internal`",
    "CoffeeLiqueur`Extensions`CommandPalette`",
    "CoffeeLiqueur`WLX`WLJS`",
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CodeFormatter`",
    "CoffeeLiqueur`Objects`"
}]


UIXtermLoad;
UIXtermPrint;
UIXtermResolve;
UIXtermColorize;

Begin["`Private`"]
Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];
Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"];
Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

Needs["CoffeeLiqueur`ExtensionManager`" -> "WLJSPackages`"];

Needs["CoffeeLiqueur`Notebook`SettingsUtils`"->"settings`", FileNameJoin[{"Frontend", "Settings.wl"}] ];

CodeFormatter`$DefaultLineWidth = 120;
SetOptions[CodeFormatter`CodeFormatCST, CodeFormatter`Airiness -> -0.75, CodeFormatter`BreakLinesMethod -> "LineBreakerV2"];

UIXtermColorize[str_String] := StringReplace[str, {
    x: RegularExpression["\"[^\"]+\""] :> StringJoin["\\x1b[38;5;137m", x, "\\x1b[0m"],
    d: RegularExpression["[\\-?\\d*\\.?\\d*]+"] :> StringJoin["\\x1b[38;5;96m", d, "\\x1b[0m"],
    b: RegularExpression["[\\{\\}]+"] :> StringJoin["\\x1b[38;5;22m", b, "\\x1b[0m"],
    g: RegularExpression["[\\<\\|]+"] :> StringJoin["\\x1b[38;5;23m", g, "\\x1b[0m"],
    g: RegularExpression["[\\|\\>]+"] :> StringJoin["\\x1b[38;5;23m", g, "\\x1b[0m"],
    g: RegularExpression["\\$Failed"] :> StringJoin["\\x1b[1;31m", g, "\\x1b[0m"]
  }]

rootDir = $InputFileName // DirectoryName // ParentDirectory;
xTerm = ImportComponent[FileNameJoin[{rootDir, "template", "xterm.wlx"}] ];

With[{http = AppExtensions`HTTPUHandler},
    http["MessageHandler", "XtermWindow"] = AssocUMatchQ[<|"Path" -> "/xterm"|>] -> xTerm;
];


SnippetsCreateItem[
    "xtermCall", 

    "Template"->ImportComponent[FileNameJoin[{rootDir, "template", "Ico.wlx"}] ], 
    "Title"->"Terminal"
];

(* just fwd *)
EventHandler[SnippetsEvents, {
    "xtermCall" -> Function[assoc, WebUILocation["/xterm", assoc["Client"], "Target"->_, "Features"->"width=660, height=500, top=0, left=800"] ]
}];


listener[OptionsPattern[] ] := 
With[{
    Controls = OptionValue["Controls"]
},
    EventHandler[EventClone[Controls], {"xterm_open" -> Function[Null, 
        WebUILocation["/xterm", Global`$Client, "Target"->_, "Features"->"width=660, height=500, top=0, left=800"]
    ]}];
    ""
]

Options[listener] = {"Path"->"", "Parameters"->"", "Modals"->"", "AppEvent"->"", "Controls"->"", "Messanger"->""}


AppExtensions`TemplateInjection["AppTopBar"] = listener;


End[]
EndPackage[]
