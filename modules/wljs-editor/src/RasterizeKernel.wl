BeginPackage["CoffeeLiqueur`Extensions`Rasterize`", {
  "CoffeeLiqueur`Misc`Events`", 
  "CoffeeLiqueur`Misc`Events`Promise`", 
  "CoffeeLiqueur`Extensions`EditorView`",
  "CoffeeLiqueur`Extensions`Communication`",
  "CoffeeLiqueur`Extensions`System`"
}]

RasterizeAsync::usage = "Async version of Rasterize that returns Promise";


Begin["`Internal`"]

takeScreenshot;
Unprotect[CurrentNotebookImage]
ClearAll[CurrentNotebookImage]

Unprotect[CurrentScreenImage]
ClearAll[CurrentScreenImage]


CurrentNotebookImage::noelectron = "CurrentNotebookImage requires desktop application"

CurrentNotebookImage[] := CurrentNotebookImage[1]
CurrentNotebookImage[_] := With[{res = FrontFetch[ takeScreenshot[] ]},
  If[StringQ[res],
    ImportString[StringDrop[res, StringLength["data:image/png;base64,"] ], "Base64"]
  ,
    Message[CurrentNotebookImage::noelectron];
    $Failed
  ]
]

Unprotect[Rasterize]
ClearAll[Rasterize]

Rasterize::noelectron = "Rasterization requires WLJS Notebook desktop app"

RasterizeAsync[n_Notebook, opts___] := (
  Message[Rasterize::noelectron];
  $Failed
) /; !TrueQ[Internal`Kernel`ElectronQ]

RasterizeAsync[n_Notebook, opts___] := Block[{Internal`RasterizeOptionsProvided = opts},
  Switch[n // First // First//First//First//Head,
    GraphicsBox,
      ToExpression[n // First // First // First, StandardForm],

    ImageBox,
      ToExpression[n // First // First // First, StandardForm],      

    GraphicsBox3D,
      ToExpression[n // First // First // First, StandardForm],
    _,

    Message[Rasterize::needraster];
    Abort[]
    
  ]
]

RasterizeAsync[n_Notebook, opts___] := Block[{Internal`RasterizeOptionsProvided = opts},
  Switch[n // First // First//First//First//Head,
    GraphicsBox,
      ToExpression[n // First // First // First, StandardForm],

    ImageBox,
      ToExpression[n // First // First // First, StandardForm],      

    GraphicsBox3D,
      ToExpression[n // First // First // First, StandardForm],
    _,

    Message[Rasterize::needraster];
    Abort[]
    
  ]
]

Rasterize[n_Notebook, opts___] := Block[{Internal`RasterizeOptionsProvided = opts},
  Switch[n // First // First//First//First//Head,
    GraphicsBox,
      ToExpression[n // First // First // First, StandardForm],

    ImageBox,
      ToExpression[n // First // First // First, StandardForm],      

    GraphicsBox3D,
      ToExpression[n // First // First // First, StandardForm],
    _,

    Message[Rasterize::needraster];
    Abort[]
    
  ]
]

Rasterize[n_Notebook, opts___] := (
  Message[Rasterize::noelectron];
  $Failed
) /; !TrueQ[Internal`Kernel`ElectronQ]

CoffeeLiqueur`Extensions`Rasterize`Internal`OverlayView;
CoffeeLiqueur`Extensions`Rasterize`Internal`GetPDF;

Rasterize::frontget = "Could not get the rasterized data from the frontend";
Rasterize::needraster = "Not supported directly. Please, apply Rasterize before exporting as an image"

Rasterize[any_, ___, OptionsPattern[] ] := (
  Message[Rasterize::noelectron];
  $Failed
) /; !TrueQ[Internal`Kernel`ElectronQ]

Rasterize[any_, ___, OptionsPattern[] ] := With[{p = Promise[], channel = CreateUUID[], window = OptionValue["Window"], exposure = OptionValue["ExposureTime"], oversampling = OptionValue["ImageUpscaling"]},
  EventHandler[channel, Function[Null,
    Then[FrontFetchAsync[OverlayView["Capture", 1 ], "Window" -> window], Function[base,
      EventFire[p, Resolve, ImportString[StringDrop[base, StringLength["data:image/png;base64,"] ], "Base64"] ];
      FrontSubmit[OverlayView["Dispose"], "Window" -> window];
    ] ]
  ] ];

  FrontSubmit[OverlayView["Create", EditorView[ToString[any, StandardForm] ], channel, exposure, If[NumberQ[oversampling], oversampling, 1] ], "Window" -> window];

  With[{r = WaitAll[p, 45 + exposure]},
    If[FailureQ[r],
      Message[Rasterize::frontget];
    ];

    r
  ]
]


RasterizeAsync[any_, ___, OptionsPattern[] ] := (
  Message[Rasterize::noelectron];
  $Failed
) /; !TrueQ[Internal`Kernel`ElectronQ]

RasterizeAsync[any_, ___, OptionsPattern[] ] := With[{p = Promise[], channel = CreateUUID[], window = OptionValue["Window"], exposure = OptionValue["ExposureTime"], oversampling = OptionValue["ImageUpscaling"]},
  EventHandler[channel, Function[Null,
    Then[FrontFetchAsync[OverlayView["Capture", 1 ], "Window" -> window], Function[base,
      EventFire[p, Resolve, ImportString[StringDrop[base, StringLength["data:image/png;base64,"] ], "Base64"] ];
      FrontSubmit[OverlayView["Dispose"], "Window" -> window];
    ] ]
  ] ];

  FrontSubmit[OverlayView["Create", EditorView[ToString[any, StandardForm] ], channel, exposure, If[NumberQ[oversampling], oversampling, 1] ], "Window" -> window];

  p
]

Options[Rasterize] = {"Window" :> CurrentWindow[], "ExposureTime" -> 1.75, "ImageUpscaling"->1}

Options[RasterizeAsync] = Options[Rasterize]

Options[producePDF] = {"Crop"->True, "Window" :> CurrentWindow[], "ExposureTime" -> 2.5, "ImageUpscaling"->1, "Landscape"->True}
Options[pdfEndpoint] = Options[producePDF];

producePDF[any_, OptionsPattern[] ] := (
  Message[Rasterize::noelectron];
  $Failed
) /; !TrueQ[Internal`Kernel`ElectronQ]

producePDF[any_, OptionsPattern[] ] := With[{p = Promise[], channel = CreateUUID[], window = OptionValue["Window"], exposure = OptionValue["ExposureTime"], oversampling = OptionValue["ImageUpscaling"], landscape = OptionValue["Landscape"], crop = OptionValue["Crop"]},
  EventHandler[channel, Function[Null,
    Then[FrontFetchAsync[GetPDF["crop"->crop, "printBackground"->True, "preferCSSPageSize"->True, "scale"->1, "margins"-><|"right"->0, "left"->0, "top"->0, "bottom"->0|>], "Window" -> window], Function[payload,
      EventFire[p, Resolve,  ByteArray[payload] ];
      FrontSubmit[OverlayView["Dispose"], "Window" -> window];
    ] ]
  ] ];

  FrontSubmit[OverlayView["Create", EditorView[ToString[any, StandardForm] ], channel, exposure, If[NumberQ[oversampling], oversampling, 1] ], "Window" -> window];

  p
]


ImportExport`RegisterExport["PDF", exportPDF, "Options" -> (Options[producePDF][[All,1]])];

Options[ExportAsync] = Join[Options[ExportAsync], {Options[producePDF]}]//DeleteDuplicates;


ExportAsync[out_String | File[out_String], content_, maybe___, opts: OptionsPattern[producePDF] ] := Module[{p = Promise[], char, strm},
  Then[producePDF[content, Sequence @@ Flatten[{opts}] ], Function[char,
    strm = OpenWrite[out, BinaryFormat->True];
    If[FailureQ[BinaryWrite[strm, char] ],
      EventFire[p, Resolve,  $Failed];
    ,
      EventFire[p, Resolve,  out];
    ];
    Close[strm];

  ] ]; 

  p

] /; (ToLowerCase[ FileExtension[out] ] === "pdf") (* FIXIT FIXIT FIXIT FIXIT *)

exportPDF[filename_, data_, opts___] :=
 Module[{char, strm},
  (* TODO: check for valid data here *)
  char = WaitAll[producePDF[data, Sequence @@ Flatten[{opts}] ], 99999 ];
  strm = OpenWrite[filename, BinaryFormat->True];
  BinaryWrite[strm, char];
  Close[strm]
]


End[]
EndPackage[]