#!/usr/bin/env wolframscript

(* Backends *)

Internal`WoxiQ = StringStartsQ[ToString[$Version], "Woxi"];
Internal`SymjaQ = StringStartsQ[ToString[$Version], "Symja"];
Internal`WolframQ = !Internal`WoxiQ && !Internal`SymjaQ;

If[$Env["ElectronCode"] =!= 1,
"WLJS Notebooks
Copyright (c) 2026 Coffee liqueur
Licensed under the AGPLv3. See <AppDir>/LICENSE.md.
  
This product bundles third-party FOSS. Full license texts are included in <AppDir>/licenses/.
" // Print;
  If[Internal`WolframQ,
    "Wolfram Engine is proprietary and distributed separately by Wolfram Research, Inc." // Print;
  ];
];

"This project is not affiliated with, endorsed by, or sponsored by Wolfram Research, Inc. Wolfram and Wolfram Language are trademarks of Wolfram Research, Inc." // Print;

If[($VersionNumber < 14.1 || !NumberQ[$VersionNumber]) && Internal`WolframQ,
    Echo["Wolfram Engine versions older than 14.1 are not supported"];
    Echo["due to missing I/O features"];
    Echo["Please, update"];
    Exit[0];
];

If[$VersionNumber > 15.0 && Internal`WolframQ,
  Do[Echo["Warning: your Wolfram Kernel version is higher, that was tested with WLJS Notebook - 14.1-15.0. We do not guarantee it will work correctly"], {5}];
  Echo["Proceeding anyway..."];
  Pause[1];
];

If[Internal`SymjaQ, "Symja support is experimental. Some features may not work" // Print];
If[Internal`WoxiQ, "Woxi support is experimental. Some features may not work" // Print];

(* $AllowDataUpdates = False; *)
$AllowInternet = True; (* Force it to avoid https://mathematica.stackexchange.com/questions/320062/openread-crashes-kernel-if-the-remote-resource-is-unavailable-the-product-exite *)

PacletDirectoryUnload /@ PacletDirectoryLoad[]; (* FIXME WL autoloads some crap *)

ParentDirectory[DirectoryName[$InputFileName]] // SetDirectory;
PacletDirectoryLoad[Directory[]];

Get[FileNameJoin[{Directory[], "Common", "LPM", "LPM.wl"}] ];

Off[General::shdw]; (* avoid warning messages from ContextAliases *)
Off[Part::partd]; (* avoid warning messages from WLX *)
Off[OptionValue::nodef]

(* WLJS Package manager *)
Needs["CoffeeLiqueur`ExtensionManager`" -> "WLJSPackages`"];

LPMLoad[ "Directory" -> Directory[], "DefaultName" -> "Packages"]
WLJSPackages`Load[FileNameJoin[{Directory[], "modules"}] ];


"WLJS Notebook does not collect or transmit your data unless you explicitly choose a feature that needs the network." // Print;

(* Web server packages *)

Needs["CoffeeLiqueur`CUSockets`"]
Needs["CoffeeLiqueur`UObjects`"]
Needs["CoffeeLiqueur`UInternal`"]
Needs["CoffeeLiqueur`TCPUServer`"]

Needs["CoffeeLiqueur`HTTPUHandler`"]
Needs["CoffeeLiqueur`HTTPUHandler`Extensions`"]
Needs["CoffeeLiqueur`WebUSocketHandler`"]

Needs["LetWL`"]

(* Notebook-related packages *)

Needs["CoffeeLiqueur`Notebook`Utils`"];

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"];

Needs["CoffeeLiqueur`Notebook`Windows`" -> "win`"];

Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

(* WLJS transport *)
Needs["CoffeeLiqueur`Misc`WLJS`Transport`"]

(* Event system  *)
Needs["CoffeeLiqueur`Misc`Events`"]
Needs["CoffeeLiqueur`Misc`Events`Promise`"]

(* Async packages  *)
Needs["CoffeeLiqueur`Misc`Async`"]
Needs["CoffeeLiqueur`Misc`Parallel`"]

(* Local kernel implementation *)
Needs["CoffeeLiqueur`Notebook`LocalKernel`" -> "LocalKernel`"];

(* Misc helpers *)
Needs["CoffeeLiqueur`Notebook`Transactions`"]
Needs["CoffeeLiqueur`CUSockets`EventsExtension`"]

(* WLX template engine *)
Needs["CoffeeLiqueur`WLX`"]
Needs["CoffeeLiqueur`WLX`Importer`"]

(* WebUI kit *)
Needs["CoffeeLiqueur`WLX`WebUI`"]

(* Code parser *)
Needs["CodeParser`"]


(* Notebook loader helper *)
Needs["CoffeeLiqueur`Notebook`Loader`" -> "loader`"];

(* Kernel utils helper *)
Needs["CoffeeLiqueur`Notebook`KernelUtils`"->"kernelUtils`", FileNameJoin[{ Directory[], "Frontend", "KernelUtils.wl"}] ];


(* Env variable *)

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

(* FWD parameters from the command line *)
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


(* Define shared directories and files *)

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

(* ~~Debug info~~ *)
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

(* Load core and user's extensions *)
WLJSPackages`Load[ AppExtensions`ExtensionsDir ];

(* Settings helpers *)
Needs["CoffeeLiqueur`Notebook`SettingsUtils`"->"settings`", FileNameJoin[{"Frontend", "Settings.wl"}] ];


Echo["\n\nWe are looking for funding ❤️  https://wljs.io/frontend/Support\n\n"];
Echo["\n\n"];

(* WR services patches *)
Get[FileNameJoin[{Directory[], "Common", "Patches", "NoWR.wl"}] ]

(* Cache assets of loaded extensions *)
WLJSPackages`Includes["js"];
WLJSPackages`Includes["frontend"];

(* Sync WL packages of loaded extensions *)
WLJSPackages`SyncShared[{FileNameJoin[{Directory[], "modules"}], AppExtensions`ExtensionsDir}, FileNameJoin[{AppExtensions`AppDataDir, "__shared"}] ];


(* Start a web server *)

$Server = <||>;
$DefaultSerializer[expr_] :=
  Block[
    {
      $Context = "dsc$`",
      $ContextPath = {"dsc$`", "System`", "Global`"}
    },
    ExportByteArray[expr, "ExpressionJSON"]
];

Print["Staring HTTP server..."];

tcp = TCPUServer[];
tcp["CompleteHandler", "HTTP"] = HTTPUPacketQ -> HTTPUPacketLength;
tcp["MessageHandler", "HTTP"]  = HTTPUPacketQ -> http;

http = HTTPUHandler[];
$Server["HTTPUHandler"] = http;

AppExtensions`HTTPUHandler = http;

(* Clean up temporal files *)

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


(* Load frontend / master kernel extensions *)
Echo["Loading core packages..."];

If[FailureQ[
    Echo[StringJoin["Loading to Master Kernel... ", #] ];
    Get[
      UniversalPathConverter[#],
      Path->{FileNameJoin[{Directory[], "modules"}], AppExtensions`ExtensionsDir}
    ] 
  ],
  Echo["Failed to load some of the packages (see logs)"];
  Pause[2];
  Exit[0]
] &/@ WLJSPackages`Includes["frontend"]; 

CoffeeLiqueur`WLX`Importer`Private`CacheControl["Hour"];

(* Shared list of kernels *)
AppExtensions`KernelList = {};



(* Load app components - entry points *)

ServerError       := ImportComponent["Frontend/ServerError.wlx"];
Protocol          := ImportComponent["Frontend/Protocol.wlx"];
ExtendedApp               := ImportComponent["Frontend/ExtendedApp.wlx"];
IframeApp    := ImportComponent["Frontend/IframeApp.wlx"];
App         := ImportComponent["Frontend/App.wlx"];
PromptWindow         := ImportComponent["Frontend/PromptWindow.wlx"];
Window      := ImportComponent["Frontend/Window.wlx"];
Settings    := ImportComponent["Frontend/Settings.wlx"];

(* Downloader module *)

Needs["CoffeeLiqueur`Notebook`HTTPDownLoader`" -> "downloader`", FileNameJoin[{Directory[], "Frontend", "Downloader.wl"}] ];
Downloader   = downloader`module;

(* Global server variables *)

$ExposedDirectories = {FileNameJoin[{Directory[], "modules"}], FileNameJoin[{Directory[], "Assets"}], Directory[], AppExtensions`ExtensionsDir, "/", ""}
$ExposedRoutes = <||>;

(* Handle signals on PATH and routes extension *)

EventHandler[AppExtensions`AppEvents // EventClone, {
 "Notebook:Close" -> Function[notebook,
  Print["Notebook was closed"];
  (*$ExposedDirectories = ReplacePart[$ExposedDirectories, FirstPosition[$ExposedDirectories, notebook["Path"] // DirectoryName ] -> Nothing];*)
 ],
 "Loader:NewNotebook" -> Function[notebook,
  Echo["A new notebook was added to PATH"];

  If[MemberQ[notebook["Properties"], "WorkingDirectory"],
    $ExposedDirectories = Append[$ExposedDirectories, notebook["WorkingDirectory"] ]  // DeleteDuplicates;
  ,
    $ExposedDirectories = Append[$ExposedDirectories, notebook["Path"] // DirectoryName ] // DeleteDuplicates;
  ];
 ],
 "Loader:LoadNotebook" -> Function[notebook,
  Echo["A notebook was added to PATH"];

  If[MemberQ[notebook["Properties"], "WorkingDirectory"],
    Echo[notebook["WorkingDirectory"] ];
    $ExposedDirectories = Append[$ExposedDirectories, notebook["WorkingDirectory"] ] // DeleteDuplicates;
  ,
    Echo[notebook["Path"] // DirectoryName];
    $ExposedDirectories = Append[$ExposedDirectories, notebook["Path"] // DirectoryName ]  // DeleteDuplicates;
  ];
  
 ],

 "App:ExtendPath" -> Function[path,
  Echo["Extend PATH"];
  $ExposedDirectories = Append[$ExposedDirectories, path] // DeleteDuplicates;
 ],

 "App:ExtendRoute" -> Function[route,
  Echo["Extend route"];
  $ExposedRoutes = Join[$ExposedRoutes, route];
 ], 

 "App:RemovePath" -> Function[paths, Module[{p = $ExposedDirectories},
   Echo["Shrink PATH"];
   $ExposedDirectories = p /. {paths -> Nothing};
  ] ]
}];


(* HTTP handler helpers *)

ElectronQ[request_] := (KeyExistsQ[request["Headers"], "Electron"]);
ElectronGetVersion[request_] := If[KeyExistsQ[request["Headers"], "Electron"], request["Headers", "Electron"], "false"];

(* serve static *)
AppExtensions`HTTPFileExtensions = {"jpeg", "jp2", "json", "wlx", "csv", "tsv", "ppt", "avi", "mp2", "pptx", "doc", "docx", "txt", "ttf", "mp4", "xls", "xlsx", "mov", "wav", "mp3", "ogg", "otf", "woff", "woff2", "css", "js", "png", "jpg", "webp", "svg", "pdf", "gif", "dat"};

http["MessageHandler", "File"]  = GetFileURequestQ[AppExtensions`HTTPFileExtensions] -> (
  ImportUFile[#, "Base":>$ExposedDirectories, "Routes":>$ExposedRoutes] &
)

(* Open HTTP port *)
SocketListen[USocketOpen[$Env["host"], $Env["http"]], tcp@#&]

Print["Staring WS/HTTP server..."];

wcp = TCPUServer[]
wcp["CompleteHandler", "WebSocket"] = WebSocketUPacketQ -> WebSocketUPacketLength
wcp["MessageHandler", "WebSocket"]  = WebSocketUPacketQ -> ws

ws = WebSocketUHandler[]
$Server["WebSocketUHandler"] = ws;

(* configure the handler for WLJS communications *)
ws["MessageHandler", "Evaluate"]  = Function[True] -> WLJSTransportHandler

(* Open WebSockets port *)
SocketListen[USocketOpen[$Env["host"], $Env["ws"] ], wcp@#&, "SocketEventsHandler"->CSocketsClosingHandler];

(* Start all extra webservers loaded from extensions *)
Map[Function[key, 
  With[{server = AppExtensions`WebServers[key]},
    Echo[StringTemplate["Starting App extension server `` on ``:``"][key, server["Host"], server["Port"]]];
    SocketListen[USocketOpen[server["Host"], server["Port"]], server["Handler"]];
  ]
], Keys[AppExtensions`WebServers]];


(* reseved keyword for WLJS interpreter *)
(* What a heck does it do here?! *)
(* let's not touch it *)
SetAttributes[Offload, HoldFirst];

middleware[app_][request_] := app[request]

(* Intialize downloader endpoint *)
Downloader["HTTPUHandler"->http];

(* Launch evaluation kernel a bit earlier *)
Needs["CoffeeLiqueur`Notebook`KernelAutolaunch`"->"kaf`", FileNameJoin[{Directory[], "Frontend", "Autolaunch.wl"}] ];

kaf`autostart[LocalKernel`LocalKernel[ "Name"->Internal`NoWR`RandomWord[] ], Hold[AppExtensions`KernelList], kernelUtils`initializeKernel[<|"env" -> $Env|>], kernelUtils`deinitializeKernel];



(* Intialize all endpoints *)

Protocol["HTTPUHandler"->http, "AppProtocol" -> AppExtensions`AppProtocol, "Middleware"->Identity, "AppEvent"->AppExtensions`AppEvents, "ExtensionTemplates"->AppExtensions`Templates, "ExtensionSidebarIcons"->AppExtensions`SidebarIcons, "Env"->$Env];
Settings["HTTPUHandler"->http, "AppEvent"->AppExtensions`AppEvents, "ExtensionTemplates"->AppExtensions`Templates]
Window["HTTPUHandler"->http, "AppEvent"->AppExtensions`AppEvents, "ExtensionTemplates"->AppExtensions`Templates];
PromptWindow["HTTPUHandler"->http, "AppEvent"->AppExtensions`AppEvents, "ExtensionTemplates"->AppExtensions`Templates, "ExtensionSidebarIcons"->AppExtensions`SidebarIcons, "Env"->$Env];
ExtendedApp["HTTPUHandler"->http, "Middleware"->middleware, "AppEvent"->AppExtensions`AppEvents, "ExtensionTemplates"->AppExtensions`Templates, "ExtensionSidebarIcons"->AppExtensions`SidebarIcons, "Env"->$Env];
IframeApp["HTTPUHandler"->http, "Middleware"->middleware, "AppEvent"->AppExtensions`AppEvents, "ExtensionTemplates"->AppExtensions`Templates, "ExtensionSidebarIcons"->AppExtensions`SidebarIcons, "Env"->$Env];
App["HTTPUHandler"->http, "Middleware"->middleware, "AppEvent"->AppExtensions`AppEvents, "ExtensionTemplates"->AppExtensions`Templates, "ExtensionSidebarIcons"->AppExtensions`SidebarIcons, "Env"->$Env];

(* Send a text message for a user *)

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
  StringTemplate["Open http://``:`` in your browser"][$Env["host"], $Env["http"] ] // Print;
, 1000
];

(* Send a request to open the first window for Electron *)
(* if available *)
ElectronIPCSend["runningAt", $Env["host"], $Env["http"] ];

(* Main loop *)
(* here it is reused for deferred micro tasks *)
(* to free up the session event loop *)

While[True,
  MicrotasksRun[];
  Pause[0.01];
];
