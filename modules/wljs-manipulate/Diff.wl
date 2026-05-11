BeginPackage["CoffeeLiqueur`Extensions`Manipulate`Diff`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Language`",
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CoffeeLiqueur`Extensions`Communication`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`Extensions`EditorView`",
    "CoffeeLiqueur`Extensions`InputsOutputs`"  
}]

Begin["`Private`"]

clearTable[table_] := With[{},
    (#["Destroy"][]) &/@ DownValues[table][[All,2]];
    ClearAll[table];
]

save[table_] := DownValues[table];
restore[table_, values_] := DownValues[table] = values;

resetAll[table_] := (
  (#["Reset"][]) &/@ SortBy[DownValues[table][[All,2]], Function[s, s["Priority"] ] ];
)


failureMessage[msg_, payload_] := (
  CoffeeLiqueur`Extensions`Manipulate`Diff`$lastJITFailure = {msg, payload};
)

(* Normal diff processor *)
(* works incrementally from diff to diff *)

processDiffs[table_, expr1_, expr2_, diffs_List, forceUpdate_] := Module[{},
  If[MatchQ[diffs, {___, $Failed, ___}], (* Fallback! *)
    forceUpdate[expr2];
    (#["Destroy"][]) &/@ DownValues[table][[All,2]];
    DownValues[table] = {};
    
    Return[];
  ];

  If[Length[diffs] == 0,
    Return[]; 
  ];

  If[Or @@ Map[(!AssociationQ[table[#[[3]]]])&, diffs], (* Fallback and rebuild dynamic expression *)
    (#["Destroy"][]) &/@ DownValues[table][[All,2]];
    DownValues[table] = {};
    
    Module[{e = expr2},
      With[
        {assoc = transpile @@ #, hash = #[[4]]},
        
        e = ReplaceAll[e, assoc["Rule"]];
        table[hash] = assoc;
        
      ] &/@ Reverse[diffs];

      forceUpdate[e];
      Return[];
    ];
  ];
  
  Map[With[ (* Update changed parts and move hashes *)
    {newHash = #[[4]], oldHash = #[[3]]}, 
    {data = table[oldHash]},
    
    table[oldHash] = .;
    table[newHash] = data;

    (data["Update"]) @@ #;
    
  ]&, diffs];
]

(* A variation of a diff processor *)
(* It allows to keep the original expression and dynamic parts unaffected *)
(* kinda that the original state is immutable till the changes are unavoidable *)
(* it keeps the same symbols from the beginning, which is much easier deal with *)

(* MUCH LESS EFFICIENT! *)

processDiffsStateless[table_, originalExpr_, expr2_, diffs_List, forceUpdate_, reset_] := Module[{},
  If[MatchQ[diffs, {___, $Failed, ___}], (* fallback! *)
    forceUpdate[expr2];
    table["$Failed"] = True;
    Return[];
  ];

  If[Length[diffs] == 0,
    If[Select[DownValues[table][[All,2]], AssociationQ] === {}, reset[originalExpr],  resetAll[table] ];    
    Return[]; 
  ];

  If[Or @@ Map[(!AssociationQ[table[#[[3]]]])&, diffs], (* fallback! *)
    forceUpdate[expr2];
    table["$Failed"] = True;
    Return[];
  ];
  

  With[{  (* Reset unaffected and update affected *)
    toUpdate = Map[With[
      {oldHash = #[[3]]}, 
      {data = table[oldHash]},

      If[TrueQ[table["$Failed"] ], (* detect fallback and restore the original expression *)
        table["$Failed"] = False;
        reset[originalExpr];
      ];

      {data, #}

    ]&, diffs],

    allEntries = DownValues[table][[All,2]]
  },
    
    Map[
        Function[t, If[t[[2]] === Null, t[[1]]["Reset"][Null] ,  t[[1]]["Update"] @@ (t[[2]]) ] ], 
        SortBy[Join[Select[Transpose[{allEntries, Table[Null, {k, Length[allEntries]}]}], !MemberQ[toUpdate[[All,1]], #[[1]]]&], toUpdate], Function[item, item[[1]]["Priority"] ] ] 
    ];
  ]
]


diff[exp_, exp_, _, _] := {}
diff[_Texture, _Texture, _, _] := (failureMessage["Textures are not supported", {None, None}]; $Failed)
diff[_Image3D, _Image3D, _, _] := (failureMessage["Image3D are not supported", {None, None}]; $Failed)
diff[exp1_, exp2_, _, _] := (failureMessage["Cannot link two expressions with available diff patterns", {exp1, exp2}]; $Failed)

diff[Rule[PlotRange, x_], Rule[PlotRange, y_], level_, attributes_] := {}

diff[Rule[PlotLabel, x_], Rule[PlotLabel, y_], level_, attributes_] := If[Lookup[attributes, "GraphicsQ", False], diffObject[Rule[PlotLabel, x], Rule[PlotLabel, y], Hash[Rule[PlotLabel, x] ], Hash[Rule[PlotLabel, y] ] ], {}]

diff[l1: LineLegend[a1_List, {b1__String}, rest___], l2: LineLegend[a1_List, {b2__String}, rest___], level_, attributes_] := diffObject[l1, l2, Hash[l1], Hash[l2] ]
diff[l1: PointLegend[a1_List, {b1__String}, rest___], l2: PointLegend[a1_List, {b2__String}, rest___], level_, attributes_] := diffObject[l1, l2, Hash[l1], Hash[l2] ]
diff[l1: SwatchLegend[a1_List, {b1__String}, rest___], l2: SwatchLegend[a1_List, {b2__String}, rest___], level_, attributes_] := diffObject[l1, l2, Hash[l1], Hash[l2] ]
diff[l1: LineLegend[a1_List, {b1__}, rest___], l2: LineLegend[a1_List, {b2__}, rest___], level_, attributes_] := diffObject[l1, l2, Hash[l1], Hash[l2] ]
diff[l1: PointLegend[a1_List, {b1__}, rest___], l2: PointLegend[a1_List, {b2__}, rest___], level_, attributes_] := diffObject[l1, l2, Hash[l1], Hash[l2] ]
diff[l1: SwatchLegend[a1_List, {b1__}, rest___], l2: SwatchLegend[a1_List, {b2__}, rest___], level_, attributes_] := diffObject[l1, l2, Hash[l1], Hash[l2] ]



diff[Rule[AxesOrigin, x_], Rule[AxesOrigin, y_], level_, attributes_] := {}

diff[Rule["PlotRange", x_], Rule["PlotRange", y_], level_, attributes_] := {}

diff[Raster[data1_List | data1_NumericArray], Raster[data2_List | data2_NumericArray], level_, attributes_] := If[Dimensions[data1] === Dimensions[data2],
  diffObject[Raster[data1], Raster[data2], Hash[Raster[data1] ], Hash[Raster[data2] ] ] 
,
  failureMessage["Cannot link two Raster primitives with different data dims", {Raster[data1], Raster[data2]}];
  $Failed
]

diff[Raster[data1_List | data1_NumericArray, pos_, rest1___], Raster[data2_List | data2_NumericArray, pos_, rest___], level_, attributes_] := If[Dimensions[data1] === Dimensions[data2],
  diffObject[Raster[data1, pos, rest1 ], Raster[data2, pos, rest], Hash[Raster[data1, pos, rest1] ], Hash[Raster[data2, pos, rest] ] ] 
,
  failureMessage["Cannot link two Raster primitives with different data dims", {Raster[data1, pos, rest1], Raster[data2, pos, rest]}];
  $Failed
]

diff[Line[data1_List], Line[data2_List], level_, attributes_] := 
  If[(Lookup[attributes, "GraphicsQ", False] || Lookup[attributes, "Graphics3DQ", False] ) && !Lookup[attributes, "GraphicsComplexQ", False],
    diffObject[Line[data1], Line[data2], Hash[Line[data1]], Hash[Line[data2]]]
  ,
    If[Lookup[attributes, "Graphics3DQ", False] && Lookup[attributes, "GraphicsComplexQ", False],
      diffObject[Line[data1], Line[data2], Hash[Line[data1]], Hash[Line[data2]]]
    ,
      failureMessage["Cannot link two Line primitives w/wo GraphicsComplex", {Line[data1], Line[data2]}];
      $Failed
    ] 
]

diff[Inset[obj_, pos1_List], Inset[obj_, pos2_List], level_, attributes_] :=
  If[Lookup[attributes, "GraphicsQ", False] && !Lookup[attributes, "GraphicsComplexQ", False],
    diffObject[Inset[obj, pos1], Inset[obj, pos2], Hash[Inset[obj, pos1] ], Hash[Inset[obj, pos2] ] ]
  ,
      failureMessage["Cannot link two Insets", {Inset[obj, pos1], Inset[obj, pos2]}];
      $Failed
  ] 

diff[Triangle[data1_List], Triangle[data2_List], level_, attributes_] := 
  If[(Lookup[attributes, "GraphicsQ", False] || Lookup[attributes, "Graphics3DQ", False] ) && !Lookup[attributes, "GraphicsComplexQ", False],
    diffObject[Triangle[data1], Triangle[data2], Hash[Triangle[data1]], Hash[Triangle[data2]]]
  ,
      failureMessage["Cannot link two Triangle primitives w/wo GraphicsComplex", {Triangle[data1], Triangle[data2]}];
      $Failed
]



diff[Arrow[data1_List], Arrow[data2_List], level_, attributes_] := 
  If[(Lookup[attributes, "GraphicsQ", False] || Lookup[attributes, "Graphics3DQ", False] ) && !Lookup[attributes, "GraphicsComplexQ", False],
    diffObject[Arrow[data1], Arrow[data2], Hash[Arrow[data1]], Hash[Arrow[data2]]]
  ,
    If[Lookup[attributes, "Graphics3DQ", False] && !Lookup[attributes, "GraphicsComplexQ", False],
      diffObject[Arrow[data1], Arrow[data2], Hash[Arrow[data1]], Hash[Arrow[data2]]]
    ,
      failureMessage["Cannot link two Arrow primitives w/wo GraphicsComplex", {Arrow[data1], Arrow[data2]}];
      $Failed
    ] 
]

diff[Line[data1_List, m_], Line[data2_List, u_], level_, attributes_] := 
  If[(Lookup[attributes, "GraphicsQ", False] || Lookup[attributes, "Graphics3DQ", False] ) && !Lookup[attributes, "GraphicsComplexQ", False],
    diffObject[Line[data1,m], Line[data2, u], Hash[Line[data1,m]], Hash[Line[data2, u]]]
  ,
    If[Lookup[attributes, "Graphics3DQ", False] && Lookup[attributes, "GraphicsComplexQ", False],
      diffObject[Line[data1,m], Line[data2, u], Hash[Line[data1,m]], Hash[Line[data2, u]]]
    ,
      failureMessage["Cannot link two Line primitives w/wo GraphicsComplex", {Line[data1, m], Line[data2, u]}];
      $Failed
    ] 
]

diff[Polygon[data1_List], Polygon[data2_List], level_, attributes_] := 
  If[Lookup[attributes, "GraphicsQ", False] && !Lookup[attributes, "GraphicsComplexQ", False],
    diffObject[Line[data1], Line[data2], Hash[Line[data1]], Hash[Line[data2]]]
  ,
    If[Lookup[attributes, "Graphics3DQ", False] && Lookup[attributes, "GraphicsComplexQ", False],
      diffObject[Polygon[data1], Polygon[data2], Hash[Polygon[data1]], Hash[Polygon[data2]]]
    ,
      failureMessage["Cannot link two Polygon primitives w/wo GraphicsComplex", {Polygon[data1], Polygon[data2]}];
      $Failed
    ] 
]

diff[Point[data1_List], Point[data2_List], level_, attributes_] := 
  If[(Lookup[attributes, "GraphicsQ", False] || Lookup[attributes, "Graphics3DQ", False] ) && !Lookup[attributes, "GraphicsComplexQ", False],
    diffObject[Point[data1], Point[data2], Hash[Point[data1]], Hash[Point[data2]]]
  ,
    failureMessage["Cannot link two Point primitives w/wo GraphicsComplex", {Point[data1], Point[data2]}];
    $Failed
]

Do[With[{s = s},

    diff[s[d11_, d12_], s[d21_, d22_], level_, attributes_] := 
      If[(Lookup[attributes, "GraphicsQ", False] || Lookup[attributes, "Graphics3DQ", False] ) && !Lookup[attributes, "GraphicsComplexQ", False],
        diffObject[s[d11, d12], s[d21, d22], Hash[s[d11, d12] ], Hash[s[d21, d22] ] ]
      ,
        failureMessage["Cannot link two "<>ToString[s]<>" primitives w/wo GraphicsComplex", {s[d11, d12], s[d21, d22]}];
        $Failed
    ]

], {s, {
    Disk, Circle, Text, Sphere, Cuboid, Rectangle, Tube
}} ]


    diff[Text[d11_, d12_, rest_], Text[d21_, d22_, rest_], level_, attributes_] := 
      If[(Lookup[attributes, "GraphicsQ", False] || Lookup[attributes, "Graphics3DQ", False] ) && !Lookup[attributes, "GraphicsComplexQ", False],
        diffObject[Text[d11, d12, rest], Text[d21, d22, rest], Hash[Text[d11, d12, rest] ], Hash[Text[d21, d22, rest] ] ]
      ,
        failureMessage["Cannot link two "<>ToString[Text]<>" primitives w/wo GraphicsComplex", {Text[d11, d12, rest], Text[d21, d22, rest]}];
        $Failed
    ]



diff[Polygon[s1_Integer, s2_Integer], Polygon[start_Integer, end_Integer], level_, attributes_] := 
    If[Lookup[attributes, "Graphics3DQ", False] && Lookup[attributes, "GraphicsComplexQ", False],
      diffObject[Polygon[s1, s2], Polygon[start, end], Hash[Polygon[s1, s2] ], Hash[ Polygon[start, end] ] ]
    ,
      failureMessage["Cannot link two non-indexed Polygon primitives wo GraphicsComplex", {Polygon[s1, s2], Polygon[start, end]}];
      $Failed
    ]


diff[i1_Image, i2_Image, level_, attributes_] := With[{
    dims1 = ImageDimensions[i1],
    dims2 = ImageDimensions[i2]
},
    If[dims1 === dims2,
        diffObject[i1, i2, Hash[i1], Hash[i2] ]
    ,   
        failureMessage["Images has different dimensions", Null];
        $Failed
    ]
]

transpile[head2_[_], head2_[d_], hash1_, hash2_] := With[{
  symbol = Unique["cmpled"]
},
  symbol = d;
  
  <|
    "Priority"->1, "Rule" -> (head2[d] -> head2[Offload[symbol] ]),
    "Reset" -> Function[Null, symbol = d],
    "Update" -> Function[{e1, e2, h1, h2},
      symbol = e2[[1]];
    ],
    "Destroy" -> Function[Null,
      ClearAll[symbol] // Quiet;
    ]
  |>
];

Do[With[{head2 = head},
  transpile[head2[_], head2[d_], hash1_, hash2_] := With[{
    symbol = Unique["cmpled"]
  },
    symbol = N[d];

    <|
      "Priority"->1, "Rule" -> (head2[d] -> head2[Offload[symbol] ]),
      "Reset" -> Function[Null, symbol = N[d] ],
      "Update" -> Function[{e1, e2, h1, h2},
        symbol = N[e2[[1]]];
      ],
      "Destroy" -> Function[Null,
        ClearAll[symbol] // Quiet;
      ]
    |>
  ];
], {head, {
  Line, Point, Polygon, Arrow, Triangle
}} ];

transpile[Line[_,_], Line[d_, u_], hash1_, hash2_] := With[{
  symbol = Unique["cmpled"]
},
  symbol = N[d];
  
  <|
    "Priority"->1, "Rule" -> (Line[d, u] -> Line[Offload[symbol] ]),
    "Reset" -> Function[Null, symbol = N[d] ],
    "Update" -> Function[{e1, e2, h1, h2},
      symbol = N[e2[[1]]];
    ],
    "Destroy" -> Function[Null,
      ClearAll[symbol] // Quiet;
    ]
  |>
];

transpile[Inset[_,_], Inset[d_, u_], hash1_, hash2_] := With[{
  symbol = Unique["cmpled"]
},
  symbol = N[u];
  
  <|
    "Priority"->1, "Rule" -> (Inset[d, u] -> Inset[d, Offload[symbol] ]),
    "Reset" -> Function[Null, symbol = N[u] ],
    "Update" -> Function[{e1, e2, h1, h2},
      symbol = N[e2[[2]]];
    ],
    "Destroy" -> Function[Null,
      ClearAll[symbol] // Quiet;
    ]
  |>
];

transpile[Rule[PlotLabel, x_String], Rule[PlotLabel, y_String], hash1_, hash2_] := With[{
  symbol = Unique["cmpled"]
},
  symbol = y;
  
  <|
    "Priority"->1, "Rule" -> (Rule[PlotLabel, y] -> Rule[PlotLabel, HoldForm[TextView[symbol//Offload, Appearance->None, "CSS"->"text-align:center; background:transparent"] ] ]),
    "Reset" -> Function[Null, symbol = y],
    "Update" -> Function[{e1, e2, h1, h2},
      symbol = e2[[2]];
    ],
    "Destroy" -> Function[Null,
      ClearAll[symbol] // Quiet;
    ]
  |>
];

transpile[Rule[PlotLabel, x_], Rule[PlotLabel, y_], hash1_, hash2_] := With[{
  symbol = Unique["cmpled"]
},
  symbol = ToString[y, StandardForm];
  
  <|
    "Priority"->1, "Rule" -> (Rule[PlotLabel, y] -> Rule[PlotLabel, HoldForm[EditorView[symbol//Offload, Appearance->None] ] ]),
    "Reset" -> Function[Null, symbol = y],
    "Update" -> Function[{e1, e2, h1, h2},
      symbol = ToString[e2[[2]], StandardForm];
    ],
    "Destroy" -> Function[Null,
      ClearAll[symbol] // Quiet;
    ]
  |>
];

(**)

Do[With[{head2 = head},
  transpile[head2[_,_], head2[d1_, d2_], hash1_, hash2_] := With[{
    symbol = Unique["cmpled"]
  },
    symbol = N[{d1, d2}];

    <|
      "Priority"->1, "Rule" -> (head2[d1, d2] -> head2[Offload[symbol[[1]]], Offload[symbol[[2]]] ]),
      "Reset" -> Function[Null, symbol = N[{d1, d2}] ],
      "Update" -> Function[{e1, e2, h1, h2},
        symbol = N[{e2[[1]], e2[[2]]}];
      ],
      "Destroy" -> Function[Null,
        ClearAll[symbol] // Quiet;
      ]
    |>
  ];
], {head, {
  Arrow, Disk, Circle, Sphere, Cuboid, Rectangle, Tube
}} ];

  transpile[Text[_,_], Text[d1_String, d2_], hash1_, hash2_] := With[{
    symbol = Unique["cmpled"]
  },
    symbol = {d1, N[d2]};

    <|
      "Priority"->1, "Rule" -> (Text[d1, d2] -> Text[Offload[symbol[[1]]], Offload[symbol[[2]]] ]),
      "Reset" -> Function[Null, symbol = {d1, N[d2]} ],
      "Update" -> Function[{e1, e2, h1, h2},
        symbol = {e2[[1]], N[e2[[2]]]};
      ],
      "Destroy" -> Function[Null,
        ClearAll[symbol] // Quiet;
      ]
    |>
  ];

  transpile[Text[_,_, rest_], Text[d1_String, d2_, rest_], hash1_, hash2_] := With[{
    symbol = Unique["cmpled"]
  },
    symbol = {d1, N[d2]};

    <|
      "Priority"->1, "Rule" -> (Text[d1, d2, rest] -> Text[Offload[symbol[[1]]], Offload[symbol[[2]]], rest ]),
      "Reset" -> Function[Null, symbol = {d1, N[d2]} ],
      "Update" -> Function[{e1, e2, h1, h2},
        symbol = {e2[[1]], N[e2[[2]]]};
      ],
      "Destroy" -> Function[Null,
        ClearAll[symbol] // Quiet;
      ]
    |>
  ];  


transpile[GraphicsComplex[_,_], GraphicsComplex[vertices2_, objects_], hash1_, hash2_] := With[{
  symbol = Unique["cmpled"]
},
  symbol = vertices2//NumericArray;
  
  <|
    "Priority"->10, "Rule" -> (GraphicsComplex[vertices2, objects] -> GraphicsComplex[Offload[symbol], objects, Rule["VertexFence", True] ]),
    "Reset" -> Function[Null, symbol = vertices2],
    "Update" -> Function[{e1, e2, h1, h2},
      symbol = e2[[1]]//NumericArray;
    ],
    "Destroy" -> Function[Null,
      ClearAll[symbol] // Quiet;
    ]
  |>
];

transpile[GraphicsComplex[_,_,_], GraphicsComplex[vertices2_, objects_, Rule[VertexNormals, normals2_] ], hash1_, hash2_] := With[{
  symbol = Unique["cmpled"]
},
  symbol = {vertices2, normals2}//NumericArray;
  
  <|
    "Priority"->10, "Rule" -> (GraphicsComplex[vertices2, objects, Rule[VertexNormals, normals2] ] -> GraphicsComplex[Offload[symbol[[1]] ], objects, Rule[VertexNormals, Offload[symbol[[2]] ] ], Rule["VertexFence", True] ]),
    "Reset" -> Function[Null, symbol = {vertices2, normals2}],
    "Update" -> Function[{e1, e2, h1, h2},
      symbol = {e2[[1]], e2[[3,2]]}//NumericArray;
    ],
    "Destroy" -> Function[Null,
      ClearAll[symbol] // Quiet;
    ]
  |>
];

transpile[GraphicsComplex[_,_,_], GraphicsComplex[vertices2_, objects_, Rule[VertexColors, normals2_] ], hash1_, hash2_] := With[{
  symbol = Unique["cmpled"]
},
  symbol = {vertices2, normals2}//NumericArray;
  
  <|
    "Priority"->10, "Rule" -> (GraphicsComplex[vertices2, objects, Rule[VertexColors, normals2] ] -> GraphicsComplex[Offload[symbol[[1]] ], objects, Rule[VertexColors, Offload[symbol[[2]] ] ], Rule["VertexFence", True] ]),
    "Reset" -> Function[Null, symbol = {vertices2, normals2}],
    "Update" -> Function[{e1, e2, h1, h2},
      symbol = {e2[[1]], e2[[3,2]]}//NumericArray;
    ],
    "Destroy" -> Function[Null,
      ClearAll[symbol] // Quiet;
    ]
  |>
];

transpile[GraphicsComplex[_,_,_,_], GraphicsComplex[vertices2_, objects_, Rule[VertexNormals, normals2_], Rule[VertexColors, colors2_] ], hash1_, hash2_] := With[{
  symbol = Unique["cmpled"]
},
  symbol = {vertices2, normals2, colors2}//NumericArray;
  
  <|
    "Priority"->10, "Rule" -> (GraphicsComplex[vertices2, objects, Rule[VertexNormals, normals2], Rule[VertexColors, colors2] ] -> GraphicsComplex[Offload[symbol[[1]] ], objects, Rule[VertexNormals, Offload[symbol[[2]] ] ], Rule[VertexColors, Offload[symbol[[3]] ] ], Rule["VertexFence", True] ]),
    "Reset" -> Function[Null, symbol = {vertices2, normals2, colors2}],
    "Update" -> Function[{e1, e2, h1, h2},
      symbol = {e2[[1]], e2[[3,2]], e2[[4,2]]}//NumericArray;
    ],
    "Destroy" -> Function[Null,
      ClearAll[symbol] // Quiet;
    ]
  |>
];


transpile[GraphicsComplex[_,_,_,_], GraphicsComplex[vertices2_, objects_, Rule[VertexColors, colors2_], Rule[VertexNormals, normals2_] ], hash1_, hash2_] := With[{
  symbol = Unique["cmpled"]
},
  symbol = {vertices2, normals2, colors2}//NumericArray;
  
  <|
    "Priority"->10, "Rule" -> (GraphicsComplex[vertices2, objects, Rule[VertexColors, colors2], Rule[VertexNormals, normals2] ] -> GraphicsComplex[Offload[symbol[[1]] ], objects, Rule[VertexNormals, Offload[symbol[[2]] ] ], Rule[VertexColors, Offload[symbol[[3]] ] ], Rule["VertexFence", True] ]),
    "Reset" -> Function[Null, symbol = {vertices2, normals2, colors2}],
    "Update" -> Function[{e1, e2, h1, h2},
      symbol = {e2[[1]], e2[[4,2]], e2[[3,2]]}//NumericArray;
    ],
    "Destroy" -> Function[Null,
      ClearAll[symbol] // Quiet;
    ]
  |>
];

Do[With[{pattern=pattern},
  transpile[pattern[_List, {__String}, ___], l2: pattern[a1_List, {b2__String}, rest___], hash1_, hash2_] := With[{
    symbol = Unique["cmpled"]
  },
    symbol = # &/@ {b2};

    <|
      "Priority"->1, "Rule" -> (l2 -> pattern[a1, 
        With[{list = Table[With[{i=i}, TextView[symbol[[i]]//Offload, Appearance->None, "CSS"->"font-size:small; padding:0; background:transparent"] ], {i, 1, Length[symbol]} ]},
          Map[Function[item, item ], list]
        ]
      , rest ]),
      "Reset" -> Function[Null, symbol = (# &/@ {b2}) ],
      "Update" -> Function[{e1, e2, h1, h2},
        symbol = # &/@ (e2[[2]]);
      ],
      "Destroy" -> Function[Null,
        ClearAll[symbol] // Quiet;
      ]
    |>
  ];

  transpile[pattern[_List, {__}, ___], l2: pattern[a1_List, {b2__}, rest___], hash1_, hash2_] := With[{
    symbol = Unique["cmpled"]
  },
    symbol = ToString[#, StandardForm] &/@ {b2};

    <|
      "Priority"->1, "Rule" -> (l2 -> pattern[a1, 
        With[{list = Table[With[{i=i}, EditorView[symbol[[i]]//Offload] ], {i, 1, Length[symbol]} ]},
          Map[Function[item, item ], list]
        ]
      , rest ]),
      "Reset" -> Function[Null, symbol = (# &/@ {b2}) ],
      "Update" -> Function[{e1, e2, h1, h2},
        symbol = ToString[#, StandardForm] &/@ (e2[[2]]);
      ],
      "Destroy" -> Function[Null,
        ClearAll[symbol] // Quiet;
      ]
    |>
  ];
], {pattern, {LineLegend, PointLegend, SwatchLegend}}];


transpile[i1_Image, i2_Image, hash1_, hash2_] := With[{
  symbol = Unique["cmpled"]
},
  symbol = NumericArray[ImageData[i2, "Byte"], "UnsignedInteger8"];
  
  <|
    "Priority"->1, "Rule" -> (i2 -> Image[Offload[symbol], "Byte"]),
    "Reset" -> Function[Null, symbol = NumericArray[ImageData[i2, "Byte"], "UnsignedInteger8"] ],
    "Update" -> Function[{e1, e2, h1, h2},
      symbol = NumericArray[ImageData[e2, "Byte"], "UnsignedInteger8"];
    ],
    "Destroy" -> Function[Null,
      ClearAll[symbol] // Quiet;
    ]
  |>
];

transpile[Raster[_], Raster[data2_], hash1_, hash2_] := With[{
  symbol = Unique["cmpled"]
},
  symbol = NumericArray[data2//N];
  
  <|
    "Priority"->1, "Rule" -> (Raster[data2] -> Raster[Offload[symbol] ]),
    "Reset" -> Function[Null, symbol = NumericArray[data2//N] ],
    "Update" -> Function[{e1, e2, h1, h2},
      symbol = NumericArray[e2[[1]]//N];
    ],
    "Destroy" -> Function[Null,
      ClearAll[symbol] // Quiet;
    ]
  |>
];

transpile[Raster[_, _, ___], Raster[data2_, pos_, rest___], hash1_, hash2_] := With[{
  symbol = Unique["cmpled"]
},
  symbol = NumericArray[data2//N];
  
  <|
    "Priority"->1, "Rule" -> (Raster[data2, pos, rest] -> Raster[Offload[symbol], pos, rest ]),
    "Reset" -> Function[Null, symbol = NumericArray[data2//N] ],
    "Update" -> Function[{e1, e2, h1, h2},
      symbol = NumericArray[e2[[1]]//N];
    ],
    "Destroy" -> Function[Null,
      ClearAll[symbol] // Quiet;
    ]
  |>
];

transpile[Raster[_], Raster[data2_NumericArray], hash1_, hash2_] := With[{
  symbol = Unique["cmpled"]
},
  symbol = data2;
  
  <|
    "Priority"->1, "Rule" -> (Raster[data2] -> Raster[Offload[symbol] ]),
    "Reset" -> Function[Null, symbol = data2 ],
    "Update" -> Function[{e1, e2, h1, h2},
      symbol = e2[[1]];
    ],
    "Destroy" -> Function[Null,
      ClearAll[symbol] // Quiet;
    ]
  |>
];

transpile[Raster[_, _, ___], Raster[data2_NumericArray, pos_, rest___], hash1_, hash2_] := With[{
  symbol = Unique["cmpled"]
},
  symbol = data2;
  
  <|
    "Priority"->1, "Rule" -> (Raster[data2, pos, rest] -> Raster[Offload[symbol], pos, rest ]),
    "Reset" -> Function[Null, symbol = data2 ],
    "Update" -> Function[{e1, e2, h1, h2},
      symbol = e2[[1]];
    ],
    "Destroy" -> Function[Null,
      ClearAll[symbol] // Quiet;
    ]
  |>
];


assignUnderHeld[Hold[s_], value_] := s = value;


diff[Graphics[args1__], Graphics[args2__], level_, attributes_] := With[{list1 = {args1}, list2 = {args2}}, 
  If[Length[list1] == Length[list2],
    MapThread[Function[{a,b},
      diff[a,b, level+1, Join[attributes, <|"GraphicsQ"->True|>]]
    ], {list1, list2}] 
 ,
   failureMessage["Graphics objects differs in args length", {list1, list2}];
   $Failed
 ]
]

diff[Graphics3D[args1__], Graphics3D[args2__], level_, attributes_] := With[{list1 = {args1}, list2 = {args2}}, 
  If[Length[list1] == Length[list2],
    MapThread[Function[{a,b},
      diff[a,b, level+1, Join[attributes, <|"Graphics3DQ"->True|>]]
    ], {list1, list2}] 
 ,
   failureMessage["Graphics3D objects differs in args length", {list1, list2}];
   $Failed
 ]
]

Do[With[{a=a},
  diff[a[first1_, rest1_], a[first2_, rest2_], level_, attributes_] := With[{},
   If[Lookup[attributes, "GraphicsQ", True] || Lookup[attributes, "Graphics3DQ", True],
      {
        diff[first1, first2, level+1, attributes ],
        diffObject[a[first1, rest1], a[first2, rest2], Hash[a[first1, rest1] ], Hash[a[first2, rest2] ] ]
      } 
   ,
    $Failed
   ]
  ];

  transpile[a[_,_], a[objects_, var_], hash1_, hash2_] := With[{
    symbol = Unique["cmpled"]
  },
    symbol = N[var];
    
    <|
      "Priority"->10, "Rule" -> (a[objects, var] -> a[objects, Offload[symbol] ]),
      "Reset" -> Function[Null, symbol = N[var] ],
      "Update" -> Function[{e1, e2, h1, h2},
        symbol = N[e2[[2]]];
      ],
      "Destroy" -> Function[Null,
        ClearAll[symbol] // Quiet;
      ]
    |>
  ];
], {a, {
  Translate, GeometricTransformation, Scale, Rotate
}}];

Do[With[{a=a},
  diff[a[first1_, rest1__], a[first2_, rest2__], level_, attributes_] := With[{},
  If[Length[List[rest1] ] ===  Length[List[rest2] ], 
   If[Lookup[attributes, "GraphicsQ", True] || Lookup[attributes, "Graphics3DQ", True],
      {
        diff[first1, first2, level+1, attributes ],
        diffObject[a[first1, rest1], a[first2, rest2], Hash[a[first1, rest1] ], Hash[a[first2, rest2] ] ]
      } 
   ,
    $Failed
   ],
    $Failed
  ]
  ];

  transpile[a[_,_,_], a[objects_, var1_, var2_], hash1_, hash2_] := With[{
    symbol = Unique["cmpled"]
  },
    symbol = {var1, var2};
    
    <|
      "Priority"->10, "Rule" -> (a[objects, var1, var2] -> a[objects, Offload[symbol[[1]]], Offload[symbol[[2]]] ]),
      "Reset" -> Function[Null, symbol = {var1, var2}],
      "Update" -> Function[{e1, e2, h1, h2},
        symbol = {e2[[2]], e2[[3]]};
      ],
      "Destroy" -> Function[Null,
        ClearAll[symbol] // Quiet;
      ]
    |>
  ];
], {a, {
  Rotate
}}];


(* consider to remove that *)

(*transpile[head2_[_,_], head2_[d1_, d2_], hash1_, hash2_] := With[{
  symbol = Unique["cmpled"]
},
  symbol = {d1, d2};
  
  <|
    "Priority"->1, "Rule" -> (head2[d1, d2] -> head2[Offload[symbol[[1]]], Offload[symbol[[2]]] ]),
    "Reset" -> Function[Null, symbol = {d1, d2}],
    "Update" -> Function[{e1, e2, h1, h2},
      symbol = {e2[[1]], e2[[2]]};
    ],
    "Destroy" -> Function[Null,
      ClearAll[symbol] // Quiet;
    ]
  |>
];*)

textureLessQ[expr_] := MatchQ[
  expr,
  GraphicsComplex[_, _] |
  GraphicsComplex[_, _, Rule[VertexColors, _] ] |
  GraphicsComplex[_, _, Rule[VertexNormals, _] ] |
  GraphicsComplex[_, _, Rule[VertexColors, _], Rule[VertexNormals, _] |
  GraphicsComplex[_, _, Rule[VertexNormals, _], Rule[VertexColors, _] ]
] ];

diff[g: GraphicsComplex[args1__], GraphicsComplex[args2__], level_, attributes_] := If[textureLessQ[g], With[{list1 = {args1}, list2 = {args2}}, 
  If[Length[list1] == Length[list2],
    If[Lookup[attributes, "GraphicsQ", False],
      MapThread[Function[{a,b},
        diff[a,b, level+1, Join[attributes, <|"GraphicsComplexQ"->True|>] ]
      ], {list1, list2}] 
    ,
      (* Graphics3D case. 2D is not supported yet *)
      {
        diff[list1[[2]], list2[[2]], level+1, Join[attributes, <|"GraphicsComplexQ"->True|>] ],
        diffObject[GraphicsComplex[args1], GraphicsComplex[args2], Hash[GraphicsComplex[args1] ], Hash[GraphicsComplex[args2] ] ]
      }
    ]
 ,
   failureMessage["GraphicsComplex objects differs in args length", {list1, list2}];
   $Failed
 ]
],
   failureMessage["GraphicsComplex with textures are not supported", {None, None}];
   $Failed  
]

diff[Annotation[args1_, _], Annotation[args2_, _], level_, attributes_] := With[{}, 
  diff[args1,args2, level+1, attributes]
]

diff[head_[args1__], head_[args2__], level_, attributes_] := With[{list1 = {args1}, list2 = {args2}}, 
  If[Length[list1] == Length[list2],
    MapThread[Function[{a,b},
      diff[a,b, level+1, attributes]
    ], {list1, list2}] 
 ,
   failureMessage[ToString[head]<>" expression differs in args length", {list1, list2}];
   $Failed
 ]
]

diff[head1_[___], head2_[___], level_, attributes_] := (
  failureMessage[ToString[head1]<>" and "<>ToString[head2]<>"cannot be linked", Null];
  $Failed
)


End[]
EndPackage[]
