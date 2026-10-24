BeginPackage["CoffeeLiqueur`ExtensionManager`"];

(*
    WLJS Extensions Manager
    This is superset of Wolfram Paclets and Node modules

    A manager allows to discover extensions, install them or read their properties
    Extensions can include JS, CSS, or even Node assets alongside with WL packages

    NOTE: This package was heavily reduced due to versioning and source clutter
        Most of the symbols are unused by WLJS
        Core extensions are immutable, while user's extensions can be added or removed
*)

InstallAll;
Packages;

SaveConfiguration;
InstallByURL;
Includes;

CoffeeLiqueur`ExtensionManager`Load;

SharedDir;
SyncShared;
$ExposedDirectories;

Begin["`Private`"]



$ProjectDir = Null;

$packages = Null;
$name2key = <||>;

Packages /: Keys[Packages] := $name2key // Keys
Packages[name_String, fields__] := $packages[ $name2key[name], fields ] 
Packages[name_String] := $packages[ $name2key[name] ] 

Packages /: KeyExistsQ[ Packages[name_String, fields__] ] := !MissingQ[ $packages[ $name2key[name], fields ] ]
Packages /: KeyExistsQ[ Packages[name_String] ] := KeyExistsQ[ $packages,  $name2key[name]  ]

Packages /: Set[ Packages[name_String, fields__], value_ ] := With[{tag = $name2key[name]},
    $packages[tag, fields] = value 
]


SyncShared[dirs_List, shared_] := With[{},

  SharedDir = shared;
  (* create shared dir *)
  If[!FileExistsQ[SharedDir ],
      CreateDirectory[SharedDir ];
  ];



  Do[ 
    Do[ 
      With[{original = SelectFirst[(FileNameJoin[{#, Packages[i, "name"], StringSplit[j, "/"]} // Flatten]) &/@ dirs, FileExistsQ]},
        Map[Function[path, 
          With[{targetPath = FileNameJoin[{shared, FileNameTake[path]}]},
            Echo[StringJoin["[Kernel/Extensions] Synchronizing deferred package ", FileNameTake[path], "."]];
            If[DirectoryQ[path],

              If[FileExistsQ[targetPath], 
                With[{
                  hash1 = Total[FileHash[#, "CRC32"] &/@ FileNames["*.*", targetPath] ],
                  hash2 = Total[FileHash[#, "CRC32"] &/@ FileNames["*.*", path] ]
                },
                  If[hash1 =!= hash2,
                    Echo[StringJoin["[Kernel/Extensions] Overwriting existing package ", FileNameTake[path], "."]];
                    DeleteDirectory[targetPath, DeleteContents->True];
                    CopyDirectory[path, targetPath];
                  ]
                ]
                
              
              ,
                Echo[StringJoin["[Kernel/Extensions] Copying package ", FileNameTake[path], "."]];
                CopyDirectory[path, targetPath];
              ];
              
            ,
              If[FileExistsQ[targetPath],
                If[FileHash[targetPath] =!=  FileHash[path],
                  Echo[StringJoin["[Kernel/Extensions] Overwriting existing package ", FileNameTake[path], "."]];
                  CopyFile[path, targetPath, OverwriteTarget->True]
                ]
              ,
                Echo[StringJoin["[Kernel/Extensions] Copying package ", FileNameTake[path], "."]];
                CopyFile[path, targetPath]
              ]
            ]
          ]
        ], {original}];
      ]
    , {j, {Packages[i, "wljs-meta", "deferred"]} // Flatten} ];
  , {i, Select[Packages // Keys, (Packages[#, "enabled"] && KeyExistsQ[Packages[#, "wljs-meta"], "deferred"])&]}]
];

$ExposedDirectories = {};

Includes[param_] := Includes[param] = 
Table[ 
    Table[ 
      FileNameJoin[{Packages[i, "name"], StringSplit[j, "/"]} // Flatten]
    , {j, {Packages[i, "wljs-meta", param]} // Flatten} ]
, {i, Select[Packages // Keys, (Packages[#, "enabled"] && KeyExistsQ[Packages[#, "wljs-meta"], param])&]}] // Flatten;


CoffeeLiqueur`ExtensionManager`Load[projectDir_ ]  := Module[{repos}, With[{metas = GetReposMeta[projectDir]},
  If[Length[metas] == 0, Return[Null, Module] ];
  If[$ProjectDir === Null,  $ProjectDir = projectDir];
  $ExposedDirectories = Append[$ExposedDirectories, projectDir] // DeleteDuplicates;

  $packages = Join[If[$packages === Null, <||>, $packages], metas ];
  $packages = sortPackages[$packages]; 
] ]

InstallAll[list_List, OptionsPattern[] ] := Module[{projectDir = OptionValue["Directory"], info, repos, cache, updated, removed, new, current, updatable, strictMode = OptionValue["StrictMode"], automaticUpdates = OptionValue["AutomaticUpdates"], skipUpdates = False, versionControl, maxVersionDiff = OptionValue["MaxVersionDiff"]},
    (* making key-values pairs *)
    repos = (#-><|"key"->#|>)&/@list // Association;

    If[!FileExistsQ[projectDir], CreateDirectory[projectDir, CreateIntermediateDirectories->True] ];
    Echo[StringJoin["[Kernel/Extensions] Extension project directory: ", projectDir]];

    $ExposedDirectories = Append[$ExposedDirectories, projectDir] // DeleteDuplicates;

    (* fetching new information from Github for each repo in the list *)
    repos = If[!AssociationQ[#], Missing[], #] &/@ FetchInfo /@ repos;

    repos = repos // DeleteMissing;

    repos = InstallPaclet[projectDir] /@ repos;
    repos = OverlayReposMeta[projectDir, repos];

    $ProjectDir = projectDir;
    $packages = repos;
    $packages = sortPackages[$packages];
]

Options[InstallAll] = {"Directory"->Directory[], "StrictMode"->False, "ForceUpdates" -> False, "MaxVersionDiff" -> None, "UpdateInterval" -> Quantity[4, "Days"], "AutomaticUpdates"->True}

sortPackages[assoc_Association] := With[{},
    Map[
        Function[key, 
            With[{tag = $packages[key, "name"]},
                $name2key[ tag ] = key;
            ];
            key -> $packages[key] 
        ]
    ,   
        SortBy[Keys[$packages], If[KeyExistsQ[$packages[#, "wljs-meta"], "priority"], $packages[#, "wljs-meta", "priority"], If[KeyExistsQ[$packages[#, "wljs-meta"], "important"], -1000, 1] ]& ] 
    ] // Association
]

SaveConfiguration := With[{},
    CacheStore[$ProjectDir, $packages]
]

OverlayReposMeta[dir_, repos_Association] := With[{},
   With[{data = #},
    Join[data, Import[FileNameJoin[{data["name"], "package.json"}], "RawJSON" , Path->{dir}] ]
   ] &/@ repos
]



GetReposMeta[dir_] := With[{files = Flatten[FileNames["package.json", dir, 2] ] },
  If[Length[files] == 0,
   {}
  ,
   Association[With[{json = Import[#, "RawJSON" ]  },
    Echo[StringJoin["[Kernel/Extensions] Loaded extension ", json["name"], "."]];
    {json["name"] -> Join[<|"key"->json["name"], "enabled" -> True|>, json]} 
   ] &/@ files]
  ]
] 



CacheStore[dir_String, repos_Association] := With[{
    users = Select[repos, Function[assoc, TrueQ[assoc["users"] ] ] ],
    defaults = Select[repos, Function[assoc, !TrueQ[assoc["users"] ] ] ]
},
    Export[FileNameJoin[{dir, "wljs_packages_lock.wl"}], defaults];
    Export[FileNameJoin[{dir, "wljs_packages_users.wl"}], users];
]

CacheLoad[dir_String] := Module[{list},
    If[!FileExistsQ[FileNameJoin[{dir, "wljs_packages_lock.wl"}] ], 
        list = Missing[]
    , 
        list = Get[FileNameJoin[{dir, "wljs_packages_lock.wl"}] ];

        If[FileExistsQ[FileNameJoin[{dir, "wljs_packages_users.wl"}] ],
       
            list = Join[list, Get[FileNameJoin[{dir, "wljs_packages_users.wl"}] ] ]
        ];
    ];

    list
]

CheckUpdates[a_Association] := Module[{result},
  CheckUpdates[a, a["key"]]
]

convertVersion[str_String] := ToExpression[StringReplace[str, "." -> ""]]

(* general function work for both Releases & Branches *)
CheckUpdates[a_Association, Rule[Github | "Github", _]] := Module[{package, new, now},
  (* fetch any *)
  package = FetchInfo[a];
  If[!AssociationQ[package], Echo["[Kernel/Extensions] Cannot check the GitHub repository because the extension metadata is invalid."]; Return[False, Module]];

  new = package["version"] // convertVersion;
  now = a["version"] //convertVersion;
  If[!NumericQ[now], now = -1];

  Echo[StringJoin["[Kernel/Extensions] Installed version ", ToString[now], "; repository version ", ToString[new], "."]];
  now < new  
]

(* general function to fetch information about the package *)
FetchInfo[a_Association] := Module[{result},
  FetchInfo[a, a["key"]]
]

FetchInfo[a_Association, _Anonymous] := a

(* for releases *)
FetchInfo[a_Association, Rule[Github | "Github", url_String]] := Module[{new, data},
  (* TAKE MASTER Branch *)
  Return[FetchInfo[a, Rule["Github", Rule[url, "master"]]]];
]

(* for branches *)
FetchInfo[a_Association, Rule[Github | "Github", Rule[url_String, branch_String]]] :=
Module[{new, data},
  (* extracting from given url *)    
    new = StringCases[url, RegularExpression[".com\\/(.*).git"]->"$1"]//First // Quiet;
    If[!StringQ[new], new = StringCases[url, RegularExpression[".com\\/(.*)"]->"$1"]//First];
    Echo[StringJoin["[Kernel/Extensions] Fetching GitHub repository metadata from ", new, "."]];

    (* here we FETCH PACLETINFO.WL file and use its metadata *)
    data = Check[Import["https://raw.githubusercontent.com/"<>new<>"/"<>ToLowerCase[branch]<>"/package.json", "RawJSON"], $Failed];
    
    (* if failed. we just STOP *)
    If[FailureQ[data],
      Echo[StringJoin["[Kernel/Extensions] Failed to fetch extension metadata from ", new, "."]];
      Echo["[Kernel/Extensions] Extension operation failed."];
      Return[a];
    ];

    Join[a, data, <|"git-url"->new|>]
]

InstallByURL[url_String, cbk_:Null] := Module[{remote},
    remote = FetchInfo[<|"key" -> ("Github" -> url)|>];

    If[!KeyExistsQ[remote, "name"],
        Echo["[Kernel/Extensions] Cannot load an extension from the supplied URL."];
        cbk[False, "Can't load from the given url"]; 
        Return[$Failed, Module];
    ];

    If[ MemberQ[Values[#["name"] &/@ $packages], remote["name"] ],
        Echo["[Kernel/Extensions] The requested extension is already installed."];
        cbk[False, "Already exists!"]; 
        Return[$Failed, Module] ;       
    ];

    InstallPaclet[$ProjectDir][remote];
    $packages = Join[$packages, <|("Github" -> url) -> Join[remote, <|"users" -> True, "enabled" -> True|>]|>];
    $packages = sortPackages[$packages];
    CacheStore[$ProjectDir, $packages];
    
    cbk[True, "Installed. Reboot is needed"];
]

(* general function *)
InstallPaclet[dir_String][a_Association] := InstallPaclet[dir][a, a["key"]]

(* releases *)
InstallPaclet[dir_String][a_Association, Rule[Github | "Github", url_String]] := Module[{dirName, pacletPath},
    (* TAKE Master branch instead *)
    Return[InstallPaclet[dir][a, Rule["Github", Rule[url, "master"]]]];
]

(* for branch *)
InstallPaclet[dir_String][a_Association, Rule[Github | "Github", Rule[url_String, branch_String]]] := Module[{dirName, pacletPath},
    dirName = dir;
    If[!FileExistsQ[dirName], CreateDirectory[dirName]];

    (* internal error, if there is no url provided *)
    If[MissingQ[a["git-url"]], Echo["[Kernel/Extensions] Extension metadata does not contain a git-url."]; Abort[]];

    (* construct name of the folder *)
    dirName = FileNameJoin[{dirName, StringReplace[a["name"], "/"->"_"]}];

    If[FileExistsQ[dirName],
        Echo[StringJoin["[Kernel/Extensions] Extension directory ", dirName, " already exists and will be replaced."]];
        Echo["[Kernel/Extensions] Removing the existing extension directory."];
        DeleteDirectory[dirName, DeleteContents -> True];
    ];

    (* download branch as zip using old API *)
    Echo["[Kernel/Extensions] Downloading the extension archive from its branch."];
    URLDownload["https://github.com/"<>a["git-url"]<>"/zipball/"<>ToLowerCase[branch], FileNameJoin[{dir, "___temp.zip"}]];
    
    Echo["[Kernel/Extensions] Extracting the extension archive."];
    ExtractArchive[FileNameJoin[{dir, "___temp.zip"}], FileNameJoin[{dir, "___temp"}]];
    DeleteFile[FileNameJoin[{dir, "___temp.zip"}]];
    
    pacletPath = FileNames["package.json", FileNameJoin[{dir, "___temp"}], 2] // First;

    If[!FileExistsQ[pacletPath], Echo[StringJoin["[Kernel/Extensions] Failed to download the extension archive to ", ToString[pacletPath], "."]]; Abort[]];
    pacletPath = DirectoryName[pacletPath];

    Echo[StringJoin["[Kernel/Extensions] Copying the extension from ", pacletPath, " to ", dirName, "."]];
 
    CopyDirectory[pacletPath, dirName];
    DeleteDirectory[FileNameJoin[{dir, "___temp"}], DeleteContents -> True];
    Print["WLJS Extensions >> finished!"];

    Join[a, <|"enabled" -> True, "branch" -> branch|>]
]


(* general function *)
RemovePaclet[dir_String][a_Association] := RemovePaclet[dir][a, a["key"]]

(* releases *)
RemovePaclet[dir_String][a_Association, Rule[Github | "Github", url_String]] := (
  Return[RemovePaclet[dir][a, Rule["Github", Rule[url, "master"]]]];
)

(* branches *)
RemovePaclet[dir_String][a_Association, Rule[Github  | "Github", Rule[url_String, branch_String]]] := Module[{dirName, pacletPath},
    dirName = dir;
    dirName = FileNameJoin[{dirName, StringReplace[a["name"], "/"->"_"]}];

    If[FileExistsQ[dirName],
        Echo[StringJoin["[Kernel/Extensions] Removing extension directory ", dirName, "."]];
        Echo["[Kernel/Extensions] Deleting extension files."];
        DeleteDirectory[dirName, DeleteContents -> True];
    ,
        Echo[StringJoin["[Kernel/Extensions] Extension directory ", dirName, " was already removed."]];
        Echo["[Kernel/Extensions] Extension removal reached an unexpected state."]; Abort[];
    ];

    a
]

End[]
EndPackage[]
