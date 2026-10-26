#!/usr/bin/env wolframscript

Get["CCompilerDriver`"];
Get["LibraryLink`"];

root = $InputFileName // DirectoryName // ParentDirectory;

Echo[root, "[Internal library build] Package root directory: "];

lib = CreateLibrary[
    File[FileNameJoin[{root, "Source", "internal.c"}] ],   
    "internal",                         (* the latest by default *)
    "TargetDirectory" -> FileNameJoin[{root, "LibraryResources", "build", $SystemID}],
    "Debug" -> True
];
