(* Reduces raw sniffer events into candidate dynamic-dependency groups. *)

BeginPackage["CoffeeLiqueur`Extensions`ExportImport`DynamicAnalyzer`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`"
}]

showAllConnections;
report;

Sniffer;

Begin["`Private`"]

folder = DirectoryName[$InputFileName];

Needs["CoffeeLiqueur`Extensions`ExportImport`Proto`" -> "proto`", FileNameJoin[{folder, "Proto.wl"}] ]
Needs["CoffeeLiqueur`Extensions`ExportImport`KernelSniffer`" , FileNameJoin[{folder, "KernelSniffer.wl"}] ]

(* The compact view omits payloads and is safe for periodic UI refreshes. *)
showAllConnections[kernel_] := With[{
    promise = Promise[],
    request = KernelSniffer[kernel, "SelectCompressed", Function[item, MatchQ[item[[2]], {"Symbol", __} | {"FrontSubmit", __}] ], Function[item, item[[1]] -> Take[item[[2]], 2] ] ]
},
    Then[request, Function[reduced,
   

        With[{result =     With[{groups = proto`splitIntoGroups[reduced // Uncompress ]},
                    Map[Function[group,
                        <|
                            "Events" -> (proto`event[#[[1]]]["Id"] &/@ group // DeleteDuplicates),
                            "Symbols" -> (#[[2, 2]] &/@ Select[group, Function[item, MatchQ[item[[2]], {"Symbol", __}] ] ] // DeleteDuplicates),
                            "FrontSubmit" -> (#[[2, 2]] &/@ Select[group, Function[item, MatchQ[item[[2]], {"FrontSubmit", __}] ] ] // DeleteDuplicates)
                        |>
                    ], groups]
            ]},

            EventFire[promise, Resolve, result];
        ] 
    ] ];
    
   promise 
]

(* The full report retains raw payloads for black-box construction. *)
report[kernel_] := With[{
    promise = Promise[],
    request = KernelSniffer[kernel, "SelectCompressed", Function[item, MatchQ[item[[2]], {"Symbol", __} | {"FrontSubmit", __}] ] ]
},
    Then[request, Function[dataset, 
        With[{groups = proto`splitIntoGroups[dataset // Uncompress ]},
            EventFire[promise, Resolve, MapIndexed[Function[{group, index}, 
                <|"Summary" -> report["Group", group], "Raw" -> group|>
            ], groups] ];
        ]
    ] ];


    promise
]

report["Group", group_] := With[{},
    <|
        "Events" -> With[{evs = (proto`event[#[[1]]]["Id"] &/@ group // DeleteDuplicates)},
            (proto`decodeEvent[#, group] &/@ evs)
        ],
        "Symbols" -> (Select[group, Function[item, MatchQ[item[[2]], {"Symbol", __}] ] ][[All, 2, 2]] // DeleteDuplicates),
        "FrontSubmit" -> (Select[group, Function[item, MatchQ[item[[2]], {"FrontSubmit", __}] ] ][[All, 2, 2]] // DeleteDuplicates)
    |>    
]





End[]
EndPackage[]
