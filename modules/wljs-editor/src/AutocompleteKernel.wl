BeginPackage["CoffeeLiqueur`Extensions`Autocomplete`", {
    "CoffeeLiqueur`WebUSocketHandler`",
    "CoffeeLiqueur`Misc`WLJS`Transport`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`Extensions`Notifications`"
}];

UIAutocompleteExtend;

Begin["`Private`"]

definitions = {};
clients = {};

shareDefinitions[cli_, set_List] := With[{
    data = set
},
    If[FailureQ @ WebSocketUSend[cli, ExportByteArray[UIAutocompleteExtend[data], "ExpressionJSON"] ], clients = clients /. {cli -> Nothing}];
]

EventHandler["autocomplete", {
    "Connect" -> Function[Null,
        With[{client = Global`$Client},
  

            clients = Append[clients, client];
            
            (* just to populate *)
            CoffeeLiqueur`Extensions`Communication`Internal`$lastClient = client;
            
            If[Internal`Kernel`Type =!= "LocalKernel", Echo["Error. Autocomplete package can only for on LocalKernel. MasterKernel is not allowed!"]; EventRemove["autocomplete"]; Return[$Failed]; ];

            With[{s = EchoLabel["Spinner"]["Reindexing symbols"]},
                BuildVocabular;
                Delete[s];
            ];
 
            If[Length[definitions] != 0,
                
                shareDefinitions[client, definitions];
            ];
        ]     
    ]
}];

extend[set_] := shareDefinitions[#, set] &/@ clients;

(* a bug with a first defined symbol $InterfaceEnvironment that causes shutdown (BUT THIS IS A STRING!!!). No idea why *)
skip = -1;

blacklist = {"CodeParser`", "CoffeeLiqueur`Extensions`Autocomplete`","CoffeeLiqueur`CUSockets`EventsExtension`","CoffeeLiqueur`Misc`WLJS`Transport`","CoffeeLiqueur`WebUSocketHandler`","CoffeeLiqueur`TCPUServer`","CoffeeLiqueur`UInternal`","CoffeeLiqueur`CUSockets`","HighlightingCompatibility`","System`","Global`", "Parallel`Developer`", "CUDACompileTools`", "Wolfram`Chatbook`"};

BuildVocabularAsync := With[{},
    BuildVocabularAsync = Null;
    SessionSubmit[BuildVocabular];
]

currentContextPath = $ContextPath;

BuildVocabular := With[{},
    BuildVocabular = Null;
 
    If[Internal`Kernel`Type =!= "LocalKernel", Echo["Error. Autocomplete package can only for on LocalKernel. MasterKernel is not allowed!"]; Return[$Failed]; ];
    
    (* Echo["Buildind vocabular for autocomplete..."]; *)
    With[{r = Flatten[( ((*Echo[#]; *){#, Information[#, "Usage"]}) &/@ Names[#<>"*"] ) &/@ Complement[$ContextPath, blacklist], 1]},
        definitions = Join[definitions, r] // DeleteDuplicates;
    ];

    currentContextPath = $ContextPath;

    Internal`AddHandler["GetFileEvent",
        If[checkContext[#], 
            If[TrueQ[Internal`Kernel`AutocompleteRescan], reBuildVocabulary];
        ]&
    ];
]

checkContext[HoldComplete[s_String, Identity, Last]] := checkContext[s]
checkContext[s_String] := StringTake[s, -1] == "`"
checkContext[_] := False

timer = Null;
lastTime = AbsoluteTime[];



reBuildVocabulary := With[{},
    lastTime = AbsoluteTime[];

    If[timer === Null,
        timer = SetInterval[With[{now = AbsoluteTime[]},
            If[now - lastTime > 4,
                TaskRemove[timer];

                With[{contexts = Complement[$ContextPath, currentContextPath]}, 
                    currentContextPath = $ContextPath;
                    
                    If[Length[contexts] > 0, 
                        Module[{old = definitions, spinner = EchoLabel["Spinner"]["Rebuilding vocabulary"]},

                            With[{r = Flatten[( ((*Echo[#]; *){#, Information[#, "Usage"]}) &/@ Names[#<>"*"] ) &/@ Complement[contexts, blacklist], 1]},
                                definitions = Join[definitions, r] // DeleteDuplicates;
                            ];



                            extend[Complement[definitions, old] ];
                            spinner["Cancel"];
                            timer = Null;
                        ];
                    ,
                        timer = Null;
                    ];

                ];


            ]
        ], 1000];
    ]
]

StartTracking := (
    StartTracking = Null;
    If[Internal`Kernel`Type =!= "LocalKernel",
        Echo["Error. Autocomplete package can only for on LocalKernel. MasterKernel is not allowed!"];
    ,
        If[$VersionNumber >= 14.3,
            $NewSymbol = If[#2 === "Global`", (
                If[skip > 0,
                    skip--;
                ,
                    definitions = Append[definitions, {#1, "User's defined symbol"} ]; 
                    extend[{{#1, "User's defined symbol"}}];
                ];
            )]&;        
        ,
            SetTimeout[
                $NewSymbol = If[#2 === "Global`", (
                    If[skip > 0,
                        skip--;
                    ,
                        definitions = Append[definitions, {#1, "User's defined symbol"} ]; 
                        extend[{{#1, "User's defined symbol"}}];
                    ];
                )]&;
            , 3000];
        ];
    ];
)

End[]

EndPackage[]



