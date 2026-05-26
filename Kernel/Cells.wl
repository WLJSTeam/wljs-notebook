BeginPackage["CoffeeLiqueur`Notebook`Cells`", {
    "CoffeeLiqueur`Misc`Events`", 
    "CoffeeLiqueur`UObjects`", 
    "CoffeeLiqueur`Notebook`Transactions`"
}]

Needs["CoffeeLiqueur`Notebook`" -> "notebook`"];

CellObj::usage = "CellObj[opts__] _CellObj creates a new cell"

OutputCellQ::usage = "Apply on a CellObj to determine the type"
InputCellQ::usage = "Apply on a CellObj to determine the type"

HashMap;
FindCell;
Serialize;
Deserialize;
DeserializeLive;

ToTransaction;

SelectCells;

Begin["`Private`"]

NullQ[any_] := any === Null

initCell[o_] := Module[{uid = CreateUUID[]},
    If[o["Hash"] === Null, 
        o["Hash"] = uid;
        HashMap[uid] = o;
    ,
        With[{hash = o["Hash"]},
            HashMap[hash] = o;
        ]
    ];

    

    (* if notebook is specified -> insert it into the cells list and fire event *)

    (* After or Before can be a sequence pattern ! *)

    If[!NullQ[ o["Notebook"] ],
        If[!TrueQ[NullQ[ o["After"]] ],
            With[{position = SequencePosition[o["Notebook", "Cells"], {o["After"]} ] // First // Last},
                o["Notebook", "Cells"] = Insert[o["Notebook", "Cells"],  o, position + 1];
            ];
        ,
            If[!TrueQ[NullQ[ o["Before"] ]],
                With[{position = SequencePosition[o["Notebook", "Cells"], {o["Before"]} ] // First // First},
                    o["Notebook", "Cells"] = Insert[o["Notebook", "Cells"],  o, position];
                ];
            ,
                (* as the last one *)
                o["Notebook", "Cells"] = Append[o["Notebook", "Cells"],  o];
            ];
        ];

        EventFire[o["Notebook"], "New Cell", o]; 
    ];
    o
]

HashMap = <||>;
CreateUType[CellObj, initCell, {"Notebook"->Null, "Hash"->Null, "UID"->Null, "Data"->"", "State"->"Idle", "Props"-><||>, "Display"->"codemirror", "Type"->"Input", "After"->Null, "Before"->Null, "MetaOnly"->False, "Invisible"->False}]

CellObj /: EventHandler[n_CellObj, opts__] := EventHandler[n["Hash"], opts] 
CellObj /: EventFire[n_CellObj, opts__] := EventFire[n["Hash"], opts]
CellObj /: EventClone[n_CellObj] := EventClone[n["Hash"] ]
CellObj /: EventRemove[n_CellObj, opts__] := EventRemove[n["Hash"], opts] 

FindCell[n_notebook`NotebookObj, pattern__] := With[{
    position = SequencePosition[n["Cells"], {pattern} ] // First // First
},
    n["Cells"][[position]]
]

Serialize[n_CellObj, OptionsPattern[] ] := Module[{props},
    props = {# -> n[#]} &/@ 
        If[OptionValue["MetaOnly"], 
            Complement[n["Properties"], {"Properties", "OverflowContent", "Icon", "Format", "Self", "Data", "Notebook", "Init", "After", "Before"}], 
            Complement[n["Properties"], {"Properties", "OverflowContent", "Icon", "Format", "Self", "Notebook", "Init", "After", "Before"}] 
        ];      

    props = Join[props, {"Notebook" -> n["Notebook", "Hash"]}];
    With[{cell = props // Flatten // Association},
        If[n["MetaOnly"] // TrueQ, 
            Join[cell, <|"Data"->""|>]
        ,
            cell
        ]    
    ]
]

Deserialize[assoc_Association, opts___] := With[{cell = CellObj[], list = Association[opts]},
    (cell[#] = assoc[#]) &/@ Complement[Keys[assoc], {"Hash"}];
    (cell[#] = list[#])  &/@ Keys[list];
    cell
]

DeserializeLive[assoc_Association, opts___] := With[{},
    CellObj[opts, "Data"->Lookup[assoc, "Data", "\n"], "Display"->Lookup[assoc, "Display", "codemirror"], "Props"->Lookup[assoc, "Props", <||>], "Type"->Lookup[assoc, "Type", "Input"] ]
]

Options[Serialize] = {"MetaOnly" -> False}

OutputCellQ[o_CellObj] := o["Type"] === "Output"
InputCellQ[o_CellObj] := o["Type"] === "Input"

SelectCells[list_List, pattern__] := With[{seq = SequencePosition[list, List[pattern] ] // Flatten},
    If[Length[seq] =!= 0,
        list[[ seq[[1]]+1 ;; seq[[2]] ]]
    ,
        {}
    ]
];


CellObj /: Delete[o_CellObj] := Module[{},
    Print[">> delete cell"];
    If[!NullQ[ o["Notebook"] ],
        If[o["Type"] === "Output", 
            (* delete just this one *)
            EventFire[o, "Destroy", o];
            EventFire[o["Notebook"], "Remove Cell", o];
            With[{n = o["Notebook"]},
                n["Cells"] = n["Cells"] /. {o -> Nothing};
            ];
            HashMap[o["Hash"] ] = .; 
            EventRemove[o["Hash"] ];
        ,
            (* else if Input -> remove all next output cells *)
            With[{list = SequenceCases[o["Notebook"]["Cells"], {o, ___?OutputCellQ}] // First, n = o["Notebook"]},
                Delete /@ (Drop[list, 1] // Reverse);
                EventFire[o, "Destroy", o];
                EventFire[o["Notebook"], "Remove Cell", o];

                n["Cells"] = n["Cells"] /. {o -> Nothing};
                HashMap[o["Hash"] ] = .; 
                EventRemove[o["Hash"] ];
            ]
        ]
    ,
        HashMap[o["Hash"] ] = .; 
        EventRemove[o["Hash"] ];
    ];
    DeleteObject[o];
]

autoTake[p_, b_] := If[!AssociationQ[p], b, p]

Options[ToTransaction] = {"Notebook" -> Automatic, AutoRemove->False};

ToTransaction[o_, OptionsPattern[] ] := With[{rm = OptionValue[AutoRemove], nb = If[OptionValue["Notebook"]===Automatic, o["Notebook"], OptionValue["Notebook"] ]},
    o["State"] = "Evaluation";
    EventFire[o, "State", "Evaluation"];
    EventFire[o, "Evaluate", True];

    transaction = Transaction[];
    transaction["Data"] = o["Data"];
    (* transaction["EvaluationContext"] = Join[autoTake[o["Notebook", "EvaluationContext"], <||>], <|"Ref" -> o["Hash"], "Notebook" -> o["Notebook"]["Hash"]|> ]; *)

    (* find any output cell after *)
    If[!NullQ[ nb ], 
        With[{seq = SequencePosition[nb["Cells"], {Sequence[o, __?OutputCellQ]}] // Flatten},
            If[Length[seq] =!= 0,
                Delete /@ (nb["Cells"][[ seq[[1]]+1 ;; seq[[2]] ]])
            ];
        ];
    ];

    EventHandler[transaction, {"Result" -> Function[data,
        (* AFTER, BEFORE, TYPE, PROPS can be altered using provided meta-data from the transaction *)

        If[data["Data"] != "Null" && !NullQ[nb],
            If[KeyExistsQ[data, "Meta"],
                CellObj["Data"->data["Data"], "Notebook"->nb, data["Meta"], "After"->Sequence[o, ___?OutputCellQ], "Type"->"Output"]
            ,
                CellObj["Data"->data["Data"], "Notebook"->nb, "After"->Sequence[o, ___?OutputCellQ], "Display"->"codemirror", "Type"->"Output"]
            ]
        ];
    ],
        "Finished" -> Function[Null,
            o["State"] = "Idle";
            Echo["Finished!"];
            EventFire[o, "State", "Idle"];
            If[rm, Delete[transaction] ];
        ],

        "Error" -> Function[error,
            o["State"] = "Idle";
            EventFire[o, "State", "Idle"];
            Echo["Error in evalaution... check syntax"];
            If[!NullQ[ nb ], 
                EventFire[nb, "CellError", {o, error}];
            ];
            EventFire[o, "Error", error];
            EventFire[transaction, "EndOfEvaluation", True];
        ]
    }];

    transaction
]

End[]
EndPackage[]
