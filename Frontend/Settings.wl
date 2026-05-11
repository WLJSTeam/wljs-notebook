BeginPackage["CoffeeLiqueur`Notebook`SettingsUtils`"];

initialize;
storeConfiguration;

Begin["`Internal`"];

loadConfiguration  := If[FileExistsQ[CoffeeLiqueur`Notebook`AppExtensions`AppConfig ], Get[CoffeeLiqueur`Notebook`AppExtensions`AppConfig ], Missing[] ];
storeConfiguration[c_Association] := Put[c, CoffeeLiqueur`Notebook`AppExtensions`AppConfig ];

initialize[conf_, OptionsPattern[] ] := With[{default = OptionValue["Defaults"]},
    conf = Join[default, (If[MissingQ[#], <||>, #]& ) @ loadConfiguration];
    storeConfiguration[conf]
];

SetAttributes[initialize, HoldFirst];
Options[initialize] = {"Defaults" -> <|"Autostart" -> True|>}

End[]
EndPackage[]