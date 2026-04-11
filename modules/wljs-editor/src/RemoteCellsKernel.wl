BeginPackage["CoffeeLiqueur`Extensions`RemoteCells`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`Extensions`Communication`",
    "CoffeeLiqueur`Extensions`EditorView`"
}]

RemoteCellObj::usage = "Internal representation of cell object in the notebook"
RemoteNotebook::usage = "Internal representation of notebook object on Kernel"

ResultCell::usage = "ResultCell[] a future output cell generated during the evaluation"

EvaluateCell::usage = "EvaluateCell[cellObject] programmatically evaluates a cell object in the interactive session."
NotebookEvaluateAsync::usage = "async version of NotebookEvaluate, which returns Promise.";
NotebookEvaluateAsModuleAsync::usage = "async version of NotebookEvaluateAsModule";
NotebookEvaluateAsModule::usage = "NotebookEvaluateAsModule[notebook] evaluates a notebook as a module in the isolated context and returns the last output expression.\nNotebookEvaluateAsModule[path_String] imports and evaluates the notebook given by path";
NotebookFocusedCell::usage = "NotebookFocusedCell[] returns currently focused cell."

NotebookReadAsync::usage = "NotebookReadAsync[] async version of NotebookRead, which returns Promise"

Begin["`Private`"]

Unprotect[Cells]
ClearAll[Cells]

Unprotect[CreateNotebook];
Unprotect[NotebookPut];
Unprotect[NotebookImport];
Unprotect[NotebookGet];
Unprotect[EvaluationCell];
Unprotect[EvaluationNotebook];
Unprotect[NotebookDirectory];
Unprotect[CellPrint];
Unprotect[ParentCell];

Unprotect[CreateWindow];
ClearAll[CreateWindow];

Unprotect[NotebookDelete];
ClearAll[NotebookDelete];

Unprotect[NotebookSelection];
Unprotect[SelectionMove];

ClearAll[NotebookSelection];
ClearAll[SelectionMove];

ClearAll[CreateNotebook]
ClearAll[CellPrint]
ClearAll[EvaluationNotebook]
ClearAll[EvaluationCell]
ClearAll[ParentCell]
ClearAll[NotebookDirectory]
ClearAll[NotebookPut]
ClearAll[NotebookImport]
ClearAll[NotebookGet]

Unprotect[NotebookClose]
ClearAll[NotebookClose]


Unprotect[NotebookPrint];
ClearAll[NotebookPrint];

Unprotect[NotebookWrite];
ClearAll[NotebookWrite];

System`EvaluationCell;
System`EvaluationNotebook;
System`NotebookDirectory;
System`ParentCell;
System`CellPrint;

NotebookPrint[___] := (Message["Not implemented"]; $Failed); 

(*  *)

cache = <||>;

(* the converter function takes file name and options as arguments *)
WLN`WLNImport[filename_String, options___] :=
 Module[{assoc, opts = Association[List[options] ], hash = CreateUUID[], fileHash = FileHash[filename]},
    If[KeyExistsQ[cache, fileHash], Return[cache[fileHash] ] ];

    assoc = Import[filename, "Text"];
    If[FailureQ[assoc], Return[$Failed] ];

    EventFire[Internal`Kernel`CommunicationChannel, "ImportNotebook", <|"Data"->assoc, "Hash"->hash, "FullPath"->FileNameJoin[{DirectoryName[filename], FileNameTake[filename]}], "Path"->DirectoryName[filename],  "Kernel"->Internal`Kernel`Hash|>];
    cache[fileHash] = hash // RemoteNotebook;
    hash // RemoteNotebook
]

ImportExport`RegisterImport[
 "WLN",
 WLN`WLNImport
]

Unprotect[NotebookSave]
ClearAll[NotebookSave]

Unprotect[NotebookEvaluate]
ClearAll[NotebookEvaluate]

Unprotect[NotebookOpen]
ClearAll[NotebookOpen]

Unprotect[CreateDocument]
ClearAll[CreateDocument]

Unprotect[NotebookRead]
ClearAll[NotebookRead]

CreateDocument[expr_, opts: OptionsPattern[] ] := CreateDocument[{expr}, opts]
CreateDocument[list_List, OptionsPattern[] ] := With[{uid = CreateUUID[], t = Flatten[transformCellExpr /@ list]},
    EventFire[Internal`Kernel`CommunicationChannel, "CreateDocument", <|"Hash"->uid, "List"->t, "Kernel"->Internal`Kernel`Hash|>];
    If[OptionValue[Visible] === True,
        NotebookOpen[RemoteNotebook[uid], "Window" -> OptionValue["Window"] ]
    ];
    RemoteNotebook[uid]
]

Options[CreateDocument] = {Visible->True, "Window" :> CurrentWindow[]}

NotebookPut[Notebook[args__], ___] := CreateDocument[{args}]
NotebookPut[Notebook[args_], ___] := CreateDocument[args]

Unprotect[NotebookLocationSpecifier];
ClearAll[NotebookLocationSpecifier];



NotebookWrite[RemoteNotebook[uid_], expr_] := With[{t = {transformCellExpr[expr]}},
  {uids = {CreateUUID[]}},
    EventFire[Internal`Kernel`CommunicationChannel, "WriteNotebook", <|"Hash"->uid, "UIds"->uids, "List"->t, "Kernel"->Internal`Kernel`Hash|>];
    
    First[RemoteCellObj[#]& /@ uids]
]

NotebookWrite[RemoteNotebook[uid_], expr_List] := With[{t = Flatten[transformCellExpr /@ expr]},
  {uids = Table[CreateUUID[], {Length[t]}]},
    EventFire[Internal`Kernel`CommunicationChannel, "WriteNotebook", <|"Hash"->uid, "UIds"->uids, "List"->t, "Kernel"->Internal`Kernel`Hash|>];
    
    RemoteCellObj[#]& /@ uids
]

transformCellExpr[ExpressionCell[expr_, "Input", CellOpen->True] ] := <|"Display"->"codemirror", "Type"->"Input", "Data"->ToString[expr, StandardForm]|>;
transformCellExpr[ExpressionCell[expr_, "Input", CellOpen->False] ] := <|"Display"->"codemirror", "Type"->"Input", "Props"-><|"Hidden"->True|>, "Data"->ToString[expr, StandardForm]|>;

transformCellExpr[ExpressionCell[expr_, _] ] := <|"Display"->"codemirror", "Type"->"Input", "Data"->ToString[expr, StandardForm]|>;
transformCellExpr[ExpressionCell[expr_] ] := <|"Display"->"codemirror", "Type"->"Input", "Data"->ToString[expr, StandardForm]|>;

transformCellExpr[ExpressionCell[expr_, "Output"] ] := <|"Display"->"codemirror", "Type"->"Output", "Data"->ToString[expr, StandardForm]|>;

transformCellExpr[CellGroup[expr_List] ] := transformCellExpr /@ expr

transformCellExpr[expr_] := <|"Display"->"codemirror", "Type"->"Input", "Data"->ToString[expr, StandardForm]|>;
transformCellExpr[expr_String] := {
    <|"Display"->"codemirror", "Type"->"Input", "Data"->(".md\n"<>expr), "Props"-><|"Hidden"->True|>|>,
    <|"Display"->"markdown", "Type"->"Output", "Data"->expr|>
};

addDisplay[d_, str_] := If[Length[StringCases[d, "."] ] > 0, 
    d<>"\n"<>str
, "."<>StringReplace[ToLowerCase[d], {
    "katex" -> "latex",
    "tex" -> "latex",
    "markdown" -> "md",
    "javascript" -> "js",
    "html" -> "html"
}]<>"\n"<>str]

fixDisplays[d_] := StringReplace[ToLowerCase[d], {
    "katex" -> "latex",
    "tex" -> "latex",
    "markdown" -> "markdown",
    "javascript" -> "js",
    "html" -> "html"
}]

transformCellExpr[Cell[expr_String, _] ] :=  transformCellExpr[expr];
transformCellExpr[Cell[expr_String, "Output"] ] :=  <|"Display"->"codemirror", "Type"->"Output", "Data"->expr|>;
transformCellExpr[Cell[expr_String, "Input", CellOpen->False] ] :=  <|"Display"->"codemirror", "Type"->"Input", "Data"->expr, "Props"-><|"Hidden"->True|>|>;
transformCellExpr[Cell[expr_String, "Input", CellOpen->True] ] :=  <|"Display"->"codemirror", "Type"->"Input", "Data"->expr|>;
transformCellExpr[Cell[expr_String, "Input"] ] :=  <|"Display"->"codemirror", "Type"->"Input", "Data"->expr|>;
transformCellExpr[Cell[expr_String, "Output", display_String] ] :=  <|"Display"->fixDisplays[display], "Type"->"Output", "Data"->expr|>;
transformCellExpr[Cell[expr_String, "Input", display_String] ] :=  <|"Display"->"codemirror", "Type"->"Input", "Data"->addDisplay[display, expr]|>;
transformCellExpr[TextCell[expr_String] ] :=  transformCellExpr[expr]
transformCellExpr[TextCell[expr_String, _] ] :=  transformCellExpr[expr]
transformCellExpr[TextCell[expr_String, "Title"] ] :=  transformCellExpr["# "<>expr]
transformCellExpr[TextCell[expr_String, "Section"] ] :=  transformCellExpr["## "<>expr]
transformCellExpr[TextCell[expr_String, "Subsection"] ] :=  transformCellExpr["### "<>expr]
transformCellExpr[TextCell[expr_String, "Subsubsection"] ] :=  transformCellExpr["### "<>expr]


EditorView[ExpressionCell[expr_, ___], opts___] := EditorView[ToString[expr, StandardForm], opts];
EditorView[Cell[expr_String, ___], opts___] := EditorView[expr, opts];


CellView[ExpressionCell[expr_, ___], opts___ ] :=  CellView[ToString[expr, StandardForm], opts];
CellView[Cell[expr_String, _], opts___ ] :=  CellView[expr, opts];
CellView[Cell[expr_String, "Output"], opts___ ] :=  CellView[expr, opts];
CellView[Cell[expr_String, "Input", CellOpen->False], opts___ ] :=  CellView[expr, opts]; 
CellView[Cell[expr_String, "Input", CellOpen->True], opts___ ] := CellView[expr, opts]; 
CellView[Cell[expr_String, "Input"], opts___ ] := CellView[expr, opts]; 
CellView[Cell[expr_String, "Output", display_String], opts___ ] := CellView[expr, "Display"->fixDisplays[display], opts]; 
CellView[Cell[expr_String, "Input", display_String], opts___ ] := CellView[addDisplay[display, expr], "Display"->fixDisplays[display], opts];  
CellView[TextCell[expr_String], opts___ ] :=  CellView[expr, "Display"->"markdown", opts]
CellView[TextCell[expr_String, _], opts___ ] :=  CellView[expr, "Display"->"markdown", opts]
CellView[TextCell[expr_String, "Title"], opts___ ] :=  CellView["# "<>expr, "Display"->"markdown", opts]
CellView[TextCell[expr_String, "Section"], opts___] :=  CellView["## "<>expr, "Display"->"markdown", opts]
CellView[TextCell[expr_String, "Subsection"], opts___ ] :=  CellView["### "<>expr, "Display"->"markdown", opts]
CellView[TextCell[expr_String, "Subsubsection"], opts___ ] :=  CellView["### "<>expr, "Display"->"markdown", opts]

CreateWindow[r_RemoteNotebook, opts: OptionsPattern[] ] := NotebookOpen[r, opts]
CreateWindow[r_RemoteNotebook, opts: OptionsPattern[] ] := NotebookOpen[r, opts]

NotebookOpen[RemoteNotebook[uid_], OptionsPattern[] ] := With[{visible = OptionValue[Visible], win = OptionValue["Window"], promise = Promise[]},
    EventFire[Internal`Kernel`CommunicationChannel, "GetNotebookProperty", <|"NotebookHash"->uid, "Function"->Function[x,x], "Tag"->"Path", "Promise" -> (promise), "Kernel"->Internal`Kernel`Hash|>];
    Then[promise, Function[path, 
        If[!FailureQ[path] && visible, 
            FrontSubmit[openNotebook[URLEncode[path] ], "Window" -> win];
        ]
    ] ];
    
    RemoteNotebook[uid]
]

NotebookOpen[path_ | File[path_], opts: OptionsPattern[] ] := With[{notebook = WLN`WLNImport[path], visible = OptionValue[Visible]},
    If[visible, NotebookOpen[notebook, opts], notebook]
]

Options[NotebookOpen] = {"Window" :> CurrentWindow[], Visible->True}

NotebookSave[RemoteNotebook[uid_] ] := (
    EventFire[Internal`Kernel`CommunicationChannel, "SaveNotebook", <|"Hash"->uid, "Path"->Null|>];
    RemoteNotebook[uid]
)

CreateNotebook[_] := CreateNotebook[]

CreateNotebook[] := With[{uid = CreateUUID[]},
    EventFire[Internal`Kernel`CommunicationChannel, "CreateNotebook", <|"Hash"->uid, "Path"->Null|>];
    RemoteNotebook[uid]
]

NotebookSave[RemoteNotebook[uid_], path_String | File[path_String] ] := (
    EventFire[Internal`Kernel`CommunicationChannel, "SaveNotebook", <|"Hash"->uid, "Path"->path|>];
    RemoteNotebook[uid]
)

NotebookClose[RemoteNotebook[uid_] ] := (
    EventFire[Internal`Kernel`CommunicationChannel, "CloseNotebook", <|"Hash"->uid|>];
    RemoteNotebook[uid_]
)

NotebookClose[r_RemoteCellObj ] := NotebookDelete[r]

NotebookEvaluateAsModule::noninteractive = "Can't use NotebookEvaluateAsModule outside the interactive session. Please use NotebookEvaluateAsModuleAsync"

NotebookEvaluateAsModuleAsync[path_String | File[path_] ] := NotebookEvaluateAsModuleAsync[NotebookOpen[path, Visible->False] ]
NotebookEvaluateAsModule[path_String | File[path_] ] := NotebookEvaluateAsModule[NotebookOpen[path, Visible->False] ]

NotebookEvaluateAsModuleAsync[RemoteNotebook[uid_] ] := Module[{}, With[{
    promise = Promise[],
    backPromise = Promise[]
},
    EventFire[Internal`Kernel`CommunicationChannel, "EvaluateNotebook", <|"ContextIsolation"->True, "EvaluationContext"-><||>, "Session"->$SessionID, "Elements"->"Module", "Hash"->uid, "Ref"->Null,  "Promise" -> (promise), "Kernel"->Internal`Kernel`Hash|>];
    
    Then[promise, Function[data,
        If[FailureQ[data],
            EventFire[backPromise, Resolve, $Failed];
        ,
            If[data === Null,
                EventFire[backPromise, Resolve, Null];
            ,
                EventFire[backPromise, Resolve, ImportByteArray[BaseDecode[ToExpression[data, InputForm] ], "WXF"] ];
            ];
        ]
    ] ];

    backPromise
] ]

NotebookEvaluateAsModule[RemoteNotebook[uid_] ] := Module[{}, With[{
    promise = Promise[], caller = System`$EvaluationContext["Ref"]
},
{
    fullHash = Hash[{caller, uid}]
},
    If[!StringQ[System`$EvaluationContext["Notebook"] ],
        Message[NotebookEvaluateAsModule::noninteractive];
        Return[$Failed];
    ];
        If[KeyExistsQ[pending, fullHash],
            With[{res = pending[fullHash]},
                pending[fullHash] = .;
                Return[res];
            ];
        ];


        EventFire[Internal`Kernel`CommunicationChannel, "EvaluateNotebook", <|"ContextIsolation"->True, "EvaluationContext"-><||>, "Session"->$SessionID, "Hash"->uid, "Elements"->"Module", "Ref"->System`$EvaluationContext["Notebook"],  "Promise" -> (promise), "Kernel"->Internal`Kernel`Hash|>];
        
        Then[promise, Function[data,
            If[FailureQ[data],
                pending[fullHash] = $Failed;
                EvaluateCell[caller // RemoteCellObj];
            ,
                If[data === Null,
                    pending[fullHash] = Null;
                ,
                    pending[fullHash] = ImportByteArray[BaseDecode[ToExpression[data, InputForm] ], "WXF"];
                ];
                
                EvaluateCell[caller // RemoteCellObj];
            ]
        ] ];

        Abort[];
] ]

pending = <||>;



NotebookEvaluateAsync[RemoteNotebook[uid_], OptionsPattern[] ] := Module[{}, With[{
    promise = Promise[],
    backPromise = Promise[],
    contextNotebook = OptionValue["ContextNotebook"][[1]],
    context = OptionValue["EvaluationContext"],
    elements = OptionValue[EvaluationElements],
    isolation = OptionValue["ContextIsolation"]
},
    EventFire[Internal`Kernel`CommunicationChannel, "EvaluateNotebook", <|"ContextIsolation"->isolation, "EvaluationContext"->context, "Session"->$SessionID, "Elements"->elements, "Hash"->uid, "Ref"->contextNotebook,  "Promise" -> (promise), "Kernel"->Internal`Kernel`Hash|>];
    
    Then[promise, Function[data,
        If[FailureQ[data],
            EventFire[backPromise, Resolve, $Failed];
        ,
            If[data === Null,
                EventFire[backPromise, Resolve, Null];
            ,
                EventFire[backPromise, Resolve, ImportByteArray[BaseDecode[ToExpression[data, InputForm] ], "WXF"] ];
            ];
        ]
    ] ];

    backPromise
] ]

Options[NotebookEvaluateAsync] = {
    "ContextNotebook" :> RemoteNotebook[System`$EvaluationContext["Notebook"] ],
    EvaluationElements -> All,
    "EvaluationContext" -> <||>,
    "ContextIsolation" -> False
}

Options[NotebookEvaluate] = Options[NotebookEvaluateAsync]

Cells[] := RemoteNotebook[System`$EvaluationContext["Notebook"] ]["Cells"] /; StringQ[System`$EvaluationContext["Notebook"] ]
Cells[r_RemoteNotebook] := r["Cells"]

NotebookEvaluateAsync[path_String | File[path_], opts: OptionsPattern[] ] := NotebookEvaluateAsync[NotebookOpen[path, Visible->False], opts]
NotebookEvaluate[path_String | File[path_], opts: OptionsPattern[] ] := NotebookEvaluate[NotebookOpen[path, Visible->False], opts]
NotebookEvaluate[r_RemoteNotebook, opts: OptionsPattern[] ] := (
    Then[NotebookEvaluateAsync[r, opts], Function[Null, Null] ];
    Null
)

ParentCell[cell_RemoteCellObj: RemoteCellObj[ System`$EvaluationContext["ResultCellHash"] ] ] := Module[{},
    With[{promise = Promise[]},
        EventFire[Internal`Kernel`CommunicationChannel, "FindParent", <|"Ref"->System`$EvaluationContext["Ref"], "CellHash" -> (cell // First), "Promise" -> (promise), "Kernel"->Internal`Kernel`Hash|>];
        promise // WaitAll
    ] // RemoteCellObj
]

NotebookDirectory[] := With[{},
    With[{promise = Promise[]},
        EventFire[Internal`Kernel`CommunicationChannel, "AskNotebookDirectory", <|"Notebook"->System`$EvaluationContext["Notebook"], "Promise" -> (promise), "Kernel"->Internal`Kernel`Hash|>];
        promise // WaitAll
    ] 
]

EvaluationCell[] := With[{},
    RemoteCellObj[ System`$EvaluationContext["Ref"] ]
]

ResultCell[] := With[{},
    RemoteCellObj[ System`$EvaluationContext["ResultCellHash"] ]
]

EvaluationNotebook[] := With[{},
    RemoteNotebook[ System`$EvaluationContext["Notebook"] ]
]

NotebookFocusedCell[] := EvaluationNotebook[]["FocusedCell"]

NotebookFocusedCell[n_RemoteNotebook] := n["FocusedCell"]

RemoteNotebook /: Set[RemoteNotebook[uid_][field_], value_] := With[{},
    EventFire[Internal`Kernel`CommunicationChannel, "NotebookFieldSet", <|"NotebookHash" -> uid, "Field" -> field, "Value"->value, "Kernel"->Internal`Kernel`Hash|>];
    Null;
]

RemoteNotebook[uid_][tag_String] := With[{promise = Promise[]},
    EventFire[Internal`Kernel`CommunicationChannel, "GetNotebookProperty", <|"NotebookHash"->uid, "Function"->Function[x,x], "Tag"->tag, "Promise" -> (promise), "Kernel"->Internal`Kernel`Hash|>];
    promise // WaitAll
] 

RemoteNotebook[uid_]["Cells"] := With[{promise = Promise[]},
    EventFire[Internal`Kernel`CommunicationChannel, "GetNotebookProperty", <|"NotebookHash"->uid, "Function"->Function[x, (#["Hash"]&)/@x ], "Tag"->"Cells", "Promise" -> (promise), "Kernel"->Internal`Kernel`Hash|>];
    RemoteCellObj /@ (promise // WaitAll)
]

RemoteNotebook[uid_]["FocusedCell"] := With[{promise = Promise[]},
    EventFire[Internal`Kernel`CommunicationChannel, "GetNotebookProperty", <|"NotebookHash"->uid, "Function"->((If[StringQ[#["FocusedCell"]["Type"] ], #["FocusedCell"]["Hash"], Last[ #["Cells"] ]["Hash"]  ] )&), "Tag"->Null, "Promise" -> (promise), "Kernel"->Internal`Kernel`Hash|>];
    RemoteCellObj @ (promise // WaitAll)
]


(* [TODO] [REFACTOR] *)

(* FIXME!!! NOT EFFICIENT!*)
(* DO NOT USE BLANK PATTERN !!! *)
RemoteNotebook /: EventHandler[ RemoteNotebook[uid_], list_] := With[{virtual = CreateUUID[]},
    EventHandler[virtual, list];
    EventFire[Internal`Kernel`CommunicationChannel, "NotebookSubscribe", <|"NotebookHash" -> uid, "Callback" -> virtual, "Kernel"->Internal`Kernel`Hash|>];
]

(* FIXME!!! NOT EFFICIENT!*)
RemoteNotebook /: EventClone[ RemoteNotebook[uid_] ] := With[{virtual = CreateUUID[], cloned = CreateUUID[]},
    EventHandler[virtual, {
        any_ :> Function[payload,
            EventFire[cloned, any, payload]
        ]
    }];
    EventFire[Internal`Kernel`CommunicationChannel, "NotebookSubscribe", <|"NotebookHash" -> uid, "Callback" -> virtual, "Kernel"->Internal`Kernel`Hash|>];
    
    EventObject[<|"Id"->cloned|>]
]

RemoteCellObj /: EvaluateCell[ RemoteCellObj[uid_] , OptionsPattern[] ] := With[{target = OptionValue["Target"], promise = Promise[]},
    EventFire[Internal`Kernel`CommunicationChannel, "EvaluateCellByHash", <|"UId" -> uid, "Target" -> target|>];
]

Options[EvaluateCell] = {"Target" -> "Notebook"}

(* [TODO] do not leak new EventObjects!!! *) 
RemoteCellObj /: EventHandler[ RemoteCellObj[uid_], list_] := Module[{eventLike}, With[{virtual = CreateUUID[]},
    EventHandler[virtual, list];
    EventFire[Internal`Kernel`CommunicationChannel, "CellSubscribe", <|"CellHash" -> uid, "Callback" -> virtual, "Kernel"->Internal`Kernel`Hash|>];
    eventLike /: EventRemove[eventLike] := With[{}, (* just to save some memory *)
        ClearAll[eventLike];
        EventRemove[virtual];
        EventFire[Internal`Kernel`CommunicationChannel, "CellUnsubscribe", <|"CellHash" -> uid, "Event" -> virtual, "Kernel"->Internal`Kernel`Hash|>];
    ];

    eventLike
] ]

RemoteCellObj /: Delete[RemoteCellObj[uid_] ] := With[{},
    EventFire[Internal`Kernel`CommunicationChannel, "DeleteCellByHash", uid];
]

NotebookDelete[n_List] := NotebookDelete /@ n 
NotebookDelete[RemoteCellObj[uid_] ] :=  EventFire[Internal`Kernel`CommunicationChannel, "DeleteCellByHash", uid];

RemoteCellObj /: Set[RemoteCellObj[uid_]["Data"], data_String ] := With[{},
    EventFire[Internal`Kernel`CommunicationChannel, "SetCellData", <|"Hash"->uid, "Data"->data|>];
]

wolframCellQ[data_] := !StringMatchQ[data, StartOfString~~(WordCharacter.. | "")~~"."~~WordCharacter..~~"\n"~~___]

convertHead[str_String] := With[{s = StringTrim[str]},
    If[StringLength[s] == 0,
        Nothing
    ,
        With[{head = StringSplit[str, "\n"][[1]]},
            If[StringTake[head, 1] == ".",
                StringDrop[head, 1]
            ,
                head
            ]
        ]
    ]
]

NotebookRead[n_RemoteNotebook] := NotebookFocusedCell[n] // NotebookRead
NotebookRead[n_List] := NotebookRead /@ n
NotebookRead[cells: {__RemoteCellObj}] := With[{promise = Promise[]},
    EventFire[Internal`Kernel`CommunicationChannel, "GetMultipleCells", <|"Cells"->cells[[All,1]], "Promise" -> (promise), "Kernel"->Internal`Kernel`Hash|>];
    NotebookRead /@ (promise // WaitAll)
];

NotebookReadAsync[n_List] := NotebookReadAsync /@ n
NotebookReadAsync[n_RemoteNotebook] := With[{promise = Promise[], internal = Promise[]},
    EventFire[Internal`Kernel`CommunicationChannel, "GetNotebookProperty", <|"NotebookHash"->n[[1]], "Function"->((If[StringQ[#["FocusedCell"]["Type"] ], #["FocusedCell"]["Hash"], Last[ #["Cells"] ]["Hash"]  ] )&), "Tag"->Null, "Promise" -> (promise), "Kernel"->Internal`Kernel`Hash|>];
    Then[promise, Function[result, 
        EventFire[internal, Resolve, RemoteCellObj[result] ];
    ] ];
    internal
];

NotebookReadAsync[cells: {__RemoteCellObj}] := With[{promise = Promise[], internal = Promise[]},
    EventFire[Internal`Kernel`CommunicationChannel, "GetMultipleCells", <|"Cells"->cells[[All,1]], "Promise" -> (promise), "Kernel"->Internal`Kernel`Hash|>];
    Then[promise, Function[results, 
        EventFire[internal, Resolve, NotebookRead /@ results]
    ] ];
    internal
];

NotebookReadAsync[o_RemoteCellObj] := With[{promise = Promise[], internal = Promise[], cells = {o}},
    EventFire[Internal`Kernel`CommunicationChannel, "GetMultipleCells", <|"Cells"->cells[[All,1]], "Promise" -> (promise), "Kernel"->Internal`Kernel`Hash|>];
    Then[promise, Function[results, 
        EventFire[internal, Resolve, NotebookRead[results[[1]] ] ]
    ] ];
    internal
];

NotebookRead[o_RemoteCellObj | o_Association ] := With[{display = o["Display"], type = o["Type"], data = o["Data"], hiddenQ = TrueQ[o["Props"]["Hidden"] ]},
    If[display === "codemirror" && type === "Output",
        Cell[data, type]
    ,
        If[type === "Input",
            If[wolframCellQ[data],
                If[hiddenQ,
                    Cell[data, type, CellOpen->False]
                ,
                    Cell[data, type]
                ]
                
            ,
                If[hiddenQ,
                    Cell[data, type, convertHead[data], CellOpen->False ]
                ,
                    Cell[data, type, convertHead[data] ]
                ]            
            ]
            
        ,
            Cell[data, type, display ]
        ]
    ]
]

NotebookWrite[RemoteCellObj[uid_], data_String] := With[{},
    EventFire[Internal`Kernel`CommunicationChannel, "SetCellData", <|"Hash"->uid, "Data"->data|>];
]

ToStringQ[str_String] := str;
ToStringQ[any_] := "$Failed";

NotebookWrite[RemoteCellObj[uid_], data_] := With[{str = ToStringQ[First[Flatten[transformCellExpr /@ Flatten[{data}] ] ]["Data"] ]},
    EventFire[Internal`Kernel`CommunicationChannel, "SetCellData", <|"Hash"->uid, "Data"->str|>]; 
]

NotebookWrite[NotebookLocationSpecifier[c_RemoteCellObj, "After"], data_ ] := CellPrint[data, "After"->c]
NotebookWrite[NotebookLocationSpecifier[c_RemoteCellObj, _], data_ ] := CellPrint[data, "After"->c]
NotebookWrite[NotebookLocationSpecifier[c_RemoteCellObj, "On"], data_ ] := NotebookWrite[c, data]

RemoteCellObj[uid_][tag_String] := With[{promise = Promise[]},
    EventFire[Internal`Kernel`CommunicationChannel, "GetCellProperty", <|"Hash"->uid, "Function"->Function[x,x], "Tag"->tag, "Promise" -> (promise), "Kernel"->Internal`Kernel`Hash|>];
    promise // WaitAll
] 

RemoteCellObj[uid_]["Notebook"] := With[{promise = Promise[]},
    EventFire[Internal`Kernel`CommunicationChannel, "GetCellProperty", <|"Hash"->uid, "Function"->Function[x, x["Hash"] ], "Tag"->"Notebook", "Promise" -> (promise), "Kernel"->Internal`Kernel`Hash|>];
    (promise // WaitAll)//RemoteNotebook
] 

Unprotect[DocumentNotebook]
ClearAll[DocumentNotebook]

CreateWindow[DocumentNotebook[cells_List, ___], opts: OptionsPattern[] ] := CreateWindow[cells, opts]

CreateWindow[expr_, opts: OptionsPattern[] ] := With[{transformed = Flatten[{transformCellExpr[expr]}][[-1]] },
    CellPrintGeneral[transformed, "Target"->_, "Title"->OptionValue[WindowTitle], ImageSize->OptionValue[WindowSize], opts]
]



Options[CreateWindow] = {"Offscreen"->False, "Notebook" :> RemoteNotebook[ System`$EvaluationContext["Notebook"] ], "Window":>CurrentWindow[], WindowTitle->"Projector", WindowSize->Automatic}

CellPrint[any_, opts___] := With[{data = CellPrintGeneral[#, opts] &/@ Flatten[{transformCellExpr[any]}]},
    If[Length[data] === 1, data[[1]], data]
]

(* [TODO] [REFACTOR] *)

CellPrint[str_String, opts___] := With[{hash = CreateUUID[], list = Association[opts]},

    If[StringQ[System`$EvaluationContext["Ref"] ],
        With[{r = System`$EvaluationContext["Ref"]},
            EventFire[Internal`Kernel`CommunicationChannel, "PrintNewCell", <|"Data" -> str, "Ref"->r, "Meta"-><|"Hash"->hash, "Type"->"Output", "After"->RemoteCellObj[ r ], opts|> |> ];
        ];
    ,
        If[!KeyExistsQ[list, "After"] && !KeyExistsQ[list, "Reference"],
            EventFire[Internal`Kernel`CommunicationChannel, "PrintNewCell", <|"Data" -> str, "Notebook"->First[list["Notebook"] ], "Meta"-><|"Hash"->hash, "Type"->"Output", "After"->RemoteCellObj[ r ], opts|> |> ];
        ,
            With[{r = If[StringQ[#], #, list["Reference"] // First] &@ (list["After"] // First)},
                EventFire[Internal`Kernel`CommunicationChannel, "PrintNewCell", <|"Data" -> str, "Ref"->r, "Meta"-><|"Hash"->hash, "Type"->"Output", "After"->RemoteCellObj[ r ], opts|> |> ];
            ];  
        ];  
    ];

    RemoteCellObj[hash]
]

CellPrintGeneral[cell_Association, opts___] := With[{hash = CreateUUID[], list = Association[opts],
    str = cell["Data"],
    type = cell["Type"],
    display = cell["Display"],
    props = Lookup[cell, "Props", <||>]
},
    If[StringQ[System`$EvaluationContext["Ref"] ],
        With[{r = System`$EvaluationContext["Ref"]},
            EventFire[Internal`Kernel`CommunicationChannel, "PrintNewCell", <|"Data" -> str, "Ref"->r, "Meta"-><|"Hash"->hash, "Type"->type, "Display"->display, "Props"->props, "After"->RemoteCellObj[ r ], opts|> |> ];
        ];
    ,
        If[!KeyExistsQ[list, "After"] && !KeyExistsQ[list, "Reference"],
            EventFire[Internal`Kernel`CommunicationChannel, "PrintNewCell", <|"Data" -> str, "Notebook"->First[list["Notebook"] ], "Meta"-><|"Hash"->hash, "Type"->type, "Display"->display, "Props"->props, "After"->RemoteCellObj[ r ], opts|> |> ];
        ,
            With[{r = If[StringQ[#], #, list["Reference"] // First] &@ (list["After"] // First)},
                EventFire[Internal`Kernel`CommunicationChannel, "PrintNewCell", <|"Data" -> str, "Ref"->r, "Meta"-><|"Hash"->hash, "Type"->type, "Display"->display, "Props"->props, "After"->RemoteCellObj[ r ], opts|> |> ];
            ];  
        ];  
    ];

    RemoteCellObj[hash]
]

Options[CellPrint] = {"EvaluatedQ"->True, "Target"->"Notebook", "Window":>CurrentWindow[], "Title"->"Projector", ImageSize->Automatic}

End[]
EndPackage[]