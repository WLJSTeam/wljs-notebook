BeginPackage["CoffeeLiqueur`Notebook`", {
    "CoffeeLiqueur`Notebook`FileFormat`",
    "CoffeeLiqueur`Misc`Events`", 
    "CoffeeLiqueur`Objects`"
}]

NotebookObj;

HashMap;
Serialize;
Deserialize;

SerializeToStream;
DeserializeFromStream;

LoadFromFile;
LoadFromString;

LoadCellFromFile;

Begin["`Private`"]

HashMap = <||>;

NullQ[any_] := any === Null

initNotebook[o_] := With[{uid = If[StringQ[o["Hash"] ] && o["Hash"] =!= Null, o["Hash"], CreateUUID[] ]},
    o["PublicFields"] = Join[o["PublicFields"], {"HaveToSaveAs", "WorkingDirectory", "Quick", "AutoconnectKernel", "ObjectFields"}] // DeleteDuplicates;
    o["Hash"] = uid;
    HashMap[uid] = o;
    o
]


CreateType[NotebookObj, initNotebook, {"EvaluationContext"-><||>, "Cells"->{}, "ObjectFields"->{} }]

NotebookObj /: EventHandler[n_NotebookObj, opts__] := EventHandler[n["Hash"], opts] 
NotebookObj /: EventFire[n_NotebookObj, opts__] := EventFire[n["Hash"], opts]
NotebookObj /: EventClone[n_NotebookObj] := EventClone[n["Hash"]]
NotebookObj /: EventRemove[n_NotebookObj, opts__] := EventRemove[n["Hash"], opts] 


SerializeToStream[stream_OutputStream, n_NotebookObj] := writeNotebook[stream, n]
DeserializeFromStream[stream_InputStream, opts: OptionsPattern[] ] := With[{a = readNotebook[stream, 10]},
    If[FailureQ[a], a,
        With[{n = NotebookObj[opts]},
            n[#] = a[#]; &/@ Complement[Keys[a], {"PublicFields", "Cells"}];
            n["PublicFields"] = Join[n["PublicFields"], a["PublicFields"] ] // DeleteDuplicates;
                          (* [FIXME] cyclic contexts dependencies ! *)
            n["Cells"] = CoffeeLiqueur`Notebook`Cells`Deserialize[#, "Notebook"->n] &/@ a["Cells"];
            n
        ]
    ]
]

Options[DeserializeFromStream] = {"Hash" :> CreateUUID[]}

LoadCellFromFile[path_, notebook_] := Module[{stream, result, legacyQ},
    If[!FileExistsQ[path],
        Return[$Failed];
    ];

    Echo["Loading cells from file"];

    stream = OpenRead[path, DOSTextFormat->False];
    result = readNotebook[stream, 10];
    Close[stream];

    If[!FailureQ[result],
        Echo["Succesfully parsed."];
        notebook["Cells"] = CoffeeLiqueur`Notebook`Cells`DeserializeLive[#, "Notebook"->notebook] &/@ result["Cells"];
        Echo["Cells were replaced"];
    ,
        Echo["Loading failed. Retrying with a legacy .wln parser..."];
        
        stream = OpenRead[path, DOSTextFormat->False];
        legacyQ = StringMatchQ[ReadLine[stream, TimeConstraint->10], ___~~"<|"~~__];
        Close[stream];


        If[legacyQ,
            Echo["Legacy format did work. Importing..."];
            With[{a = Get[path]},
                Deserialize[a["serializer"], "cells", a, notebook]
            ];
            Echo["Cells were replaced"];
        ,
            Return[$Failed];
        ];
    ];
    notebook  
]

LoadFromFile[path_String | File[path_], opts: OptionsPattern[] ] := Module[{stream, notebook, legacyQ},
    If[!FileExistsQ[path],
        Return[$Failed];
    ];

    Echo["Loading from file"];

    stream = OpenRead[path, DOSTextFormat->False];
    notebook = DeserializeFromStream[stream, opts];
    Close[stream];

    If[!FailureQ[notebook],
        Echo["Succesfully parsed."];
        With[{n = notebook}, n["Path"] = path];
    ,
        Echo["Loading failed. Retrying with a legacy .wln parser..."];
        
        stream = OpenRead[path, DOSTextFormat->False];
        legacyQ = StringMatchQ[ReadLine[stream, TimeConstraint->10], ___~~"<|"~~__];
        Close[stream];


        If[legacyQ,
            Echo["Legacy format did work. Importing..."];

            (* legacy format. Keep it for backward compatibillity! *)
            (* it does not take that much space! *)
            With[{n = Deserialize[ Get[path] , NotebookObj[opts] ]},
                If[!MatchQ[n, _NotebookObj], Return[$Failed]; ];
                notebook = n;
                n["Path"] = path;
            ];
        ,
            Return[notebook];
        ];
    ];
    notebook  
]

Options[LoadFromFile] = {"Hash" :> CreateUUID[]}

LoadFromString[string_String, opts: OptionsPattern[] ] := Module[{stream, notebook, legacyQ},
    Echo["Loading from string"];
    stream = StringToStream[string];
    notebook = DeserializeFromStream[stream, opts];
    Close[stream];

    If[!FailureQ[notebook],
        Echo["Succesfully parsed."];
    ,
        Echo["Loading failed. Retrying with a legacy .wln parser..."];
        
        stream = StringToStream[string];
        legacyQ = StringMatchQ[ReadLine[stream, TimeConstraint->10], ___~~"<|"~~__];
        Close[stream];


        If[legacyQ,
            Echo["Legacy format did work. Importing..."];

            (* legacy format. Keep it for backward compatibillity! *)
            (* it does not take that much space! *)
            With[{n = Deserialize[ ImportString[string, "WL", DOSTextFormat->False], NotebookObj[opts] ]},
                If[!MatchQ[n, _NotebookObj], Return[$Failed]; ];
                notebook = n;
            ];
        ,
            Return[$Failed];
        ];
    ];
    notebook  
]

Options[LoadFromString] = {"Hash" :> CreateUUID[]}

(* depricated! *)
Serialize[n_NotebookObj] := Module[{props},
    props = {# -> n[#]} &/@ Complement[n["Properties"], {"Hash", "Format", "ChatBook", "CellsInitialized", "Socket", "EvaluationContext", "Opened","WebSocketQ", "Evaluator", "Cells", "Properties","Icon","Self", "Init", "Kernel"}];
    props // Flatten // Association
]

(* depricated! *)
Deserialize[n_Association] := With[{notebook = NotebookObj[]},
    Deserialize[n["serializer"], n, notebook]
]

(* depricated! *)
Deserialize[n_Association, notebook_NotebookObj] := With[{},
    Deserialize[n["serializer"], n, notebook]
]

(* depricated! *)
Deserialize[any_, n_Association, notebook_NotebookObj] := With[{},
    Echo["Notebook.wl >> Unknown Serializer: "];
    Echo[any];
    $Failed["Unknown Serializer: "<>ToString[any] ]
]

(* depricated WLN format. Keep it for backward compatibillity! *)
Deserialize["jsfn4", n_Association, notebook_NotebookObj] := With[{pf = notebook["PublicFields"]},
    (notebook[#] = n["Notebook", #]) &/@ Complement[Keys[n["Notebook"] ], {"Hash"}]; 
                        (* cyclic contexts dependencies ! *)
    notebook["Cells"] = CoffeeLiqueur`Notebook`Cells`Deserialize[#, "Notebook"->notebook] &/@ n["Cells"];
    
    (* it should not be here. violation of SOLID. Keep it for backward compatibillity! *)
    notebook["PublicFields"] = Join[notebook["PublicFields"], pf];
    notebook["ObjectFields"] = {"Objects", "Symbols", "Storage", "ExcalidrawImages", "RuntimeCache", "ZIPArchive"};

    notebook
]

Deserialize["jsfn4", "cells", n_Association, notebook_NotebookObj] := With[{},
    notebook["Cells"] = CoffeeLiqueur`Notebook`Cells`DeserializeLive[#, "Notebook"->notebook] &/@ n["Cells"];
]



End[]
EndPackage[]