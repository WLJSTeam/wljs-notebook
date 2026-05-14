(* ::Package:: *)

(* ::Chapter:: *)
(*HTTP Handler*)


(*
	message - ByteArray passed from TCPUServer handler
	request - Association parsed from message
	response - Null | String | ByteArray for further sending to TCPUServer handler
*)


(* ::Program:: *)
(*+-----------------------------------------------+*)
(*|                HTTP HANDLER                   |*)
(*|                                               |*)
(*|              (reseive request)                |*)
(*|                      |                        |*)
(*|           [parse request to assoc]            |*)
(*|                      |                        |*)
(*|              <select pipeline>                |*)
(*|     /       /        |        \         \     |*)
(*|    ..   [get..]  [post..]  [delete..]   ..    |*)
(*|             \        |        /               |*)
(*|          [create string response]             |*)
(*|                      |                        |*)
(*|               {return to tcp}                 |*)
(*+-----------------------------------------------+*)


(* ::Section::Closed:: *)
(*Requarements*)



(* ::Section::Closed:: *)
(*Begin packge*)


BeginPackage["CoffeeLiqueur`HTTPHandler`", {
	"CoffeeLiqueur`Objects`", 
	"CoffeeLiqueur`Internal`"
}]; 


(* ::Section::Closed:: *)
(*Names*)


ClearAll["`*"]


HTTPUPacketQ::usage = 
"HTTPUPacketQ[client, message] check that message was sent via HTTP protocol."; 


HTTPUPacketLength::usage = 
"HTTPUPacketLength[client, message] returns expected message length."; 


HTTPUHandler::usage = 
"HTTPUHandler[opts] mutable type for the handling HTTP request."; 


(* ::Section::Closed:: *)
(*Begin private context*)


Begin["`Private`"]; 


(* ::Section::Closed:: *)
(*HTTPUPacketQ*)


HTTPUPacketQ[client_, message_ByteArray] := 
Module[{head}, 
	head = ByteArrayToString[BytesUSplit[message, $httpEndOfHead -> 1][[1]]]; 
	
	(*Return: True | False*)
	And[
		StringLength[head] != Length[message], (* equivalent of the StringContainsQ[message, $httpEndOfHead] *)
		StringContainsQ[head, StartOfString ~~ $httpMethods], 
		Or[
			StringContainsQ[head, StartOfLine ~~ "Connection: keep-alive", IgnoreCase -> True], 
			StringContainsQ[head, StartOfLine ~~ "Connection: close", IgnoreCase -> True]
		]
	]
]; 


(* ::Section::Closed:: *)
(*HTTPUPacketLength*)


HTTPUPacketLength[client_, message_ByteArray] := 
Module[{head}, 
	head = ByteArrayToString[BytesUSplit[message, $httpEndOfHead -> 1][[1]]]; 

	(*Return: _Integer*)
	Which[
		StringContainsQ[head, "Content-Length: ", IgnoreCase -> True], 
			StringLength[head] + 4 + ToExpression[StringExtract[head, {"Content-Length: ", "content-length: "} -> 2, "\r\n" -> 1]], 
		True, 
			Length[message]
	]
]; 


(* ::Section::Closed:: *)
(*HTTPUHandler*)


CreateUType[HTTPUHandler, {
	"MessageHandler" -> <||>, 
	"DefaultMessageHandler" -> $messageHandler, 
	"Deserializer" -> <||>, 
	"Serializer" -> <||>, 
	"Logger" -> Automatic
}]; 


handler_HTTPUHandler[client_, message_ByteArray] := 
Module[{request, response, pipeline, result, deserializer, serializer, messageHandler, defaultMessageHandler, logger}, 
	deserializer = handler["Deserializer"]; 
	serializer = handler["Serializer"]; 
	messageHandler = handler["MessageHandler"]; 
	defaultMessageHandler = handler["DefaultMessageHandler"]; 
	
	(*Signature: logger[text_String, expr_]*)
	logger = handler["Logger"]; 
	logger["Request", message];

	(*Request: _Association*)
	request = parseRequest[message, deserializer]; 
	logger["Parsed", request]; 

	(*Result: _String | _Association*)
	result = ConditionUApply[messageHandler, defaultMessageHandler][request]; 
	logger["Result", result]; 

	(*Result: _String | _ByteArray*)
	response = createResponse[result, serializer]; 
	logger["Response", response]; 

	(*Return: _String | ByteArray[]*)
	response
]; 


(* ::Section::Closed:: *)
(*Internal*)


$httpMethods = {"GET", "PUT", "DELETE", "HEAD", "POST", "CONNECT", "OPTIONS", "TRACE", "PATCH"}; 


$httpEndOfHead = StringToByteArray["\r\n\r\n"]; 


$errorResponse = <|"Code" -> 404, "Body" -> "Not found"|>; 


parseRequest[message_ByteArray, deserializer_] := 
Module[{headBytes, head, headline, headers, body, bodyBytes}, 
	{headBytes, bodyBytes} = BytesUSplit[message, $httpEndOfHead -> 1]; 
	head = ByteArrayToString[headBytes]; 
	
	headline = First @ StringCases[
		StringExtract[head, "\r\n" -> 1], 
		method__ ~~ " " ~~ url__ ~~ " " ~~ version__ :> Join[
			<|"Method" -> method|>, 
			MapAt[Association, Key["Query"]] @ 
			MapAt[URLBuild, Key["Path"]] @ 
			<|URLParse[url]|>[[{"Path", "Query"}]], 
			<|"Version" -> version|>
		], 
		IgnoreCase -> True
	]; 

	headers = Association[
		Map[Rule[#1, StringRiffle[{##2}, ":"]]& @@ Map[StringTrim]@StringSplit[#, ":"] &]@
  		StringExtract[head, "\r\n\r\n" -> 1, "\r\n" -> 2 ;; ]
	]; 

	body = ConditionUApply[deserializer, $deserializer][headers, bodyBytes]; 

	(*Return: Association[
		Metod, 
		Path, 
		Query, 
		Version, 
		Headers, 
		Body
	]*)
	Join[
		headline, 
		<|"Headers" -> headers, "Body" -> body|>
	]
]; 


createResponse[body_, serializer_] := 
createResponse[
	<|
		"Code" -> 200, 
		"Body" -> body
	|>, 
	serializer
]; 


createResponse[assoc_Association, serializer_] := 
Module[{response = assoc, body, headers}, 
	body = ConditionUApply[serializer, $serializer][response["Body"]]; 

	If[StringQ[body], body = StringToByteArray[body]];

	If[Not[KeyExistsQ[response, "Message"]], response["Message"] = "OK"]; 
	If[Not[KeyExistsQ[response, "Headers"]], 
		response["Headers"] = <|
		"Content-Length" -> Length[body]
		|>
	];  

	(*Return: ByteArray[]*)
	Join[StringToByteArray[StringTemplate["HTTP/1.1 `Code` `Message`\r\n"][response] <> 
		StringRiffle[KeyValueMap[StringRiffle[{#1, ToString[#2]}, ": "]&] @ response["Headers"], "\r\n"] <> 
		"\r\n\r\n"],
		body]

]; 


(* ::Section::Closed:: *)
(*Default message handler*)


$messageHandler = 
Function[<|"Code" -> 404, "Body" -> "NotFound"|>];


(* ::Section::Closed:: *)
(*Serialization*)


$deserializer[headers_Association, body_ByteArray] := 
body; 


$serializer[expr_] := 
ExportString[expr, "ExpressionJSON"]; 


$serializer[assoc_Association] := 
ExportString[assoc, "RawJSON"]; 


$serializer[list_List] := 
ExportString[list, "RawJSON"]; 


$serializer[image_Image] := 
ExportString[image, "PNG"]; 


$serializer[image_Graphics] := 
ExportString[image, "SVG"]; 


$serializer[text_String] := 
text; 

$serializer[bytes_ByteArray] := 
bytes


(* ::Section::Closed:: *)
(*End private context*)


End[]; 


(* ::Section::Closed:: *)
(*End packet*)


EndPackage[]; 
