BeginPackage["CoffeeLiqueur`Misc`WLJS`Transport`", {
    "CoffeeLiqueur`WebUSocketHandler`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`Misc`Events`"
}]; 

WLJSTransportHandler::usage = ""
WLJSTransportScript::usage = ""
WLJSAliveQ::usage = ""

WLJSTransportSend::usage = ""

System`Offload;
Offload::usage = "Hold expression to be evaluated on a frontend"

Begin["`Private`"]

System`WLJSIOImport;
System`WLJSIOUpdateSymbol;
System`WLJSIOAddTracking;
System`WLJSIOGetSymbol;
System`WLJSIOPromise;
System`WLJSIOPromiseResolve;
System`WLJSIDCardRegister;
System`WLJSIOPromiseCallback;

System`WLJSIORequest;
System`WLJSIOFetch;

System`SlientPing;

WLJSIOImport[data_] := ImportByteArray[URLDecode[data]//StringToByteArray, "RawJSON"]

SetAttributes[Offload, HoldFirst]

WLJSTransportHandler[cl_, data_ByteArray] := Block[{Global`$Client = cl},
    ToExpression[data//ByteArrayToString];
]

WLJSTransportSend[expr_, client_] := WebSocketUSend[client, expr // $DefaultSerializer]

$DefaultSerializer = ExportByteArray[#, "ExpressionJSON", Compact->0]&

WLJSIOAddTracking[symbol_] := With[{cli = Global`$Client, name = SymbolName[Unevaluated[symbol]]},
    WLJSTransportHandler["AddTracking"][symbol, name, cli, Function[{client, value},
        WebSocketUSend[client, WLJSIOUpdateSymbol[name, value] // $DefaultSerializer]
    ]]
]

SetAttributes[WLJSIOAddTracking, HoldFirst]

WLJSIOGetSymbol[uid_, params_][expr_] := With[{client = Global`$Client},
    WLJSTransportHandler["GetSymbol"][expr, client, Function[result,
        WebSocketUSend[client, WLJSIOPromiseResolve[uid, result] // $DefaultSerializer] 
    ]]
];

WLJSIOPromise[uid_, params_][expr_] := With[{client = Global`$Client},
    (*Print["WLJS promise >> get with id "<>uid];*)
    WebSocketUSend[client, WLJSIOPromiseResolve[uid, expr] // $DefaultSerializer];
];

WLJSIOFetch[uid_][symbol_] := With[{client = Global`$Client},
    (*Print["WLJS promise >> get with id "<>uid];*)
    If[PromiseQ[symbol],
        Then[symbol, Function[res,
            WebSocketUSend[client, WLJSIOPromiseResolve[uid, res] // $DefaultSerializer];
        ] ];
    ,
        WebSocketUSend[client, WLJSIOPromiseResolve[uid, symbol] // $DefaultSerializer];
    ]
];

WLJSIOFetch[uid_][r_, args_List] := With[{client = Global`$Client, symbol = r @@ args},
    (*Print["WLJS promise >> get with id "<>uid];*)
    If[PromiseQ[symbol],
        Then[symbol, Function[res,
            WebSocketUSend[client, WLJSIOPromiseResolve[uid, res] // $DefaultSerializer];
        ] ];
    ,
        WebSocketUSend[client, WLJSIOPromiseResolve[uid, symbol] // $DefaultSerializer];
    ]
];

WLJSIORequest[uid_][ev_String, pattern_, data_] := With[{client = Global`$Client, res = EventFire[ev, pattern, data]},
    (*Print["WLJS promise >> get with id "<>uid];*)
    If[PromiseQ[res],
        Then[res, Function[r,
            WebSocketUSend[client, WLJSIOPromiseResolve[uid, r] // $DefaultSerializer];
        ] ];
    ,
        WebSocketUSend[client, WLJSIOPromiseResolve[uid, res] // $DefaultSerializer];
    ]
];

WLJSIOPromiseCallback[uid_, params_][expr_] := With[{client = Global`$Client},
    (*Print["WLJS promise >> get with id "<>uid];*)
    expr[Function[result, 
        WebSocketUSend[client, WLJSIOPromiseResolve[uid, result] // $DefaultSerializer];
    ]];
];

IDCards = <||>;
WLJSIDCardRegister[uid_String] := (Print["Transport registered as "<>uid]; IDCards[uid] = Global`$Client)

WLJSAliveQ[uid_String] := (
    If[KeyExistsQ[IDCards, uid],
        With[{res = !FailureQ[WebSocketUSend[IDCards[uid], SlientPing // $DefaultSerializer]]},
            If[!res, IDCards[uid] = .];
            res
        ]
    ,
        Missing[]
    ]
)

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


WLJSTransportScript[OptionsPattern[] ] := If[NumberQ[OptionValue["Port"] ],
    Switch[{OptionValue["TwoKernels"], OptionValue["Event"], OptionValue["Host"]},
        {False, Null, Null},
        ScriptTemplate[OptionValue["PrefixMode"], OptionValue["Port"], "server.init({socket: socket})" ]
    ,
        {True, Null, Null},
        ScriptTemplate[OptionValue["PrefixMode"], OptionValue["Port"], "server.init({socket: socket, kernel: true})" ]
    ,
        {False, _String, Null},
        ScriptTemplate[OptionValue["PrefixMode"], OptionValue["Port"], "server.init({socket: socket}); server.emitt('"<>OptionValue["Event"]<>"', 'True', 'Connected');" ]
    ,
        {True, _, Null},
        ScriptTemplate[OptionValue["PrefixMode"], OptionValue["Port"], "server.init({socket: socket, kernel: true}); " ]
    ,
        {False, Null, _String},
        ScriptTemplate[OptionValue["PrefixMode"], OptionValue["Port"], OptionValue["Host"], "server.init({socket: socket}); " ]
    ,
        {True, Null, _String},
        ScriptTemplate[OptionValue["PrefixMode"], OptionValue["Port"], OptionValue["Host"], "server.init({socket: socket, kernel: true}); " ]        
    ]
,
    "Specify a mode and a port!"
]

Options[WLJSTransportScript] = {"Port"->Null, "Host"->Null, "PrefixMode"->False, "Regime"->"Standalone", "Event"->Null, "TwoKernels" -> False}

assets = $InputFileName // DirectoryName // ParentDirectory;

commonScript = StringRiffle[{
    Import[FileNameJoin[{assets, "Assets", "ServerAPI.js"}], "String"],
    Import[FileNameJoin[{assets, "Assets", "InterpreterExtension.js"}], "String"]
}, "\n"];


ScriptTemplate[_, port_, initCode_] := 
    StringTemplate["
        <script type=\"module\">
            ``
            ;
            const wport = ``;
            var socket = new WebSocket((window.location.protocol == \"https:\" ? \"wss://\" : \"ws://\")+window.location.hostname+':'+wport);
            window.server = new Server('Master Kernel');

            socket.onopen = function(e) {
              console.log(\"[open]\");
              
              ``;
            }; 

            socket.onmessage = function(event) {
              //create global context
              //callid
              const uid = Math.floor(Math.random() * 100);
              var global = {call: uid};
              interpretate(JSON.parse(event.data), {global: global});
            };

            socket.onclose = function(event) {
              console.log(event);
              if (wport == 0) return;
              tryreload(() => {
                interpretate.alert('Connection lost. Please, update the page to see new changes.')
              });
            }; 

            
        </script>
    "][commonScript, port, initCode]

ScriptTemplate[_, port_, host_, initCode_] := 
    StringTemplate["
        <script type=\"module\">
            ``
            ;
            const wport = ``;
            var socket = new WebSocket((window.location.protocol == \"https:\" ? \"wss://\" : \"ws://\")+'``'+':'+wport);
            window.server = new Server('Master Kernel');

            socket.onopen = function(e) {
              console.log(\"[open]\");
              
              ``;
            }; 

            socket.onmessage = function(event) {
              //create global context
              //callid
              const uid = Math.floor(Math.random() * 100);
              var global = {call: uid};
              interpretate(JSON.parse(event.data), {global: global});
            };

            socket.onclose = function(event) {
              console.log(event);
              if (wport == 0) return;
              tryreload(() => {
                interpretate.alert('Connection lost. Please, update the page to see new changes.')
              });
            }; 

            
        </script>
    "][commonScript, port, host, initCode]    



ScriptTemplate[prefix_String, port_, initCode_] := 
    StringTemplate["
        <script type=\"module\">
            ``
            ;
            const wport = ``;
            var socket = new WebSocket((window.location.protocol == \"https:\" ? \"wss://\" : \"ws://\")+window.location.hostname+':'+window.location.port+'/``');
            window.server = new Server('Master Kernel');

            socket.onopen = function(e) {
              console.log(\"[open]\");
              
              ``;
            }; 

            socket.onmessage = function(event) {
              //create global context
              //callid
              const uid = Math.floor(Math.random() * 100);
              var global = {call: uid};
              interpretate(JSON.parse(event.data), {global: global});
            };

            socket.onclose = function(event) {
              console.log(event);
              if (wport == 0) return;
              tryreload(() => {
                interpretate.alert('Connection lost. Please, update the page to see new changes.')
              });
            }; 

            
        </script>
    "][commonScript, port, prefix, initCode]

ScriptTemplate[prefix_String, port_, host_, initCode_] := 
    StringTemplate["
        <script type=\"module\">
            ``
            ;
            const wport = ``;
            var socket = new WebSocket((window.location.protocol == \"https:\" ? \"wss://\" : \"ws://\")+'``/``');
            window.server = new Server('Master Kernel');

            socket.onopen = function(e) {
              console.log(\"[open]\");
              
              ``;
            }; 

            socket.onmessage = function(event) {
              //create global context
              //callid
              const uid = Math.floor(Math.random() * 100);
              var global = {call: uid};
              interpretate(JSON.parse(event.data), {global: global});
            };

            socket.onclose = function(event) {
              console.log(event);
              if (wport == 0) return;
              tryreload(() => {
                interpretate.alert('Connection lost. Please, update the page to see new changes.')
              });
            }; 

            
        </script>
    "][commonScript, port, host, prefix, initCode]    


End[];

EndPackage[];

System`WLXEmbed;
