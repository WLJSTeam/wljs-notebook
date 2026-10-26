(* Registry and common protocol for dynamic-export sampling strategies. *)

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

(* Lower numeric priority wins when several strategies accept a group. *)
findBest[group_] := (
    Echo["[wljs-export-html/BlackBox] Searching the best from"];
    Echo[definedBoxes, "[wljs-export-html/BlackBox] defined black-box types: "];
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


(* Loading a file registers its strategy in definedBoxes. *)
With[{folder = FileNameJoin[{$InputFileName // DirectoryName, "BlackBoxes"}]},
    Echo["[wljs-export-html/BlackBox] Found black boxes: "];
    Echo[FileNames["*.wl", folder], "[wljs-export-html/BlackBox] Discovered black-box strategy files: "];

    Get /@ FileNames["*.wl", folder];
];


End[]
EndPackage[]




