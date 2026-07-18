BeginPackage["CoffeeLiqueur`Extensions`Sound`", {
    "CoffeeLiqueur`Misc`Language`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`Misc`WLJS`Transport`",
	"CoffeeLiqueur`Extensions`Communication`",
    "CoffeeLiqueur`Extensions`FrontendObject`"
}]

PCMPlayer::usage = "PCMPlayer[data_Offload, type_String, opts___] creates a streaming PCM player"

System`AudioWrapperBox;
System`AudioWrapper;

Unprotect[EmitSound]
ClearAll[EmitSound]

Unprotect[Audio`AudioGUIDump`audioBoxes]
Unprotect[Audio]
ClearAll[Audio`AudioGUIDump`audioBoxes]


Begin["`Internal`"]


EmitSound[s_Sound, opts: OptionsPattern[] ] := With[{},
    FrontSubmit[s, opts]
]

EmitSound[s_Audio, opts: OptionsPattern[] ] := With[{},
    FrontSubmit[PCMPlayer[s, "AutoRemove"->True, "GUI"->False], opts]
]

Options[EmitSound] = {"Window" :> CurrentWindow[]}

Unprotect[SoundNote]
SoundNote[] := SoundNote[12];
Protect[SoundNote]

Unprotect[Speak]
ClearAll[Speak]

Speak[expr_, opts:OptionsPattern[] ] := EmitSound[SpeechSynthesize[SpokenString[expr], GeneratedAssetLocation -> None], opts]
Speak[expr_String, opts:OptionsPattern[] ] := EmitSound[SpeechSynthesize[expr, GeneratedAssetLocation -> None], opts]


Options[Speak] = Options[EmitSound]

FormatValues[Audio] = {};

Unprotect[Audio]

Audio /: Audio`AudioGUIDump`audioBoxes[a_Audio, audioID_ , appearance_, form_] := AudioWrapperBox[a, form]


Unprotect[Sound`soundDisplay]
ClearAll[Sound`soundDisplay]
Unprotect[System`Dump`soundDisplay]
ClearAll[System`Dump`soundDisplay]
System`Dump`soundDisplay[s_]:=$Failed 
Sound`soundDisplay[s_] := $Failed 

Unprotect[Sound]

Sound /: MakeBoxes[s_Sound, form: StandardForm] := With[{

},
  If[ByteCount[s] < 3 1024,
    ViewBox[s, s]
  ,
    With[{
        o = CreateFrontEndObject[s]
    },{
        out = MakeBoxes[o, StandardForm]
    },
        ViewBox[out,o]
    ]
  ]
  
]

System`WLXForm;

ClearAll[musicInputBoxes]
musicInputBoxes[expr_] := ToString[expr, InputForm]

Scan[
  Function[s,
    Unprotect[s];
    FormatValues[s] = {};
    s /: MakeBoxes[expr_s, form : (StandardForm | WLXForm)] := musicInputBoxes[expr]
  ],
  {MusicNote, MusicRest, MusicChord, MusicMeasure, MusicVoice, MusicScore,
   MusicPitch, MusicDuration, MusicInterval, MusicKeySignature,
   MusicTimeSignature, MusicScale}
]


PianoViewBox;

MusicScore /: MakeBoxes[m_MusicScore, StandardForm] := With[{},
If[ByteCount[m] < 3 1024,
  ViewBox[m, Sound[m]]
,
  With[{
      o = CreateFrontEndObject[m]
  },{
      out = MakeBoxes[o, StandardForm]
  },
      ViewBox[out,Sound[o]]
  ]
]
]

MusicRest /: MakeBoxes[m_MusicRest, StandardForm] := With[{above = { 
          {BoxForm`SummaryItem[{"Duration: ", m["Duration"]["Duration"]}]}
        }},
      BoxForm`ArrangeSummaryBox[
           MusicRest, (* head *)
           m,      (* interpretation *)
           None,    (* icon, use None if not needed *)
           (* above and below must be in a format suitable for Grid or Column *)
           above,    (* always shown content *)
           Null (* expandable content. Currently not supported!*)
        ]
]
MusicPitch /: MakeBoxes[m_MusicPitch, StandardForm] := With[{},
      BoxForm`ArrangeSummaryBox[
           MusicPitch, (* head *)
           m,      (* interpretation *)
           ViewDecorator["RawText", m["Key"]<>m["Octave"]],    (* icon, use None if not needed *)
           (* above and below must be in a format suitable for Grid or Column *)
           {},    (* always shown content *)
           Null (* expandable content. Currently not supported!*)
        ]
]
MusicDuration /: MakeBoxes[m_MusicDuration, StandardForm] := With[{},
      BoxForm`ArrangeSummaryBox[
           MusicDuration, (* head *)
           m,      (* interpretation *)
           ViewDecorator["RawText", ToString@ToString[m["Duration"], InputForm]],    (* icon, use None if not needed *)
           (* above and below must be in a format suitable for Grid or Column *)
           {},    (* always shown content *)
           Null (* expandable content. Currently not supported!*)
        ]
]
MusicNote /: MakeBoxes[m_MusicNote, StandardForm] := With[{above={
{BoxForm`SummaryItem[{"Note: ", Style[StringTemplate["````"][m["Pitch"]["Key"],m["Pitch"]["Octave"]], 9]}]},
{BoxForm`SummaryItem[{"Duration: ", Style[ToString@ToString[m["Duration"]["Duration"], InputForm], 9]}]}
}},
      BoxForm`ArrangeSummaryBox[
           MusicNote, (* head *)
           m,      (* interpretation *)
           PianoViewBox[{m["Pitch"]}],    (* icon, use None if not needed *)
           (* above and below must be in a format suitable for Grid or Column *)
           above,    (* always shown content *)
           Null (* expandable content. Currently not supported!*)
        ]
]
MusicChord /: MakeBoxes[m_MusicChord, StandardForm] := With[{above={
{BoxForm`SummaryItem[{"Name: ", Style[StringTemplate["``"][m["Name"]], 9]}]},
{BoxForm`SummaryItem[{"Root: ", Style[StringTemplate["``"][m["Root"]["Key"]], 9]}]},
{BoxForm`SummaryItem[{"Notes: ", Style[StringRiffle[Map[Function[p, p["Key"]<>ToString[p["Octave"]]], m["PitchList"]], " "], 9]}]}
}},
      BoxForm`ArrangeSummaryBox[
           MusicChord, (* head *)
           m,      (* interpretation *)
           PianoViewBox[m["PitchList"]],    (* icon, use None if not needed *)
           (* above and below must be in a format suitable for Grid or Column *)
           above,    (* always shown content *)
           Null (* expandable content. Currently not supported!*)
        ]
]

MusicScale /: MakeBoxes[m_MusicScale, StandardForm] := With[{above={
{BoxForm`SummaryItem[{"Name: ", Style[StringTemplate["``"][m["Name"]], 9]}]},
{BoxForm`SummaryItem[{"Notes: ", Style[StringRiffle[Map[Function[p, p["Key"]<>ToString[p["Octave"]]], m["PitchList"]], " "], 9]}]}
}},
      BoxForm`ArrangeSummaryBox[
           MusicScale, (* head *)
           m,      (* interpretation *)
           PianoViewBox[m["PitchList"]],    (* icon, use None if not needed *)
           (* above and below must be in a format suitable for Grid or Column *)
           above,    (* always shown content *)
           Null (* expandable content. Currently not supported!*)
        ]
]

Unprotect[Sound]
Sound /: MakeBoxes[s_Sound, WLXForm] := With[{o = CreateFrontEndObject[s]},
  MakeBoxes[o, WLXForm]
]

(* force sampling *)
Unprotect[Sound]
Sound[SampledSoundFunction[CompiledFunction[__, f_Function, _], time_, rate_] ] := Sound[SampledSoundList[Table[f[i], {i, time}], rate] ]

Unprotect[Audio]
FormatValues[Audio] = {};
Audio /: MakeBoxes[s_Audio, form : WLXForm | StandardForm] := With[{},
  AudioWrapperBox[s, form]
]

Audio[buffer_Offload, format_:"Real32", opts:OptionsPattern[] ] := PCMPlayer[buffer, format, opts]


PCMPlayer /: EventHandler[PCMPlayer[args__], handler_] := With[{uid = CreateUUID[]}, 
    EventHandler[uid, handler];
    PCMPlayer[args, "Event"->uid] 
]

extractChannelTyped[a_Audio, type_] := If[AudioChannels[a] > 1,
    AudioData[AudioChannelMix[a, "Mono"], type] // First
,
    AudioData[a, type] // First
]

PCMPlayer[a_Audio, opts:OptionsPattern[] ] := With[{info = Information[a]},
    If[MemberQ[{"Real32", "Real64"}, info["DataType"] ],
        PCMPlayer[extractChannelTyped[a, "SignedInteger16"], "SignedInteger16", SampleRate -> QuantityMagnitude[ info["SampleRate"] ], opts ]
    ,
        PCMPlayer[extractChannelTyped[a, info["DataType"] ], info["DataType"], SampleRate -> QuantityMagnitude[ info["SampleRate"] ], opts ]
    ]
]

PCMPlayer /: MakeBoxes[p_PCMPlayer, StandardForm] := With[{o = CreateFrontEndObject[p]}, {out = MakeBoxes[o, StandardForm]},
    ViewBox[out, o]
]

PCMPlayer /: MakeBoxes[p_PCMPlayer, WLXForm] := With[{o = CreateFrontEndObject[p]},
    MakeBoxes[o, WLXForm]
]

Options[PCMPlayer] = {
    "AutoPlay" -> True,
    "Event" -> Null,
    SampleRate -> 44100,
    "GUI" -> True,
    "TimeAhead" -> 200,
    "AutoRemove" -> False,
    "FullLength" -> False
}

If[!ListQ[garbage], garbage = {}];


If[!ListQ[audioDumpTemporal], audioDumpTemporal = {}];

AudioWrapperBox[a_Audio, StandardForm] := With[{
    options = <|SampleRate -> QuantityMagnitude[ Information[a]["SampleRate"] ] |>,
    data = extractChannelTyped[a, "SignedInteger16"],
    uid = CreateUUID[]
},

    If[ByteCount[data] > Internal`Kernel`$FrontEndObjectSizeLimit 1024 1024 / 8.0,
        LeakyModule[{
            bigBuffer, index = 1, buffer, paused = False
        },
            AppendTo[garbage, Hold[buffer] ];
            AppendTo[garbage, Hold[bigBuffer] ];

            bigBuffer = NumericArray[data, "SignedInteger16"];

            ClearAttributes[bigBuffer, Temporary];
            ClearAttributes[buffer, Temporary];
            
            buffer = {};

            EventHandler[uid, {
                
                "More" -> Function[Null, 
                    If[paused, Return[] ];
                
                    With[{
                        newIndex = Min[index + 3 1024, Length[bigBuffer] ],
                        from = index,
                        to = Min[Length[bigBuffer], index + 3 1024 - 1]
                    },
                        buffer = bigBuffer[[from ;; to]];
                        If[index == newIndex, 
                            paused = True;
                            index = 1;
                            Return[];
                        ];
                        index = newIndex;
                    ]
                ],
            
                "Stop" -> Function[Null,
                    index = 1;
                    paused = True;
                ],

                "Pause" -> Function[Null,
                    paused = True;
                ],

                "Resume" -> Function[Null,
                    paused = False;
                    EventFire[uid, "More", True];
                ],                

                "Set" -> Function[position,
                    index = Max[1, Floor[Length[bigBuffer] position ] ];
                ]
            }];


            With[{o = PCMPlayer[buffer // Offload, {}, "SignedInteger16", "AutoPlay"->False, "DataOnKernel"->True, "Event"->uid, "FullLength"->Length[bigBuffer], SampleRate -> options[SampleRate] ]},
                RowBox[{"(*VB[*)(Audio[", ToString[bigBuffer//Unevaluated, InputForm], ", \"SignedInteger16\", SampleRate->", ToString[options[SampleRate], InputForm],"])(*,*)(*", ToString[Compress[o], InputForm], "*)(*]VB*)"}]
            ]
        ]
    ,

        With[{},
            Module[{},

                        With[{virtualBuffer = CreateFrontEndObject[data] },
                            With[{result = With[{o = CreateFrontEndObject[PCMPlayer[virtualBuffer, "SignedInteger16", "AutoPlay"->False, SampleRate -> options[SampleRate] ] ]},
                                RowBox[{"(*VB[*)(Audio[FrontEndRef[", ToString[virtualBuffer//First, InputForm], "], \"SignedInteger16\", SampleRate->",ToString[options[SampleRate], InputForm ],"])(*,*)(*", ToString[Compress[Hold[o] ], InputForm], "*)(*]VB*)"}]
                            ] },

                                
                                result
                            ]    
                        ]                
                ]
        
        ]


    ]
]

AudioWrapperBox[a_Audio, WLXForm] := With[{
    options = <|SampleRate -> QuantityMagnitude[ Information[a]["SampleRate"] ] |>,
    data = extractChannelTyped[a, "SignedInteger16"],
    uid = CreateUUID[]
},

    If[ByteCount[data] > Internal`Kernel`$FrontEndObjectSizeLimit 1024 1024 / 8.0,
        LeakyModule[{
            bigBuffer, index = 1, buffer, paused = False
        },
            AppendTo[garbage, Hold[buffer] ];
            AppendTo[garbage, Hold[bigBuffer] ];

            bigBuffer = NumericArray[data, "SignedInteger16"];

            ClearAttributes[bigBuffer, Temporary];
            ClearAttributes[buffer, Temporary];
            
            buffer = {};

            EventHandler[uid, {
                
                "More" -> Function[Null, 
                    If[paused, Return[] ];
                
                    With[{
                        newIndex = Min[index + 3 1024, Length[bigBuffer] ],
                        from = index,
                        to = Min[Length[bigBuffer], index + 3 1024 - 1]
                    },
                        buffer = bigBuffer[[from ;; to]];
                        If[index == newIndex, 
                            paused = True;
                            index = 1;
                            Return[];
                        ];
                        index = newIndex;
                    ]
                ],
            
                "Stop" -> Function[Null,
                    index = 1;
                    paused = True;
                ],

                "Pause" -> Function[Null,
                    paused = True;
                ],

                "Resume" -> Function[Null,
                    paused = False;
                    EventFire[uid, "More", True];
                ],                

                "Set" -> Function[position,
                    index = Max[1, Floor[Length[bigBuffer] position ] ];
                ]
            }];


            With[{o = PCMPlayer[buffer // Offload, {}, "SignedInteger16", "AutoPlay"->False, "DataOnKernel"->True, "Event"->uid, "FullLength"->Length[bigBuffer], SampleRate -> options[SampleRate] ]},
                MakeBoxes[o, WLXForm]
            ]
        ]
    ,

        With[{},
            Module[{},

                        With[{virtualBuffer = CreateFrontEndObject[data] },
                            With[{result = With[{o = CreateFrontEndObject[PCMPlayer[virtualBuffer, "SignedInteger16", "AutoPlay"->False, SampleRate -> options[SampleRate] ] ]},
                                o
                            ] },

                                
                                MakeBoxes[result, WLXForm]
                            ]    
                        ]                
                ]
        
        ]


    ]
]

(* WL14 with no reason reloads the definitons of some symbols *)
(* It breaks ANY FormatValues *)
(* In this example to reproduce see issue https://github.com/WLJSTeam/wolfram-js-frontend/issues/396  *)
$rootPackageDirectory = DirectoryName[$InputFileName] // ParentDirectory;

If[Internal`Kernel`Watchdog["Enabled"],
  With[{file = FileNameJoin[{$rootPackageDirectory, "src", "Kernel.wl"}]},
    Internal`Kernel`Watchdog["Assertion", "EmitSound",
      DownValues[EmitSound]//Hash
    ,
      Get[file]
    ];
    Internal`Kernel`Watchdog["Assertion", "Audio",
      FormatValues[Audio]//Hash
    ,
      Get[file]
    ];
    Internal`Kernel`Watchdog["Assertion", "MusicChord",
      FormatValues[MusicChord]//Hash
    ,
      Get[file]
    ];  
  ]
];


End[]
EndPackage[]
