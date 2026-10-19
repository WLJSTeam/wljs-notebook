(* Normalizes captured events and groups them by affected action. *)

BeginPackage["CoffeeLiqueur`Extensions`ExportImport`Proto`"]

create;
actionHash;
event;
types;

decodeEvent;
splitIntoGroups;

Begin["`Private`"]

create[_] := Null;

(* All FrontSubmit calls share a group; symbols are grouped by name. *)
actionHash[{"Symbol", ex_, ___}] := Hash[{"Symbol", ex}]
actionHash[{"FrontSubmit", ___}] := Hash["FrontSubmit"]




event[{ev_, pattern_, _}]["Id"] := StringJoin[ev, "::", pattern];
event[{ev_, pattern_}]["Id"] := StringJoin[ev, "::", pattern];
event[{_, _, pay_}]["Data"] := pay 
event[{ev_, pattern_, pay_}]["Hash"] := Hash[StringJoin[ev, "::", pattern]] Hash[pay];

types = {True|False, _String, _?NumericQ, _};


decodeEvent[ev_String, list_List] := With[{filtered = Select[list, Function[rule, event[rule[[1]]]["Id"] === ev ]][[All,1]]},
  With[{dupsfree = DeleteDuplicates[filtered[[All, 3]]]},
    <|
      "Id" -> ev,
      "FullForm" -> Take[First[filtered], 2],
      "Values" -> dupsfree,
      "Count" -> Length[filtered[[All, 3]]],
      "Duplicates" -> ((Length[filtered[[All, 3]]] - Length[dupsfree])/Length[filtered[[All, 3]]])
    |>
  ]
]

splitIntoGroups = GatherBy[#, Function[item,  actionHash[item[[2]]]]]&



End[]
EndPackage[]
