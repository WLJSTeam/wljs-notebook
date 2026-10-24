BeginPackage["CoffeeLiqueur`LPM`"]

PacletRepositories::usage = "depricated"
LPMRepositories::usage = "LPMRepositories[{\"Github\" -> \"URL to the repo\", ...}] specify the wolfram packages to be synced via remote url"
LPMLoad::usage = "LPMLoad[\"Directory\"->...] loads paclets stored by LPMRepositories[] without checking updates and etc"
Github::usage = "depricated"


Begin["`Private`"]

pacletDirectoryLoad = PacletDirectoryLoad

urlImport = Import;
urlDownload= URLDownload;
urlGet = Get;

convertVersion[str_String] := ToExpression[StringReplace[str, "."->""]]
convertVersion[any_PacletObject] := convertVersion[any["Version"]]


inspectPackages[dir_String, cbk_] := Module[{ 
  packages
},
  packages = Get /@ DeleteDuplicatesBy[FileNames["PacletInfo.wl" | "PacletInfo.m", {dir}, {2}], DirectoryName];

  With[{found = SortBy[PacletFind[#["Name"] ], convertVersion]},

    If[Length[found] > 0,
      With[{conflicting = found // Last},
        If[convertVersion[conflicting] > convertVersion[#],
          Echo[StringJoin["[Common/LPM] Package version conflict for ", #["Name"], ": globally installed ", ToString[convertVersion[conflicting]], ", locally loaded ", ToString[convertVersion[#]]]];
          cbk[conflicting, #];
        ]
      ]
    ]
  ] &/@ packages;
]

LPMRepositories = PacletRepositories;

LPMRepositories::failure = "Error: ``"

LPMLoad[OptionsPattern[] ] := With[{default = OptionValue["DefaultName"]}, {result = Catch[Module[{projectDir},
  If[OptionValue["Directory"]//StringQ,
    projectDir = OptionValue["Directory"];
    If[!StringQ[projectDir], Echo["[Common/LPM] The selected directory is not a valid package directory."]; Message[LPMRepositories::wrongfolder]; Return[$Failed] ];
  ,
    projectDir = NotebookDirectory[] // Quiet;
    If[!StringQ[projectDir], projectDir = DirectoryName[$InputFileName] ];
    If[!StringQ[projectDir], Throw["We cannot work without a project directory. Save your notebook / script first"]; ];    
  ];

  If[FileExistsQ[FileNameJoin[{projectDir, default}] ], Map[pacletDirectoryLoad] @  Map[DirectoryName] @  DeleteDuplicatesBy[FileNames["PacletInfo.wl" | "PacletInfo.m", {#}, {2}], DirectoryName]& @ FileNameJoin[{projectDir, default}], 
    Throw["folder does not exist"];
  ];
] ]},
  If[StringQ[result], Message[LPMRepositories::failure, result]; $Failed, Null]
]

Options[LPMLoad] = {"Directory"->None, "DefaultName"->"wl_packages"}

PacletRepositories[list_List, OptionsPattern[]] := With[{deffered = OptionValue["Deffered"], preserve = OptionValue["PreserveConfiguration"]}, {result = Catch[Module[{projectDir, strictMode = OptionValue["StrictMode"], info, repos, cache, updated, removed, new, current, updatable, skipUpdates = OptionValue["Passive"], automaticUpdates = OptionValue["AutomaticUpdates"], versionControl, maxVersionDiff = OptionValue["MaxVersionDiff"]},
    (* making key-values pairs *)
    repos = (#-><|"key"->#|>)&/@list // Association;

    (* locating project directory *)
    If[OptionValue["Directory"]//StringQ,
      projectDir = OptionValue["Directory"];
      If[!StringQ[projectDir], Throw["Directory "<>ToString[projectDir]<>" is not a directory"];  ];
    ,
      projectDir = NotebookDirectory[] // Quiet;
      If[!StringQ[projectDir], projectDir = DirectoryName[$InputFileName]];
      If[!StringQ[projectDir], Throw["We cannot work without a project directory. Save your notebook / script first"]; ];    
    ];

    If[!FileExistsQ[projectDir],
      CreateDirectory[projectDir, CreateIntermediateDirectories->True];
      If[!FileExistsQ[projectDir], Throw["Cannot create project directory "<>ToString[projectDir] ]; ];
    ];

    (* PASSIVE mode :: skips all checks and just loads wl_package folder *)
    If[skipUpdates, 
      If[!deffered,
        inspectPackages[FileNameJoin[{projectDir, "wl_packages"}], OptionValue["ConflictResolutionFunction"] ];
        Map[pacletDirectoryLoad] @  Map[DirectoryName] @  DeleteDuplicatesBy[FileNames["PacletInfo.wl" | "PacletInfo.m", {#}, {2}], DirectoryName]& @ FileNameJoin[{projectDir, "wl_packages"}];
      ];
      Return[Null, Module];
    ];

    Echo["[Common/LPM] Fetching package metadata from the configured repository."];

    If[FailureQ[ URLFetch["https://github.com"] ],
        Echo["[Common/LPM] Cannot refresh package metadata because no internet connection is available."];

        If[!MissingQ[cache], 
          Echo["[Common/LPM] Using stored package metadata."];
          If[!deffered,
            inspectPackages[FileNameJoin[{projectDir, "wl_packages"}], OptionValue["ConflictResolutionFunction"] ];
            Map[pacletDirectoryLoad] @  Map[DirectoryName] @  DeleteDuplicatesBy[FileNames["PacletInfo.wl" | "PacletInfo.m", {#}, {2}], DirectoryName]& @ FileNameJoin[{projectDir, "wl_packages"}];
          ];
          Return[Null, Module];
        ,
          Throw["No lock file found"];
        ];
    ];

    (* fetching new information from Github for each repo in the list *)
    repos = If[!AssociationQ[#], Missing[], #] &/@ FetchInfo /@ repos;

    repos = repos // DeleteMissing;

    (* fetching cached data (current status of all packages in the project) *)
    Echo["[Common/LPM] Comparing installed packages with cached metadata."];
    cache = CacheLoad[projectDir];



    (* if there is no cache -> *)
    If[MissingQ[cache], 
      (* nothing is installed! Install them all *)
      repos = InstallPaclet[projectDir] /@ repos;
    ,
      (* we have local versions of all packages *)
      (* we need to compare them to one, which were just loaded via internet *)

      removed =  (#->cache[#])&/@ Complement[Keys[cache], Keys[repos]] // Association;
      current    =  (#->cache[#])&/@ Intersection[Keys[repos], Keys[cache]] // Association;
      new = (#->repos[#])&/@ Complement[Keys[repos], Keys[cache]] // Association;

      If[!preserve, Echo[Length[removed], "[Common/LPM] Packages scheduled for removal: "] ];
      Echo[Length[new], "[Common/LPM] Packages scheduled for installation: "];
     
      (* remove unecessary (a user removed them) *)
      If[!preserve, RemovePaclet[projectDir] /@ removed,
                    current = Join[current, removed];
      ];
      
      (* install new *)
      new = InstallPaclet[projectDir] /@ new;

      (* what must be updated *)
      If[automaticUpdates,
        updatable = Select[current, CheckUpdates];
      ,
        Echo["[Common/LPM] Automatic package updates are disabled by default."];
        updatable = <||>;
      ];

      (* will be updated *)
      updated   = ((#->repos[#])&/@ Keys[updatable]) // Association;
 
      Echo[Length[updatable], "[Common/LPM] Packages scheduled for update: "];

      (* update our list with fresh data *)
      repos = Join[current, InstallPaclet[projectDir] /@ updated, new];
    ];

    (* update local cache file aka packages.json *)
    CacheStore[projectDir, repos];

    (* finally load dirs *)
    If[!deffered,
      inspectPackages[FileNameJoin[{projectDir, "wl_packages"}], OptionValue["ConflictResolutionFunction"] ];
      Map[pacletDirectoryLoad] @  Map[DirectoryName] @  DeleteDuplicatesBy[FileNames["PacletInfo.wl" | "PacletInfo.m", {#}, {2}], DirectoryName]& @ FileNameJoin[{projectDir, "wl_packages"}];
    ];
] ]},
    If[StringQ[result], Message[LPMRepositories::failure, result]; $Failed, Null]
]

Options[PacletRepositories] = {"Deffered"->False, "PreserveConfiguration"->False, "Directory"->None, "StrictMode"->False, "Passive"->False, "ForceUpdates" -> False, "AutomaticUpdates"->True, "MaxVersionDiff" -> None, "UpdateInterval" -> Quantity[14, "Days"], "ConflictResolutionFunction" -> Function[{conflicting, true}, 
  Echo["[Common/LPM] Resolving the package conflict by uninstalling the global package."];
  If[PacletUninstall[conflicting] =!= Null,
    Echo["[Common/LPM] Operation failed."];
    Exit[-1];
  ];
]}

CacheStore[dir_String, repos_Association] := Export[FileNameJoin[{dir, "wl_packages_lock.wl"}], repos]
CacheLoad[dir_String] := If[!FileExistsQ[FileNameJoin[{dir, "wl_packages_lock.wl"}]], Missing[], Import[FileNameJoin[{dir, "wl_packages_lock.wl"}]]];

CheckUpdates[a_Association] := Module[{result},
  CheckUpdates[a, a["key"]]
]

convertVersion[str_String] := ToExpression[StringReplace[str, "." -> ""]]

CheckUpdates[a_Association, _] := False

(* general function work for both Releases & Branches *)
CheckUpdates[a_Association, Rule[Github | "Github", _]] := Module[{package, new, now},
  (* fetch any *)
  package = FetchInfo[a];
  If[!AssociationQ[package], Echo["[Common/LPM] Package metadata is invalid; skipping the update check."]; Return[False, Module]];

  (* a feature on how we can detect on what we are looking at *)
  If[KeyExistsQ[package, "tag_name"],
    (* releases *)
    new = package["tag_name"] // convertVersion;
    now = a["tag_name"] //convertVersion;

    (* if there was no available releases before and now it appeared, there will be missmatch *)
    If[!NumericQ[now], now = -1];

    Echo[StringJoin["[Common/LPM] Installed version ", ToString[now], "; repository version ", ToString[new], "."]];
    now < new  
  ,
    (* branches *)
    new = package["Version"] // convertVersion;
    now = a["Version"] //convertVersion;
    If[!NumericQ[now], now = -1];

    Echo[StringJoin["[Common/LPM] Installed version ", ToString[now], "; repository version ", ToString[new], "."]];
    now < new  
  ]
]

(* general function to fetch information about the package *)
FetchInfo[a_Association] := Module[{result},
  FetchInfo[a, a["key"]]
]

FetchInfo[a_Association, _] := a 

(* for releases *)
FetchInfo[a_Association, Rule[Github | "Github", url_String]] := Module[{new, data},
  (* extracting from given url *)
  new = StringCases[url, RegularExpression[".com\\/(.*).git"]->"$1"]//First // Quiet;
    If[!StringQ[new], new = StringCases[url, RegularExpression[".com\\/(.*)"]->"$1"]//First];
    Echo[StringJoin["[Common/LPM] Fetching GitHub release metadata for ", new, "."]];

  (* here we FETCH GITHUB API RESPONCE and use releases metadata *)
  data = urlImport["https://api.github.com/repos/"<>new<>"releases/latest", "JSON"] // Association // Quiet;

  (* if there is NO RELEASES *)
  If[!StringQ[data["zipball_url"]],
    Print["Releases are not available. Taking a master branch"];
    (* TAKE MASTER Branch *)
    Return[FetchInfo[a, Rule["Github", Rule[url, "master"]]]];
  ];

  (* merge new and old data together *)
  Join[a, data, <|"git-url"->new|>]
]

(* for branches *)
FetchInfo[a_Association, Rule[Github | "Github", Rule[url_String, branch_String]]] :=
Module[{new, data},
  (* extracting from given url *)    
    new = StringCases[url, RegularExpression[".com\\/(.*).git"]->"$1"]//First // Quiet;
    If[!StringQ[new], new = StringCases[url, RegularExpression[".com\\/(.*)"]->"$1"]//First];
    Echo[StringJoin["[Common/LPM] Fetching GitHub repository metadata for ", new, "."]];

    (* here we FETCH PACLETINFO.WL file and use its metadata *)
    data = urlGet["https://raw.githubusercontent.com/"<>new<>"/"<>ToLowerCase[branch]<>"/PacletInfo.wl"] // Quiet;
    If[!MatchQ[ToString[Head[data] ], "PacletObject" | "Paclet"], 
      data = urlGet["https://raw.githubusercontent.com/"<>new<>"/"<>ToLowerCase[branch]<>"/PacletInfo.m"];
    ];

    (* if failed. we just STOP *)

    If[!MatchQ[ToString[Head[data] ], "PacletObject" | "Paclet"], (* some issue with contexts *)
      Throw["Cannot get "<>ToString[new] ];
    ];

    Join[a, Switch[ToString[Head[data] ], "PacletObject", data//First, "Paclet", Association @ KeyValueMap[Function[{k,v}, ToString[k]->v], Association @@ data] ], <|"git-url"->new|>]
]

(* general function *)
InstallPaclet[dir_String][a_Association] := InstallPaclet[dir][a, a["key"]]

(* releases *)
InstallPaclet[dir_String][a_Association, Rule[Github | "Github", url_String]] := Module[{dirName, pacletPath},
    dirName = FileNameJoin[{dir, "wl_packages"}];
    If[!FileExistsQ[dirName], CreateDirectory[dirName]];

    (* check if there is no data on releases -> *)
    If[MissingQ[a["zipball_url"]], 
      (* TAKE Master branch instead *)
      Echo["[Common/LPM] No release archive is available; falling back to the master branch."];
      Return[InstallPaclet[dir][a, Rule["Github", Rule[url, "master"]]]];
    ];

    (* make a name from the git url provided *)
    dirName = FileNameJoin[{dirName, StringReplace[a["git-url"], "/"->"_"]}];

    (* in a case of update, directory will probably be there.. cleaning it! *)
    If[FileExistsQ[dirName],
        Echo["[Common/LPM] The package directory already exists and will be replaced."];
        Echo["[Common/LPM] Removing the existing package directory."];
        DeleteDirectory[dirName, DeleteContents -> True];
    ];

    (* download release *)
    Echo["[Common/LPM] Downloading the package release archive."];
    urlDownload[a["zipball_url"], FileNameJoin[{dir, "___temp.zip"}]];
    
    (* extract to temporary directory and copy *)
    Echo["[Common/LPM] Extracting the package release archive."];
    ExtractArchive[FileNameJoin[{dir, "___temp.zip"}], FileNameJoin[{dir, "___temp"}]];
    DeleteFile[FileNameJoin[{dir, "___temp.zip"}]];
    
    (* locate PacletInfo, if it is not there, this is very bad. *)
    pacletPath = FileNames["PacletInfo.wl" | "PacletInfo.m", FileNameJoin[{dir, "___temp"}], 2] // First;

    If[!FileExistsQ[pacletPath], Throw["Failed to fetch "<>ToString[pacletPath] ] ];
    pacletPath = DirectoryName[pacletPath];

    Echo[StringJoin["[Common/LPM] Copying the package from ", pacletPath, " to ", dirName, "."]];
 
    CopyDirectory[pacletPath, dirName];
    DeleteDirectory[FileNameJoin[{dir, "___temp"}], DeleteContents -> True];
    Print["LPM >> finished"];

    a
]

(* for branch *)
InstallPaclet[dir_String][a_Association, Rule[Github | "Github", Rule[url_String, branch_String]]] := Module[{dirName, pacletPath},
    dirName = FileNameJoin[{dir, "wl_packages"}];
    If[!FileExistsQ[dirName], CreateDirectory[dirName]];

    (* internal error, if there is no url provided *)
    If[MissingQ[a["git-url"] ], Throw["git url was not found" ]; ];

    (* construct name of the folder *)
    dirName = FileNameJoin[{dirName, StringReplace[Lookup[a, "Name", a[Name] ], "/"->"_"]}];

    If[FileExistsQ[dirName],
        Echo[StringJoin["[Common/LPM] Package directory ", dirName, " already exists and will be replaced."]];
        Echo["[Common/LPM] Removing the existing package directory."];
        DeleteDirectory[dirName, DeleteContents -> True];
    ];

    (* download branch as zip using old API *)
    Echo["[Common/LPM] Downloading the package archive from the master branch."];
    urlDownload["https://github.com/"<>a["git-url"]<>"/zipball/"<>ToLowerCase[branch], FileNameJoin[{dir, "___temp.zip"}]];
    
    Echo["[Common/LPM] Extracting the master-branch package archive."];
    ExtractArchive[FileNameJoin[{dir, "___temp.zip"}], FileNameJoin[{dir, "___temp"}]];
    DeleteFile[FileNameJoin[{dir, "___temp.zip"}]];
    
    pacletPath = FileNames["PacletInfo.wl" | "PacletInfo.m", FileNameJoin[{dir, "___temp"}], 2] // First;

    If[!FileExistsQ[pacletPath], Throw["Failed to fetch "<>ToString[pacletPath] ]; ];
    pacletPath = DirectoryName[pacletPath];

    Echo[StringJoin["[Common/LPM] Copying the package from ", pacletPath, " to ", dirName, "."]];
 
    CopyDirectory[pacletPath, dirName];
    DeleteDirectory[FileNameJoin[{dir, "___temp"}], DeleteContents -> True];
    Print["LPM >> finished"];

    a
]

urlQ[s_String] := StringMatchQ[s, __~~"://"~~__]
urlQ[URL[s_String] ] := StringMatchQ[s, __~~"://"~~__]
urlQ[File[s_String] ] := False
takeName[s_String] := StringReplace[FileBaseName[If[urlQ[s],
  URLParse[s]["Path"][[-1]]
,
  FileNameSplit[s][[-1]]
] ], {"."->"_", "-"->"_", "%"->"_", "/"->"_", "\\"->"_", " "->"_"}]

takeFileName[s_String] := FileNameTake[If[urlQ[s],
  URLParse[s]["Path"][[-1]]
,
  FileNameSplit[s][[-1]]
] ]

InstallPaclet[dir_String][a_Association, url_String] := Module[{dirName, pacletPath},
    dirName = FileNameJoin[{dir, "wl_packages"}];
    If[!FileExistsQ[dirName], CreateDirectory[dirName] ];

    (* construct name of the folder *)
    dirName = FileNameJoin[{dirName, takeName[url]}];

    If[FileExistsQ[dirName],
        Echo[StringJoin["[Common/LPM] Package directory ", dirName, " already exists and will be replaced."]];
        Echo["[Common/LPM] Removing the existing package directory."];
        DeleteDirectory[dirName, DeleteContents -> True];
    ];

    If[FileExtension[url // takeFileName] =!= "paclet", 
      Throw["File "<>ToString[(url // takeFileName)]<>" is not a paclet"];
    ];

    Echo["[Common/LPM] Downloading the paclet archive."];
    pacletPath = urlDownload[url];
    If[FailureQ[pacletPath], 
      Throw["Could not download "<>ToString[(url // takeFileName)] ];
    ];
    
    Echo["[Common/LPM] Extracting the paclet archive."];
    pacletPath = ExtractPacletArchive[pacletPath, CreateDirectory[] ];

    If[FailureQ[pacletPath], 
      Throw["Could not extract "<>ToString[(url // takeFileName) ] ];
    ];

    
    Echo[StringJoin["[Common/LPM] Copying the package from ", pacletPath, " to ", dirName, "."]];
    CopyDirectory[pacletPath, dirName];
 
    CopyDirectory[pacletPath, dirName];
    DeleteDirectory[pacletPath, DeleteContents -> True];
    Print["LPM >> finished"];

    a
]

(* general function *)
RemovePaclet[dir_String][a_Association] := RemovePaclet[dir][a, a["key"]]

(* releases *)
RemovePaclet[dir_String][a_Association, Rule[Github | "Github", url_String]] := (
  
  If[MissingQ[a["zipball_url"]], 
    Echo["[Common/LPM] No release archive is available; removing the master-branch installation."];
    Return[RemovePaclet[dir][a, Rule["Github", Rule[url, "master"]]]];
  ];  

  dirName = FileNameJoin[{dir, "wl_packages"}];
  dirName = FileNameJoin[{dirName, StringReplace[a["git-url"], "/"->"_"]}];

  If[FileExistsQ[dirName],
      Echo[StringJoin["[Common/LPM] Removing package directory ", dirName, "."]];
      Echo["[Common/LPM] Deleting package files."];
      DeleteDirectory[dirName, DeleteContents -> True];
  ,
      Throw["Folder was already removed. Desync with a lock file"];
  ];

  a  
)

(* branches *)
RemovePaclet[dir_String][a_Association, Rule[Github | "Github", Rule[url_String, branch_String]]] := Module[{dirName, pacletPath},
    dirName = FileNameJoin[{dir, "wl_packages"}];
    dirName = FileNameJoin[{dirName, StringReplace[a["Name"], "/"->"_"]}];

    If[FileExistsQ[dirName],
        Echo[StringJoin["[Common/LPM] Removing package directory ", dirName, "."]];
        Echo["[Common/LPM] Deleting package files."];
        DeleteDirectory[dirName, DeleteContents -> True];
    ,
        Throw["Folder was already removed. Desync with a lock file"];
    ];

    a
]

RemovePaclet[dir_String][a_Association, url_String] := Module[{dirName, pacletPath},
    dirName = FileNameJoin[{dir, "wl_packages"}];
    dirName = FileNameJoin[{dirName, takeName[url]}];

    If[FileExistsQ[dirName],
        Echo[StringJoin["[Common/LPM] Removing package directory ", dirName, "."]];
        Echo["[Common/LPM] Deleting package files."];
        DeleteDirectory[dirName, DeleteContents -> True];
    ,
        Throw["Folder was already removed. Desync with a lock file"]
    ];

    a
]

End[]

EndPackage[]
