BeginPackage["CoffeeLiqueur`Extensions`Graphics`", {
    "CoffeeLiqueur`Misc`Events`", 
    "CoffeeLiqueur`Extensions`Communication`", 
    "CoffeeLiqueur`Extensions`FrontendObject`", 
    "CoffeeLiqueur`Extensions`Boxes`",
    "CoffeeLiqueur`Misc`WLJS`Transport`"
}]


Controls::usage = "Controls -> True, False is an option for Graphics to use zoom and panning"
TransitionType::usage = "TransitionType -> \"Linear\", \"CubicInOut\" is an option for Graphics to use smoothening filter for the transitions"
TransitionDuration::usage = "TransitionDuration -> 300 is an option for Graphics to set the duration of the transitions"

ZoomAt::usage = "ZoomAt[k_, {x_,y_}:{0,0}] zooms and pans plot to a given point. Can be used together with FrontSubmit and MetaMarker"

SVGAttribute::usage = "SVGAttribute[GraphicsObject_, \"Attrname\" -> \"Value\"] where AttrName is an d3-svg attribute of the object. Supports dynamic updates"

AnimationFrameListener::usage = "AnimationFrameListener[symbol // Offload, \"Event\" -> _String] binds to a symbol instance and requests an animation frame once symbol was changed"

SVGGroup::usage = "SVGGroup[g_] represents an isolated SVG group of graphics primitives"

Graphics`Canvas;
Graphics`Canvas::usage = ""

Graphics`Serialize;

Graphics`CaptureImage64 = ""

Graphics`DPR;
Graphics`DPR::usage = "Returns the client's device pixel ratio. Use inside FrontFetch"

(*Unprotect[Image]
Options[Image] = Append[Options[Image], Antialiasing->True];*)

Begin["`Private`"]

Unprotect[CurrentImage];
ClearAll[CurrentImage];

CurrentImage[] := CurrentImage[1]
CurrentImage[_] := With[{d = DeviceOpen["Camera"]}, {
    img = DeviceRead[d]
},
    DeviceClose[d];
    If[ImageQ[img], img, $Failed]
]

AnimationFrameListener[any_, Rule["Event", frameTrigger_EventObject]] := AnimationFrameListener[any, Rule["Event", frameTrigger[[1, "Id"]]]]

AnimationFrameListener /: EventHandler[AnimationFrameListener[any_], f_] := With[{
    temp = CreateUUID[]
},
    EventHandler[temp, f];
    AnimationFrameListener[any, "Event"->temp]
]

listener[p_, list_] := With[{uid = CreateUUID[]}, With[{
    rules = Map[Function[rule, rule[[1]] -> uid ], list]
},
    EventHandler[uid, list];
    EventListener[p, rules]
] ]

Unprotect[Point, Rectangle, Text, Disk, Polygon];

Point      /: EventHandler[p_Point, list_List] := listener[p, list]
Rectangle  /: EventHandler[p_Rectangle, list_List] := listener[p, list]
Polygon  /: EventHandler[p_Polygon, list_List] := listener[p, list]
Text       /: EventHandler[p_Text, list_List] := listener[p, list]
Disk       /: EventHandler[p_Disk, list_List] := listener[p, list]

Graphics`Canvas  /: EventHandler[p_Graphics`Canvas, list_List] := listener[p, list]

Protect[Point, Rectangle, Text, Disk, Polygon];

(*Unprotect[Rasterize]
Rasterize[g_Graphics, any___] := With[{svg = FrontFetch[Graphics`Serialize[g, "TemporalDOM"->True] ]},
    ImportString[svg, "Svg"]
]*)

Unprotect[Image]

Image /: EventHandler[Image[args__, opts:OptionsPattern[] ], list_List ] := With[{
    epilog = {OptionValue[Image, {opts}, Epilog]}
},
    With[{options = Join[Association[opts], <|Epilog -> Join[epilog, {
        listener[Null, list]
    }]|>]},
        Image[args, Sequence @@ Normal[options] ]
    ] 
]


Unprotect[Graphics]

Graphics /: EventHandler[Graphics[args_, opts:OptionsPattern[] ], list_List ] := With[{
    epilog = {OptionValue[Graphics, {opts}, Epilog]}
},
    With[{options = Join[Association[opts], <|Epilog -> Join[epilog, {
        listener[Null, list]
    }]|>]},
        Graphics[args, Sequence @@ Normal[options] ]
    ] 
]

Options[Graphics] = Join[Options[Graphics], {"Controls"->True}];

MakeExpressionBox[expr_, uid_] := CreateFrontEndObject[EditorView[ToString[ImportString[ToString[expr, OutputForm, CharacterEncoding -> "UTF8"], "ExpressionJSON"] , StandardForm], "ReadOnly"->True, "Selectable"->False], uid] // Quiet

Graphics /: MakeBoxes[System`Dump`g_Graphics?System`Dump`vizGraphicsQ,System`Dump`fmt:StandardForm|TraditionalForm] := If[ByteCount[System`Dump`g] < 2 1024,
    ViewBox[System`Dump`g, System`Dump`g]
,
    With[{fe = CreateFrontEndObject[System`Dump`g]},
        MakeBoxes[fe, System`Dump`fmt]
    ]
]

Graphics /: MakeBoxes[System`Dump`g_Graphics,System`Dump`fmt:StandardForm|TraditionalForm] := If[ByteCount[System`Dump`g] < 2 1024,
    ViewBox[System`Dump`g, System`Dump`g]
,
    With[{fe = CreateFrontEndObject[System`Dump`g]},
        MakeBoxes[fe, System`Dump`fmt]
    ]
]

System`WLXForm;

Graphics /: MakeBoxes[g_Graphics, WLXForm] := With[{fe = CreateFrontEndObject[g]},
    MakeBoxes[fe, WLXForm]
]

Image;

Unprotect[Image]

FormatValues[Image] = {};

Off[Image::optx];
Off[Image::imgarray];

Image /: MakeBoxes[Image`ImageDump`img:Image[_,Image`ImageDump`type_,Image`ImageDump`info___],Image`ImageDump`fmt_]/;Image`ValidImageQHold[Image`ImageDump`img] := With[{i=Information[Image`ImageDump`img], dataType = Information[Image`ImageDump`img, "DataType"]},
    If[ByteCount[Image`ImageDump`img] > Internal`Kernel`$FrontEndObjectSizeLimit 1024 1024,
        BoxForm`ArrangeSummaryBox[Image, Image`ImageDump`img, None, {
            BoxForm`SummaryItem[{"ObjectType", "Image"}],
            BoxForm`SummaryItem[{"ColorSpace", i["ColorSpace"]}],
            BoxForm`SummaryItem[{"Channels", i["Channels"]}],
            BoxForm`SummaryItem[{"Dimensions", ImageDimensions[Image`ImageDump`img]}],
            BoxForm`SummaryItem[{"DataType", i["DataType"]}]
        }, {}]
    ,
        If[dataType === "Bit16",
            With[{fe = CreateFrontEndObject[Image[Image`ImageDump`img, "Byte", Interleaving->True, ImageResolution->Automatic] ]},
                MakeBoxes[fe, Image`ImageDump`fmt]
            ]        
        ,
            With[{fe = CreateFrontEndObject[Image[Image`ImageDump`img, Interleaving->True, ImageResolution->Automatic] ]},
                MakeBoxes[fe, Image`ImageDump`fmt]
            ]        
        ]
    ]
]

Image /: MakeBoxes[Image`ImageDump`img:Image[_Offload, Image`ImageDump`type_, Image`ImageDump`info___], Image`ImageDump`fmt_] := With[{fe = CreateFrontEndObject[Image`ImageDump`img]},

    MakeBoxes[fe, Image`ImageDump`fmt]

]


(* FIXME: FilledCurve*)
Unprotect[FilledCurve]
FilledCurve[i:{{{_,_,_}..}..}, p:List[__]] := FilledCurve[conversion[{i,p}]]

conversion[curve_] :=
   Module[{ff},

       ff[i_, pts_, deg_] :=
           Switch[i,
               0, Line[Rest[pts]],
               1, BezierCurve[Rest[pts], SplineDegree -> deg],
               2, BezierCurve[
                   Join[{pts[[2]], 2 pts[[2]] - pts[[1]]}, Drop[pts, 2]], 
                   SplineDegree -> deg],
               3, BSplineCurve[Rest[pts], SplineDegree -> deg]
               ];

       Function[{segments, pts},
               MapThread[ff,
                   {
                       segments[[All, 1]],
                       pts[[Range @@ (#1 - {1, 0})]] & /@
                           Partition[Accumulate[segments[[All, 2]]], 2, 1, {-1, -1}, 1],
                       segments[[All, 3]]
                       }
                   ]
               ] @@@ Transpose[curve]
       ]


Unprotect[Polygon]
FormatValues[Polygon] = {}

(* WL14 with no reason reloads the definitons of some symbols *)
(* It breaks ANY FormatValues *)
(* In this example to reproduce see issue https://github.com/WLJSTeam/wolfram-js-frontend/issues/396  *)

If[Internal`Kernel`Watchdog["Enabled"],
  With[{file = FileNameJoin[{$RemotePackageDirectory, "src", "Kernel.wl"}]},
    Internal`Kernel`Watchdog["Assertion", "Graphics",
      FormatValues[Graphics]//Hash
    ,
      Get[file]
    ]
  ]
];

End[]
EndPackage[]