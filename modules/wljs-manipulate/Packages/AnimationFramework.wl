BeginPackage["AnimationFramework`", {
  "CoffeeLiqueur`Extensions`Graphics`",
  "CoffeeLiqueur`Misc`Async`", 
  "CoffeeLiqueur`Misc`Events`", 
  "CoffeeLiqueur`Misc`Events`Promise`", 
  "CoffeeLiqueur`Extensions`Communication`", 
  "CoffeeLiqueur`Extensions`FrontendObject`", 
  "CoffeeLiqueur`Extensions`Boxes`",
  "CoffeeLiqueur`Misc`WLJS`Transport`",
  "CoffeeLiqueur`Objects`",
  "CoffeeLiqueur`WLX`",
  "CoffeeLiqueur`WLX`Importer`",
  "CoffeeLiqueur`Extensions`InputsOutputs`",
  "CoffeeLiqueur`Extensions`RemoteCells`"
}]

Scene;

AnimationFramework`AddTo;
AnimationFramework`Layer;
AnimationFramework`Remove;
AnimationFramework`Update;
AnimationFramework`Animate;

AnimationFramework`Loop;

AnimationFramework`Finish;

AnimationFramework`Color;

AnimationFramework`Delayed;

AnimationFramework`CameraRig;

AnimationFramework`Component;

RecordAnimation;
RecorderToVideo;

Worker;


TimelinedAnimation;
AnimationFramework`Marker;

AnimationFramework`Proxy;

AudioFromClips;

Begin["`Private`"]

AnimationFramework`Proxy;
CreateType[proxy, {}];

toStringSafe[s_String] := s
toStringSafe[n_] := With[{s = ToString[n]},
  If[StringTake[s, -1] == ".", s<>"0", s]
]

replaceNumbersInString[str_, replacements_List] := 
 Module[{index = 0},
  StringReplace[str, 
   NumberString :> (index++; 
     If[index <= Length[replacements], 
      toStringSafe[replacements[[index]]], "NaN"])]
]

interpolator[f_, _] := f

extractNumbers[s_String] := ToExpression /@ StringCases[s, NumberString]

interpolator["Linear", String] := Function[{time, origin, current, target},
  With[{o = extractNumbers[origin], t = extractNumbers[target]},
    replaceNumbersInString[target, time (t - o) + o]
  ]
]


interpolator["Linear", _] := Function[{time, origin, current, target},
  time (target - origin) + origin
]

interpolator["LinearEuclidean", String] := Function[{time, origin, current, target},
  With[{o = extractNumbers[origin], t = extractNumbers[target]},
    replaceNumbersInString[target, time (t - o) + o]
  ]
]

sqMult[list_List] := Map[Function[s, Sign[s] s^2], list]
sqMult[l_] := l^2
sqrtSafe[s_] := If[s < 0, Sqrt[Abs[s] ] Sign[s], Sqrt[s] ]
sqrtSafe[s_List] := Map[sqrtSafe, s]

interpolator["LinearEuclidean", _] := Function[{time, origin, current, target}, With[{o = sqMult[origin]},
  sqrtSafe[time (sqMult[target] - o) + o]
] ]

interpolator[_String, p_] := interpolator["CubicInOut", p]

interpolator["CubicInOut", _] := Function[{x, origin, current, target},
  If[x < 0.5, 4 x^3, 1 - ((-2 x + 2)^3)/2] (target - origin) + origin
]

interpolator["CubicInOut", String] := Function[{x, origin, current, target},
  With[{o = extractNumbers[origin], t = extractNumbers[target]},
    replaceNumbersInString[target, If[x < 0.5, 4 x^3, 1 - ((-2 x + 2)^3)/2] (t - o) + o]
  ]
]

interpolator["QuadIn", _] := Function[{x, origin, current, target},
  x^2 (target - origin) + origin
]

interpolator["QuadIn", String] := Function[{x, origin, current, target},
  With[{o = extractNumbers[origin], t = extractNumbers[target]},
    replaceNumbersInString[target, x^2 (t - o) + o]
  ]
]

interpolator["QuadOut", _] := Function[{x, origin, current, target},
  (1 - (1 - x) * (1 - x)) (target - origin) + origin
]

interpolator["QuadOut", String] := Function[{x, origin, current, target},
  With[{o = extractNumbers[origin], t = extractNumbers[target]},
    replaceNumbersInString[target, (1 - (1 - x) * (1 - x)) (t - o) + o]
  ]
]


AnimationFramework`Color[c_] := List @@ RGBColor[c]



CreateType[animation, {}]

AnimationFramework`Animate[scene_Scene, e_proxy, Rule[prop_String, target_], type_, duration_] := Null;

AnimationFramework`Animate[scene_Scene, e_, r_] := AnimationFramework`Animate[scene, e, r, "Ease", 1.0]
AnimationFramework`Animate[scene_Scene, e_, r_, type_] := AnimationFramework`Animate[scene, e, r, t, 1.0]

AnimationFramework`Animate[scene_Scene, e_entity, Rule[prop_String, target_], type_, duration_] := With[{
  a = animation[]
},
  a["Interpolator"] = interpolator[type, Head[target] ];
  a["Scene"] = scene;
  a["Entity"] = e;
  a["Target"] = target;
  a["Type"] = "Single";
  a["Property"] = prop;
  a["Old"] = take[e, prop];
  a["Duration"] = duration;
  a["Timestamp"] = scene["AbsoluteTime"][];
  a["FinalTime"] = scene["AbsoluteTime"][] + duration;
  a["Promise"] = Promise[];
  scene["Animations"] = Append[scene["Animations"], a];

  a["Promise"]
]

AnimationFramework`Animate[scene_Scene, Hold[symbol_], target_, type_, duration_] := With[{
  a = animation[]
},
  a["Interpolator"] = interpolator[type, Head[target] ];
  a["Scene"] = scene;
  a["Target"] = target;
  a["Type"] = "Symbol";
  a["Old"] = symbol;
  a["Symbol"] = Hold[symbol];
  a["Duration"] = duration;
  a["Timestamp"] = scene["AbsoluteTime"][];
  a["FinalTime"] = scene["AbsoluteTime"][] + duration;
  a["Promise"] = Promise[];
  scene["Animations"] = Append[scene["Animations"], a];

  a["Promise"]
]

AnimationFramework`Finish[p_] := p; 

CreateType[runner, {}]

AnimationFramework`Loop[scene_Scene, e_entity, prop_String, function_, duration_:1] := With[{
  r = runner[]
},
  r["Function"] = function;
  r["Duration"] = duration;
  r["Entity"] = e;
  r["Property"] = prop;
  r["Cycle"] = 1;
  r["Timestamp"] = scene["AbsoluteTime"][];
  r["FinishedQ"] = Null;
  scene["Runners"] = Append[scene["Runners"], r];

  r
];


AnimationFramework`Animate[scene_Scene, e_entity, r: {__Rule}, type_, duration_] := With[{
  a = animation[]
},
  a["Interpolator"] = interpolator[type, Head[target]];
  a["Scene"] = scene;
  a["Entity"] = e;
  a["Type"] = "Multi";
  a["Target"] = r[[All,2]];
  a["Property"] = r[[All,1]];
  a["Old"] = take[e, #] &/@ (r[[All,1]]);
  a["Duration"] = duration;
  a["Timestamp"] = scene["AbsoluteTime"][];
  a["FinalTime"] = scene["AbsoluteTime"][] + duration;
  a["Promise"] = Promise[];
  scene["Animations"] = Append[scene["Animations"], a];

  a["Promise"]
]


CreateType[worker, {}]

Worker[s_Scene, function_] := With[{
  w = worker[]
},
  w["Scene"] = s;
  w["Function"] = function;
  w["Timestamp"] = s["AbsoluteTime"][];
  w["Armed"] = True;
  w["FinishedQ"] = Null;
  s["Workers"] = Append[s["Workers"], w];

  w
]

handleWorkers[w_, s_, time_] := Module[{passed = time - w["Timestamp"]},
  If[!w["Armed"], Return[]];

  With[{r = w["Function"][passed]},
    w["Armed"] = False;
    If[PromiseQ[r],
      Then[r, Function[nothing,
        If[w["FinishedQ"] =!= Null,
          EventFire[w["FinishedQ"], Resolve, True];
          w["FinishedQ"] = Null;
        ];      
        w["Armed"] = True;
      ]];
    ,
      If[w["FinishedQ"] =!= Null,
        EventFire[w["FinishedQ"], Resolve, True];
        w["FinishedQ"] = Null;
      ];
      w["Armed"] = True;
    ]
  ];
]

handleRunners[r_, s_, time_] := Module[{passed = time - r["Timestamp"], e = r["Entity"]},
  If[passed >= r["Duration"], 
    r["Timestamp"] = time;
    passed = 0;

    With[{p = r["Property"]},
      With[{prev = take[e, p]},
        With[{result = r["Function"][1.0, prev, r["Cycle"]]},
            AnimationFramework`Update[s, e, p -> result];
        ];
      ];
    ];

    r["Cycle"] += 1;

    If[r["FinishedQ"] =!= Null,
      EventFire[r["FinishedQ"], Resolve, True];
      r["FinishedQ"] = Null;
    ];

    Return[];
  ];

  

  With[{p = r["Property"]},
    With[{prev = take[e, p]},
      With[{result = r["Function"][passed / r["Duration"], prev, r["Cycle"] ]},
        If[prev =!= result,
          AnimationFramework`Update[s, e, p -> result];
        ]
      ]
    ]
  ];
]

AnimationFramework`Remove[r_runner] := With[{s = r["Entity"]["Scene"]},
  s["Runners"] = s["Runners"] /. {r -> Nothing};
]

AnimationFramework`Remove[r_worker] := With[{s = r["Scene"]},
  s["Workers"] = s["Workers"] /. {r -> Nothing};
]

AnimationFramework`Finish[r_runner] := With[{p = Promise[]},
  r["FinishedQ"] = p;
  p
]

AnimationFramework`Finish[r_worker] := With[{p = Promise[]},
  r["FinishedQ"] = p;
  p
]

CreateType[timer, {}];

AnimationFramework`Delayed[scene_, duration_] := Function[function, With[{t = timer[], p = Promise[]},
  t["Promise"] = Promise[];
  t["Timestamp"] = scene["AbsoluteTime"][];
  t["Duration"] = duration;
  scene["Timers"] = Append[scene["Timers"], t];

  Then[t["Promise"], Function[Null,
    With[{r = function},
      Then[r, Function[result,
        EventFire[p, Resolve, result];
      ] ]
    ]
  ] ];

  p
], HoldFirst]

AnimationFramework`Delayed[f_, scene_Scene, duration_] := AnimationFramework`Delayed[scene, duration][f]

SetAttributes[AnimationFramework`Delayed, HoldFirst]


Scene /: PauseAsync[scene_Scene, duration_] := With[{t = timer[]},
  t["Promise"] = Promise[];
  t["Timestamp"] = scene["AbsoluteTime"][];
  t["Duration"] = duration;
  scene["Timers"] = Append[scene["Timers"], t];

  t["Promise"]
]

handleTimers[t_, s_, time_] := With[{passed = time - t["Timestamp"]},
  If[passed > t["Duration"],
    s["Timers"] = s["Timers"] /. {t -> Nothing};
    EventFire[t["Promise"], Resolve, True];
    DeleteObject[t];
    Return[];
  ];
]

handleAnimation[a_, s_, time_] := With[{passed = time - a["Timestamp"], e = a["Entity"]},
  If[passed >= a["Duration"], 
    s["Animations"] = s["Animations"] /. {a -> Nothing};

    Switch[a["Type"],
        "Multi",
          With[{p = a["Property"]},
            With[{results = MapThread[(#4 -> a["Interpolator"][1.0, #1, #2, #3])&, {
              a["Old"], take[e, #] &/@ p, a["Target"], p}]
            },
              AnimationFramework`Update[s, e,  Sequence@@results]
            ];
          ];,

        "Single",
          With[{p = a["Property"]},
            With[{result = a["Interpolator"][1.0, a["Old"], take[e, p], a["Target"]]},
              AnimationFramework`Update[s, e,  p -> result]
            ];
          ];,

        "Symbol",
          With[{result = a["Interpolator"][1.0, a["Old"], ReleaseHold[a["Symbol"]], a["Target"]], sym = a["Symbol"]},
            assignHeld[sym, result];
          ];,

        _,
        False
    ];

    EventFire[a["Promise"], Resolve, True];
    DeleteObject[a];
    Return[];
  ];

  Switch[a["Type"],
    "Multi",
      With[{p = a["Property"]},
        With[{results = MapThread[(#4 -> a["Interpolator"][passed/a["Duration"], #1, #2, #3])&, {
          a["Old"], take[e, #] &/@ p, a["Target"], p}]
        },
          AnimationFramework`Update[s, e,  Sequence@@results]
        ];
      ];,
  
    "Single",
      With[{p = a["Property"]},
        With[{result = a["Interpolator"][passed/a["Duration"], a["Old"], take[e, p], a["Target"]]},
          AnimationFramework`Update[s, e,  p -> result]
        ];
      ];,

    "Symbol",
      With[{result = a["Interpolator"][passed/a["Duration"], a["Old"], ReleaseHold[a["Symbol"]], a["Target"]], sym = a["Symbol"]},
        assignHeld[sym, result];
      ];,
    
    _,
    False
  ];
]

CreateType[Scene, initScene, {
  ImageSize -> {500,400},
  Magnification -> 1,
  Epilog -> {},
  Prolog -> {}
}];

initScene[scene_] := Module[{opts},
  scene["Options"] = (#->scene[#]) &/@ Complement[scene["Properties"], {"Icon","Init","PublicFields", "Self", "Properties"}] // Association;
  scene["Children"] = {};
  scene["TimeMarkers"] = <||>;
  scene["Logs"] = {};

  scene["AbsoluteTime"] = AbsoluteTime;

  opts = scene["Options"];

  If[KeyExistsQ[opts, "TimeMarkers"],
    scene["TimeMarkers"] = opts["TimeMarkers"];
  ];  

  scene["GlobalDirectives"] = Lookup[opts, "GlobalDirectives", {}];

  With[{size = Switch[opts["ImageSize"],
    Small,
      {300,300},

    Medium,
      {500,500},

    Large,
      {800,600},

    _Real | _Integer,
      {1,1}  opts["ImageSize"],

    _,
      opts["ImageSize"]
  
  ]},
    opts = Join[KeyDrop[opts, {"ImageSize", "TimeMarkers", "GlobalDirectives"}], <|ImageSize->size, ImagePadding->None|>];
  ];

  With[{size = opts[ImageSize]},
    If[size[[1]] > size[[2]],
      opts = Join[opts, <|
        PlotRange->N[{{-1,1} size[[1]]/size[[2]], {-1,1}}]
      |>]    
    ,
      opts = Join[opts, <|
        PlotRange->N[{{-1,1}, {-1,1} size[[2]]/size[[1]]}]
      |>]     
    ]
  ];

  
  scene["Options"] = opts;
  scene["Ref"] = FrontInstanceReference[];
  scene["Window"] = Null;
  scene["Workers"] = {};
  scene["Runners"] = {};
  scene["Markers"] = {};
  scene["Timers"] = {};
  scene["Animations"] = {};
  scene["FrameHandler"] = Function[time,
    handleMarkers[#, scene, time] &/@ scene["Markers"];
    handleWorkers[#, scene, time] &/@ scene["Workers"];
    handleAnimation[#, scene, time] &/@ scene["Animations"];
    handleRunners[#, scene, time] &/@ scene["Runners"];
    handleTimers[#, scene, time] &/@ scene["Timers"];
  ];
  
  scene
];

AnimationFramework`Remove[s_Scene] := With[{},
  AnimationFramework`Remove /@ s["Workers"];
  AnimationFramework`Remove /@ s["Animations"];
  AnimationFramework`Remove /@ s["Runners"];

  AnimationFramework`Remove /@ s["Children"];

  s["Timers"] = {};
  s["Workers"] = {};
  s["Markers"] = {};
  s["Animations"] = {};
  s["Runners"] = {};
  s["Children"] = {};
]

FormatValues[Scene] = {};

System`WLXForm;

Scene /: MakeBoxes[s_Scene, form: StandardForm | WLXForm] := With[{w = CurrentWindow[], tick = Unique["af"], uid = CreateUUID[]},
  s["Window"] = w;
  s["MountedQ"] = False;

  With[{
    epilog = Join[s["Options"]["Epilog"], {
      AnimationFrameListener[tick // Offload, "Event"->uid, "Timeout"->300]
    }]
  },

    EventHandler[uid, Function[Null,
      
      If[!s["MountedQ"], With[{w = CurrentWindow[]},
        s["Window"] = w;
        s["MountedQ"] = True;
        EventHandler[w, {"Closed" -> Function[Null,
          s["MountedQ"] = False;
        ]}];
      ] ];

      s["FrameHandler"][AbsoluteTime[] ];
      tick = 1;
    ] ];

    tick = 1;
  
    With[{
      g = Graphics[{
        s["GlobalDirectives"], s["Ref"]
      }, "TransitionType"->None, "GUI"->False, Epilog->epilog, Sequence @@ Normal[KeyDrop[s["Options"], {"Epilog"}] ] ]
    },
      MakeBoxes[g, form]
    ]
  ]
]


AnimationFramework`Marker;

CreateType[marker, {}];

AnimationFramework`Marker[scene_Scene, id_String] := AnimationFramework`Marker[scene, id, "Start"];
AnimationFramework`Marker[s_Scene, id_, "Duration"] := With[{},
  With[{m = s["TimeMarkers"][id]},
    m["duration"]
  ]
]

AnimationFramework`Marker[s_Scene, id_, "Start"] := With[{ m = marker[], p = Promise[]},
  m["Time"] = s["TimeMarkers"][id]["time"];
  m["Promise"] = p;
  s["Markers"] = Append[s["Markers"], m]; 

  p
]

AnimationFramework`Marker[s_Scene, id_, "End"] := With[{ m = marker[], p = Promise[]},
  m["Time"] = s["TimeMarkers"][id]["time"] + s["TimeMarkers"][id]["duration"];
  m["Promise"] = p;
  s["Markers"] = Append[s["Markers"], m]; 

  p
]

handleMarkers[m_, s_Scene, time_] := With[{},
  If[time >= m["Time"],
      s["Markers"] = s["Markers"] /. {m -> Nothing};
      EventFire[m["Promise"], Resolve, True];
      DeleteObject[m];
  ];
]



AnimationFramework`AddTo[s_Scene, AnimationFramework`Proxy[feature_] ] := With[{p = proxy[]},
  s["Children"] = Append[s["Children"], p];
  p["Scene"] = s;
  p["Group"] = FrontInstanceGroup[];
  FrontSubmit[p["Group"][feature["Create"][p] ], s["Ref"], "Window"->s["Window"] ];
  p
]

CreateType[entity, {}];

AnimationFramework`AddTo[s_Scene, feature_] := With[{e = entity[]},
  s["Children"] = Append[s["Children"], e];
  e["Scene"] = s;
  e["Group"] = FrontInstanceGroup[];
  FrontSubmit[e["Group"][feature], s["Ref"], "Window"->s["Window"]];
  e
]

AnimationFramework`AddTo[s_entity, feature_] := With[{e = entity[], scene = s["Scene"]},
  s["Children"] = Append[s["Children"], e];
  e["Scene"] = scene;
  e["Group"] = FrontInstanceGroup[];
  FrontSubmit[e["Group"][feature], s["Ref"], "Window"->scene["Window"]];
  e
]

AnimationFramework`Layer[s_entity, feature_] := With[{e = entity[], scene = s["Scene"]},
  s["Children"] = Append[s["Children"], e];
  e["Children"] = {};
  e["Ref"] = FrontInstanceReference[];
  e["Scene"] = scene;
  e["Group"] = FrontInstanceGroup[];
  With[{p = If[Length[Cases[feature, #children, Infinity]] > 0,
    feature /. {#children -> SVGGroup[e["Ref"]]}
  ,
    If[ListQ[feature],
      Join[feature, {SVGGroup[e["Ref"]]}]
    ,
      {feature, SVGGroup[e["Ref"]]}
    ]
  ]},
    FrontSubmit[e["Group"][p], s["Ref"], "Window"->scene["Window"] ];
  ];
  e
]

AnimationFramework`Layer[s_Scene, feature_] := With[{e = entity[]},
  s["Children"] = Append[s["Children"], e];
  e["Children"] = {};
  e["Ref"] = FrontInstanceReference[];
  e["Scene"] = s;
  e["Group"] = FrontInstanceGroup[];
  With[{p = If[Length[Cases[feature, #children, Infinity]] > 0,
    feature /. {#children -> SVGGroup[e["Ref"]]}
  ,
    If[ListQ[feature],
      Join[feature, {SVGGroup[e["Ref"]]}]
    ,
      {feature, SVGGroup[e["Ref"]]}
    ]
  ]},
    FrontSubmit[e["Group"][p], s["Ref"], "Window"->s["Window"]];
  ];
  e
]

AnimationFramework`Layer[s_Scene, feature_, variables_] := With[{
  e = entity[],
  vars = variables[[All, 1]],
  symbol = Unique["af"]
},
  e["Symbol"] = Hold[symbol];
  symbol = variables[[All, 2]];
  e["Slots"] = MapIndexed[(#1 -> #2[[1]])&, vars] // Association;
  
  e["Children"] = {};
  e["Ref"] = FrontInstanceReference[];
  
  s["Children"] = Append[s["Children"], e];
  e["Scene"] = s;
  e["Group"] = FrontInstanceGroup[];
  With[{f = feature /. MapIndexed[Function[{v, index}, With[{i = index[[1]]}, 
      Slot[v] -> Offload[symbol[[i]]]
    ]], vars]},

    With[{p = If[Length[Cases[f, #children, Infinity]] > 0,
    f /. {#children -> SVGGroup[e["Ref"]]}
  ,
    If[ListQ[f],
      Join[f, {SVGGroup[e["Ref"]]}]
    ,
      {f, SVGGroup[e["Ref"]]}
    ]
  ]
    
    }, FrontSubmit[e["Group"][
      p
    ], s["Ref"], "Window"->s["Window"]]]
  ];
  e
]

AnimationFramework`Layer[s_entity, feature_, variables_] := With[{
  e = entity[],
  vars = variables[[All, 1]],
  symbol = Unique["af"],
  scene = s["Scene"]
},
  e["Symbol"] = Hold[symbol];
  e["Scene"] = scene;
  
  symbol = variables[[All, 2]];
  e["Slots"] = MapIndexed[(#1 -> #2[[1]])&, vars] // Association;
  
  e["Children"] = {};
  e["Ref"] = FrontInstanceReference[];
  
  s["Children"] = Append[s["Children"], e];

  e["Group"] = FrontInstanceGroup[];
  With[{f = feature /. MapIndexed[Function[{v, index}, With[{i = index[[1]]}, 
      Slot[v] -> Offload[symbol[[i]]]
    ]], vars]},

    With[{p = If[Length[Cases[f, #children, Infinity]] > 0,
    f /. {#children -> SVGGroup[e["Ref"]]}
  ,
    If[ListQ[f],
      Join[f, {SVGGroup[e["Ref"]]}]
    ,
      {f, SVGGroup[e["Ref"]]}
    ]
  ]
    
    }, FrontSubmit[e["Group"][
      p
    ], s["Ref"], "Window"->scene["Window"]]]
  ];
  e
]

collectRecursive[e_entity] := If[MemberQ[e["Properties"], "Children"],
  collectRecursive[e["Children"]]
,
  e
]

collectRecursive[{}] := {};
collectRecursive[list_List] := collectRecursive /@ list

AnimationFramework`Remove[e_entity] := With[{scene =  e["Scene"]},
 If[!MatchQ[scene, _Scene], Return[]];
 
 scene["Children"] = scene["Children"] /. {e -> Nothing};

 If[MemberQ[e["Properties"], "BeforeRemove"],
  e["BeforeRemove"][e];
 ];

 clearSymbol[e["Symbol"]];
 
 If[MemberQ[e["Properties"], "Children"],
   With[{children = collectRecursive[e["Children"]] // Flatten},
      clearSymbol /@ children;
      FrontInstanceGroupRemove[Join[#["Group"] &/@ Reverse[children], {e["Group"]}], "Window"->scene["Window"] ];
      DeleteObject /@ children;
   ]
 ,
   FrontInstanceGroupRemove[e["Group"], "Window"->scene["Window"] ] ;
 ];
 
 DeleteObject[e];
]

clearSymbol[Hold[s_]] := Quiet[ClearAll[s]];
SetAttributes[clearSymbol, HoldFirst];

assignHeld[Hold[s_], v_] := s = v;
SetAttributes[assignHeld, HoldFirst];

AnimationFramework`Update[e_entity, rest__] := AnimationFramework`Update[e["Scene"], e, rest]
AnimationFramework`Update[s_Scene, e_entity, Rule[slot_String, value_]] := With[{
  symbol = e["Symbol"],
  i = e["Slots"][slot],
  oldValue = e["Symbol"] // ReleaseHold
},
  assignHeld[symbol, ReplacePart[oldValue, i -> value]];
]

AnimationFramework`Update[s_Scene, e_entity, r__Rule] := AnimationFramework`Update[s, e, {r}]
AnimationFramework`Update[s_Scene, e_entity, rules: {Rule[_String, _]..}] := With[{
  symbol = e["Symbol"],
  oldValue = e["Symbol"] // ReleaseHold,
  slots = e["Slots"]
},
  assignHeld[symbol, ReplacePart[oldValue,  Map[(slots[#[[1]]] -> #[[2]])&, rules]]];
]

take[e_entity, prop_String] := (e["Symbol"] // ReleaseHold)[[e["Slots"][prop]]]

AnimationFramework`AddTo[s_, feature_, r_Rule] := AnimationFramework`AddTo[s, feature, {r}]

AnimationFramework`AddTo[s_Scene, feature_, variables_] := With[{
  e = entity[],
  vars = variables[[All, 1]],
  symbol = Unique["af"]
},
  e["Symbol"] = Hold[symbol];
  symbol = variables[[All, 2]];
  e["Slots"] = MapIndexed[(#1 -> #2[[1]])&, vars] // Association;
  
  
  s["Children"] = Append[s["Children"], e];
  e["Scene"] = s;
  e["Group"] = FrontInstanceGroup[];
  With[{f = feature /. MapIndexed[Function[{v, index}, With[{i = index[[1]]}, 
      Slot[v] -> Offload[symbol[[i]]]
    ]], vars]},

    FrontSubmit[e["Group"][
      f
    ], s["Ref"], "Window"->s["Window"] ]
  ];
  e
]

AnimationFramework`CameraRig[s_Scene] := With[{
  e = entity[],
  vars = {"zoom", "position"},
  symbol = Unique["af"]
},

  symbol = {1.0, {0.0,0.0} };

  (* works as a proxy object *)
  Experimental`ValueFunction[Unevaluated[symbol] ] = Function[{y,x}, 
    FrontSubmit[ZoomAt @@ x, s["Ref"], "Window" -> s["Window"] ];
  ];

  e["Symbol"] = Hold[symbol];
  e["Slots"] = <|"zoom"->1, "position"->2|>;
  e["Scene"] = s;
  s["Children"] = Append[s["Children"], e];

  e
]

AnimationFramework`Component[s_, api_, r_Rule] := AnimationFramework`Component[s, api, {r}]

AnimationFramework`Component[s_Scene, api: {__Rule}, varibales: {__Rule}] := With[{
  e = entity[],
  vars = varibales[[All,1]],
  symbol = Unique["af"],
  updater = "Update" /. api,
  remover = "Remove" /. api
},

  symbol = varibales[[All,2]];

  (* works as a proxy object *)
  Experimental`ValueFunction[Unevaluated[symbol] ] = Function[{y,x}, 
    updater[AssociationThread[vars -> x] ];
  ];

  e["BeforeRemove"] = Function[Null, remover[AssociationThread[vars -> symbol] ] ];
  e["Symbol"] = Hold[symbol];
  e["Slots"] = MapIndexed[(#1 -> #2[[1]])&, vars] // Association;
  e["Scene"] = s;
  s["Children"] = Append[s["Children"], e];

  e
]

AnimationFramework`Component[s_entity, api: {__Rule}, varibales: {__Rule}] := With[{
  e = entity[],
  vars = varibales[[All,1]],
  symbol = Unique["af"],
  updater = "Update" /. api,
  remover = "Remove" /. api,
  scene = s["Scene"]
},

  symbol = varibales[[All,2]];

  (* works as a proxy object *)
  Experimental`ValueFunction[Unevaluated[symbol] ] = Function[{y,x}, 
    updater[AssociationThread[vars -> x] ];
  ];

  e["BeforeRemove"] = Function[Null, remover[AssociationThread[vars -> symbol] ] ];
  e["Symbol"] = Hold[symbol];
  e["Slots"] = MapIndexed[(#1 -> #2[[1]])&, vars] // Association;
  e["Scene"] = scene;
  s["Children"] = Append[s["Children"], e];

  e
]

AnimationFramework`AddTo[s_entity, feature_, variables_] := With[{
  e = entity[],
  vars = variables[[All, 1]],
  symbol = Unique["af"],
  scene = s["Scene"]
},
  e["Symbol"] = Hold[symbol];
  symbol = variables[[All, 2]];
  e["Slots"] = MapIndexed[(#1 -> #2[[1]])&, vars] // Association;
  
  
  s["Children"] = Append[s["Children"], e];
  e["Scene"] = scene;
  e["Group"] = FrontInstanceGroup[];
  With[{f = feature /. MapIndexed[Function[{v, index}, With[{i = index[[1]]}, 
      Slot[v] -> Offload[symbol[[i]]]
    ]], vars]},

    FrontSubmit[e["Group"][
      f
    ], s["Ref"], "Window"->scene["Window"]]
  ];
  e
]

root = FileNameJoin[{DirectoryName[$InputFileName], "AnimationFramework"}];
timelineLayout = ImportComponent[FileNameJoin[{root, "Timeline.wlx"}] ];


CreateType[timelined, {}];
TimelinedAnimation;
SetAttributes[TimelinedAnimation, HoldFirst]

Options[TimelinedAnimation] = Join[Options[Graphics],  {"TimeMarkers" -> <||>, "AudioClips"->{}, "GlobalDirectives"->{} }];

TimelinedAnimation[function_, opts:OptionsPattern[] ] := With[{
  t = timelined[],
  s = Scene[opts],
  uid = CreateUUID[]
},

  t["Scene"] = s;
  t["Shown"] = False;
  t["UId"] = uid;
  t["Function"] = Hold[function];
  t["StoredAudioClips"] = OptionValue["AudioClips"];


  t
]





FormatValues[timelined] = {};

fetchNext[f_, w_, cbk_] := Then[FrontFetchAsync[f, "Window"->w, "Format"->"RawJSON"], cbk ]

timelined /: MakeBoxes[t_timelined, StandardForm] := Module[{timer, startingTime, delta, seekTime = 0, seekingTask = Null}, With[{
  w = CurrentWindow[], tick = Unique["af"], uid = CreateUUID[], s = t["Scene"],
  timelineEvents = CreateUUID[],
  tickHandlerSymbol = Unique["af"],
  timelineControls = Unique["af"],
  timeScale = 1,
  seeking = 0
},
  s["Window"] = w;
  s["State"] = False;
  s["Paused"] = False;
  s["Timeline"] = t;
  t["Shown"] = True;

  t["AudioClipsAsync"] := With[{p = Promise[]}, Then[FrontFetchAsync[timelineControls["ConvertAudioClips"], "Window"->s["Window"] ], Function[length,
      Module[{data = {}, cbk},
        cbk = Function[res,
          
          If[res =!= False,
            AppendTo[data, res];
            fetchNext[timelineControls["PopAudio"], s["Window"], cbk]
          ,
            EventFire[p, Resolve, data];
          ];
        ];

        fetchNext[timelineControls["PopAudio"], s["Window"], cbk];
      ];
    ] ]; 
    p
  ];

  t["AudioClips"] := WaitAll[t["AudioClipsAsync"], 60];

  s["AbsoluteTime"] = timer;
  delta = 0;
  timer = Function[Null,
    AbsoluteTime[] - startingTime + delta
  ];
  
  With[{
    epilog = Join[s["Options"]["Epilog"], {
      AnimationFrameListener[tick // Offload, "Event"->uid, "Timeout"->300]
    }]
  },

    EventHandler[timelineEvents, {
      "ready" -> Function[Null,
        FrontSubmit[timelineControls["State", s["State"] ] ];
      ],

      "markers" -> Function[markers,
        s["TimeMarkers"] = markers;
        t["TimeMarkers"] = markers;
      ],

      "play" -> Function[Null,
        If[s["State"], Return[] ];
        startingTime = AbsoluteTime[];

        s["State"] = True;
        tick = s["AbsoluteTime"][];
        FrontSubmit[timelineControls["State", s["State"] ], "Window"->s["Window"] ];

        If[s["Paused"], s["Paused"] = False; Return[] ];

        With[{r = ReleaseHold[t["Function"] ]},
          Then[r[s], Function[result,
            s["State"] = False;
            delta = 0;
            FrontSubmit[timelineControls["State", s["State"] ], "Window"->s["Window"] ];
            tick = 0;
          ] ];
        ];
      ],

      "pause" -> Function[Null,
        s["State"] = False;
        s["Paused"] = True;
        delta = timer[];
        FrontSubmit[timelineControls["State", s["State"] ], "Window"->s["Window"] ];
      ],

      "stop" -> Function[Null,
        If[seekingTask =!= Null, 
              s["Paused"] = True;
              Return[];  
        ];

        delta = 0;
        s["State"] = False;
        s["Paused"] = False;
        AnimationFramework`Remove[s];
        FrontSubmit[timelineControls["State", s["State"] ], "Window"->s["Window"] ];
        tick = 0;
      ],

      "seek" -> Function[pos,
        If[seekingTask =!= Null, Return[] ];
        If[pos > delta && s["Paused"] == True,
          seekTime = delta;

          FrontSubmit[timelineControls["SeekingBlock", True ], "Window"->s["Window"] ];

          timer = Function[Null,
                seekTime
          ];

          seekingTask = SetInterval[
            s["FrameHandler"][seekTime];
            seekTime += 1/15.0;
            tick = seekTime;
            If[seekingTask === Null, Return[] ];
            If[seekTime > pos - 1/15.0 || s["Paused"] === True,

              FrontSubmit[timelineControls["SeekingBlock", False ], "Window"->s["Window"] ];
              If[seekingTask =!= Null, TaskRemove[seekingTask] ];
              seekingTask = Null;
              s["Paused"] = True;
              delta = seekTime;

              timer = Function[Null,
                AbsoluteTime[] - startingTime + delta
              ];
            ];
          , 4]; 
        ,
          delta = 0;

          

          AnimationFramework`Remove[s];

          s["Window"] = CurrentWindow[];

          FrontSubmit[timelineControls["SeekingBlock", True ], "Window"->s["Window"] ];

          seekTime = 0;
          timer = Function[Null,
                seekTime
          ];


          With[{r = ReleaseHold[t["Function"] ]},

            Then[r[s], Function[result,
              s["State"] = False;
              delta = 0;
              FrontSubmit[timelineControls["State", s["State"] ], "Window"->s["Window"] ];
              tick = 0;
            ] ]; 
          ];
          



          seekingTask = SetInterval[
            s["FrameHandler"][seekTime];
            seekTime += 1/15.0;
            tick = seekTime;
            If[seekingTask === Null, Return[] ];
            If[seekTime > pos - 1/15.0 || s["Paused"] === True,
              If[seekingTask =!= Null, TaskRemove[seekingTask] ];
              FrontSubmit[timelineControls["SeekingBlock", False ], "Window"->s["Window"] ];
              s["Paused"] = True;
              seekingTask = Null;
              delta = seekTime;

              timer = Function[Null,
                AbsoluteTime[] - startingTime + delta
              ];              
            ];
          , 4];          
        

        ]
      ]
    }];

    EventHandler[uid, Function[Null,
      With[{w = CurrentWindow[]},
        If[s["Window"] =!= w,
          s["Window"] = w;
        ];
      ];
      If[!s["State"] , Return[] ];
      With[{time = s["AbsoluteTime"][]},
        s["FrameHandler"][time];
        tick = time;
      ];
      
    ] ];

    tick = 0;

  
    With[{
      g = Graphics[{
        s["GlobalDirectives"], s["Ref"]
      }, "TransitionType"->None, "GUI"->False, Epilog->epilog, Sequence @@ Normal[KeyDrop[s["Options"], {"Epilog"}]]],
      tb = HTMLView[timelineLayout[timelineEvents, tickHandlerSymbol, timelineControls], Epilog->{
        timelineControls["Load", s["TimeMarkers"], t["StoredAudioClips"] ],
        tickHandlerSymbol[tick // Offload]
      }]
    },
      

      MakeBoxes[{g, tb}//Column, StandardForm]
    ]
  ]
] ] /; (t["Shown"] === False)


timelined /: MakeBoxes[t_timelined, StandardForm] := With[{},
  Module[{above},
        above = { 
          {BoxForm`SummaryItem[{"TimeMarkers: ", t["TimeMarkers"]}]} 
        };

        BoxForm`ArrangeSummaryBox[
           timelined,
           t,
           None,
           above,
           Null
        ]
    ]  
] /; (t["Shown"] === True)

AudioFromClips[a_List] := AudioOverlay[Map[Function[audio,
      {AudioTrim[audio["data"], {audio["startCrop"], audio["endCrop"]}], audio["time"]}
    ], Map[Function[audio,
      Join[audio, <|
        "data" -> ImportString[StringDrop[audio["data"], StringLength["data:audio/webm;base64,"] ], "BASE64"]
      |>]
    ], a] ] ]


recordAnimationBox = ImportComponent[FileNameJoin[{root, "RecordAnimation.wlx"}] ];

Options[RecordAnimation] = Join[{FrameRate -> 60, 	"StaggerDelay"->30, GeneratedAssetFormat -> "JPEG", 	"TimeMarkers"-><||>, GeneratedAssetLocation:>(CreateDirectory[]), CompressionLevel -> 0.2}, Join[Options[Graphics], {"GlobalDirectives"->{} }] ];

filterRulesForRest[] := Association[Options[RecordAnimation]]

filterRulesForRest[opts__] := With[{keys = Join[{"TimeMarkers", "GlobalDirectives"}, Options[Graphics][[All,1]]]},
  With[{assoc = KeyDrop[Join[Association[Options[RecordAnimation]], Association[opts]], keys]},

    assoc
  ]
]

filterRulesForScene[] := {}

filterRulesForScene[opts__] := With[{keys = Complement[Options[RecordAnimation][[All,1]], Join[{"TimeMarkers", "GlobalDirectives"}, Options[Graphics][[All,1]] ] ]},
  With[{assoc = KeyDrop[Association[opts], keys]},

    assoc
  ]
]

CreateType[recorder, {}];

RecordAnimation[timelineFunction_, opts___] := With[{
  rulesForScene = filterRulesForScene[opts],
  rulesForRest  = filterRulesForRest[opts],
  r = recorder[]
}, Module[{timer, frame = 0, start}, With[{
  s = Scene @@ Normal[rulesForScene],
  w = CurrentWindow[], tick = Unique["af"], UId = CreateUUID[], StartEvent = CreateUUID[],
  dir = rulesForRest[GeneratedAssetLocation],
  format = rulesForRest[GeneratedAssetFormat],
  rate = rulesForRest[FrameRate],
  delay = rulesForRest["StaggerDelay"],
  quality = Max[Min[Round[100 - 100 rulesForRest[CompressionLevel] ], 100], 0],
  JSHandler = Unique["af"],
  lastFrame = Unique["af"]
},
  s["AbsoluteTime"] = timer;
  r["Recording"] = False;
  r["Finished"] = False;

  s["Window"] = w;

  lastFrame = 0;

  timer[] := frame / rate // N;

  
  With[{
    epilog = Join[s["Options"]["Epilog"], {
      AnimationFrameListener[tick // Offload, "Event"->UId]
    }]
  },

  EventHandler[StartEvent, Function[noop,  
    s["Window"] = CurrentWindow[];
    r["Recording"] = True;
    FrontSubmit[JSHandler["Init", UId, URLEncode[dir], format, quality, delay], s["Ref"], "Window"->w];
    
    Then[timelineFunction[s], Function[result,
      r["Recording"] = False;
      r["Finished"] = True;
      AnimationFramework`Remove[s];(*`*)
      Then[dumpAllFrames[dir, JSHandler, lastFrame, frame, w], Function[Null, 
        AnimationFramework`AddTo[s, {Red, {EdgeForm[Red], White, Rectangle[{-0.5,-0.5}, {0.5,0.5}]}, Text[Style["Finished", FontSize->18], {0,0}, {0,0}]}]; (*`*)
        
        EventRemove[UId];
        FrontSubmit[JSHandler["Finish", UId], s["Ref"], "Window"->w];      
      ] ];
    ] ];

    EventHandler[UId, Function[noop2,
      If[!r["Recording"], Return[] ];
      With[{w = CurrentWindow[]},
        If[s["Window"] =!= w,
          s["Window"] = w;
        ];
      ];
      s["FrameHandler"][timer[]];


      Then[FrontFetchAsync[JSHandler["Record", UId], s["Ref"], "Window"->w], Function[Null,
        If[frame - lastFrame > 60,
          Then[dumpAllFrames[dir, JSHandler, lastFrame, frame, w], Function[Null,
            lastFrame = frame;
            frame = frame + 1;
            tick = 1;
          ] ];
        , 
          frame = frame + 1;
          tick = 1;        
        ];
      ]];
    ]];

    tick = 1;
    EventRemove[StartEvent];
  ]];


    tick = 1;
  
    r["OutputDirectory"] = dir;
    r["FrameRate"] = rate;
    r["UId"] = UId;
    r["JSHandler"] = JSHandler;
    r["Scene"] = s;
    r["epilog"] = epilog;
    r["StartEvent"] = StartEvent;
    
    r
  ]
  
] ] ]

dumpAllFrames[dir_, JSHandler_, lastFrame_, frame_, w_] := With[{p = Promise[]},
  Then[FrontFetchAsync[JSHandler["Pop"], "Window"->w], Function[base,
    If[lastFrame > frame || !StringQ[base],
      EventFire[p, Resolve, True];
    ,
      Export[FileNameJoin[{dir, StringTemplate["FRAME_``.png"][lastFrame]}], ImportString[StringDrop[base, StringLength["data:image/png;base64,"] ], "Base64"] ];
      Then[dumpAllFrames[dir, JSHandler, lastFrame+1, frame, w], Function[Null, 
        EventFire[p, Resolve, True];
      ] ]
    ];
  ] ];
  p
]

FormatValues[recorder] = {}

System`WLXForm;

recorder /: MakeBoxes[r_recorder, form: StandardForm | WLXForm] := With[{},
  recordAnimationBox[r["UId"], r["JSHandler"], r["Scene"], r["epilog"], r["StartEvent"], form]
] /; (r["Recording"] == False && r["Finished"] == False)

recorder /: MakeBoxes[r_recorder, StandardForm] := With[{},
  Module[{above},
        above = { 
          {BoxForm`SummaryItem[{"OutputDirectory: ", r["OutputDirectory"]}]}, 
          {BoxForm`SummaryItem[{"FrameRate: ", r["FrameRate"]}]}
          {BoxForm`SummaryItem[{"Recording: ", r["Recording"]}]}
        };

        BoxForm`ArrangeSummaryBox[
           recorder,
           r,
           None,
           above,
           Null
        ]
    ]
] /; (r["Recording"] == True || r["Finished"] == True)

recorder::sr = "Rendering is still in progress"

RecorderToVideo[r_recorder] := With[{},
  If[r["Recording"] == True || r["Finished"] == False, Message[recorder::sr]; Return[$Failed] ];
  FrameListVideo[Import /@ SortBy[FileNames["*.png" | "*.jpg" | "*.jpeg", r["OutputDirectory"] ], ToExpression[FileBaseName[#] ]&], CompressionLevel->0, FrameRate->r["FrameRate"] ]
]


End[]
EndPackage[]