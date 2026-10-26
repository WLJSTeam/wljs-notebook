BeginPackage["LetWL`"];


Let


Begin["`Private`"];


(* ::Input::Initialization:: *)
(* Taken from https://mathematica.stackexchange.com/a/10451/7936 *)
(* cc by-sa 3.0 with attribution required. rev 2017.11.3.27632 *)
(* Code by Leonid Shifrin https://mathematica.stackexchange.com/users/81/leonid-shifrin *)
(* I simply replaced `LetL` with `Let` *)
Unprotect[Let];
ClearAll[Let];

Let::usage="A With-like construction that allows recursive assignments, like Let* in scheme."

SetAttributes[Let, HoldAll];
SyntaxInformation[Let] = {"ArgumentsPattern" -> {_, _}, "LocalVariables" -> {"Solve", {1, Infinity}}};
Let /: Verbatim[SetDelayed][lhs_, rhs : HoldPattern[Let[{__}, _]]] := Block[{With}, Attributes[With] = {HoldAll};
   lhs := Evaluate[rhs]];
Let[{}, expr_] := expr;
Let[{head_}, expr_] := With[{head}, expr];
Let[{head_, tail__}, expr_] := Block[{With}, Attributes[With] = {HoldAll};
   With[{head}, Evaluate[Let[{tail}, expr]]]];

Protect[Let];


End[];


EndPackage[];