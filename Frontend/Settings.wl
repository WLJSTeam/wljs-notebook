BeginPackage["CoffeeLiqueur`Notebook`SettingsUtils`"];

(* 
    Settings serializer/deserializer helper
*)

initialize;
storeConfiguration;
events;

Begin["`Internal`"];

events = CreateUUID[];

loadConfiguration  := If[FileExistsQ[CoffeeLiqueur`Notebook`AppExtensions`AppConfig ], Get[CoffeeLiqueur`Notebook`AppExtensions`AppConfig ], Missing[] ];

storeConfiguration[c_Association] := With[{},
    Echo["Storing to a file..."];
    Put[c, CoffeeLiqueur`Notebook`AppExtensions`AppConfig ]
];

initialize[conf_, OptionsPattern[] ] := With[{default = OptionValue["Defaults"], loaded = loadConfiguration}, 
    conf = Join[default, (If[MissingQ[#], <||>, #]& ) @ loaded];
    If[conf =!= loaded,
        storeConfiguration[conf]
    ]
];

SetAttributes[initialize, HoldFirst];
Options[initialize] = {"Defaults" -> <|"Autostart" -> True|>}

End[]
EndPackage[]