#!/usr/bin/env wolframscript
(* ::Package:: *)

Get["CCompilerDriver`"]; 


getLibraryLinkVersion[] := 
Which[
    $VersionNumber >= 14.1, 
        With[{n = LibraryVersionInformation[FindLibrary["demo"] ]["WolframLibraryVersion"]},
            If[!NumberQ[n], 7, n]
        ], 
    $VersionNumber >= 13.1, 
        7, 
    $VersionNumber >= 12.1, 
        6, 
    $VersionNumber >= 12.0, 
        5, 
    $VersionNumber >= 11.2, 
        4, 
    $VersionNumber >= 10.0, 
        3, 
    $VersionNumber >= 9.0, 
        2, 
    True, 
        1
]; 

build[lib_String, opts: OptionsPattern[CreateLibrary]] := 
Block[{$directory, $libSrc, $libDir, $linkerOptions, uvLib}, 


    $directory = DirectoryName[If[$InputFileName == "", 
        NotebookFileName[], 
        $InputFileName
    ], 2]; 


        uvLib = FileNameJoin[{$directory, "UV", $SystemID, "libuv."<>Internal`DynamicLibraryExtension[]}];
        If[!FileExistsQ[uvLib],
            (* CreateDirectory[FileNameJoin[{$directory, "UV", $SystemID}] ]; *)
            Echo["Storing UV library..."];
            Echo[$ScriptCommandLine[[-1]]];
            Echo[uvLib];
            (* CopyFile[$ScriptCommandLine[[-1]], uvLib, OverwriteTarget->True] // Echo; *)
        ];


    $libSrc = File[FileNameJoin[{
        $directory, 
        "Source", 
        lib <> ".c"
    }]]; 

    $libDir = FileNameJoin[{
        $directory, 
        "LibraryResources", 
        $SystemID <> "-v" <> ToString[getLibraryLinkVersion[] ]
    }]; 


    If[!FileExistsQ[$libDir], CreateDirectory[]];

    CreateLibrary[$libSrc, lib, 
        "TargetDirectory" -> $libDir, 
        "Debug" -> False, 
        opts
    ]
]; 

Switch[$OperatingSystem,
    "Windows",
        $includes = "C:\\Github\\libuv\\include";
        $libs = "C:\\Github\\libuv\\build\\Debug\\uv.lib";
        build["usockets", "Libraries" -> {$libs, "ws2_32"}, "IncludeDirectories" -> {$includes}],
    
    "MacOSX",
        $uvPrefix = "/opt/homebrew/opt/libuv";
        $includes = FileNameJoin[{$uvPrefix, "include"}];
        $libs = FileNameJoin[{$uvPrefix, "lib", "libuv.dylib"}];
        build["usockets", "Libraries" -> {$libs}, "IncludeDirectories" -> {$includes}],
    
    "Unix",
        $includes = "/usr/include";
        $libs = "uv";
        build["usockets", "Libraries" -> {$libs}, "IncludeDirectories" -> {$includes}]
] 

