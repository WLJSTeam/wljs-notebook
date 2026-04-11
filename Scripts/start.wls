#!/usr/bin/env wolframscript

If[$Env["ElectronCode"] =!= 1,
"WLJS Notebooks
Copyright (c) 2026 Coffee liqueur
Licensed under the AGPLv3. See <AppDir>/LICENSE.md.

This product bundles third-party FOSS. Full license texts are included in <AppDir>/licenses/.
Wolfram Engine is proprietary and distributed separately by Wolfram Research, Inc.
" // Print];

"This project is not affiliated with, endorsed by, or sponsored by Wolfram Research, Inc. Wolfram and Wolfram Language are trademarks of Wolfram Research, Inc." // Print;

(* $AllowDataUpdates = False; *)

PacletDirectoryUnload /@ PacletDirectoryLoad[]; (* FIXME WL autoloads some crap *)

ParentDirectory[DirectoryName[$InputFileName]] // SetDirectory;
PacletDirectoryLoad[Directory[]];

Get[FileNameJoin[{Directory[], "Common", "LPM", "LPM.wl"}] ];

Off[General::shdw]; (* avoid warning messages from ContextAliases *)
Off[Part::partd]; (* avoid warning messages from WLX *)
Off[OptionValue::optnf]

(* WLJS Package manager *)
Needs["CoffeeLiqueur`ExtensionManager`" -> "WLJSPackages`"];

LPMLoad[ "Directory" -> Directory[], "DefaultName" -> "Packages"]
WLJSPackages`Load[FileNameJoin[{Directory[], "modules"}] ];


"WLJS Notebook does not collect or transmit your data unless you explicitly choose a feature that needs the network." // Print;

(* web-server *)
Needs["CoffeeLiqueur`CSockets`"]
Needs["CoffeeLiqueur`Objects`"]
Needs["CoffeeLiqueur`Internal`"]
Needs["CoffeeLiqueur`TCPServer`"]

Needs["CoffeeLiqueur`HTTPHandler`"]
Needs["CoffeeLiqueur`HTTPHandler`Extensions`"]
Needs["CoffeeLiqueur`WebSocketHandler`"]
Needs["CoffeeLiqueur`LTP`"]

Needs["LetWL`"]


Needs["CoffeeLiqueur`Notebook`Utils`"];

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"];

Needs["CoffeeLiqueur`Notebook`Windows`" -> "win`"];

Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

(* WLJS transport *)
Needs["CoffeeLiqueur`Misc`WLJS`Transport`"]

(* event system  *)
Needs["CoffeeLiqueur`Misc`Events`"]
Needs["CoffeeLiqueur`Misc`Events`Promise`"]

Needs["CoffeeLiqueur`Misc`Async`"]

Needs["CoffeeLiqueur`Misc`Parallel`"]



Needs["CoffeeLiqueur`Notebook`LocalKernel`" -> "LocalKernel`"];
Needs["CoffeeLiqueur`Notebook`Transactions`"]


Needs["CoffeeLiqueur`CSockets`EventsExtension`"]

(* WLX template engine *)
Needs["CoffeeLiqueur`WLX`"]
Needs["CoffeeLiqueur`WLX`Importer`"]
Needs["CoffeeLiqueur`WLX`WLJS`"]

(* WebUI Toolkit *)
Needs["CoffeeLiqueur`WLX`WebUI`"]

Needs["CodeParser`"]


(* env parameters *)
System`$Env;


$Env = Join[<|
  "host" -> "127.0.0.1",
  "http" -> 20560,
  "ws"   -> 20559,
  "jtp"  -> 20562,
  "ws2"  -> 20563,

  "wsprefix" -> False,
  "ws2prefix" -> False,

  "AccentColor" -> "#0AC7BB"
  (*,"docs" -> 20540*)
|>, If[AssociationQ[$Env], $Env, <||> ] ];

If[$ScriptCommandLine =!= {},
  With[{argv = Rest @ $ScriptCommandLine},
    Echo["Command line: "];
    Echo[argv];
    MapIndexed[Function[{key, pos},
      With[{},
        If[MemberQ[Keys[$Env], key] || True,
          With[{
            value = argv[[2;;;;2]][[ pos[[1]] ]]
          },
            Echo[key -> value];
  
            $Env = Join[$Env, <|key -> If[NumericQ[ $Env[key] ],
              ToExpression[value],
              value
            ]|>];
          ]
        ]
      ]
    ], argv[[;;;;2]]];
  ];
];

If[KeyExistsQ[$Env, "folder"],
  $Env["parent_folder"] = ParentDirectory[ $Env["folder"] ];
];

With[{appJSON = Import[FileNameJoin[{Directory[], "package.json"}], "RawJSON"]},
  $Env["AppJSON"] = appJSON;
];


versionToNumber[ver_String] := FromDigits[ToExpression@StringSplit[ver, "."], 1000];

If[versionToNumber[$VersionNumber] > versionToNumber["14.2"],
  Echo["Warning: your Wolfram Kernel version is higher, that tested with WLJS Notebook. We do not guarantee it will work"];
];

If[versionToNumber[$VersionNumber] < versionToNumber["13.3"],
  Echo["Error: your Wolfram Kernel version is older than 13.3. WLJS App won't work. We are sorry"];
  Echo["You can always download a freeware Wolfram Engine"];
  Exit[-1];
];


syncDemoFolders[path_String] := Null;

AppExtensions`FrontendEnv = $Env;

AppExtensions`QuickNotesDir = FileNameJoin[{$TemporaryDirectory, "wljs_quicknotes"}];
If[!DirectoryQ[AppExtensions`QuickNotesDir], CreateDirectory[AppExtensions`QuickNotesDir] ];

AppExtensions`BackupsDir = FileNameJoin[{$TemporaryDirectory, "wljs_backups"}];
If[!DirectoryQ[AppExtensions`BackupsDir], CreateDirectory[AppExtensions`BackupsDir] ];

AppExtensions`DefaultDocumentsDir = FileNameJoin[{$UserDocumentsDirectory, "WLJS Notebooks"}];
If[!DirectoryQ[AppExtensions`DefaultDocumentsDir], CreateDirectory[AppExtensions`DefaultDocumentsDir] ];

AppExtensions`DemosDir = FileNameJoin[{AppExtensions`DefaultDocumentsDir, "Demos"}];
If[!DirectoryQ[AppExtensions`DemosDir], CreateDirectory[AppExtensions`DemosDir]; syncDemoFolders[AppExtensions`DemosDir]; ];

AppExtensions`ExtensionsDir = FileNameJoin[{AppExtensions`DefaultDocumentsDir, "Extensions"}];
If[!DirectoryQ[AppExtensions`ExtensionsDir], CreateDirectory[AppExtensions`ExtensionsDir]; ];

AppExtensions`AppDataDir = Lookup[$Env, "AppData", Directory[] ];

AppExtensions`AppConfig = FileNameJoin[{AppExtensions`AppDataDir, "_settings.wl"}];

If[KeyExistsQ[$Env, "store_config_in_docs"],
  AppExtensions`AppConfig = FileNameJoin[{AppExtensions`DefaultDocumentsDir, "config.wl"}];
];

(* ~~check version~~ *)
Echo["Checking version of WLJS Notebook ..."];
Echo[AppExtensions`FrontendEnv["AppJSON"]["version"] ];

Echo["Default paths:"];
Echo[">> QuickNotesDir: "<> AppExtensions`QuickNotesDir];
Echo[">> BackupsDir: "<> AppExtensions`BackupsDir];
Echo[">> DefaultDocumentsDir: "<> AppExtensions`DefaultDocumentsDir];
Echo[">> DemosDir: "<> AppExtensions`DemosDir];
Echo[">> ExtensionsDir: "<> AppExtensions`ExtensionsDir];
Echo[">> AppDataDir: "<> AppExtensions`AppDataDir];
Echo[">> AppConfig: "<> AppExtensions`AppConfig];
Echo[">> Root: "<> Directory[] ];

(* load users extensions *)
WLJSPackages`Load[ AppExtensions`ExtensionsDir ];

{loadSettings, storeSettings}        = Get[FileNameJoin[{"Frontend", "Settings.wl"}] ];

Echo["\n\nWe are looking for funding ❤️  https://wljs.io/frontend/Support\n\n"];
Echo["\n\n"];

(* check if there is internet or connection to WR servers *)
(* NetworkConnected is not robust enough *)
Internal`$NoWRServices = !StringQ[TimeConstrained[RandomWord[], 10, $Failed] ];

If[TrueQ @ Internal`$NoWRServices, 
  Echo["No WR servers are reachable, we will apply patches to some system symbols..."];
  Get[FileNameJoin[{Directory[], "Common", "Patches", "NoWR.wl"}] ]
];

WLJSPackages`Includes["js"];
WLJSPackages`Includes["frontend"];

WLJSPackages`SyncShared[{FileNameJoin[{Directory[], "modules"}], AppExtensions`ExtensionsDir}, FileNameJoin[{AppExtensions`AppDataDir, "__shared"}] ];

(*EventHandler[AppExtensions`AppEvents // EventClone, {
 any_ :> (Echo[StringTemplate["App Event ``: ``"][any, #]]&)
}];*)

(* start a bit earlier, so that extensions can hook on*)
$Server = <||>;
$DefaultSerializer = ExportByteArray[#, "ExpressionJSON"]&

Print["Staring HTTP server..."];

tcp = TCPUServer[];
tcp["CompleteHandler", "HTTP"] = HTTPUPacketQ -> HTTPUPacketLength;
tcp["MessageHandler", "HTTP"]  = HTTPUPacketQ -> http;

http = HTTPUHandler[];
$Server["HTTPUHandler"] = http;

AppExtensions`HTTPUHandler = http;


With[{now = Now},
  Function[file,
    If[now - FileDate[file] > Quantity[14, "Days"], DeleteFile[file]; Echo[StringTemplate["Removed old note ``"][file] ] ]
  ] /@ FileNames["*.wln", AppExtensions`QuickNotesDir]
];

With[{now = Now},
  Function[file,
    If[now - FileDate[file] > Quantity[30, "Days"], DeleteFile[file]; Echo[StringTemplate["Removed old note ``"][file] ] ]
  ] /@ FileNames["*.wln", AppExtensions`BackupsDir]
];


(* load stuff into frontend *)
Echo["Loading packages: FRONTEND"];

If[FailureQ[
    Get[
      UniversalPathConverter[#],
      Path->{FileNameJoin[{Directory[], "modules"}], AppExtensions`ExtensionsDir}
    ] 
  ],
  Echo["Failed to load some of the packages (see logs)"];
  Exit[0]
] &/@ WLJSPackages`Includes["frontend"]; 

CoffeeLiqueur`WLX`Importer`Private`CacheControl["Hour"];

AppExtensions`KernelList = {};


(* Entrypoint of an app *)
ServerError       := ImportComponent["Frontend/ServerError.wlx"];
Protocol          := ImportComponent["Frontend/Protocol.wlx"];
ExtendedApp               := ImportComponent["Frontend/ExtendedApp.wlx"];
IframeApp    := ImportComponent["Frontend/IframeApp.wlx"];
App         := ImportComponent["Frontend/App.wlx"];
PromptWindow         := ImportComponent["Frontend/PromptWindow.wlx"];
Window      := ImportComponent["Frontend/Window.wlx"];
Settings    := ImportComponent["Frontend/Settings.wlx"];
Downloader   = ImportComponent["Frontend/Downloader.wl"];

(* Global variables *)

$ExposedDirectories = {FileNameJoin[{Directory[], "modules"}], FileNameJoin[{Directory[], "Assets"}], Directory[], AppExtensions`ExtensionsDir, "/", ""}
$ExposedRoutes = <||>;


EventHandler[AppExtensions`AppEvents // EventClone, {
 "Notebook:Close" -> Function[notebook,
  Print["Notebook was closed"];
  (*$ExposedDirectories = ReplacePart[$ExposedDirectories, FirstPosition[$ExposedDirectories, notebook["Path"] // DirectoryName ] -> Nothing];*)
 ],
 "Loader:NewNotebook" -> Function[notebook,
  Echo["New notebook load and add it to the path! >>"];

  If[MemberQ[notebook["Properties"], "WorkingDirectory"],
    $ExposedDirectories = Append[$ExposedDirectories, notebook["WorkingDirectory"] ]  // DeleteDuplicates;
  ,
    $ExposedDirectories = Append[$ExposedDirectories, notebook["Path"] // DirectoryName ]  // DeleteDuplicates;
  ];
 ],
 "Loader:LoadNotebook" -> Function[notebook,
  Echo["Load notebook and adding it to the path! >>"];
  

  If[MemberQ[notebook["Properties"], "WorkingDirectory"],
    Echo[notebook["WorkingDirectory"] ];
    $ExposedDirectories = Append[$ExposedDirectories, notebook["WorkingDirectory"] ] // DeleteDuplicates;
  ,
    Echo[notebook["Path"] // DirectoryName];
    $ExposedDirectories = Append[$ExposedDirectories, notebook["Path"] // DirectoryName ]  // DeleteDuplicates;
  ];
  
 ],

 "App:ExtendPath" -> Function[path,
  $ExposedDirectories = Append[$ExposedDirectories, path] // DeleteDuplicates;
 ],

 "App:ExtendRoute" -> Function[route,
  $ExposedRoutes = Join[$ExposedRoutes, route];
 ], 

 "App:RemovePath" -> Function[paths, Module[{p = $ExposedDirectories},
    $ExposedDirectories = p /. {paths -> Nothing};
  ] ]
}];




ElectronQ[request_] := (KeyExistsQ[request["Headers"], "Electron"]);
ElectronGetVersion[request_] := If[KeyExistsQ[request["Headers"], "Electron"], request["Headers", "Electron"], "false"];

(* serve static *)
AppExtensions`HTTPFileExtensions = {"jpeg", "wlx", "ttf",  "otf", "woff", "woff2", "css", "js", "png", "jpg", "webp", "svg", "pdf", "gif", "dat"};
http["MessageHandler", "File"]  = GetFileURequestQ[AppExtensions`HTTPFileExtensions] -> (
  ImportUFile[#, "Base":>$ExposedDirectories, "Routes":>$ExposedRoutes] &
)

SocketListen[USocketOpen[$Env["host"], $Env["http"]], tcp@#&]


Print["Staring WS/HTTP server..."];

wcp = TCPUServer[]
wcp["CompleteHandler", "WebSocket"] = WebSocketUPacketQ -> WebSocketUPacketLength
wcp["MessageHandler", "WebSocket"]  = WebSocketUPacketQ -> ws

ws = WebSocketUHandler[]
$Server["WebSocketUHandler"] = ws;

(* configure the handler for WLJS communications *)
ws["MessageHandler", "Evaluate"]  = Function[True] -> WLJSTransportHandler


SocketListen[USocketOpen[$Env["host"], $Env["ws"] ], wcp@#&, "SocketEventsHandler"->CSocketsClosingHandler];

(* start all webservers from extensions *)
Map[Function[key, 
  With[{server = AppExtensions`WebServers[key]},
    Echo[StringTemplate["Starting App extension server `` on ``:``"][key, server["Host"], server["Port"]]];
    SocketListen[USocketOpen[server["Host"], server["Port"]], server["Handler"]];
  ]
], Keys[AppExtensions`WebServers]];


(* reseved keyword for WLJS interpreter *)
SetAttributes[Offload, HoldFirst];

middleware[app_][request_] := app[request]



(* hook all routes handlers *)
AutoTest["HTTPUHandler"->http];
Downloader["HTTPUHandler"->http];
Protocol["HTTPUHandler"->http, "AppProtocol" -> AppExtensions`AppProtocol, "Middleware"->Identity, "AppEvent"->AppExtensions`AppEvents, "ExtensionTemplates"->AppExtensions`Templates, "ExtensionSidebarIcons"->AppExtensions`SidebarIcons, "Env"->$Env];
Settings["HTTPUHandler"->http, "AppEvent"->AppExtensions`AppEvents, "ExtensionTemplates"->AppExtensions`Templates]
Window["HTTPUHandler"->http, "AppEvent"->AppExtensions`AppEvents, "ExtensionTemplates"->AppExtensions`Templates];
PromptWindow["HTTPUHandler"->http, "AppEvent"->AppExtensions`AppEvents, "ExtensionTemplates"->AppExtensions`Templates, "ExtensionSidebarIcons"->AppExtensions`SidebarIcons, "Env"->$Env];
ExtendedApp["HTTPUHandler"->http, "Middleware"->middleware, "AppEvent"->AppExtensions`AppEvents, "ExtensionTemplates"->AppExtensions`Templates, "ExtensionSidebarIcons"->AppExtensions`SidebarIcons, "Env"->$Env];
IframeApp["HTTPUHandler"->http, "Middleware"->middleware, "AppEvent"->AppExtensions`AppEvents, "ExtensionTemplates"->AppExtensions`Templates, "ExtensionSidebarIcons"->AppExtensions`SidebarIcons, "Env"->$Env];
App["HTTPUHandler"->http, "Middleware"->middleware, "AppEvent"->AppExtensions`AppEvents, "ExtensionTemplates"->AppExtensions`Templates, "ExtensionSidebarIcons"->AppExtensions`SidebarIcons, "Env"->$Env];


SetTimeout[
  StringTemplate["Open http://``:`` in your browser"][$Env["host"], $Env["http"]] // Print;
, 15000
];

SetTimeout[
  StringTemplate["Open http://``:`` in your browser"][$Env["host"], $Env["http"]] // Print;
, 10000
];

SetTimeout[
  StringTemplate["Open http://``:`` in your browser"][$Env["host"], $Env["http"]] // Print;
, 5000
];

SetTimeout[
  StringTemplate["Open http://``:`` in your browser"][$Env["host"], $Env["http"]] // Print;
, 3000
];

SetTimeout[
  StringTemplate["Open http://``:`` in your browser"][$Env["host"], $Env["http"]] // Print;
, 1000
];

(* Main sync thread *)

While[True,
  MicrotasksRun[];
  Pause[0.01];
];
