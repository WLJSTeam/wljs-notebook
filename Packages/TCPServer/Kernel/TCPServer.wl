(* ::Package:: *)

(* ::Chapter:: *)
(*TCP Server*)


(* ::Program:: *)
(*+-------------------------------------------------+*)
(*|                HANDLE PACKET                    |*)
(*|                                                 |*)
(*|              (receive packet)                   |*)
(*|                      |                          |*)
(*|            [get extended packet]                |*)
(*|                      |                          |*)
(*|                <is complete>                    |*)
(*|           yes /             \ no                |*)
(*|    [get message]      [save packet to buffer]   |*)
(*|          |                   /                  |*)
(*|   [invoke handler]          /                   |*)
(*|          |                 /                    |*)
(*|   [send response]         /                     |*)
(*|          |               /                      |*)
(*|    [clear buffer]       /                       |*)
(*|                 \      /                        |*)
(*|                  {next}                         |*)
(*+-------------------------------------------------+*)


(* ::Section::Closed:: *)
(*Begin package*)


BeginPackage["CoffeeLiqueur`TCPUServer`", {
	"CoffeeLiqueur`UObjects`", 
	"CoffeeLiqueur`UInternal`"
}]; 


(* ::Section::Closed:: *)
(*Names*)


TCPUServer::usage = 
"TCPUServer[opts] TCP server"; 


(* ::Section::Closed:: *)
(*Private context*)


Begin["`Private`"]; 


(* ::Section:: *)
(*Server*)


(* ::Section::Closed:: *)
(*Cosntructor*)


CreateUType[TCPUServer, {
	"Logger", 
	"Buffer" -> <||>, 
	"CompleteHandler" -> <||>, 
	"DefaultCompleteHandler" -> $defaultCompleteHandler, 
	"MessageHandler" -> <||>, 
	"DefaultMessageHandler" -> $defaultMessageHandler
}]; 


(* ::Section::Closed:: *)
(*Entrypoint*)


server_TCPUServer[packet_Association] := 
Module[{logger, client, extendedPacket, message, result, extraPacket, extraPacketDataLength}, 
	client = packet["SourceSocket"]; (*SocketObject[] | USocketObject[]*)
	extendedPacket = getExtendedPacket[server, client, packet]; (*Association[]*)

	If[extendedPacket["Completed"], 
		message = getMessage[server, client, extendedPacket]; (*ByteArray[]*)
		result = invokeHandler[server, client, message]; (*ByteArray[] | _String | Null*)
		sendResponse[server, client, result]; 

		If[extendedPacket["StoredLength"] > extendedPacket["ExpectedLength"], 
			extraPacket = packet; 
			extraPacketDataLength = extendedPacket["StoredLength"] - extendedPacket["ExpectedLength"]; 
			extraPacket["DataByteArray"] = packet["DataByteArray"][[-extraPacketDataLength ;; ]]; 
			clearBuffer[server, client]; 	
			server[extraPacket], 
		(*Else*)
			clearBuffer[server, client]
		], 
	
	(*Else*)
		savePacketToBuffer[server, client, extendedPacket]
	]; 
]; 


(* ::Section:: *)
(*Internal methods*)


TCPUServer /: getExtendedPacket[server_TCPUServer, client: _[uuid_], packet_Association] := 
Module[{data, dataLength, buffer, last, expectedLength, storedLength, completed, completeHandler, defaultCompleteHandler, extendedPacket}, 
	data = packet["DataByteArray"]; (*ByteArray[]*)
	dataLength = Length[data]; 

	If[KeyExistsQ[server["Buffer"], uuid] && server["Buffer", uuid]["Length"] > 0, 
		buffer = server["Buffer", uuid]; (*DataStructure[DynamicArray]*)
		last = buffer["Part", -1]; (*Association[]*) 
		expectedLength = last["ExpectedLength"]; 
		storedLength = last["StoredLength"];, 

	(*Else*)
		completeHandler = server["CompleteHandler"]; (*Association[] | Function[]*)
		defaultCompleteHandler = server["DefaultCompleteHandler"]; (*Function[]*)
		expectedLength = ConditionUApply[completeHandler, defaultCompleteHandler][client, data]; 
		storedLength = 0; 
	]; 

	completed = storedLength + dataLength >= expectedLength; 

	server["Logger"]["received: " <> ToString[dataLength] <> " bytes; completed: " <> ToString[completed]]; 

	(*Return: Association[]*)
	Join[packet, <|
		"Completed" -> completed, 
		"ExpectedLength" -> expectedLength, 
		"StoredLength" -> storedLength + dataLength, 
		"DataLength" -> dataLength
	|>]
]; 


TCPUServer /: getMessage[server_TCPUServer, client: _[uuid_], extendedPacket_Association] := 
If[KeyExistsQ[server["Buffer"], uuid] && server["Buffer", uuid]["Length"] > 0,  

	(*Return: _ByteArray*)
	Part[#, 1 ;; extendedPacket["ExpectedLength"]]& @ 
	Apply[Join] @ 
	Append[extendedPacket["DataByteArray"]] @ 
	server["Buffer", uuid]["Elements"][[All, "DataByteArray"]], 

(*Else*)

	(*Return: _ByteArray*)
	extendedPacket["DataByteArray"][[1 ;; extendedPacket["ExpectedLength"]]]
];  


TCPUServer /: invokeHandler[server_TCPUServer, client_, message_ByteArray] := 
Module[{messageHandler, defaultMessageHandler}, 
	messageHandler = server["MessageHandler"]; 
	defaultMessageHandler = server["DefaultMessageHandler"]; 

	(*Return: ByteArray[] | _String | Null*)
	ConditionUApply[messageHandler, defaultMessageHandler][client, message]
]; 


TCPUServer /: sendResponse[server_TCPUServer, client_, result: _ByteArray | _String | Null] := 
Switch[result, 
	_String, 
		server["Logger"]["sending " <> ToString[StringLength[result]] <> " bytes response..."]; 
		WriteString[client, result]; , 
	
	_ByteArray, 
		server["Logger"]["sending " <> ToString[Length[result]] <> " bytes response..."]; 
		BinaryWrite[client, result];, 
	
	_Association, 
		If[KeyExistsQ[result, "Callback"] && KeyExistsQ[result, "Result"], 
			server["Logger"]["sending " <> ToString[Length[result["Result"]]] <> " bytes response..."]; 
			BinaryWrite[client, result["Result"]]; 
			result["Callback"][client, result["Result"]]; 
		];, 

	Null, 
		server["Logger"]["handle message without response", result];
]; 


TCPUServer /: savePacketToBuffer[server_TCPUServer, _[uuid_], extendedPacket_Association] := 
If[KeyExistsQ[server["Buffer"], uuid], 
	server["Buffer", uuid]["Append", extendedPacket], 
	server["Buffer", uuid] = CreateDataStructure["DynamicArray", {extendedPacket}]
]; 


TCPUServer /: clearBuffer[server_TCPUServer, _[uuid_]] := 
If[KeyExistsQ[server["Buffer"], uuid], 
	server["Buffer", uuid]["DropAll"]; 
]; 


(* ::Section::Closed:: *)
(*Defaults*)


$defaultCompleteHandler = 
Function[{client, data}, Length[data]]; 


$defaultMessageHandler = 
Function[{client, data}, Close[client]]; 


(* ::Section::Closed:: *)
(*End private context*)


End[]; 


(* ::Section::Closed:: *)
(*End package*)


EndPackage[]; 
