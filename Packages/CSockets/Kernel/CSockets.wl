(* ::Package:: *)

(* ::Chapter:: *)
(*USocketListener*)


(* ::Section:: *)
(*Begin package*)


BeginPackage["CoffeeLiqueur`CUSockets`"]; 

Needs @ If[$OperatingSystem === "Windows",  
	"CoffeeLiqueur`CUSockets`Interface`Windows`", 
	"CoffeeLiqueur`CUSockets`Interface`Unix`"
];

(* ::Section:: *)
(*Names*)


USocketObject::usage = 
"USocketObject[socketId] socket representation."; 


USocketOpen::usage = 
"USocketOpen[port] returns new server socket."; 


USocketConnect::usage = 
"USocketConnect[host, port] connect to socket"; 


USocketListener::usage = 
"USocketListener[assoc] listener object."; 


(* ::Section:: *)
(*Private context*)


Begin["`Private`"]; 


(* ::Section:: *)
(*Implementation*)


USocketObject[socketId_Integer]["DestinationPort"] := 
socketPort[socketId]; 


USocketOpen[host_String: "localhost", port_Integer] := 
USocketObject[socketOpen[host, ToString[port]]]; 


USocketOpen[address_String ] /; 
StringMatchQ[address, __ ~~ ":" ~~ NumberString] := 
USocketObject[Apply[socketOpen, Join[StringSplit[address, ":"], {}] ] ]; 



USocketConnect[host_String: "localhost", port_Integer] := 
USocketObject[socketConnect[host, ToString[port]]]; 

USocketObject /: SocketConnect[USocketObject[socketId_] ] := USocketObject[ socketConnectInternal[socketId] ]; 


USocketConnect[address_String] /; 
StringMatchQ[address, __ ~~ ":" ~~ NumberString] := 
USocketObject[Apply[socketConnect, StringSplit[address, ":"]]]; 


USocketObject /: BinaryWrite[USocketObject[socketId_Integer], data_ByteArray] := With[{result = socketBinaryWrite[socketId, data, Length[data], $bufferSize]},
	If[result < 0,  $Failed, result]
]


USocketObject /: BinaryWrite[USocketObject[socketId_Integer], data_List] := With[{result = socketBinaryWrite[socketId, ByteArray[data], Length[data], $bufferSize]},
	If[result < 0,  $Failed, result]
]


USocketObject /: WriteString[USocketObject[socketId_Integer], data_String] := With[{result = socketWriteString[socketId, data, StringLength[data], $bufferSize]},
	If[result < 0,  $Failed, result]
]


USocketObject /: SocketReadMessage[USocketObject[socketId_Integer], bufferSize_Integer: $bufferSize] := 
socketReadMessage[socketId, bufferSize]; 


USocketObject /: SocketReadyQ[USocketObject[socketId_Integer]] := 
socketReadyQ[socketId]; 


USocketObject /: Close[USocketObject[socketId_Integer]] := 
socketClose[socketId]; 

StandardSocketEventsHandler = Echo[StringTemplate["`` was ``"][#2, #1] ]&;

USocketObject /: SocketListen[socket: USocketObject[socketId_Integer], handler_, OptionsPattern[{SocketListen, "BufferSize" -> $bufferSize, "SocketEventsHandler" -> StandardSocketEventsHandler}]] := 
With[{messager = OptionValue["SocketEventsHandler"]},
	Module[{task}, 
		task = createAsynchronousTask[socketId, 
			(With[{p = toPacket[##]}, p /. {a_Association :> handler[a], b_List :> (messager@@b)} ] ) &
		, "BufferSize" -> OptionValue["BufferSize"] ]; 

		USocketListener[<|
			"Socket" -> socket, 
			"Host" -> socket["DestinationHostname"], 
			"Port" -> socket["DestinationPort"], 
			"Handler" -> handler, 
			"TaskId" -> task[[2]], 
			"Task" -> task
		|>]
	]; 
];


USocketListener /: DeleteObject[USocketListener[assoc_Association]] := 
socketListenerTaskRemove[assoc["TaskId"]]; 


(* ::Section:: *)
(*Internal*)

$bufferSize = 8192; 

toPacket[task_, "Received", {serverId_, clientId_, data_}] :=
	<|
		"Socket" -> USocketObject[serverId], 
		"SourceSocket" -> USocketObject[clientId], 
		"DataByteArray" -> ByteArray[data]
	|>

toPacket[task_, any_String, {serverId_, clientId_, data_}] := {any, USocketObject[clientId]}


(* ::Section:: *)
(*End private context*)


End[]; 


(* ::Section:: *)
(*End package*)


EndPackage[]; 
