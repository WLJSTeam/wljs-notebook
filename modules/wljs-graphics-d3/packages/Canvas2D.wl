BeginPackage["Canvas2D`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Extensions`Boxes`",
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CoffeeLiqueur`Extensions`Graphics`",
    "CoffeeLiqueur`Extensions`FrontendObject`"
}]

Canvas2D::usage = "Canvas2D[] creates 2D canvas context.\r\nctx = Canvas2D[]; Image[ctx] renders empty canvas";



Begin["`Private`"]

Canvas2D`Canvas2D[OptionsPattern[] ] := With[{
  buf1 = Unique["c2d"],
  buf2 = Unique["c2d"],
  index = Unique["c2d"]
},
  With[{
    c = ctx[buf1, buf2, index]
  },
    buf1 = Developer`ToPackedArray[Table[{0,0,0,0,0,0,0}, {64}]];
    index = 0;
    buf2 = buf1;
    c
  ]
]

push[ctx[buf1_, buf2_, index_], val_] := With[{
  i = index + 1,
  length = Length[buf1]
},
  If[i > length, 
    buf1 = Developer`ToPackedArray[PadRight[buf1, 2 length, {0,0,0,0,0,0,0}]];
  ];
  index = i;
  
  buf1[[i]] = val;
];

Canvas2D`Dispatch[ctx[buf1_, buf2_, index_] ] := (
  push[ctx[buf1, buf2, index], {0}]; (* END of buffer *)
  buf2 = buf1;
  index = 0;
)

SetAttributes[ctx, HoldAll];

(* single-code commands *)
Canvas2D`BeginPath[ctx_] :=
  push[ctx, {3, 0, 0, 0, 0, 0, 0}]
Canvas2D`ClosePath[ctx_] :=
  push[ctx, {4, 0, 0, 0, 0, 0, 0}]
Canvas2D`Fill[ctx_] :=
  push[ctx, {7, 0, 0, 0, 0, 0, 0}]
Canvas2D`Stroke[ctx_] :=
  push[ctx, {9, 0, 0, 0, 0, 0, 0}]
Canvas2D`Clip[ctx_] :=
  push[ctx, {28, 0, 0, 0, 0, 0, 0}]

(* two-field commands *)
Canvas2D`SetLineWidth[ctx_, w_Real|w_Integer] :=
  push[ctx, {18, w, 0, 0, 0, 0, 0}]
Canvas2D`SetLineWidth[ctx_, w_] :=
  push[ctx, {18, N[w], 0, 0, 0, 0, 0}]
Canvas2D`SetGlobalAlpha[ctx_, a_Real | a_Integer] :=
  push[ctx, {29, a, 0, 0, 0, 0, 0}]
Canvas2D`SetGlobalAlpha[ctx_, a_] :=
  push[ctx, {29, N[a], 0, 0, 0, 0, 0}]

(* three-field commands *)
Canvas2D`MoveTo[ctx_, {x_Real|x_Integer, y_Real|y_Integer}] :=
  push[ctx, {5, x, y, 0, 0, 0, 0}]
Canvas2D`MoveTo[ctx_, {x_, y_}] :=
  push[ctx, {5, N[x], N[y], 0, 0, 0, 0}]

Canvas2D`LineTo[ctx_, {x_Real|x_Integer, y_Real|y_Integer}] :=
  push[ctx, {6, x, y, 0, 0, 0, 0}]
Canvas2D`LineTo[ctx_, {x_, y_}] :=
  push[ctx, {6, N[x], N[y], 0, 0, 0, 0}]

Canvas2D`Translate[ctx_, {dx_Real|dx_Integer, dy_Real|dy_Integer}] :=
  push[ctx, {25, dx, dy, 0, 0, 0, 0}]
Canvas2D`Translate[ctx_, {dx_, dy_}] :=
  push[ctx, {25, N[dx], N[dy], 0, 0, 0, 0}]

Canvas2D`Scale[ctx_, {sx_Real|sx_Integer, sy_Real|sy_Integer}] :=
  push[ctx, {27, sx, sy, 0, 0, 0, 0}]
Canvas2D`Scale[ctx_, {sx_, sy_}] :=
  push[ctx, {27, N[sx], N[sy], 0, 0, 0, 0}]

(* five-field commands *)
Canvas2D`FillRect[ctx_, {x_Real|x_Integer, y_Real|y_Integer}, {w_Real|w_Integer, h_Real|h_Integer}] :=
  push[ctx, {1, x, y, w, h, 0, 0}]
Canvas2D`FillRect[ctx_, {x_, y_}, {w_, h_}] :=
  push[ctx, {1, N[x], N[y], N[w], N[h], 0, 0}]

Canvas2D`StrokeRect[ctx_, {x_Real|x_Integer, y_Real|y_Integer}, {w_Real|w_Integer, h_Real|h_Integer}] :=
  push[ctx, {2, x, y, w, h, 0, 0}]
Canvas2D`StrokeRect[ctx_, {x_, y_}, {w_, h_}] :=
  push[ctx, {2, N[x], N[y], N[w], N[h], 0, 0}]

Canvas2D`Rect[ctx_, {x_Real|x_Integer, y_Real|y_Integer}, {w_Real|w_Integer, h_Real|h_Integer}] :=
  push[ctx, {8, x, y, w, h, 0, 0}]
Canvas2D`Rect[ctx_, {x_, y_}, {w_, h_}] :=
  push[ctx, {8, N[x], N[y], N[w], N[h], 0, 0}]

Canvas2D`QuadraticCurveTo[ctx_, {cpx_Real|cpx_Integer, cpy_Real|cpy_Integer}, {x_Real|x_Integer, y_Real|y_Integer}] :=
  push[ctx, {11, cpx, cpy, x, y, 0, 0}]
Canvas2D`QuadraticCurveTo[ctx_, {cpx_, cpy_}, {x_, y_}] :=
  push[ctx, {11, N[cpx], N[cpy], N[x], N[y], 0, 0}]

(* full-length commands (already 7 entries) *)
Canvas2D`Arc[ctx_, {x_Real|x_Integer, y_Real|y_Integer}, r_Real|r_Integer, θ1_Real|θ1_Integer, θ2_Real|θ2_Integer, ccw_: False] :=
  push[ctx, {10, x, y, r, θ1, θ2, If[ccw, 1, 0]}]

Canvas2D`BezierCurveTo[ctx_, {cp1x_Real|cp1x_Integer, cp1y_Real|cp1y_Integer},
                           {cp2x_Real|cp2x_Integer, cp2y_Real|cp2y_Integer},
                           {x_Real|x_Integer,    y_Real|y_Integer}] :=
  push[ctx, {12, cp1x, cp1y, cp2x, cp2y, x, y}]

(* text with 4 fields → pad 3 zeros *)
Canvas2D`FillText[ctx_, text_String, {x_Real|x_Integer, y_Real|y_Integer}] :=
  push[ctx, {13, text, x, y, 0, 0, 0}]
Canvas2D`FillText[ctx_, text_String, {x_, y_}] :=
  push[ctx, {13, text, N[x], N[y], 0, 0, 0}]

Canvas2D`StrokeText[ctx_, text_String, {x_Real|x_Integer, y_Real|y_Integer}] :=
  push[ctx, {14, text, x, y, 0, 0, 0}]
Canvas2D`StrokeText[ctx_, text_String, {x_, y_}] :=
  push[ctx, {14, text, N[x], N[y], 0, 0, 0}]

(* styles/state (2 fields → pad 5 zeros) *)
Canvas2D`SetFillStyle[ctx_, style_String] :=
  push[ctx, {16, style, 0, 0, 0, 0, 0}]

Canvas2D`SetFillStyle[ctx_, style_] :=
  push[ctx, {16, list2Col[style], 0, 0, 0, 0, 0}]

ClearAll[list2Col]

list2Col[{color_?ColorQ, Opacity[o_]}] := 
  With[{rgb = ColorConvert[color, RGBColor]}, 
    StringTemplate["rgba(``,``,``,``)"] @@ Join[Round[255 {rgb[[1]], rgb[[2]], rgb[[3]]}], {o}]
  ]

list2Col[{Opacity[o_], color_?ColorQ}] := list2Col[{color, Opacity[o]}]

list2Col[color_?ColorQ] := 
  With[{rgb = ColorConvert[color, RGBColor]}, 
    StringTemplate["rgb(``,``,``)"] @@ Round[255 {rgb[[1]], rgb[[2]], rgb[[3]]}]
  ]

Canvas2D`ColorToString = list2Col;
  
Canvas2D`SetStrokeStyle[ctx_, style_String] :=
  push[ctx, {17, style, 0, 0, 0, 0, 0}]

Canvas2D`SetStrokeStyle[ctx_, style_] :=
  push[ctx, {17, list2Col[style], 0, 0, 0, 0, 0}]
  
Canvas2D`SetLineCap[ctx_, cap_String] :=
  push[ctx, {19, cap, 0, 0, 0, 0, 0}]
Canvas2D`SetLineJoin[ctx_, join_String] :=
  push[ctx, {20, join, 0, 0, 0, 0, 0}]
Canvas2D`SetMiterLimit[ctx_, m_Real|m_Integer] :=
  push[ctx, {21, m, 0, 0, 0, 0, 0}]
Canvas2D`SetMiterLimit[ctx_, m_] :=
  push[ctx, {21, N[m], 0, 0, 0, 0, 0}]
Canvas2D`SetFont[ctx_, fontSpec_String] :=
  push[ctx, {22, fontSpec, 0, 0, 0, 0, 0}]

(* save/restore *)
Canvas2D`Save[ctx_] :=
  push[ctx, {23, 0, 0, 0, 0, 0, 0}]
Canvas2D`Restore[ctx_] :=
  push[ctx, {24, 0, 0, 0, 0, 0, 0}]

Canvas2D`Rotate[ctx_, angle_Real|angle_Integer] :=
  push[ctx, {26, angle, 0, 0, 0, 0, 0}]
Canvas2D`Rotate[ctx_, angle_] :=
  push[ctx, {26, N[angle], 0, 0, 0, 0, 0}]

Canvas2D`SetTextAlign[ctx_, align_String] :=
  push[ctx, {30, align, 0, 0, 0, 0, 0}]
Canvas2D`SetTextBaseline[ctx_, baseline_String] :=
  push[ctx, {31, baseline, 0, 0, 0, 0, 0}]

Canvas2D`ArcTo[ctx_, {x1_?NumericQ, y1_?NumericQ}, {x2_?NumericQ, y2_?NumericQ}, r_?NumericQ] :=
  push[ctx, {35, x1, y1, x2, y2, r, 0}]
Canvas2D`ArcTo[ctx_, {x1_, y1_}, {x2_, y2_}, r_] :=
  push[ctx, {35, N[x1], N[y1], N[x2], N[y2], N[r], 0}]

(* RoundRect *)
Canvas2D`RoundRect[ctx_, {x_?NumericQ, y_?NumericQ}, {w_?NumericQ, h_?NumericQ}, r_?NumericQ] :=
  push[ctx, {36, x, y, w, h, r, 0}]
Canvas2D`RoundRect[ctx_, {x_, y_}, {w_, h_}, r_] :=
  push[ctx, {36, N[x], N[y], N[w], N[h], N[r], 0}]

(* Fill/Stroke/Clip overloads accepting a Path2D and optional rule *)
Canvas2D`Fill[ctx_, path_, rule_String] :=
  push[ctx, {7, path, rule, 0, 0, 0, 0}]
Canvas2D`Fill[ctx_, path_] :=
  push[ctx, {7, path, 0, 0, 0, 0, 0}]
Canvas2D`Stroke[ctx_, path_, rule_String] :=
  push[ctx, {9, path, rule, 0, 0, 0, 0}]
Canvas2D`Stroke[ctx_, path_] :=
  push[ctx, {9, path, 0, 0, 0, 0, 0}]
Canvas2D`Clip[ctx_, path_, rule_String] :=
  push[ctx, {28, path, rule, 0, 0, 0, 0}]
Canvas2D`Clip[ctx_, path_] :=
  push[ctx, {28, path, 0, 0, 0, 0, 0}]

(* Rectangle clearing *)
Canvas2D`ClearRect[ctx_, {x_?NumericQ, y_?NumericQ}, {w_?NumericQ, h_?NumericQ}] :=
  push[ctx, {34, x, y, w, h, 0, 0}]
Canvas2D`ClearRect[ctx_, {x_, y_}, {w_, h_}] :=
  push[ctx, {34, N[x], N[y], N[w], N[h], 0, 0}]

(*------------------- Missing Transform & State Commands --------------------*)
(* Transform matrix operations *)
Canvas2D`Transform[ctx_, a_?NumericQ, b_?NumericQ, c_?NumericQ, d_?NumericQ, e_?NumericQ, f_?NumericQ] :=
  push[ctx, {37, a, b, c, d, e, f}]
Canvas2D`Transform[ctx_, a_, b_, c_, d_, e_, f_] :=
  push[ctx, {37, N[a], N[b], N[c], N[d], N[e], N[f]}]
Canvas2D`SetTransform[ctx_, a_?NumericQ, b_?NumericQ, c_?NumericQ, d_?NumericQ, e_?NumericQ, f_?NumericQ] :=
  push[ctx, {38, a, b, c, d, e, f}]
Canvas2D`SetTransform[ctx_, a_, b_, c_, d_, e_, f_] :=
  push[ctx, {38, N[a], N[b], N[c], N[d], N[e], N[f]}]
Canvas2D`ResetTransform[ctx_] :=
  push[ctx, {39, 0, 0, 0, 0, 0, 0}]

(* Composite & filter *)
Canvas2D`SetGlobalCompositeOperation[ctx_, op_String] :=
  push[ctx, {40, op, 0, 0, 0, 0, 0}]
Canvas2D`SetFilter[ctx_, f_String] :=
  push[ctx, {41, f, 0, 0, 0, 0, 0}]

(* Image smoothing *)
Canvas2D`SetImageSmoothingEnabled[ctx_, b_?BooleanQ] :=
  push[ctx, {42, If[b, 1, 0], 0, 0, 0, 0, 0}]
Canvas2D`SetImageSmoothingQuality[ctx_, q_String] :=
  push[ctx, {43, q, 0, 0, 0, 0, 0}]

(* Line dash *)
Canvas2D`SetLineDash[ctx_, arr_List] :=
  Module[{n = Length[arr], pad = PadRight[arr, 5, 0]},
    push[ctx, {32, n, Sequence @@ pad}]
  ]
Canvas2D`SetLineDashOffset[ctx_, offset_?NumericQ] :=
  push[ctx, {33, offset, 0, 0, 0, 0, 0}]
Canvas2D`SetLineDashOffset[ctx_, offset_] :=
  push[ctx, {33, N[offset], 0, 0, 0, 0, 0}]

(* Shadows *)
Canvas2D`SetShadowOffsetX[ctx_, x_?NumericQ] :=
  push[ctx, {44, x, 0, 0, 0, 0, 0}]
Canvas2D`SetShadowOffsetX[ctx_, x_] :=
  push[ctx, {44, N[x], 0, 0, 0, 0, 0}]
Canvas2D`SetShadowOffsetY[ctx_, y_?NumericQ] :=
  push[ctx, {45, y, 0, 0, 0, 0, 0}]
Canvas2D`SetShadowOffsetY[ctx_, y_] :=
  push[ctx, {45, N[y], 0, 0, 0, 0, 0}]
Canvas2D`SetShadowBlur[ctx_, b_?NumericQ] :=
  push[ctx, {46, b, 0, 0, 0, 0, 0}]
Canvas2D`SetShadowBlur[ctx_, b_] :=
  push[ctx, {46, N[b], 0, 0, 0, 0, 0}]
Canvas2D`SetShadowColor[ctx_, style_String] :=
  push[ctx, {47, style, 0, 0, 0, 0, 0}]
Canvas2D`SetShadowColor[ctx_, style_] :=
  push[ctx, {47, list2Col[style], 0, 0, 0, 0, 0}]

allocateGradient[ctx[buf1_, buf2_, index_] ] := index;

Canvas2D`CreateLinearGradient[ctx_, {x0_?NumericQ, y0_?NumericQ}, {x1_?NumericQ, y1_?NumericQ}] :=
  Module[{g = allocateGradient[ctx]},
    push[ctx, {48, x0, y0, x1, y1, 0, 0}];
    g
  ]
Canvas2D`CreateLinearGradient[ctx_, {x0_, y0_}, {x1_, y1_}] :=
  Module[{g = allocateGradient[ctx]},
    push[ctx, {48, N[x0], N[y0], N[x1], N[y1], 0, 0}];
    g
  ]

Canvas2D`CreateRadialGradient[ctx_, {x0_?NumericQ, y0_?NumericQ, r0_?NumericQ}, {x1_?NumericQ, y1_?NumericQ, r1_?NumericQ}] :=
  Module[{g = allocateGradient[ctx]},
    push[ctx, {49, x0, y0, r0, x1, y1, r1}];
    g
  ]
Canvas2D`CreateRadialGradient[ctx_, {x0_, y0_, r0_}, {x1_, y1_, r1_}] :=
  Module[{g = allocateGradient[ctx]},
    push[ctx, {49, N[x0], N[y0], N[r0], N[x1], N[y1], N[r1]}];
    g
  ]

Canvas2D`CreateConicGradient[ctx_, angle_?NumericQ, {x_?NumericQ, y_?NumericQ}] :=
  Module[{g = allocateGradient[ctx]},
    push[ctx, {50, angle, x, y, 0, 0, 0}];
    g
  ]
Canvas2D`CreateConicGradient[ctx_, angle_, {x_, y_}] :=
  Module[{g = allocateGradient[ctx]},
    push[ctx, {50, N[angle], N[x], N[y], 0, 0, 0}];
    g
  ]

Canvas2D`AddColorStop[ctx_, grad_, offset_?NumericQ, color_String] :=
  (* grad is the object (returned by CreateLinearGradient etc.) *)
  push[ctx, {51, grad, offset, color, 0, 0, 0}]

Canvas2D`AddColorStop[ctx_, grad_, offset_?NumericQ, color_] :=
  (* accept any ColorQ + Opacity[...] *)
  push[ctx, {51, grad, offset, list2Col[color], 0, 0, 0}]


Canvas2D`SetFillStyle[ctx_, grad_Integer] := (* gradients *)
  push[ctx, {52, grad, 0, 0, 0, 0, 0}]


Canvas2D`SetStrokeStyle[ctx_, grad_Integer] := (* gradients *)
  push[ctx, {53, grad, 0, 0, 0, 0, 0}]  


imageCache[_] := $Failed
imageCache[img_Image] := imageCache[img] = CreateFrontEndObject[Image[img, "Byte", ImageResolution->Automatic, Interleaving->True], ToString[Hash[img] ] ][[1]];

Canvas2D`DrawImage[ctx_, img_Image, {dx_?NumericQ, dy_?NumericQ}] := With[{dims = ImageDimensions[img]},
  push[ctx, {54, imageCache[img], dx, dy, dims[[1]], dims[[2]], 0}]  
]

Canvas2D`DrawImage[ctx_, img_Image, {dx_, dy_}] := With[{dims = ImageDimensions[img]},
  push[ctx, {54, imageCache[img], N[dx], N[dy], dims[[1]], dims[[2]], 0}]  
]

Canvas2D`DrawImage[ctx_, img_Image, {dx_?NumericQ, dy_?NumericQ}, {dw_?NumericQ, dh_?NumericQ}] := With[{},
  push[ctx, {54, imageCache[img], dx, dy, dw, dh, 0}]  
]

Canvas2D`DrawImage[ctx_, img_Image, {dx_, dy_}, {dw_, dh_}] := With[{},
  push[ctx, {54, imageCache[img], N[dx], N[dy], N[dw], N[dh], 0}]  
]


ctx /: AnimationFrameListener[ctx[_, buf2_, _], rest__] := AnimationFrameListener[buf2 // Offload, rest]

icon = Uncompress["1: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"];

ctx /: MakeBoxes[c_ctx, StandardForm] :=    Module[{above},
        above = { 
          {BoxForm`SummaryItem[{"Command buffer: ", Length[c[[1]]]}]}
        };

        BoxForm`ArrangeSummaryBox[
           ctx,
           c,
           icon,
           above,
           Null
        ]
    ];

Unprotect[Image]

Image /: MakeBoxes[i: Image[_ctx, ___], StandardForm] := With[{
  o = CreateFrontEndObject[i]
},{
  box = MakeBoxes[o, StandardForm]
},
  ViewBox[box, o]
]

Image /: MakeBoxes[i: Image[_ctx, ___], WLXForm] := With[{
  o = CreateFrontEndObject[i]
},
  MakeBoxes[o, form]
]

Protect[Image]

End[]
EndPackage[]