BeginPackage["CoffeeLiqueur`Extensions`ExportImport`Decoder`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`Notebook`Transactions`"
}];


Begin["`Internal`"];

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`LocalKernel`" -> "LocalKernel`"]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

System`RowBoxFlatten; (* needed to fix Kernel and Master definitions *)

Needs["CoffeeLiqueur`Notebook`Loader`" -> "loader`"];

{saveNotebook, loadNotebook, renameNotebook, cloneNotebook}         = {loader`save, loader`load, loader`rename, loader`clone};

(*                                             ***                                                 *)
(*                                         HTML Converter                                          *)
(*                                             ***                                                 *)



(*                                             ***                                                 *)
(*                                       Markdown Converter                                        *)
(*                                             ***                                                 *)


(*                                             ***                                                 *)
(*                                   Mathematica NB Converter                                      *)
(*                                             ***                                                 *)



End[];    
EndPackage[];

{CoffeeLiqueur`Extensions`ExportImport`Decoder`Internal`check, CoffeeLiqueur`Extensions`ExportImport`Decoder`Internal`decodeHTML, CoffeeLiqueur`Extensions`ExportImport`Decoder`Internal`decodeMD, CoffeeLiqueur`Extensions`ExportImport`Decoder`Internal`decodeMathematica}