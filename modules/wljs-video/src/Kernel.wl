BeginPackage["CoffeeLiqueur`Extensions`Video`", {
    "CoffeeLiqueur`Misc`Events`", 
    "CoffeeLiqueur`Extensions`Boxes`",
    "CoffeeLiqueur`Extensions`Communication`", 
    "CoffeeLiqueur`Extensions`InputsOutputs`", 
    "CoffeeLiqueur`Misc`Language`", 
    "CoffeeLiqueur`Misc`Async`", 
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CoffeeLiqueur`CUSockets`EventsExtension`",
    "CoffeeLiqueur`CUSockets`",
    "CoffeeLiqueur`Extensions`EditorView`",
    "CoffeeLiqueur`Extensions`Notifications`",
    "CoffeeLiqueur`Extensions`Sound`",
    "CoffeeLiqueur`Extensions`Graphics`"
}]
Begin["`Internal`"]

System`VideoWrapper;
System`WLXForm;

(* prevent collecting from Garbage. Mathematica's bug*)
If[!ListQ[trash], trash = {}];

Video;
AnimatedImage;

Unprotect[Video]
Unprotect[AnimatedImage]

FormatValues[Video] = {};
FormatValues[AnimatedImage] = {};

Unprotect[TemplateBox]
TemplateBox[Video`VideoGUIDump`assoc_,"VideoBox2", ___] := With[{v = Video[Video`VideoGUIDump`assoc["resourcePath"] ]},
    gui[v, StandardForm]
]


AnimatedImage /: MakeBoxes[a_AnimatedImage, frmt_] := With[{
    rate = If[MatchQ[#, _Quantity], QuantityMagnitude[#, "Frames"/"Seconds"], If[!NumberQ[#], 12, #] ] &@ ({Information[a, "FrameRate"]}//Flatten//First),
    size = If[MatchQ[#, {_?NumberQ, _?NumberQ}], #, Null] &@ Information[a, "RasterSize"]
},

With[
{
    str = ExportString[a["ImageList"], {"Base64", "GIF"}, "DisplayDurations" -> 1.0/rate ]
}, 
    If[StringByteCount[str] > 10.0 1024 1024,
        With[{
            img = HTMLView["<span style=\"color:red\">GIF is too large</span>"]
        },
            If[frmt === WLXForm,
                With[{m = CreateFrontEndObject[img ]},
                    MakeBoxes[m, WLXForm]
                ]
            ,
                Module[{imgSymbol},

                    With[{},
                        BoxForm`ArrangeSummaryBox[
                           AnimatedImage, (* head *)
                           a,      (* interpretation *)
                           None,    (* icon, use None if not needed *)
                           (* above and below must be in a format suitable for Grid or Column *)
                            { 
                                {BoxForm`SummaryItem[{"Compressed size: ",Round @ Quantity[StringByteCount[str]/1024.0/1024.0, "Megabytes"]}]},
                                {BoxForm`SummaryItem[{"Frames: ", a["ImageList"]//Length}]}
                            },    (* always shown content *)
                           Null (* expandable content. Currently not supported!*)
                        ]
                    ] 
                ]           
            ] ]      
    ,
        With[{
            img = HTMLView[StringTemplate["<img width=\"``\" height=\"``\" src=\"data:image/gif;base64,``\"/>"][If[size===Null, "auto", size[[1]] ], If[size===Null, "auto", size[[2]] ], str ] ]
        },
            If[frmt === WLXForm,
                With[{m = CreateFrontEndObject[img ]},
                    MakeBoxes[m, WLXForm]
                ]
            ,
                Module[{imgSymbol},
                    AppendTo[trash, Hold[imgSymbol] ];    
                    ClearAttributes[imgSymbol, Temporary];

                    With[{v = ViewBox[imgSymbol, CreateFrontEndObject[img] ] },
                        imgSymbol = a;

                        v
                    ] 
                ]           
            ] ]     
    ]
] ]

sampleRate[s_Audio] := QuantityMagnitude[ Information[s]["SampleRate"] ]

Video /: MakeBoxes[
        Video`VideoGUIDump`video
        :
        Video[Video`VideoGUIDump`resourcePath_,
             Video`VideoGUIDump`options___]
        ,
        Video`VideoGUIDump`fmt_
    ] /; Video`ValidVideoQHold[Video`VideoGUIDump`video]  :=
    With[{

    },
        gui[Video`VideoGUIDump`video, Video`VideoGUIDump`fmt]
    ]

template = StringTemplate["<video width=\"auto\" height=\"auto\" preload=\"metadata\" controls class=\"rounded\" style=\"vertical-align:middle; max-width:1024px;\"><source src=\"/downloadFile/?path=``\"/></video>"]

gui[Video`VideoGUIDump`video_Video, Video`VideoGUIDump`fmt_] := With[{path = URLEncode[FindFile[Information[Video`VideoGUIDump`video, "ResourcePath"] ] ]}, Module[{videoSymbol},
With[{
    g = HTMLView[template[path] ]
},
    If[Video`VideoGUIDump`fmt === WLXForm,
        With[{m = CreateFrontEndObject[g ]},
            MakeBoxes[m, WLXForm]
        ]
    ,
        AppendTo[trash, Hold[videoSymbol] ];    
        ClearAttributes[videoSymbol, Temporary];

        With[{ibox = ViewBox[videoSymbol, CreateFrontEndObject[g ] ]},
            videoSymbol = Video`VideoGUIDump`video;
            ibox
        ]                
    ]
]
] ]


(*resizeFrame = Function[i, ImageResize[i, w] ]

guiBox;

reduce[n_, k_] := n[[;; ;; k, ;; ;; k]]
reduce[n_, 1] := n 

gui[Video`VideoGUIDump`video_Video, Video`VideoGUIDump`fmt_] := 
With[{
    (* limit the width since JSON packets are slow *)
    width = Min[ImageDimensions[VideoFrameList[Video`VideoGUIDump`video, 1]//First ] // First, 500],
    framerate = QuantityMagnitude[Information[Video`VideoGUIDump`video, "FrameRate"]//First, "Frames"/"Seconds"],
    click = CreateUUID[],
    audioEndBuffer = CreateUUID[],
    audio = Quiet[AudioChannelMix[Flatten[{Cases[VideoExtractTracks[Video`VideoGUIDump`video], _Audio, 2]}] // First, "Mono"] ],
    duration = QuantityMagnitude[Information[Video`VideoGUIDump`video]["Duration"], "Minutes"],
    totalFrames = QuantityMagnitude[Information[Video`VideoGUIDump`video]["Duration"], "Seconds"] QuantityMagnitude[Information[Video`VideoGUIDump`video, "FrameRate"]//First, "Frames"/"Seconds"]
},
    LeakyModule[{
        movie = VideoFrameList[Video`VideoGUIDump`video, {"Random",1}] // First,
        frames,
        index = 1,
        audioData = {},
        playing = False,
        audioBuffer = {},
        initialIndex = 1,
        audioIndex = 1,
        initialTime = AbsoluteTime[],
        frameEvent = CreateUUID[],
        syncTrigger = 1,
        resolution,
        reductionFactor = 1,

        videoSymbol
    },

        resolution = Max[ImageDimensions[movie] ];

        If[resolution > 1024,
            reductionFactor = Round[Ceiling[Log2[resolution] ] - Log2[1024] + 1];
        ];

        (* prevent garbage collecting *)
        AppendTo[trash, Hold[Video`VideoGUIDump`video] ];
        AppendTo[trash, Hold[videoSymbol] ];

        ClearAttributes[videoSymbol, Temporary];

        frames = reduce[NumericArray[ImageData[movie, "Byte"], "UnsignedInteger8"], reductionFactor ];

        With[{
            img = Image[frames // Offload, "Byte", Epilog->{
                AnimationFrameListener[syncTrigger // Offload, "Event"->frameEvent]
            }] // Quiet,
            window = CurrentWindow[],
            ev = CreateUUID[]
        },

            If[MatchQ[audio, _Audio], EventHandler[audioEndBuffer, {"More" -> Function[Null,
                If[playing == False, Return[] ];

                audioBuffer = audioData[[audioIndex ;; Min[audioIndex - 1 + 3 1024, Length[audioData] ] ]];

                audioIndex += 3 1024;
                If[audioIndex > Length[audioData],  audioIndex = Length[audioData] - 1 ];
            ]}] ];

            EventHandler[ev, 
            
            {
                "Pause" -> Function[Null,
                    EventRemove[frameEvent] // Quiet;
                    playing = False;
                ],

                "Set" -> Function[p,
                    index = Max[1, Floor[p * totalFrames ] ];
                    initialTime = AbsoluteTime[];
                    initialIndex = index;

                    If[Length[audioData] == 0, 
                        If[MatchQ[audio, _Audio], audioData = NumericArray[AudioData[audio, "SignedInteger16"] // First, "SignedInteger16"] ];
                        audioIndex = 1;
                    ];

                    audioIndex = Max[Floor[(index/totalFrames) Length[audioData] ], 1];
                    audioBuffer = audioData[[audioIndex ;; Min[audioIndex - 1 + 3 1024, Length[audioData] ] ]];
                    audioIndex += 3 1024;
                ],

                "Resume" -> Function[Null,

                    If[playing,
                        Return[];
                    ];


                    initialTime = AbsoluteTime[];
                    initialIndex = index;

                    playing = True;   

                    With[{socket = EventClone[Global`$Client]},
                        EventHandler[socket, {
                            "Closed" -> Function[Null,
                                EventRemove[socket];
                                EventRemove[frameEvent] // Quiet;
                                playing = False;
                            ]
                        }]
                    ];

                    EventHandler[frameEvent, Function[Null,
                        If[!playing, Return[] ];

                        With[{newIndex = Max[Round[(AbsoluteTime[] - initialTime)/(1.0/framerate)] + initialIndex, 1]},
                            If[newIndex != index,
                                index = newIndex;
                                If[index >= totalFrames, 
                                    index = 1;
                                    playing = False;     
                                ,
                                    frames = reduce[NumericArray[ImageData[VideoExtractFrames[Video`VideoGUIDump`video, Quantity[index, "Frames"] ], "Byte"], "UnsignedInteger8"], reductionFactor ];
                                ];   
                            ];
                        ];

                        syncTrigger = True;
                    ] ];

                    EventFire[frameEvent, True]; 

                    If[MatchQ[audio, _Audio], 
                        audioIndex = Max[Floor[(index/totalFrames) Length[audioData] ], 1];
                        audioBuffer = audioData[[audioIndex ;; Min[audioIndex - 1 + 3 1024, Length[audioData] ] ]];
                        audioIndex += 3 1024;
                    ];

                ]

            } 
            
            ];        

        
          
            With[{g = guiBox[img, If[MatchQ[audio, _Audio], PCMPlayer[audioBuffer // Offload, "SignedInteger16", "NoGUI"->True, "TimeAhead"->400, "Event"->audioEndBuffer, "SampleRate" -> sampleRate[audio] ] ], "FullLength"->duration, "Event"->ev]},

                If[Video`VideoGUIDump`fmt === WLXForm,
                    With[{m = CreateFrontEndObject[g ]},
                        MakeBoxes[m, WLXForm]
                    ]
                ,
                    With[{ibox = ViewBox[videoSymbol, CreateFrontEndObject[g ] ]},
                        videoSymbol = Video`VideoGUIDump`video;
                        ibox
                    ]                
                ]


            
             
            ]
        ]
    ]
]*)




(* WL14 with no reason reloads the definitons of some symbols *)
(* It breaks ANY FormatValues *)
(* In this example to reproduce see issue https://github.com/WLJSTeam/wolfram-js-frontend/issues/396  *)
$rootPackageDirectory = DirectoryName[$InputFileName] // ParentDirectory;

If[Internal`Kernel`Watchdog["Enabled"],
  With[{file = FileNameJoin[{$rootPackageDirectory, "src", "Kernel.wl"}]},
    Internal`Kernel`Watchdog["Assertion", "Video",
      FormatValues[Video]//Hash
    ,
      Get[file]
    ];
  ]
];


End[]
EndPackage[]