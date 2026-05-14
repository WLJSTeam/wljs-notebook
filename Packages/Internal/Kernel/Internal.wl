(*:Package:*)

BeginPackage["CoffeeLiqueur`UInternal`"]; 


ClearAll["`*"]; 


PreUCompile::usage = 
"PreUCompile[name, func] load if library exists and compliling if not"; 


ConditionUApply::usage = 
"ConditionUApply[pairs, default][args] select rule if key[args] is True and resturn value[args]"; 


Cache::usage = 
"Cache[expr] cache expr for one minute
Cache[expr, period] cache expr for specific period"; 


ByteUMask::usage =  
"ByteUMask[key, data] returns masked data.";

BytesUPosition::usage = 
"BytesUPosition[data, sep, n] n position of sep in data"; 


BytesUSplit::usage = 
"BytesUSplit[data, sep -> n] works like Map[StringJoin, TakeDrop[StringSplit[text, sep], n]]"; 


AssocUMatchQ::usage = 
"AssocUMatchQ[assoc, pattern] match assoc with pattern
AssocUMatchQ[assoc, key, valuePattern] check key from assoc
AssocUMatchQ[pattern] - function"; 


AssocUBlock::usage = 
"AssocUBlock[assoc, vars, expr] assoc converts to local variables for block."; 


WolframAlphaTextUPod


Begin["`Private`"]; 


SetAttributes[AssocUBlock, HoldRest]; 


AssocUBlock[assoc_Association, vars___Set, expr_] := 
Module[{x1, x2}, 
	x1 = Normal @ assoc /. Rule[k_String, v_] :> Rule[ToExpression[k, StandardForm, Hold], v]; 
	x2 = Apply[List, Hold[vars] /. Verbatim[Set][a_, b_] :> (Hold[a] -> b)]; 
	With[{x3 = Join[x1, x2]}, 
		With[{x4 = Hold[x3, expr] /. Rule[Hold[s_], v_] :>  Hold[s, v]}, 
			Apply[Block , x4  /. Hold[s_Symbol, v_] :> Set[s, v]]
		]
	]
]; 


ConditionUApply[conditionAndFunctions_Association: <||>, defalut_: Function[Null], ___] := 
Function[Last[SelectFirst[conditionAndFunctions, Function[cf, First[cf][##]], {defalut}]][##]]; 


SetAttributes[Cache, HoldFirst]; 


Cache[expr_, period_Integer: 60] := 
Module[{roundNow = Floor[AbsoluteTime[], period]}, 
	If[IntegerQ[Cache[expr, "Date"]] && Cache[expr, "Date"] == roundNow, 
		Cache[expr, "Value"], 
	(*Else*)
		Cache[expr, "Date"] = roundNow; 
		Cache[expr, "Value"] = expr
	]
]; 


BytesUPosition[data_ByteArray, bytes_ByteArray, n_Integer: 1] := 
bytesPosition[data, bytes, {n}]; 


BytesUPosition[byteArray_ByteArray, subByteArray_ByteArray, n_List] := 
bytesPosition[byteArray, subByteArray, n]; 


BytesUPosition[data_ByteArray, bytes_ByteArray, Span[n_Integer, All]] := 
bytesPosition[data, bytes, Range[n, Round[Length[data] / Length[bytes]]]]; 


BytesUSplit[data_ByteArray, separator_ByteArray -> n_Integer?Positive] := 
Module[{position}, 
	position = BytesUPosition[data, separator, n]; 
	If[Length[position] > 0, 
		{data[[ ;; position[[1, 1]] - 1]], data[[position[[1, 2]] + 1 ;; ]]}, 
	(*Else*)
		{data}
	]
]; 


AssocUMatchQ[assoc_Association, pattern_Association] := 
Apply[And, KeyValueMap[AssocUMatchQ[assoc, #1, #2]&, pattern]]; 


AssocUMatchQ[pattern_Association][assoc_Association] := 
AssocUMatchQ[assoc, pattern]; 


AssocUMatchQ[request_Association, key__String, test: _String | _StringExpression] := 
StringMatchQ[request[key], test, IgnoreCase -> True]; 


AssocUMatchQ[request_Association, key__String, test: _Association] := 
AssocUMatchQ[request[key], test]; 


AssocUMatchQ[request_Association, key: _String | {__String}, test: _Function | _Symbol | _[___]] := 
test[request[key]]; 


SetAttributes[PreUCompile, HoldRest]; 


PreUCompile[{directory_String, name_String}, func_FunctionCompile] := 
Module[{libraryResources, lib}, 
	libraryResources = getLibraryResourcesDirectory[directory]; 
	lib = FileNameJoin[{libraryResources, name <> "." <> Internal`DynamicLibraryExtension[]}]; 
	If[
		FileExistsQ[lib], 
			LibraryFunctionLoad[lib], 
		(*Else*)
		With[{},
			If[!FileExistsQ[libraryResources], CreateDirectory[libraryResources]]; 
			LibraryFunctionLoad[FunctionCompileExportLibrary[lib, func]]
		]
	]
]; 

PreUCompile[{directory_String, name_String}, path_] := 
Module[{libraryResources, lib}, 
	Echo["\033[1;44mPre compilation was initiated. Please wait...\033[1;0m"];
	libraryResources = getLibraryResourcesDirectory[directory]; 
	lib = FileNameJoin[{libraryResources, name <> "." <> Internal`DynamicLibraryExtension[]}]; 
	If[
		FileExistsQ[lib], 
			LibraryFunctionLoad[lib], 
		(*Else*)
		If[!(path // ListQ),
			With[{func = Import[path]},
				If[!FileExistsQ[libraryResources], CreateDirectory[libraryResources]]; 
				LibraryFunctionLoad[FunctionCompileExportLibrary[lib, func]]
			]
			(*Else*)
		,
			With[{func = Import[Which@@Flatten[(path/.Rule->List)]]},
				If[!FileExistsQ[libraryResources], CreateDirectory[libraryResources]]; 
				LibraryFunctionLoad[FunctionCompileExportLibrary[lib, func]]
			]		
		]
	]
]; 


(*Internal*)


$directory = 
DirectoryName[$InputFileName, 2]; 


getLibraryResourcesDirectory[directory_String] := 
FileNameJoin[{
	directory, 
	"LibraryResources", 
	$SystemID
}]; 

bytesPosition := bytesPosition = FileNameJoin[{$directory, "Kernel", "bytesPosition.wl"}] // Get


ByteUMask[key_ByteArray, data_ByteArray] :=  
byteMask[data, Length[data], key, Length[key] ]

byteMask := byteMask = FileNameJoin[{$directory, "Kernel", "byteMask.wl"}] // Get

(*End private*)


End[]; 


(*End package*)


EndPackage[];
