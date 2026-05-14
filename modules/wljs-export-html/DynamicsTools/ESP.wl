BeginPackage["CoffeeLiqueur`Extensions`ExportImport`WidgetAPI`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`Objects`"
}]

Begin["`Tools`"]

HashMap = <||>

CreateUType[WidgetLike, init, {"Online"->False, "Interpolation"->True, "Hash"->Null, "Notebook"->Null, "Meta"-><|"Description"->"Generic"|>, "Ranges"->{}, "ResetStateFunction"->(Null&)}]

ChangeState[w_WidgetLike, "Online"] := w["Online"] = True
ChangeState[w_WidgetLike, "Offline"] := w["Online"] = False

WidgetLike /: Delete[r_WidgetLike] := With[{h = r["Hash"]},
    HashMap[h] = .;
    DeleteObject[r];
]

safeFunction[f_] := With[{uid = CreateUUID[]},
    EventHandler[uid, f];
    Function[Null, EventFire[uid, True] ]
]

flags = <||>
ResetFlag[flag_] := flags[flag] = False
SetFlag[flag_] := flags[flag] = True
ReadFlag[flag_] := TrueQ[flags[flag] ]

Deserialize[a_Association] := With[{hash = a["Hash"]},
    If[!KeyExistsQ[HashMap, hash],
        WidgetLike["Hash" -> hash];
    ];

    With[{o = HashMap[hash]},
        Map[Function[key,
            Switch[key,
                "Range",
                    o["Range"] = (Deserialize[#, "RangeSet"] &/@ a["Range"]);
                ,
                _,
                    o[key] = a[key];
            ]
        ], Keys[a] ];

        o
    ]
]

Deserialize[l_List] := Deserialize /@ l

Deserialize[a_Association, "RangeSet"] := With[{hash = a["Hash"]},
    If[!KeyExistsQ[HashMap, hash],
        RangeSet["Hash" -> hash];
    ];

    With[{o = HashMap[hash]},
        Map[Function[key, o[key] = a[key]; ], Keys[a] ];
        o
    ]
]

Serialize[] := With[{},
    Serialize /@ Select[Values[HashMap], MatchQ[#, _WidgetLike]& ]
]

Flush[] := (
    Delete /@ Values[HashMap];
    HashMap = <||>;
)

Serialize[r_WidgetLike] := With[{
    props = r["Properties"] /. {"Icon"->Nothing, "Properties"->Nothing, "Self"->Nothing, "Init"->Nothing}
},
    Association[Table[key -> Serialize[r[key] ], {key, props}] ]
]


CreateUType[RangeSet, init, {
    "Range"->{},
    "ReducedRange"->{},
    "Type"->"Range",
    "Initial"->1,
    "Event"->Null,
    "Hash"->Null,
    "Delay"->300
}]

Serialize[r_RangeSet] := With[{
    props = r["Properties"] /. {"Icon"->Nothing, "Properties"->Nothing, "Self"->Nothing, "Init"->Nothing}
},
    Association[Table[key -> Serialize[r[key] ], {key, props}] ]
]

Serialize[a_] := a
Serialize[a_List] := Serialize /@ a

init[r_] := With[{
    hash = If[r["Hash"]===Null, CreateUUID[], r["Hash"] ]
},
    HashMap[hash] = r;
    r["Hash"] = hash;
    r
]

RangeSet /: Delete[r_RangeSet] := With[{h = r["Hash"]},
    HashMap[h] = .;
    DeleteObject[r];
]


End[]
EndPackage[]