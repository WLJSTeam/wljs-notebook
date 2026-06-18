BeginPackage["CoffeeLiqueur`Extensions`Rasterize`", {
  "CoffeeLiqueur`Misc`Events`", 
  "CoffeeLiqueur`Misc`Async`", 
  "CoffeeLiqueur`Misc`Events`Promise`", 
  "CoffeeLiqueur`Extensions`EditorView`",
  "CoffeeLiqueur`Extensions`Communication`",
  "CoffeeLiqueur`Extensions`System`",
  "CoffeeLiqueur`UObjects`"
}]

RasterizeAsync::usage = "Async version of Rasterize that returns Promise";

Begin["`Helpers`"]

UseTemporalWindow;

Begin["`Private`"]

window[_] := Null;
windowObject[_] := Null;
windowReadyQ[_] := False;
windowClosingQ[_] := False;
windowOpts[_] := {};
lastTimeUsed[_] := Now;
intervalTimer[_] := Null;
que[_] := Null;

CreateUType[qItem, {"State"->"Added", "Promise"->Promise[], "Date"->Now}];

CoffeeLiqueur`Extensions`Rasterize`Helpers`UseTemporalWindow[opts___] := With[{hash = Hash[{opts}]}, With[{item = qItem[]}, 
    If[que[hash] === Null, que[hash] = {}];
    createWindow[hash, opts];
    que[hash] = Append[que[hash], item];
    item["Promise"]
] ]

checkQue[hash_] := Module[{q = que[hash]},
    If[Length[q] === 0, Return[Null, Module]];
    lastTimeUsed[hash] = Now;
    Function[item,
        Switch[item["State"],
            "Added",
                If[windowReadyQ[hash] === True,
                    item["State"] = "Pending";
                    item["Date"] = Now;
                    With[{back = Promise[]}, 
                        EventFire[item["Promise"], Resolve, <|"Window"->windowObject[hash], "Promise"->back|>];
                        Then[back, Function[Null, item["State"] = "Finished"]];
                    ];
                ]
            ,

            "Pending",
                If[Now - item["Date"] > Quantity[30, "Minutes"],
                    item["State"] = "Finished";
                ];
            ,

            _,
                que[hash] = que[hash] /. {item -> Nothing};
                DeleteObject[item];
        ]
    ][q[[1]]];
];

destroy[hash_] := Module[{pending},
    windowReadyQ[hash] = False;
    windowClosingQ[hash] = False;
    window[hash] = Null;
    TaskRemove[intervalTimer[hash]];
    intervalTimer[hash] = Null;
    (* Preserve items that arrived during the closing window gap *)
    pending = Select[que[hash], #["State"] === "Added" &];
    que[hash] = {};
    If[Length[pending] > 0,
        que[hash] = pending;
        createWindow[hash, Sequence @@ windowOpts[hash]];
    ];
];

createWindow[hash_, opts___] := With[{}, If[window[hash] === Null,
    windowOpts[hash] = {opts};
    window[hash] = CreateWindow[Cell["<div class=\"px-4 py-2\"><small>Temporal window</small></div>", "Output", "HTML"], WindowSize->{1920, 1280}, "Offscreen"->True, opts ];

    EventHandler[window[hash], {"Ready" -> Function[w,
        windowObject[hash] = w;
        windowReadyQ[hash] = True;
        windowClosingQ[hash] = False;
        lastTimeUsed[hash] = Now;
        checkQue[hash];
        If[intervalTimer[hash] =!= Null, TaskRemove[intervalTimer[hash]]];
        intervalTimer[hash] = SetInterval[
            checkQue[hash];
            If[Now - lastTimeUsed[hash] > Quantity[3, "Seconds"],
                windowClosingQ[hash] = True;
                NotebookClose[window[hash]];
            ];
        , 500];
    ], "Closed" -> Function[Null,
        If[window[hash] =!= Null,
            destroy[hash];
        ];
    ]}];
,
    (* Window is alive but closing: don't reset the idle timer, let it finish closing.
       Items added to the queue now will be picked up by destroy's recreation. *)
    If[!windowClosingQ[hash],
        lastTimeUsed[hash] = Now;
    ];
]];

End[]

End[]

Begin["`Internal`"]

takeScreenshot;
Unprotect[CurrentNotebookImage]
ClearAll[CurrentNotebookImage]

Unprotect[CurrentScreenImage]
ClearAll[CurrentScreenImage]


CurrentNotebookImage::noelectron = "CurrentNotebookImage requires desktop application"

CurrentNotebookImage[] := CurrentNotebookImage[1]
CurrentNotebookImage[_] := With[{res = FrontFetch[ takeScreenshot[], "Window"->OptionValue["Window"] ]},
  If[StringQ[res],
    ImportString[StringDrop[res, StringLength["data:image/png;base64,"] ], "Base64"]
  ,
    Message[CurrentNotebookImage::noelectron];
    $Failed
  ]
]

Options[CurrentNotebookImage] = {"Window":>CurrentWindow[]};

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
Rasterize::nowindow = "No active window found to render an expression. Trying again in 3 seconds"


Rasterize[any_, ___, OptionsPattern[] ] := (
  Message[Rasterize::noelectron];
  $Failed
) /; !TrueQ[Internal`Kernel`ElectronQ]

Rasterize[any_, ___, opts: OptionsPattern[] ] := With[{channel = CreateUUID[], exposure = OptionValue["ExposureTime"], oversampling = OptionValue["ImageUpscaling"]},
  WaitAll[RasterizeAsync[any,  opts], 25 + exposure]
] 


RasterizeAsync[any_, ___, OptionsPattern[] ] := (
  Message[Rasterize::noelectron];
  $Failed
) /; !TrueQ[Internal`Kernel`ElectronQ]

RasterizeAsync[any_, ___, opts: OptionsPattern[] ] := With[{p = Promise[], channel = CreateUUID[], notebook = OptionValue["Notebook"], exposure = OptionValue["ExposureTime"], oversampling = OptionValue["ImageUpscaling"]},
    Then[CoffeeLiqueur`Extensions`Rasterize`Helpers`UseTemporalWindow["Notebook"->notebook], Function[assoc, With[{
        window = assoc["Window"],
        back = assoc["Promise"]
    },
      EventHandler[channel, Function[Null,
        Then[FrontFetchAsync[OverlayView["Capture", 1 ], "Window" -> window], Function[base,
          FrontSubmit[OverlayView["Dispose"], "Window" -> window];
          EventFire[back, Resolve, True];
          EventFire[p, Resolve, ImportString[StringDrop[base, StringLength["data:image/png;base64,"] ], "Base64"] ];
        ] ]
      ] ];

      FrontSubmit[OverlayView["Create", EditorView[ToString[any, StandardForm] ], channel, exposure, If[NumberQ[oversampling], oversampling, 1] ], "Window" -> window];
    ]]];
    p
]

Options[Rasterize] = {"ExposureTime" -> 2.0, "ImageUpscaling"->1, "Notebook" :> EvaluationNotebook[]}

Options[RasterizeAsync] = Options[Rasterize]

Options[producePDF] = {"Crop"->True,   "Notebook" :> EvaluationNotebook[], "ExposureTime" -> 3.0, "ImageUpscaling"->1, "Landscape"->True}
Options[pdfEndpoint] = Options[producePDF];

producePDF[any_, OptionsPattern[] ] := (
  Message[Rasterize::noelectron];
  $Failed
) /; !TrueQ[Internal`Kernel`ElectronQ]

producePDF[any_, opts: OptionsPattern[] ] := With[{ p = Promise[], channel = CreateUUID[], notebook = OptionValue["Notebook"], exposure = OptionValue["ExposureTime"], oversampling = OptionValue["ImageUpscaling"], landscape = OptionValue["Landscape"], crop = OptionValue["Crop"]},
    Then[CoffeeLiqueur`Extensions`Rasterize`Helpers`UseTemporalWindow["Notebook"->notebook], Function[assoc, With[{window = assoc["Window"], promise = assoc["Promise"]},
      EventHandler[channel, Function[Null,
        Then[FrontFetchAsync[GetPDF["crop"->crop, "printBackground"->True, "preferCSSPageSize"->True, "scale"->1, "margins"-><|"right"->0, "left"->0, "top"->0, "bottom"->0|>], "Window" -> window], Function[payload,
          
          FrontSubmit[OverlayView["Dispose"], "Window" -> window];
          EventFire[promise, Resolve, True];
          EventFire[p, Resolve,  ByteArray[payload] ];
        ] ]
      ] ];

      FrontSubmit[OverlayView["Create", EditorView[ToString[any, StandardForm] ], channel, exposure, If[NumberQ[oversampling], oversampling, 1] ], "Window" -> window];
    ]]];

    p
]


ImportExport`RegisterExport["PDF", exportPDF, "Options" -> (Options[producePDF][[All,1]])];

Options[ExportAsync] = Join[Options[ExportAsync], {Options[producePDF]}]//DeleteDuplicates;

(* [TODO] implement better async IO *)

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

] /; (ToLowerCase[ FileExtension[out] ] === "pdf") (* [FIXME] [TODO] *)

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