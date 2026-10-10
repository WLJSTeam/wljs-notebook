BeginPackage["CoffeeLiqueur`WLJS`Transport`", {
    "CoffeeLiqueur`WebUSocketHandler`"
}]; 

(* Public API *)

WLJSTransportHandler;
WLJSTransportScript;
$WLJSTransportAssets;

WLJSTransportSend;

Begin["`Internal`"]


(* System-wide symbols *)
(* Exposing them reduces the payload on very fast updates             *)
(* Normally, you should keep them in the internal (private)  context  *)
(* and use their full name when defining them on JS side              *)

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

System`$CurrentWebSocket;
System`Offload;

Offload::usage = "Hold expression to be evaluated on the frontend"
SetAttributes[Offload, HoldFirst]

WLJSIOImport[data_] := ImportByteArray[URLDecode[data]//StringToByteArray, "RawJSON"]

(* Main handler will evaluate any WebSocket message *)
WLJSTransportHandler[cl_, data_ByteArray] := Block[{$CurrentWebSocket = cl},
    ToExpression[data//ByteArrayToString];
]

$DefaultSerializer[expr_] :=
  Block[
    {
      $Context = "dsc$`",
      $ContextPath = {"dsc$`", "System`", "Global`"}
    },
    ExportByteArray[expr, "ExpressionJSON"]
];

WLJSTransportSend[expr_, client_] := WebSocketUSend[client, expr // $DefaultSerializer]

(* performance critical part! streaming large chunks of data upon symbol update *)
WLJSIOAddTracking[symbol_] := With[{cli = $CurrentWebSocket, name = SymbolName[Unevaluated[symbol]], context = Context[Unevaluated[symbol]]},
	If[context == "Global`" || context == "System`",
    	WLJSTransportHandler["AddTracking"][symbol, name, cli, Function[{client, value},
                (* bypass $DefaultSerializer for faster path *)
                WebSocketUSendBinary[client, ExportByteArray[WLJSIOUpdateSymbol[name, value], "WXF"] ];
    	] ]
	,
		With[{fullName = StringJoin[context, name]},
    		WLJSTransportHandler["AddTracking"][symbol, fullName, cli, Function[{client, value},
                (* bypass $DefaultSerializer for faster path *)
                WebSocketUSendBinary[client, ExportByteArray[WLJSIOUpdateSymbol[fullName, value], "WXF"] ];
    		] ]
		]
	]
]

SetAttributes[WLJSIOAddTracking, HoldFirst]


WLJSIOGetSymbol[uid_, params_][expr_] := With[{client = $CurrentWebSocket},
    WLJSTransportHandler["GetSymbol"][expr, client, Function[result,
        WebSocketUSend[client, WLJSIOPromiseResolve[uid, result] // $DefaultSerializer] 
    ]]
];

WLJSIOPromise[uid_, params_][expr_] := With[{client = $CurrentWebSocket},
    WebSocketUSend[client, WLJSIOPromiseResolve[uid, expr] // $DefaultSerializer];
];

WLJSIOFetch[uid_][symbol_] := With[{client = $CurrentWebSocket},
    If[PromiseQ[symbol],
        Then[symbol, Function[res,
            WebSocketUSend[client, WLJSIOPromiseResolve[uid, res] // $DefaultSerializer];
        ] ];
    ,
        WebSocketUSend[client, WLJSIOPromiseResolve[uid, symbol] // $DefaultSerializer];
    ]
];

WLJSIOFetch[uid_][r_, args_List] := With[{client = $CurrentWebSocket, symbol = r @@ args},
    If[PromiseQ[symbol],
        Then[symbol, Function[res,
            WebSocketUSend[client, WLJSIOPromiseResolve[uid, res] // $DefaultSerializer];
        ] ];
    ,
        WebSocketUSend[client, WLJSIOPromiseResolve[uid, symbol] // $DefaultSerializer];
    ]
];

WLJSIORequest[uid_][ev_String, pattern_, data_] := With[{client = $CurrentWebSocket, res = EventFire[ev, pattern, data]},
    If[PromiseQ[res],
        Then[res, Function[r,
            WebSocketUSend[client, WLJSIOPromiseResolve[uid, r] // $DefaultSerializer];
        ] ];
    ,
        WebSocketUSend[client, WLJSIOPromiseResolve[uid, res] // $DefaultSerializer];
    ]
];

WLJSIOPromiseCallback[uid_, params_][expr_] := With[{client = $CurrentWebSocket},
    (*Print["WLJS promise >> get with id "<>uid];*)
    expr[Function[result, 
        WebSocketUSend[client, WLJSIOPromiseResolve[uid, result] // $DefaultSerializer];
    ]];
];

(* Script for embeding *)


WLJSTransportScript[OptionsPattern[] ] := If[NumberQ[OptionValue["Port"] ],
    Switch[{OptionValue["TwoKernels"], OptionValue["Event"], OptionValue["Host"]},
        {False, Null, Null},
        ScriptTemplate[OptionValue["PrefixMode"], OptionValue["Port"], "server.init({socket: socket})" ]
    ,
        {True, Null, Null},
        ScriptTemplate[OptionValue["PrefixMode"], OptionValue["Port"], "server.init({socket: socket, kernel: true})" ]
    ,
        {False, _String, Null},
        ScriptTemplate[OptionValue["PrefixMode"], OptionValue["Port"], "server.init({socket: socket}); server.io.fire('"<>OptionValue["Event"]<>"', true, 'Connected');" ]
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

rootDir = $InputFileName // DirectoryName // ParentDirectory;
root = rootDir // FileNameSplit // Last;
commonScript = Table[StringTemplate["<script type=\"module\" src=\"``\"></script>"]["/"<>root<>"/"<>p], {p, {
    "src/api.js",
    "src/extension.js"
}}] // StringRiffle;

$WLJSTransportAssets = {
    FileNameJoin[{rootDir, "src", "api.js"}],
    FileNameJoin[{rootDir, "src", "extension.js"}]
};

ScriptTemplate[_, port_, initCode_] := 
    StringTemplate["
        ``
        <script type=\"module\">
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
        ``
        <script type=\"module\">
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
        ``
        <script type=\"module\">
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
        ``
        <script type=\"module\">
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

(* 
    Override ExpressionJSON exports to use WXF for packed arrays 
    This is hacky, since it uses internal private symbols of WL14+

    It significantly improves performance (especially on floats) and memory usage

    here we create a new structure Internal`PackedArrayWXF
    this will be defined on the frontend too
*)

(* frontend symbol *)
Internal`PackedArrayWXF;

(* force the converter package to load *)
ExportString[0, "ExpressionJSON"];

ClearAll[expressionJSONPackableArrayQ, expressionJSONPackedWXF, toExpressionJSONPackedWXF];

(* Use it only on "large" objects *)

expressionJSONPackableArrayQ[x_] :=
  NumericArrayQ[x] || (ListQ[x] && If[Developer`PackedArrayQ[x], ByteCount[x]> 1024, False]);

expressionJSONPackedWXF[x_] :=
  Internal`PackedArrayWXF[Developer`WriteWXFByteArray[x]];

Quiet[
 toExpressionJSONPackedWXF[Image[data_, rest___]] /;
    expressionJSONPackableArrayQ[data] :=
  Image[expressionJSONPackedWXF[data], rest];

 toExpressionJSONPackedWXF[Image3D[data_, rest___]] /;
    expressionJSONPackableArrayQ[data] :=
  Image3D[expressionJSONPackedWXF[data], rest];

 toExpressionJSONPackedWXF[Audio[data_, rest___]] /;
    expressionJSONPackableArrayQ[data] :=
  Audio[expressionJSONPackedWXF[data], rest];
];

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

(* force reader package to load *)

ImportString["0", "ExpressionJSON"];  

(* Inverse convertion *)

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
