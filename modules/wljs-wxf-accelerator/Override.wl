BeginPackage["CoffeeLiqueur`Misc`WLJS`Transport`WXFAccelerator`", {"CoffeeLiqueur`WebUSocketHandler`", "CoffeeLiqueur`Misc`WLJS`Transport`"}]; 
Begin["`Internal`"]

System`WLJSIOAddTracking;
System`WLJSIOUpdateSymbol;

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



End[]
EndPackage[]
