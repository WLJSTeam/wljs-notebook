BeginPackage["CoffeeLiqueur`Extensions`ExportImport`BlackBox`", {
    "CoffeeLiqueur`UObjects`",
    "CoffeeLiqueur`Misc`Events`"
}]

findBest;
construct;
test;

priority;

process;
export;

BlackBox;
definedBoxes;

Begin["`Private`"]

definedBoxes = {};

CreateUType[BlackBox, init, {"Priority" -> 100}];
init[box_] := With[{uid = CreateUUID[]},
  box["UId"] = uid;
  box
]

BlackBox /: EventFire[b_BlackBox, rest__] := EventFire[b["UId"], rest]
BlackBox /: EventHandler[b_BlackBox, rest__] := EventHandler[b["UId"], rest]

findBest[group_] := (
    Echo["Searching the best from"];
    Echo[definedBoxes];
    SelectFirst[SortBy[definedBoxes, priority ], (
        test[#, group]
    )&]
)

test[_, _] := False

construct[_, dataset_, kernel_] := {}

priority[_] := 100

delete[_] := Null;

process[_, params_List] := Null;
export[_] := Null;


(* Load all black boxes *)
With[{folder = FileNameJoin[{$InputFileName // DirectoryName, "BlackBoxes"}]},
    Echo["Found black boxes: "];
    Echo[FileNames["*.wl", folder] ];

    Get /@ FileNames["*.wl", folder];
];


End[]
EndPackage[]




