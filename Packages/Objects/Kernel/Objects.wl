(* ::Package:: *)

(* ::Chapter:: *)
(*Objects*)


(* ::Section::Closed:: *)
(*Begin package*)


BeginPackage["CoffeeLiqueur`Objects`"]; 


(* ::Section::Closed:: *)
(*Names*)


CreateUType::usage = 
"CreateUType[type, parent, init, {fields}] create type"; 


UObject::usage = 
"UObject[] base mutable object."; 


UTypeQ::usage = 
"UTypeQ[name] check that name is type"; 


UObjectQ::usage = 
"UObjectQ[expr] check that expr is mutable object"; 


(* ::Section::Closed:: *)
(*Private context*)


Begin["`Private`"]; 


(* ::Section:: *)
(*UObject constructor*)


SetAttributes[UObject, HoldFirst]; 


$objectDefaultIcon = 
Import[FileNameJoin[{DirectoryName[$InputFileName, 2], "Images", "ObjectIcon.png"}]]; 


Options[UObject] = {
    "Icon" :> $objectDefaultIcon, 
    "Init" -> Identity, 
    "PublicFields" -> {"Properties"}
}; 


UObject[opts: OptionsPattern[]] := 
With[{symbol = Unique[Context[UObject] <> SymbolName[UObject] <> "`$"], 
    fullOpts = Normal[Join[<|Options[UObject]|>, <|Flatten[{opts}]|>]]}, 
    symbol = <||>; 
    Table[opt /. {
        _[k_String, v_] :> SetDelayed[symbol[k], v], 
        _[k_Symbol, v_] :> With[{ks = SymbolName[k]}, SetDelayed[symbol[ks], v]]
    }, {opt, fullOpts}]; 
    symbol["Self"] := symbol; 
    symbol["Properties"] := Keys[symbol]; 
    symbol["Init"] @ UObject[symbol]; 
    Return[UObject[symbol]]
]; 


UObject[assoc_Association] := 
If[KeyExistsQ[assoc, "Self"], 
    UObject["Self"] /. assoc, 
(*Else*)
    With[{symbol = Unique[Context[UObject] <> SymbolName[UObject] <> "`$"]}, 
        symbol = assoc; 
        symbol["Self"] := symbol; 
        symbol["Properties"] := Keys[symbol]; 
        If[KeyExistsQ[symbol, "Init"], symbol["Init"] @ UObject[symbol]]; 
        UObject[symbol]
    ]
]; 


UObject[assoc: Except[_Symbol | _Association] ? AssociationQ] := 
With[{a = assoc}, UObject[a]]; 


(* ::Section::Closed:: *)
(*DeleteObject*)


UObject /: DeleteObject[UObject[symbol_Symbol]] := 
Remove[symbol]; 


(* ::Section::Closed:: *)
(* Normal*)


UObject /: Normal[UObject[symbol_Symbol]] := 
symbol; 


(* ::Section::Closed:: *)
(*UTypeQ UObject*)


UObject /: UTypeQ[UObject] = 
True; 


(* ::Section::Closed:: *)
(*UObjectQ UObject*)


UObjectQ[___] := 
False; 


UObject /: UObjectQ[UObject[symbol_Symbol]] = 
True; 


(* ::Section::Closed:: *)
(*Get*)


UObject[symbol_Symbol][key_String] := 
symbol[key]; 


UObject[symbol_Symbol][key_Symbol] := 
symbol[SymbolName[key]]; 


UObject[symbol_Symbol][key_String, keys__] := 
symbol[key][keys]; 


UObject[symbol_Symbol][key_Symbol, keys__] := 
symbol[SymbolName[key]][keys]; 


(* ::Section:: *)
(*Set*)


UObject /: Set[UObject[symbol_Symbol][key_String], value_] := 
symbol[key] = value; 


UObject /: SetDelayed[UObject[symbol_Symbol][key_String], value_] := 
symbol[key] := value; 


UObject /: Set[UObject[symbol_Symbol][key_Symbol], value_] := 
With[{k = SymbolName[key]}, symbol[k] = value]; 


UObject /: SetDelayed[UObject[symbol_Symbol][key_Symbol], value_] := 
With[{k = SymbolName[key]}, symbol[k] := value]; 


UObject /: Set[UObject[symbol_Symbol][keys__, key_], value_] := 
With[{part = UObject[symbol][keys]}, 
    Which[
        AssociationQ[part], 
            UObject[symbol][keys] = Append[part, key -> value], 
        True, 
            part[key] = value
    ]; 
    value
]; 


UObject /: SetDelayed[UObject[symbol_Symbol][keys__, key_], value_] := 
With[{part = UObject[symbol][keys]}, 
    Which[
        AssociationQ[part], 
            UObject[symbol][keys] = Append[part, key :> value], 
        True, 
            part[key] := value
    ]; 
]; 


UObject /: Set[UObject[symbol_Symbol][keys__, key_Symbol], value_] := 
With[{k = SymbolName[key]}, UObject[symbol][keys, k] = value]; 


UObject /: SetDelayed[UObject[symbol_Symbol][keys__, key_Symbol], value_] := 
With[{k = SymbolName[key]}, UObject[symbol][keys, k] := value]; 


UObject /: Set[name_Symbol, object_UObject] := (
    ClearAll[name]; 
    Block[{UObject}, SetAttributes[UObject, HoldFirst]; name = object]; 
    name /: Set[name[keys__], value_] := object[keys] = value; 
    name /: SetDelayed[name[keys__], value_] := object[keys] := value; 
    name /: Unset[name[key_String]] := Unset[object[key]]; 
    name
); 


(* ::Section:: *)
(*UnSet*)


UObject /: Unset[UObject[symbol_Symbol][key_String]] := 
Unset[symbol[key]]; 


(* ::Section::Closed:: *)
(*Summary Box*)


UObject /: MakeBoxes[object: UObject[symbol_Symbol?AssociationQ], form: (StandardForm | TraditionalForm)] := 
Module[{above, below}, 
    above = Join[
        {{BoxForm`SummaryItem[{"Self: ", Defer["Self"] /. symbol}], SpanFromLeft}}, 
        Map[{BoxForm`SummaryItem[{# <> ": ", symbol[#]}], SpanFromLeft}&] @ symbol["PublicFields"]
    ]; 

    below = {}; 
    
    (*Return*)
    BoxForm`ArrangeSummaryBox[Head[object], object, symbol["Icon"], above, below, form, "Interpretable" -> Automatic]
];


(* ::Section::Closed:: *)
(*UTypeQ*)


UTypeQ[___] := 
False; 


(* ::Section:: *)
(*Create type*)


CreateUType[type_Symbol, parent_Symbol?UTypeQ, init: _Symbol | _Function, fields_Association] := 
Module[{
    messages = Messages[type], 
    upValues = UpValues[type],
    subValues = SubValues[type], 
    downValues = DownValues[type]
}, 
    ClearAll[type]; 
    type /: UTypeQ[type] = True; 
    Language`ExtendedFullDefinition[type] = Language`ExtendedFullDefinition[parent] /. parent -> type; 
    Messages[type] = Normal[<|Messages[type], messages|>];
    UpValues[type] = Normal[<|UpValues[type], upValues|>];
    SubValues[type] = Normal[<|SubValues[type], subValues|>];
    DownValues[type] = Normal[<|DownValues[type], downValues|>];
    Options[type] = Normal[<|Join[Options[type], Normal[fields], {If[init === Automatic, Nothing, "Init" -> init]}]|>]; 
    type
]; 


CreateUType[type_Symbol, parent: _Symbol?UTypeQ: UObject, init: _Symbol | _Function: Automatic, fields_List: {}] := 
Module[{assoc = Association[Map[
    Switch[#, 
        _String -> _, #, 
        _String, # -> Automatic, 
        _Symbol -> _, SymbolName[#[[1]]] -> #[[2]], 
        _Symbol, SymbolName[#] -> Automatic, 
        _Symbol :> _, # /. r_[k_, v] :> r[SymbolName[k], v], 
        _String :> _, #
    ]&
] @ fields]}, 
    CreateUType[type, parent, init, assoc]
]; 


(* ::Section::Closed:: *)
(*End private context*)


End[]; (*`Private`*)


(* ::Section::Closed:: *)
(*End package*)


EndPackage[]; (*CoffeeLiqueur`Objects`*)
