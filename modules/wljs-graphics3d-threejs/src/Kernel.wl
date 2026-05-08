BeginPackage["CoffeeLiqueur`Extensions`Graphics3D`", {
  "CoffeeLiqueur`Misc`Events`", "CoffeeLiqueur`Extensions`Communication`",
  "CoffeeLiqueur`Extensions`FrontendObject`", 
  "CoffeeLiqueur`Extensions`Boxes`",
  "CoffeeLiqueur`Misc`WLJS`Transport`"
}]

Metalness::usage = "depricated. Use Directive"
Emissive::usage = "depricated. Use Directive"
Roughness::usage = "depricated. Use Directive"
Shadows::usage = "depricated. Use Directive"

HemisphereLight::usage = "HemisphereLight[skyColor_RGBColor, groundColor_RGBColor, intensity_] used in Graphics3D"

MeshMaterial::usage = "specifies the material for 3D primitives. MeshMaterial[MeshPhysicalMaterial[]], MeshMaterial[MeshToonMaterial[]]"

MeshPhysicalMaterial::usage = ""
MeshToonMaterial::usage = ""
MeshLambertMaterial::usage = ""
MeshPhongMaterial::usage = ""
MeshFogMaterial::usage = "works only with RTX on"

LinearFog::usage = "LinearFog[], LinearFog[col_], LinearFog[col_, {near_, far_}] adds a linear fog to a 3D scene"

Begin["`Tools`"]

WaterShader;
Materials["Glass"] = Directive[White, "EmissiveIntensity"->0, "Ior"->1.51, "Transmission"->1.0, "Roughness"->0.13]
Materials["Iridescent"] = Directive[RGBColor["#474747"], "Roughness"->0.25, "Metalness"->1.0, "Iridescence"->1.0, "IridescenceIOR"->2.2]
Materials["Acrylic"] = Directive[White, "Roughness"->0, "Metalness"->0, "Transmission"->1.0, , "AttenuationDistance"->0.75, "AttenuationColor"->RGBColor["#2a6dc6"] ]

Serialize;

End[]



Begin["`Private`"]

MakeExpressionBox[expr_, uid_] := CreateFrontEndObject[EditorView[ToString[ImportString[ToString[expr, OutputForm, CharacterEncoding -> "UTF8"], "ExpressionJSON"] , StandardForm], "ReadOnly"->True, "Selectable"->False], uid] // Quiet


(*
    list of all properties supported in Directives

    "Color",
    "Emissive",
    "Emissiveintensity",
    "Roughness",
    "Metalness",
    "Ior",
    "Transmission",
    "Thinfilm",
    "MaterialThickness",
    "Attenuationcolor",
    "Attenuationdistance",
    "Opacity",
    "Clearcoat",
    "Clearcoatroughness",
    "Sheencolor",
    "Sheenroughness",
    "Iridescence",
    "Iridescenceior",
    "Iridescencethickness",
    "Specularcolor",
    "Specularintensity",
    "Matte",
    "Flatshading",
    "Castshadow"

*)

listener[p_, list_] := With[{uid = CreateUUID[]}, With[{
    rules = Map[Function[rule, rule[[1]] -> uid ], list]
},
    EventHandler[uid, list];
    EventListener[p, rules]
] ]

Unprotect[Sphere];

Sphere      /: EventHandler[p_Sphere, list_List] := listener[p, list]

Protect[Sphere];


(* CALL A MODAL HERE 
Unprotect[Rasterize]
Rasterize[g_Graphics3D, any___] := With[{base = FrontFetch[Graphics3D`Serialize[Plot3D[Sin[x + y^2], {x, -3, 3}, {y, -2, 2}], "TemporalDOM"->True] ]},
  ImportString[StringDrop[base, StringLength["data:image/png;base64,"] ], "Base64"]
]
*)

Unprotect[Graphics3D]

System`WLXForm;

Graphics3D /: MakeBoxes[g_Graphics3D, WLXForm] := With[{fe = CreateFrontEndObject[g]},
    MakeBoxes[fe, WLXForm]
]

Graphics3D /: MakeBoxes[System`Dump`g_Graphics3D,System`Dump`fmt:StandardForm|TraditionalForm] := If[ByteCount[System`Dump`g] < 2 1024,
    ViewBox[System`Dump`g, System`Dump`g]
,
    With[{fe = CreateFrontEndObject[System`Dump`g]},
        {out = MakeBoxes[fe, StandardForm]},
          ViewBox[out, fe]
    ]
]

Image3D;
Unprotect[Image3D]
FormatValues[Image3D] = {}

dump = {};

CoffeeLiqueur`Extensions`Graphics3D`Private`SampledColorFunction;

Off[Image3D::imgarray];
Off[Image3D::optx];

Image3D /: MakeBoxes[Image`ImageDump`img:Image3D[_,Image`ImageDump`type_,Image`ImageDump`info___], Image`ImageDump`fmt_]/;Image`ValidImage3DQHold[Image`ImageDump`img] := With[{i=Information[Image`ImageDump`img]},
If[ByteCount[Image`ImageDump`img] > Internal`Kernel`$FrontEndObjectSizeLimit 1024 1024,
  BoxForm`ArrangeSummaryBox[Image3D, Image`ImageDump`img, None, {
            BoxForm`SummaryItem[{"ObjectType", "Image3D"}],
            BoxForm`SummaryItem[{"Size", Quantity[ByteCount[Image`ImageDump`img]/1024/1024, "Megabytes" ]}],
            BoxForm`SummaryItem[{"Dimensions", ImageDimensions[Image`ImageDump`img]}],
            BoxForm`SummaryItem[{"DataType", i["DataType"]}]
  }, {}]  
,
  With[{
    colorFunction = Lookup[Association[ Options[Image`ImageDump`img] ], ColorFunction, Automatic]
  },
    With[{
      object = CreateFrontEndObject[
        If[colorFunction === Automatic, Image`ImageDump`img,
          If[StringQ[colorFunction],
            Image`ImageDump`img
          ,
            With[{sampled = Table[List @@ ColorConvert[colorFunction[i/255.0], "RGB"], {i,0,255}]},
              Image3D[Image`ImageDump`img, ColorFunction -> CoffeeLiqueur`Extensions`Graphics3D`Private`SampledColorFunction[sampled] ]
            ]
          ]
        ]
      ]
    },
      If[Image`ImageDump`fmt === WLXForm,
        MakeBoxes[object, Image`ImageDump`fmt]
      , 
        With[{out = MakeBoxes[object, StandardForm]},
          ViewBox[out, object]
        ]
      ]
      
    ]
  ]
]
]

Image3D /: MakeBoxes[Image`ImageDump`img:Image3D[o_Offload, Image`ImageDump`type_, Image`ImageDump`info___], Image`ImageDump`fmt_] := With[{colorFunction = Lookup[Association[ Options[Image`ImageDump`img] ], ColorFunction, Automatic]}, With[{fe = CreateFrontEndObject[         If[colorFunction === Automatic, Image`ImageDump`img,
          If[StringQ[colorFunction],
            Image`ImageDump`img
          ,
            With[{sampled = Table[List @@ ColorConvert[colorFunction[i/255.0], "RGB"], {i,0,255}]},
              Image3D[o, Image`ImageDump`type, ColorFunction -> CoffeeLiqueur`Extensions`Graphics3D`Private`SampledColorFunction[sampled], Image`ImageDump`info ]
            ]
          ]
        ] ]},

  
                If[Image`ImageDump`fmt === WLXForm,
                    MakeBoxes[fe, Image`ImageDump`fmt]
                ,
                    With[{
                        out = MakeBoxes[fe, StandardForm]
                    },
                        ViewBox[out, fe]
                    ]
                ]

] ]

End[]
EndPackage[]

$ContextAliases["Graphics3D`"] = "CoffeeLiqueur`Extensions`Graphics3D`Tools`";
