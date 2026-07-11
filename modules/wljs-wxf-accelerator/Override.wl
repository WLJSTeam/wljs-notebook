BeginPackage["CoffeeLiqueur`Misc`WLJS`Transport`WXFAccelerator`", {"CoffeeLiqueur`WebUSocketHandler`", "CoffeeLiqueur`Misc`WLJS`Transport`"}]; 
Begin["`Internal`"]

System`WLJSIOAddTracking;
System`WLJSIOUpdateSymbol;

(*** Override handlers for symbols updates to use binary websockets ***)

WLJSIOAddTracking[symbol_] := With[{cli = Global`$Client, name = SymbolName[Unevaluated[symbol]], context = Context[Unevaluated[symbol]]},
	If[context == "Global`" || context == "System`",
    	WLJSTransportHandler["AddTracking"][symbol, name, cli, Function[{client, value},
        	BinaryWrite[client, encodeFrame[ExportByteArray[WLJSIOUpdateSymbol[name, value], "WXF"] ] ]
    	] ]
	,
		With[{fullName = StringJoin[context, name]},
    		WLJSTransportHandler["AddTracking"][symbol, fullName, cli, Function[{client, value},
        		BinaryWrite[client, encodeFrame[ExportByteArray[WLJSIOUpdateSymbol[fullName, value], "WXF"] ] ]
    		] ]
		]
	]
]

encodeFrame[message_ByteArray] := 
Module[{byte1, fin, opcode, length, mask, lengthBytes, reserved}, 
	fin = {1}; 
	
	reserved = {0, 0, 0}; 

	opcode = IntegerDigits[2, 2, 4]; 

	byte1 = ByteArray[{FromDigits[Join[fin, reserved, opcode], 2]}]; 

	length = Length[message]; 

	Which[
		length < 126, 
			lengthBytes = ByteArray[{length}], 
		126 <= length < 2^16, 
			lengthBytes = ByteArray[Join[{126}, IntegerDigits[length, 256, 2]]], 
		2^16 <= length < 2^64, 
			lengthBytes = ByteArray[Join[{127}, IntegerDigits[length, 256, 8]]]
	]; 

	(*Return: _ByteArray*)
	ByteArray[Join[byte1, lengthBytes, message]]
]; 


(*** Override ExpressionJSON exports to use WXF for packed arrays ***)

(* force the converter package to load *)
ExportString[0, "ExpressionJSON"];

ClearAll[expressionJSONPackableArrayQ, expressionJSONPackedWXF, toExpressionJSONPackedWXF];

expressionJSONPackableArrayQ[x_] :=
  NumericArrayQ[x] || (ListQ[x] && If[Developer`PackedArrayQ[x], ByteCount[x]> 1024, False]);

expressionJSONPackedWXF[x_] :=
  Internal`PackedArrayWXF[Developer`WriteWXFByteArray[x]];

toExpressionJSONPackedWXF[Image[data_, rest___]] /;
    expressionJSONPackableArrayQ[data] :=
  Image[expressionJSONPackedWXF[data], rest];

toExpressionJSONPackedWXF[Image3D[data_, rest___]] /;
    expressionJSONPackableArrayQ[data] :=
  Image3D[expressionJSONPackedWXF[data], rest];

toExpressionJSONPackedWXF[Audio[data_, rest___]] /;
    expressionJSONPackableArrayQ[data] :=
  Audio[expressionJSONPackedWXF[data], rest];

$expressionJSONHeldAttributes = {
  HoldFirst, HoldRest, HoldAll, HoldAllComplete
};

heldHeadQ[head_Symbol] :=
  Intersection[Attributes[head], $expressionJSONHeldAttributes] =!= {};

heldHeadQ[_] := False;

toExpressionJSONPackedWXF[x_NumericArray] :=
  expressionJSONPackedWXF[x];

toExpressionJSONPackedWXF[x_List] :=
  expressionJSONPackedWXF[x] /; If[Developer`PackedArrayQ[x], ByteCount[x] >  1024, False];

toExpressionJSONPackedWXF[x_?AtomQ] := x;

toExpressionJSONPackedWXF[x_RuleDelayed] := x;

toExpressionJSONPackedWXF[x_] := x /; heldHeadQ[Head[Unevaluated[x]]];

toExpressionJSONPackedWXF[x_] :=
  Map[toExpressionJSONPackedWXF, x];

Unprotect[System`Convert`JSONDump`writeExpressionJSON];

System`Convert`JSONDump`writeExpressionJSON[
  stream_OutputStream, expr_, opts___
] :=
  Developer`WriteExpressionJSONStream[
    stream,
    toExpressionJSONPackedWXF[expr],
    "IssueMessagesAs" -> Export,
    FilterRules[Flatten[{opts}], Options[Developer`WriteExpressionJSONStream]]
  ];

System`Convert`JSONDump`writeExpressionJSON[
  filename_String, expr_, opts___
] :=
  Developer`WriteExpressionJSONFile[
    filename,
    toExpressionJSONPackedWXF[expr],
    "IssueMessagesAs" -> Export,
    FilterRules[Flatten[{opts}], Options[Developer`WriteExpressionJSONFile]]
  ];

Protect[System`Convert`JSONDump`writeExpressionJSON];

ImportString["0", "ExpressionJSON"];  (* force reader package to load *)

ClearAll[fromExpressionJSONPackedWXF];

fromExpressionJSONPackedWXF[x_] :=
  x /. Internal`PackedArrayWXF[ba_ByteArray] :>
    Developer`ReadWXFByteArray[ba];

Unprotect[System`Convert`ExpressionJSONDump`readExpressionJSON];

System`Convert`ExpressionJSONDump`readExpressionJSON[filename_String, opts___] :=
  "Expression" -> fromExpressionJSONPackedWXF[
    Developer`ReadExpressionJSONFile[
      filename,
      "IssueMessagesAs" -> Import
    ]
  ];

System`Convert`ExpressionJSONDump`readExpressionJSON[stream_InputStream, opts___] :=
  "Expression" -> fromExpressionJSONPackedWXF[
    Developer`ReadExpressionJSONStream[
      stream,
      "IssueMessagesAs" -> Import
    ]
  ];

Protect[System`Convert`ExpressionJSONDump`readExpressionJSON];


End[]
EndPackage[]
