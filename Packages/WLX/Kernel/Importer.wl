BeginPackage["CoffeeLiqueur`WLX`Importer`", {"CoffeeLiqueur`WLX`"}]

ImportComponent::usage = "ImportComponent[filename_String] imports a component"

Placebo::usage = "Identity, but for strings"

TemplateSwizzle::usage = "Use to override components"

$Options;
$FirstChild;
$Children;


Begin["`Private`"]

TemplateSwizzle = <||>;

PackageExists = True

Placebo[str__] := StringJoin @@ (ToString /@ List[str])
Placebo[str_] := ToString[str]

(* evaluation tricks *)
EvaluationHolderObject /: SetDelayed[symbol_, EvaluationHolderObject[obj_, assoc_]] := With[{p = assoc["Path"]}, (
    symbol[rules_Rule] := Block[{Global`$WLXInputPath = DirectoryName[p], $Children = {}, $FirstChild = Null, $Options = Association[rules // List]}, ReleaseHold[obj]];
    symbol[rules__Rule] := Block[{Global`$WLXInputPath = DirectoryName[p], $Children = {}, $FirstChild = Null, $Options = Association[rules // List]}, ReleaseHold[obj]];
    symbol[arg_] := Block[{Global`$WLXInputPath = DirectoryName[p], $Children = {arg}, $FirstChild = arg, $Options = Association[{}]}, ReleaseHold[obj]];
    symbol[arg_, rules__Rule] := Block[{Global`$WLXInputPath = DirectoryName[p], $Children = {arg}, $FirstChild = arg, $Options = Association[rules // List]}, ReleaseHold[obj]];
    symbol[arg_, rest___, rules___Rule] := Block[{Global`$WLXInputPath = DirectoryName[p], $Children = List[arg, rest], $FirstChild = arg, $Options = Association[rules // List]}, ReleaseHold[obj]];
)]
SetAttributes[EvaluationHolderObject, HoldFirst]

importComponent[filename_, opts___] := (
    (* check the cache first! *)
    loadData[filename, opts]
)

ImportComponent[filename_, opts___] := (
    If[StringTake[filename, -3] === ".wl", loadNormalWlFile[filename], 
        (* check the cache first! *)
        With[{object = loadData[filename, opts]},
            With[{p = object[[2]]["Path"], body = object[[1]]}, 
                Block[{Global`$WLXInputPath = DirectoryName[p]}, 
                    ReleaseHold[body] 
                ] 
            ]
        ]
    ]
)

ImportComponent /: SetDelayed[symbol_, ImportComponent[args_, opts___]] := With[{e = importComponent[args, opts]}, SetDelayed[symbol, e]]

loadNormalWlFile[path_] := With[{base = Global`$WLXInputPath}, cache[loadNormalWlFile[path, base], cinterval] ]

loadNormalWlFile[filename_String, base_] := Module[{data, path},
    (* search by relative first *)
    path = {base, filename // processFileName} // Flatten // FileNameJoin;
    If[!TrueQ[FileExistsQ[path]],
        path = filename // processFileName // FileNameJoin;
    ];
    
    Get[path]
]

loadData[filename_, opts_Rule: Rule["Localize", True]] := With[{base = Global`$WLXInputPath},
    cache[loadData[filename, base, opts], cinterval]
]

loadData[filename_String, base_, opts_Rule: Rule["Localize", True]] := Module[{data, path},
    (* search by relative first *)
    path = {base, filename // processFileName} // Flatten // FileNameJoin;
    If[!TrueQ[FileExistsQ[path ] ],
        path = filename // processFileName // FileNameJoin;
    ];

    (* check swizzle *)

    If[KeyExistsQ[TemplateSwizzle, Hash[path] ],
        Echo["Swizzle!!!!"];
        Echo[path];
        data = Import[TemplateSwizzle[path // Hash], "Text"];
    ,
        data = Import[path, "Text"];
    ];
    

    With[{body = ProcessString[data, opts]},
        EvaluationHolderObject[body, <|"Path"->(path // FileNameJoin)|>]
    ]
]

loadData[path_, base_, opts_Rule: Rule["Localize", True]] := Module[{data},
    data = Import[path, "Text"];

    With[{body = ProcessString[data, opts]},
        EvaluationHolderObject[body, <|"Path"->path|>]
    ]
]


(* filenames corrector *)
checkIfUNIXStyle[str_String] := Length[StringCases[str, "\\"]] === 0

convertToUNIX[str_String] := StringReplace[str, "\\" -> "/"] // FileNameSplit
convertToWin[str_String]  := StringReplace[str, "/" -> "\\"] // FileNameSplit

processFileName[filename_String] := 
    Switch[
        $OperatingSystem,
        "MacOSX",
            If[checkIfUNIXStyle[filename], filename // FileNameSplit, convertToUNIX[filename]]
        ,
        "Windows",
            If[checkIfUNIXStyle[filename], convertToWin[filename], filename // FileNameSplit]
        ,
        _,
            If[checkIfUNIXStyle[filename], filename // FileNameSplit, convertToUNIX[filename]]
    ];


(* smart caching. credits https://github.com/KirillBelovTest *)

cinterval = "Minute"

wcache[expr_, date_DateObject] := (
	wcache[expr, {"Date"}] = date; 
	wcache[expr, date] = expr
);

wcache[expr_, interval_String: "Minute"] := (
	If[DateObjectQ[wcache[expr, {"Date"}]] && DateObject[Now, interval] != wcache[expr, {"Date"}], 
		wcache[expr, wcache[expr, {"Date"}]] =.]; 
	wcache[expr, DateObject[Now, interval]]
);

SetAttributes[wcache, HoldFirst]

cache = Identity[#1]&


cache = wcache; cinterval = "Hour";

CacheControl[False] := (cache = Identity[#1]&; "Caching was disabled") 
CacheControl[True]  := (cache = wcache; cinterval = "Minute"; "Caching was enabled for 1 minute") 
CacheControl["Minute"]  := (cache = wcache; cinterval = "Minute"; "Caching was enabled for 1 minute") 
CacheControl[date_DateObject]  := (cache = wcache; cinterval = date; "Caching was enabled for custom interval") 

End[]

EndPackage[]
