#!/usr/bin/env wolframscript

PacletDirectoryLoad[DirectoryName[$InputFileName, 3]];
Needs["CoffeeLiqueur`WebUSocketHandler`"];

ClearAll[testSocket, writes, closed, received, makeHandler, clientFrame];
testSocket /: BinaryWrite[testSocket[id_Integer], data_ByteArray] :=
    (AppendTo[writes[id], data]; Length[data]);
testSocket /: Close[testSocket[id_Integer]] := (closed[id] = True; Null);

makeHandler[id_Integer] := Module[{handler = WebSocketUHandler[]},
    writes[id] = {};
    closed[id] = False;
    received[id] = {};
    handler["DefaultMessageHandler"] = Function[{client, data},
        AppendTo[received[id], data];
        Null
    ];
    handler
];

clientFrame[data_ByteArray] := Module[{length = Length[data], prefix, key = ByteArray[{1, 2, 3, 4}], masked},
    prefix = Which[
        length < 126, {130, 128 + length},
        length < 2^16, Join[{130, 254}, IntegerDigits[length, 256, 2]],
        True, Join[{130, 255}, IntegerDigits[length, 256, 8]]
    ];
    masked = ByteUMask[key, data];
    Join[ByteArray[prefix], key, If[ByteArrayQ[masked], masked, ByteArray[masked]]]
];

handshake = StringToByteArray[
    "GET / HTTP/1.1\r\nUpgrade: websocket\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n"
];

tests = {
    VerificationTest[
        Module[{handler = makeHandler[1], client = testSocket[1]},
            Scan[WebSocketUStreamHandler[handler, client, ByteArray[{#}]] &, Normal[handshake]];
            Length[writes[1]] == 1 &&
                StringContainsQ[ByteArrayToString[First[writes[1]]],
                    "sec-websocket-accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=\r\n"] &&
                !closed[1]
        ],
        True,
        TestID -> "handshake split at every byte"
    ],
    VerificationTest[
        Module[{handler = makeHandler[2], client = testSocket[2], payload = ByteArray[{10, 20}]},
            WebSocketUStreamHandler[handler, client, Join[handshake, clientFrame[payload]]];
            Length[writes[2]] == 1 && received[2] === {payload} && !closed[2]
        ],
        True,
        TestID -> "handshake and frame in one TCP read"
    ],
    VerificationTest[
        Module[{handler = makeHandler[3], client = testSocket[3], payload = ByteArray[{10, 20, 30}], frame},
            WebSocketUStreamHandler[handler, client, handshake];
            frame = clientFrame[payload];
            Scan[WebSocketUStreamHandler[handler, client, ByteArray[{#}]] &, Normal[frame]];
            received[3] === {payload} && !closed[3]
        ],
        True,
        TestID -> "frame header and payload split at every byte"
    ],
    VerificationTest[
        Module[{handler = makeHandler[4], client = testSocket[4], payload = ByteArray[{10, 20}], frames},
            WebSocketUStreamHandler[handler, client, handshake];
            frames = Apply[Join, ConstantArray[clientFrame[payload], 1000]];
            WebSocketUStreamHandler[handler, client, frames];
            Length[received[4]] == 1000 && AllTrue[received[4], # === payload &] && !closed[4]
        ],
        True,
        TestID -> "many small frames in one TCP read"
    ],
    VerificationTest[
        Module[{handler = makeHandler[5], client = testSocket[5], payload, frame},
            WebSocketUStreamHandler[handler, client, handshake];
            payload = StringToByteArray[StringRepeat["x", 10 * 2^20]];
            frame = clientFrame[payload];
            Scan[WebSocketUStreamHandler[handler, client, ByteArray[{#}]] &, Normal[frame[[1 ;; 14]]]];
            WebSocketUStreamHandler[handler, client, frame[[15 ;;]]];
            received[5] === {payload} && !closed[5]
        ],
        True,
        TestID -> "10 MiB frame with split extended header"
    ],
    VerificationTest[
        Module[{handler = makeHandler[6], client = testSocket[6], frame},
            WebSocketUStreamHandler[handler, client, handshake];
            frame = clientFrame[ByteArray[{10, 20, 30}]];
            WebSocketUStreamHandler[handler, client, frame[[1 ;; 3]]];
            WebSocketUDisconnect[handler, client];
            !KeyExistsQ[handler["StreamState"], 6] &&
                !handler["Connections"]["MemberQ", client] &&
                !handler["Buffer"]["KeyExistsQ", 6]
        ],
        True,
        TestID -> "TCP disconnect clears partial frame"
    ],
    VerificationTest[
        Module[{handler = makeHandler[7], client = testSocket[7], payload, frame},
            WebSocketUStreamHandler[handler, client, handshake];
            payload = StringToByteArray[StringRepeat["x", 1024]];
            frame = clientFrame[payload];
            Scan[WebSocketUStreamHandler[handler, client, ByteArray[{#}]] &, Normal[frame[[1 ;; 8]]]];
            WebSocketUStreamHandler[handler, client, frame[[9 ;;]]];
            received[7] === {payload} && !closed[7]
        ],
        True,
        TestID -> "1 KiB frame with split extended header"
    ],
    VerificationTest[
        Module[{handler = makeHandler[8], client = testSocket[8], payload = ByteArray[{10, 20}]},
            WebSocketUStreamHandler[handler, client, handshake[[1 ;; -3]]];
            WebSocketUStreamHandler[handler, client,
                Join[handshake[[-2 ;;]], clientFrame[payload]]];
            Length[writes[8]] == 1 && received[8] === {payload} && !closed[8]
        ],
        True,
        TestID -> "split handshake followed by frame in same read"
    ],
    VerificationTest[
        Module[{handler = makeHandler[9], client = testSocket[9], frame},
            WebSocketUStreamHandler[handler, client, handshake];
            frame = clientFrame[ByteArray[{10, 20}]];
            WebSocketUStreamHandler[handler, client, Join[ByteArray[{2}], frame[[2 ;;]]]];
            If[!handler["Buffer"]["KeyExistsQ", 9], Return[False]];
            WebSocketUDisconnect[handler, client];
            !handler["Buffer"]["KeyExistsQ", 9]
        ],
        True,
        TestID -> "disconnect clears WebSocket message fragments"
    ],
    VerificationTest[
        Module[{handler = makeHandler[10], client = testSocket[10]},
            WebSocketUStreamHandler[handler, client, handshake];
            handler["MaxFrameBytes"] = 1024;
            WebSocketUStreamHandler[handler, client, ByteArray[{130, 254, 4, 1, 1, 2, 3, 4}]];
            closed[10] && !KeyExistsQ[handler["StreamState"], 10]
        ],
        True,
        TestID -> "oversized frame rejected from header"
    ]
};

report = TestReport[tests];
Print[Length[report["TestsSucceededKeys"]], " tests passed; ",
    Length[report["TestsFailedWrongResultsKeys"]] +
    Length[report["TestsFailedWithMessagesKeys"]], " failed; ",
    Length[report["TestsNotEvaluatedKeys"]], " not evaluated."];
If[Length[report["TestsFailedWrongResultsKeys"]] +
   Length[report["TestsFailedWithMessagesKeys"]] +
   Length[report["TestsNotEvaluatedKeys"]] > 0,
    Print[KeyTake[report["TestResults"],
        Join[report["TestsFailedWrongResultsKeys"], report["TestsFailedWithMessagesKeys"]]]];
    Exit[1]
];
