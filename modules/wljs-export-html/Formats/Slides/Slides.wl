BeginPackage["CoffeeLiqueur`Extensions`ExportImport`Slides`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`", 
    "CoffeeLiqueur`Misc`WLJS`Transport`"
}];

Needs["CoffeeLiqueur`ExtensionManager`" -> "WLJSPackages`"];
Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];


export;

Begin["`Private`"]



pdfEndpoint["Create", feobject_, OptionsPattern[] ] := With[{p = Promise[], channel = CreateUUID[], window = OptionValue["Window"], exposure = OptionValue["ExposureTime"], oversampling = OptionValue["ImageUpscaling"], landscape = OptionValue["Landscape"], crop = OptionValue["Crop"]},
  EventHandler[channel, Function[Null,
    EventFire[p, Resolve, <|"Window"->window, "crop"->crop|>];
  ] ];

  WebUISubmit[OverlayView["Create", feobject, channel, exposure, If[NumberQ[oversampling], oversampling, 1] ], window];

  p
]

pdfEndpoint["Capture", OptionsPattern[] ] := With[{p = Promise[], channel = CreateUUID[], window = OptionValue["Window"], exposure = OptionValue["ExposureTime"], oversampling = OptionValue["ImageUpscaling"], landscape = OptionValue["Landscape"], crop = OptionValue["Crop"]},
  Then[WebUIFetch[GetPDF["crop"->crop, "printBackground"->True, "preferCSSPageSize"->True, "scale"->1, "margins"-><|"right"->0, "left"->0, "top"->0, "bottom"->0|>], window, "Format"->"JSON"], Function[payload,
      EventFire[p, Resolve,  ByteArray[payload] ];
  ] ];
  p
]

pdfEndpoint["CaptureToMerger", OptionsPattern[] ] := With[{p = Promise[], channel = CreateUUID[], window = OptionValue["Window"], exposure = OptionValue["ExposureTime"], oversampling = OptionValue["ImageUpscaling"], landscape = OptionValue["Landscape"], crop = OptionValue["Crop"]},
  Then[WebUIFetch[AccumulatePDF @ GetPDF["crop"->crop, "printBackground"->True, "preferCSSPageSize"->True, "scale"->1, "margins"-><|"right"->0, "left"->0, "top"->0, "bottom"->0|>], window, "Format"->"JSON"], Function[payload,
      EventFire[p, Resolve,  True ];
  ] ];
  p
]

pdfEndpoint["FlushAndMerge", OptionsPattern[] ] := With[{p = Promise[], channel = CreateUUID[], window = OptionValue["Window"], exposure = OptionValue["ExposureTime"], oversampling = OptionValue["ImageUpscaling"], landscape = OptionValue["Landscape"], crop = OptionValue["Crop"]},
  Then[WebUIFetch[FlushPDF[], window, "Format"->"JSON"], Function[payload,
      EventFire[p, Resolve,  ByteArray[payload] ];
  ] ];
  p
]

pdfEndpoint["Destroy", OptionsPattern[] ] := With[{p = Promise[], channel = CreateUUID[], window = OptionValue["Window"], exposure = OptionValue["ExposureTime"], oversampling = OptionValue["ImageUpscaling"], landscape = OptionValue["Landscape"], crop = OptionValue["Crop"]},
  WebUISubmit[OverlayView["Dispose"], window];
]


Options[pdfEndpoint] = {"Crop"->True, "Window" :> Global`$Client, "ExposureTime" -> 2.0, "ImageUpscaling"->1, "Landscape"->True}



folder = $InputFileName // DirectoryName;
rootFolder = folder // ParentDirectory // ParentDirectory;

captureSlide[count_, log_, win_, delay_] := captureSlide[count, log, win, delay, Promise[] ]

captureSlide[count_, log_, win_, delay_, p_] := With[{},
    Then[pdfEndpoint["CaptureToMerger", "Window"->win ], Function[Null,
        EventFire[log, Notifications`NotificationMessage["Renderer"], StringTemplate["Captured slide ``"][count]];
        count++;
        Then[WebUIFetch[GetNextSlide[delay], win, "Format"->"JSON"], Function[result, 
            Echo["Result:"]; Echo[result];
            If[!TrueQ[result], 
                EventFire[p, Resolve, True];
            ,
                captureSlide[count, log, win, delay, p];
            ]
        ] ];
    ] ];
    p
] 

SetAttributes[captureSlide, HoldFirst];

slideCellQ[cell_] := If[cell["Type"] === "Input",
    StringMatchQ[cell["Data"], ".slides\n"~~___]
,
    False
]

export[controls_, modals_, messager_, client_, notebookOnLine_nb`NotebookObj, path_, name_, ext_, settings_, _] := With[{
    win = Unique["winObSlides"],
    winObject = Unique["winObSlidesObject"]
},
    With[{
        electronQ = WebUIFetch[CheckElectron[], client]
    },
      Then[electronQ, Function[isElectron,

        If[isElectron,
With[{
            p = Promise[],
            delay = Round[Lookup[settings, "ExportSlideExposureTime", 1.5] 1000]
        },
          
       EventFire[modals, "SaveDialog", <|
           "Promise"->p,
           "title"->"Export as PDF slides",
           "properties"->{"createDirectory", "dontAddToRecent"},
           "filters"->{<|"extensions"->"pdf", "name"->"PDF Document"|>}
       |>];


            AsyncFunction[Null, With[{
                filename = Unique["htmlSlidesExporter"], payload = Unique["htmlSlidesExporter"],
                spinner = Unique["htmlSlidesExporter"], filenameRaw = Unique["htmlSlidesExporter"],
                count = Unique["htmlSlidesCounter"]
            }, 
                filenameRaw = p // Await;
                filename = If[StringQ[filenameRaw], URLDecode @ filenameRaw, URLDecode @ filenameRaw["filePath"] ];
                count = 1;

                If[!StringQ[filename] || TrueQ[filenameRaw["canceled"] ] || StringLength[filename] === 0, 
                    Echo["Cancelled saving"]; Echo[filenameRaw];
                    ClearAll[payload, filename, spinner, win, winObject, count]; 
                ,

                    Echo[filename];
                    spinner = Notifications`Spinner["Topic"->"Exporting", "Body"->"Please, wait"];

                    If[!StringMatchQ[filename, __~~".pdf"],  filename = filename <> ".pdf"];
                    If[filename === ".pdf", filename = name<>filename];
                    If[DirectoryName[filename] === "", filename = FileNameJoin[{path, filename}] ];

                    With[{slides = SelectFirst[notebookOnLine["Cells"], Function[cell, slideCellQ[cell] ] ]},
                        If[MissingQ[slides],
                            EventFire[messager, "Warning", "Notebook does not contain any .slides cells"];    
                            Delete[spinner];     
                            ClearAll[payload, filename, spinner, win, winObject, count];               
                        ,
                            Delete /@ Select[notebookOnLine["Cells"], Function[cell, cell["Display"]==="slide" ] ];
                            EventFire[messager, spinner, True];

                            Echo["Projecting cell to the outer window"];
                            EventFire[messager, "Info", "Setting up the projector"];       
                            winObject = SelectFirst[EventFire[controls, "NotebookCellProjectTemporalOpts", <|"Cell"->slides, "Offscreen"->True|>] // Flatten, PromiseQ];
                            Echo[winObject];
                            winObject = winObject // Await;
                            Echo[winObject];
                            PauseAsync[2] // Await;
                            Echo["Window  is ready"];
                            win = winObject["Socket"];
                            Echo[win];
                            
                            
                            EventFire[messager, "Message", "Going though slides"];  
                            WebUIFetch[LoadPDFLibrary[], win] // Await;
                            pdfEndpoint["Create", HijackCellToContainer[winObject["Hash"], "border:1px solid #8585851a"], "Window"->win] // Await; 
                            PauseAsync[0.4] // Await;
                            WebUIFetch[ShakeSlide[], win] // Await;
                            PauseAsync[0.2] // Await;
                            EventFire[messager, "Info", "Almost there"];  
                            captureSlide[count, messager, win, delay] // Await;

                            slides[[1]] // Delete;
                            pdfEndpoint["Destroy", "Window"->win] // Await; 
                            EventFire[messager, "Info", "Done"];  

                            payload = pdfEndpoint["FlushAndMerge", "Window"->win] // Await;   
                            Echo[payload // Head];
                            Echo[payload // Length];

                            WebUIClose[win];
                            


                            With[{file = OpenWrite[filename, BinaryFormat->True]},
                                BinaryWrite[file, payload];
                                Close[file];
                                EventFire[messager, "Saved", "Exported to "<>filename];
                                Delete[spinner];     
                                ClearAll[payload, filename, spinner, win, winObject, count];
                            ];



                        ];

                    ];
                
                ];

            ] ][];


                    

            
        ]        
        ,
            EventFire[messager, "Warning", "This feature requires WLJS Desktop App"];    
        ];

      ] ];    
        
    ]
]


End[]

EndPackage[]