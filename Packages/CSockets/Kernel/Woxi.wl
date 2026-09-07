BeginPackage["CoffeeLiqueur`CUSockets`Interface`Woxi`"]

createAsynchronousTask;
socketOpen;
socketClose;
socketBinaryWrite;
socketWriteString;

socketConnect;
socketConnectInternal;

socketReadyQ;
socketReadMessage;
socketPort;
socketListenerTaskRemove;


Begin["`Private`"]


Echo["CSockets >> Woxi >> Using native sockets"];

$nextSocketId = 0;

registerNativeSocket[socket_] := Module[{uuid, id},
    uuid = socket["UUID"];
    id = socketIds[uuid];

    If[IntegerQ[id], Return[id]];

    id = $nextSocketId = $nextSocketId + 1;
    socketIds[uuid] = id;
    nativeSockets[id] = socket;
    socketsInfo[id] = socket["DestinationPort"];
    id
];

socketOpen[host_String, port_String] :=
    registerNativeSocket[SocketOpen[host, ToExpression[port]]];

socketConnect[host_String, port_String] :=
    registerNativeSocket[SocketConnect[host, ToExpression[port]]];

socketConnectInternal[socketId_Integer] := With[{
    socket = nativeSockets[socketId]
},
    registerNativeSocket[SocketConnect[
        socket["DestinationHostname"],
        socket["DestinationPort"]
    ]]
];

socketClose[socketId_Integer] := With[{result = Close[nativeSockets[socketId]]},
    If[result === $Failed, -1, 0]
];

socketBinaryWrite[socketId_Integer, data_ByteArray, length_Integer, bufferSize_Integer] :=
With[{result = BinaryWrite[nativeSockets[socketId], data]},
    If[result === $Failed, -1, length]
];

socketWriteString[socketId_Integer, data_String, length_Integer, bufferSize_Integer] :=
With[{result = WriteString[nativeSockets[socketId], data]},
    If[result === $Failed, -1, length]
];

socketReadyQ[socketId_Integer] := SocketReadyQ[nativeSockets[socketId]];

socketReadMessage[socketId_Integer, size_Integer] :=
    SocketReadMessage[nativeSockets[socketId], size];

socketPort[socketId_Integer] := If[IntegerQ[socketsInfo[socketId]],
    socketsInfo[socketId],
    -1
];

forwardAccepted[event_] := (registerNativeSocket[event["SourceSocket"]]; Null);

forwardReceived[serverId_Integer, handler_][event_] := Module[{clientId},
    clientId = registerNativeSocket[event["SourceSocket"]];
    handler[serverId, "Received", {
        serverId,
        clientId,
        Normal[event["DataByteArray"]]
    }]
];

forwardSocketEvent[name_String, serverId_Integer, handler_][event_] := Module[{clientId},
    clientId = registerNativeSocket[event["SourceSocket"]];
    handler[serverId, name, {serverId, clientId, {}}]
];

Options[createAsynchronousTask] = {"BufferSize" -> 2^11};

createAsynchronousTask[socketId_Integer, handler_, OptionsPattern[]] := Module[{listener},
    listener = SocketListen[
        nativeSockets[socketId],
        HandlerFunctions -> <|
            "Accepted" -> forwardAccepted,
            "Received" -> forwardReceived[socketId, handler],
            "Closed" -> forwardSocketEvent["Closed", socketId, handler],
            "Error" -> forwardSocketEvent["Error", socketId, handler]
        |>
    ];
    listenerObjects[listener[[1]]] = listener;
    {listener, listener[[1]]}
];

socketListenerTaskRemove[listenerId_Integer] :=
    DeleteObject[listenerObjects[listenerId]];


End[]
EndPackage[]
