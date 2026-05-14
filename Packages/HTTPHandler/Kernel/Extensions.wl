(* ::Package:: *)

(* ::Chapter:: *)
(*Extensions*)


BeginPackage["CoffeeLiqueur`HTTPUHandler`Extensions`", {
    "CoffeeLiqueur`UInternal`", 
    "CoffeeLiqueur`HTTPUHandler`", 
    "CoffeeLiqueur`TCPUServer`"
}]; 


AddHTTPUHandler::usage = 
"AddHTTPUHandler[tcp, http] adds HTTP Handler to TCP Server."; 


GetFileURequestQ::usage = 
"GetFileURequestQ[fileType] returns function for checking that is a Get request and path contatins file."; 


URLPathToUFileName::usage = 
"URLPathToUFileName[request] to file path."; 


FileNameToUURLPath::usage = 
"FileNameToUURLPath[file] to url."; 


ImportUFile::usage = 
"ImportFileAsText[request] import file from request as text data."; 


GetMIMEUType::usage = 
"GetMIMEUType[request] returns mime type based on a file extension."; 


GetPOSTURequestQ::usage = 
"GetPOSTURequestQ[fileType] returns function for checking that is a Post request and path contatins file."; 


ProcessUMultipart::usage = 
"ProcessUMultipart[request] returns processed request with a POST data decrypted."; 


SetMIMEUTable::usage =
"SetMIMEUTable[table_Association] sets a custom MIME types table"

Begin["`Private`"]; 


AddHTTPUHandler[tcp_TCPUServer, key_String: "HTTP", http_HTTPUHandler] := (
    tcp["CompleteHandler", key] = HTTPUPacketQ -> HTTPUPacketLength; 
    tcp["MessageHandler", key] = HTTPUPacketQ -> http; 
);


GetFileURequestQ[fileType: _String | {__String} | _StringExpression] := 
AssocUMatchQ[<|"Method" -> "GET", "Path" -> "/" ~~ ___ ~~ "." ~~ fileType|>]; 

GetPOSTURequestQ[fileType: _String | {__String} | _StringExpression] := 
AssocUMatchQ[<|"Method" -> "POST", "Path" -> "/" ~~ ___ ~~ "." ~~ fileType|>];

URLPathToUFileName[urlPath_String] := 
FileNameJoin[FileNameSplit[StringTrim[urlPath // URLDecode, "/"]]]; 


URLPathToUFileName[request_Association] := 
URLPathToUFileName[request["Path"]]; 


FileNameToUURLPath[fileName_String] := 
URLBuild[FileNameSplit[StringTrim[fileName, StartOfString ~~ Directory[]]]]; 


Options[ImportUFile] = {"Base" :> {Directory[]}, "StringOutput"->False, "RequestPath" -> "", "Routes" -> <||>}
Options[importFile] = Options[ImportUFile]

importFile[path_String, opts:OptionsPattern[]] := With[{body = ReadByteArray[path]},
      If[!OptionValue["StringOutput"],
        <|
            "Body" -> body, 
            "Code" -> 200, 
            "Headers" -> <|
                "Content-Type" -> GetMIMEUType[path], 
                "Content-Length" -> Length[body], 
                "Connection"-> "Keep-Alive", 
                "Keep-Alive" -> "timeout=5, max=1000", 
                "Cache-Control" -> "max-age=60480"
            |>
        |>
      ,
        body // ByteArrayToString
      ] 
    ]

ImportUFile[file_String, opts:OptionsPattern[]] := Module[{
    paths = Flatten[OptionValue["Base"]], 
    raw = OptionValue["RequestPath"], 
    routes = OptionValue["Routes"]
},
    
    With[{path = FileNameJoin[{#, file}]},
     Echo["HTTPUHandler >> Checking "<>path<>"..."];
     If[
         FileExistsQ[path]
     ,
         Return[importFile[path, opts], Module]
     ]
    ] &/@ paths;


    With[{
        splitted = FileNameSplit[StringTrim[raw // URLDecode, "/"] ]
    },{
        route = SelectFirst[routes//Keys, MatchQ[splitted, #]&]
    },

        If[!MissingQ[route],
            Echo["HTTPUHandler >> Checking route "<>ToString[route]<>"..."];
            With[{
                resolved = FileNameJoin[{Key[route][routes], Drop[splitted, Length[route]-1]} // Flatten]
            },
                Echo["HTTPUHandler >> Resolved to: "<>resolved];
                If[FileExistsQ[resolved],
                    Return[importFile[resolved, opts], Module];
                ];
            ]
        ];
    ];

    Echo["HTTPUHandler >> File "<>file<>" was not found ;()"];

    <|"Code" -> 404|>
]



ImportUFile[request_Association, opts: OptionsPattern[]] := 
ImportUFile[URLPathToUFileName[request["Path"]], "RequestPath"->request["Path"], opts]


ImportFileAsText = ImportUFile


GetMIMEUType[file_String] := Module[{type},
    type = $mimeTypes[file // FileExtension];
	If[!StringQ[type], type = "application/octet-stream"];
    type
]; 


$directory = 
DirectoryName[$InputFileName];


$mimeTypes = 
Get[FileNameJoin[{$directory, "MIMETypes.wl"}]];

SetMIMEUTable[assoc_Association] := $mimeTypes = assoc

GetMIMEUType[request_Association] := 
GetMIMEUType[URLPathToUFileName[request["Path"]]]; 


$DeserializeUrlencoded[request_Association, body_ByteArray] := (
    <|<|URLParse["/?" <> (body//ByteArrayToString)]|>["Query"]|>
); 


DecryptField[line_String] := 
 Module[{stream = StringToStream[line], header, body}, 
  (* Convert a large string to a stream due to performance isssues *)

    With[{extracted = StringExtract[
      (* Read only the header *)
      ReadString[stream, "\r\n\r\n"],
       "\r\n\r\n" -> 1, "\r\n" -> 2 ;;]},
   
   (* Extract parameters *)
   
   header = (Association[
      Map[
        Rule[#1, StringRiffle[{##2}, ":"]] & @@ 
          Map[StringTrim]@StringSplit[#, ":"] &]@extracted]);
   
   header["Content-Disposition"] = 
    Join @@ (Map[
        StringCases[#, 
          RegularExpression["(\\w*)=\"(.*)\""] :> <|
            "$1" -> "$2"|>] &, (StringTrim /@ 
          StringSplit[header["Content-Disposition"], ";"][[2 ;;]])] //
        Flatten);
   
   (* Skip gaps *)
   ReadString[stream, "\n"];
   ReadString[stream, "\n"];
   
   (* The rest is our payload *)
   
   body = ReadString[stream, EndOfFile];

   (* remove \r\n in the beginng and in the end *)
   body = StringDrop[StringDrop[body, -4], 1];

   Close[stream];
   
   <|"Body" -> body, "Headers" -> header|>
]]; 


$DeserializeMultipart[request_Association, body_ByteArray] := Module[{boundary, stream, buffer, field, data},
    boundary = StringCases[request["Headers"]["Content-Type"], RegularExpression["boundary=(.*)"] :> "$1"] // First;

    stream = StringToStream[body//ByteArrayToString];
    buffer = {};

    field = ReadString[stream, boundary];
    
    While[StringQ[field = ReadString[stream, boundary]],
        If[StringTake[field, 2] === "--", Break[]];
        buffer = {buffer, field // DecryptField};
    ];

    buffer = buffer // Flatten;

    (* Association, where all fields will be stored *)
    data = <||>;

    Function[assoc, 
        
        If[KeyExistsQ[assoc["Headers"], "Content-Type"],
        (* 90% probabillity that this is a file *)
        
            If[!KeyExistsQ[data, assoc["Headers", "Content-Disposition", "name"]],
                data[assoc["Headers", "Content-Disposition", "name"]] = <||>
            ];

            (* name -> filename -> data *)
            data[assoc["Headers", "Content-Disposition", "name"]][assoc["Headers", "Content-Disposition", "filename"]] = assoc["Body"];
        ,
        (* 90% probabillity that this is a regualar field *)

            (* name -> value *)
            data[assoc["Headers", "Content-Disposition", "name"]] = assoc["Body"]
        ]
    ] /@ buffer;

    data
]; 


ProcessUMultipart[request_Association, OptionsPattern[]] := Module[{},
    (* Return request_Association *)

    If[StringMatchQ[request["Headers"]["Content-Type"], "application/x-www-form-urlencoded" ~~ ___],
        Print["URL Encoded detected"];
        Return[Join[request, <|"Data"->$DeserializeUrlencoded[request, request["Body"]], "Body"->{}|>]]
    ];

    If[StringMatchQ[request["Headers"]["Content-Type"], "multipart/form-data" ~~ ___],
        Print["Multipart detected"];
        Return[Join[request, <|"Data"->$DeserializeMultipart[request, request["Body"]], "Body"->{}|>]]
    ];

]; 




End[]; 


EndPackage[]; 
