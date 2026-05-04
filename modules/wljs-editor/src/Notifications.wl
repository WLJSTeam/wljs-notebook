BeginPackage["CoffeeLiqueur`Extensions`Notifications`", {
    "CoffeeLiqueur`Extensions`Editor`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`WLX`WebUI`"
}]


Begin["`Private`"]

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`Evaluator`" -> "StandardEvaluator`"];
Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

(*truncatedTemplate = ImportComponent[ FileNameJoin[{$InputFileName // DirectoryName // ParentDirectory, "templates", "truncated.wlx"}] ];
truncatedTemplate = truncatedTemplate["Data"->"``", "Size"->"``"];*)

infoWindow = ImportComponent[FileNameJoin[{$InputFileName // DirectoryName // ParentDirectory, "templates", "Progress.wlx"}] ];

spinners = <||>;

EventHandler[NotebookEditorChannel // EventClone,
    {
        "CreateSpinner" -> Function[assoc,
            With[{kernel = assoc["Kernel"], data= assoc["Data"], topic = assoc["Topic"], UId = assoc["UId"]},
                With[{spinner = Notifications`Spinner["Topic"->topic, "Body"->data]},
                    spinners[UId] = spinner;
                    EventFire[kernel, spinner, True];
                ]
            ]
        ],

        "RemoveSpinner" -> Function[UId,
            With[{s = spinners[UId]},
                Delete[s];
                spinners[UId] = .;
            ]
        ],

        "CreateProgressBar" -> Function[assoc,
            With[{kernel = assoc["Kernel"], data= assoc["Data"], topic = assoc["Topic"], UId = assoc["UId"]},
                With[{notification = Notifications`Custom["Topic"->topic, "Body"->infoWindow["Channel"->UId, "Message"->data], "Controls"->False]},
                    spinners[UId] = notification;
                    EventFire[kernel, notification, True];
                    EventFire[UId, "Progress", <|"Bar"->0, "Max"->1.0, "Info"->""|>];
                ]
            ]
        ],

        "SetProgressBar" -> Function[assoc,
            With[{kernel = assoc["Kernel"], data= assoc["Bar"],  UId = assoc["UId"]},
                EventFire[UId, "Progress", <|"Bar"->data, "Max"->1.0|>];
            ]
        ], 

        "RemoveProgressBar" -> Function[UId,
            With[{s = spinners[UId]},
                Delete[s];
                spinners[UId] = .;
            ]
        ],          

        "SetProgressBarMessage" -> Function[assoc,
            With[{kernel = assoc["Kernel"], data= assoc["Message"], UId = assoc["UId"]},
                EventFire[UId, "Message", data];
            ]
        ],     

        "CreateModal" -> Function[data,
            With[{promise = Promise[], backpromise = data["Promise"], modal = data["Modal"], kernel = GenericKernel`HashMap[ data["Kernel"] ], notebook = nb`HashMap[ data["Notebook"] ]},
                With[{

                },
                    

                    Module[{
                        
                    },

                        Echo["Creating modal: "<>modal<>" for channel "<>notebook["ModalsChannel"] ];
                        Echo["Socket: "<>ToString[notebook["Socket"] ] ];

                        EventFire[notebook["ModalsChannel"], modal, Join[data["Data"], <|
                            "Promise"->promise,
                            "Client" -> notebook["Socket"]
                        |>] ];


                        Then[promise, Function[resolve, 
                            ClearAll[proxy];
                            GenericKernel`Async[kernel, EventFire[backpromise, Resolve, resolve] ];
                        ], Function[reject, 
                            ClearAll[proxy];
                            GenericKernel`Async[kernel, EventFire[backpromise, Reject, reject] ];
                        ] ];

                    ]
                ]

            
            ]
        ]
    }
]



End[]
EndPackage[]
