BeginPackage["CoffeeLiqueur`Notebook`Utils`"];

(*
	Useful utilites package
*)

console::usage = "console[\"log\", message, args]"
NullQ::usage = "NullQ[x]"
Cached::usage = "Cached[expr_, interval_String: \"Minute\"]"
RandomString::usage = "RandomString[length]"
DropHalf::usage = "DropHalf drops a half of a list from the end"
AssociationToggle::usage = "mutable boolean assoc manipulator"
HashString32::usage = "Hash the string using CRC32 and represent using Base64"

UniversalPathConverter::usage = "converts UNIX to win and vise versa"
ElectronIPCSend::usage = "send message to Electron process";

Begin["`Private`"]; 

ElectronIPCSend[name_String, args__] := WriteString[$StandardOutputStream, "<<<IPC>>>" <> ExportString[{name, {args} }, "RawJSON", "Compact" -> True] <> "\n"];


NullQ[expr_] := expr===Null;

console["log", message_, args___] := Print[StringTemplate[message][args]]
console["memory stat"] := (CoffeeLiqueur`WolframJSFrontend`ram = {CoffeeLiqueur`WolframJSFrontend`ram, Round[MemoryInUse[]/1024,1]/1024//N}//Flatten);

(* smart caching. credits https://github.com/KirillBelovTest *)
ClearAll[Cached]
SetAttributes[Cached, HoldFirst]

Cached[expr_, date_DateObject] := (
	Cached[expr, {"Date"}] = date; 
	Cached[expr, date] = expr
);

Cached[expr_, interval_String: "Minute"] := (
	If[DateObjectQ[Cached[expr, {"Date"}]] && DateObject[Now, interval] != Cached[expr, {"Date"}], 
		Cached[expr, Cached[expr, {"Date"}]] =.]; 
	Cached[expr, DateObject[Now, interval]]
);

HashString32[str_String] := Hash[str, "CRC32", "Base64Encoding"]

RandomString[n_] := Alphabet[][ [RandomInteger[ {1, 26}, n] ] ] // StringJoin;
DropHalf[x_List] := Drop[x,-Length[x]/2 //Round];

AssociationToggle[expr_, fl_] := (If[KeyExistsQ[expr, fl],
    expr[fl] = ! expr[fl],
    expr[fl] = True
    ];)
	
SetAttributes[AssociationToggle, HoldFirst]

If[$OperatingSystem === "Windows",

	UniversalPathConverter[path_String] := If[StringContainsQ[path, "/"],

		StringRiffle[StringSplit[path, "/"], "\\"]
	,	

		path
	]

,

	UniversalPathConverter[path_String] := If[StringContainsQ[path, "/"],
		path
	,
		StringRiffle[StringSplit[path, "\\"], "/"]
	]

]

End[];

EndPackage[];