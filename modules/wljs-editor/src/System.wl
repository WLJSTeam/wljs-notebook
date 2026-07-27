BeginPackage["CoffeeLiqueur`Extensions`System`", {
  "CoffeeLiqueur`Extensions`FrontendObject`",
  "CoffeeLiqueur`Misc`Events`", 
  "CoffeeLiqueur`Misc`Events`Promise`", 
  "CoffeeLiqueur`Misc`Parallel`",
  "CoffeeLiqueur`Extensions`EditorView`",
  "CoffeeLiqueur`Extensions`Communication`",
  "CoffeeLiqueur`Extensions`RemoteCells`"
}]

MessageDialog;

ExportAsync::usage = "Async version of Export that returns Promise";

ChoiceDialog;
ChoiceDialogAsync;

SystemDialogInput;
SystemDialogInputAsync;

InputStringAsync;
InputAsync;

FrontFileDownload::usage = "FrontFileDownload[filename] creates a downloadable file for the frontend.\nFrontFileDownload[byteArray, filename] creates a downloadable file for the frontend from raw bytes.\nUse as FrontSubmit[FrontFileDownload[...]] to invoke a save dialog"

Begin["`Internal`"]

frontDownload;
FrontFileDownload[array_ByteArray, name_String:"generic"] := frontDownload[array, name]

FrontFileDownload[File[file_] | file_String] := With[{b = ReadByteArray[file]},
    If[!ByteArrayQ[b],
        $Failed
    ,
        frontDownload[b, FileNameTake[file]]
    ]
]

FrontFileDownload::fmt = "Input must be a ByteArray or a file"
FrontFileDownload[___] := (Message[FrontFileDownload::fmt]; $Failed);

frontDownload /: MakeBoxes[f_frontDownload, form: StandardForm | WLXForm] := With[{ref = CreateFrontEndObject[f]},
    If[form === WLXForm,
        MakeBoxes[ref, form]
    ,
        ViewBox[MakeBoxes[ref, form], ref]
    ]
]

Options[ExportAsync] = Options[Export];

ExportAsync[file_, content_, maybe___, opts:OptionsPattern[] ] := With[{p = Promise[]},
    If[Length[Kernels[] ] == 0, LaunchKernels[1] ];
    Then[ParallelSubmitAsync[ Export[file, content, maybe, opts] ], Function[res, 
        EventFire[p, Resolve,  If[FailureQ[res], $Failed, file] ];
    ] ];
    
    p
]


opClipboard;

Unprotect[SystemDialogInput]
ClearAll[SystemDialogInput]

Unprotect[ChoiceDialog]
ClearAll[ChoiceDialog]

Unprotect[MessageDialog]
ClearAll[MessageDialog]

Options[MessageDialog] = {"Title"->"", "Notebook" :> RemoteNotebook[ System`$EvaluationContext["Notebook"] ]}


Options[ChoiceDialog] = {"Title"->"", "Notebook" :> RemoteNotebook[ System`$EvaluationContext["Notebook"] ]}
Options[ChoiceDialogAsync] = Options[ChoiceDialog];

Unprotect[Input];
ClearAll[Input];

Unprotect[InputString];
ClearAll[InputString];

Unprotect[DialogInput];
Unprotect[DialogNotebook];
ClearAll[DialogInput];
ClearAll[DialogNotebook];

Unprotect[DialogReturn];
ClearAll[DialogReturn];

Unprotect[CreateDialog]
ClearAll[CreateDialog]

Unprotect[CreateDialog]
ClearAll[CreateDialog]


Input[args___]       := WaitAll[InputAsync[args], 100000]
InputString[args___] := WaitAll[InputStringAsync[args], 100000]



InputAsync[prompt_, initial_, opts: OptionsPattern[] ] := With[{p = Promise[]}, 
    Then[InputStringAsync[TextString[prompt], ToString[initial, InputForm], opts ], Function[r,
        If[StringQ[r], EventFire[p, Resolve, ToExpression[r, InputForm] ],
            EventFire[p, Resolve, $Canceled];
        ];
    ] ];
    p
]

InputAsync[prompt_, opts: OptionsPattern[] ] := With[{p = Promise[]}, 
    Then[InputStringAsync[TextString[prompt], "", opts ], Function[r,
        If[StringQ[r], EventFire[p, Resolve, ToExpression[r, InputForm] ],
            EventFire[p, Resolve, $Canceled];
        ];
    ] ];
    p
]
InputAsync[opts: OptionsPattern[] ] := With[{p = Promise[]}, 
    Then[InputStringAsync["Input", "", opts ], Function[r,
        If[StringQ[r], EventFire[p, Resolve, ToExpression[r, InputForm] ],
            EventFire[p, Resolve, $Canceled];
        ];
    ] ];
    p
]

InputStringAsync[prompt_String:"Input text", initial_String:"", opts: OptionsPattern[] ] := With[{
    p = Promise[], promise = Promise[],
    notebook = OptionValue[InputStringAsync, "Notebook"] // First
},
    EventFire[Internal`Kernel`CommunicationChannel, "NotebookMessageDialogNative", <|"Type"->"TextBox", "Ref"->notebook, "Payload"-><|
        "title"->prompt, "default"->initial
    |>, "Kernel"->Internal`Kernel`Hash, "Promise" -> (promise)|>];
    Then[promise, Function[result,
        If[StringQ[result],
            EventFire[p, Resolve, result]
        ,
            EventFire[p, Resolve, $Canceled]
        ]
    ] ];

    p
]


Options[InputStringAsync] = { "Notebook" :> RemoteNotebook[ System`$EvaluationContext["Notebook"] ]}
Options[InputAsync] = Options[InputStringAsync];

System`Confirm;

MessageDialog[expr_, OptionsPattern[] ] := With[{
    notebook = OptionValue[MessageDialog, "Notebook"] // First,
    editorView = CreateFrontEndObject[EditorView[ToString[expr, StandardForm] ] ],
    promise = Promise[]
},
    EventFire[Internal`Kernel`CommunicationChannel, "NotebookMessageDialog", <|"Ref"->notebook, "Payload"-><|
        "List"->{}, "Expression"->(editorView[[1]]), "Title"->OptionValue["Title"], 
        "Promise" -> (promise), "NoButtons"->True
    |>, "Kernel"->Internal`Kernel`Hash|>];
]

MessageDialog[expr_String, OptionsPattern[] ] := With[{
    notebook = OptionValue[MessageDialog, "Notebook"] // First,
    promise = Promise[]
},
    EventFire[Internal`Kernel`CommunicationChannel, "NotebookMessageDialogNative", <|"Type"->"MessageBox", "Ref"->notebook, "Payload"-><|
        "title"->"Message", "type"->"info", "message"->expr
    |>, "Kernel"->Internal`Kernel`Hash, "Promise" -> (promise)|>];
    Then[promise, Null];
]


ChoiceDialog[expr__] := WaitAll[ChoiceDialogAsync[expr], 100000]

ChoiceDialogAsync[expr_String] := With[{
    notebook = EvaluationNotebook[] // First,
    promise = Promise[],
    backpromise = Promise[]
},
    EventFire[Internal`Kernel`CommunicationChannel, "NotebookMessageDialogNative", <|"Ref"->notebook, "Type"->"MessageBox", "Payload"-><|
        "title" -> "Dialog", "message" -> expr, "type"->"question", "buttons"->{"OK", "Cancel"}
    |>, "Kernel"->Internal`Kernel`Hash, "Promise" -> (promise)|>];

    Then[promise, Function[result,
        EventFire[backpromise, Resolve, (result["response"] === 0 || result === True)];
    ] ];

    backpromise
]

ChoiceDialogAsync[expr_String, Rule["Notebook", n_] ] := With[{
    notebook = n // First,
    promise = Promise[],
    backpromise = Promise[]
},
    EventFire[Internal`Kernel`CommunicationChannel, "NotebookMessageDialogNative", <|"Ref"->notebook, "Type"->"MessageBox", "Payload"-><|
        "title" -> "Dialog", "message" -> expr, "type"->"question", "buttons"->{"OK", "Cancel"}
    |>, "Kernel"->Internal`Kernel`Hash, "Promise" -> (promise)|>];

    Then[promise, Function[result,
        EventFire[backpromise, Resolve, (result["response"] === 0 || result === True)];
    ] ];

    backpromise
]


ChoiceDialogAsync[expr_] := With[{
    notebook = EvaluationNotebook[] // First,
    editorView = CreateFrontEndObject[EditorView[ToString[expr, StandardForm] ] ],
    promise = Promise[],
    backpromise = Promise[]
},
    EventFire[Internal`Kernel`CommunicationChannel, "NotebookMessageDialog", <|"Ref"->notebook, "Payload"-><|
        "List"->{}, "Expression"->editorView[[1]]
    |>, "Kernel"->Internal`Kernel`Hash, "Promise" -> (promise)|>];

    Then[promise, Function[result,
        EventFire[backpromise, Resolve, result === 1];
    ] ];

    backpromise
]

ChoiceDialogAsync[expr_, Rule["Notebook", n_] ] := With[{
    notebook = n // First,
    editorView = CreateFrontEndObject[EditorView[ToString[expr, StandardForm] ] ],
    promise = Promise[],
    backpromise = Promise[]
},
    EventFire[Internal`Kernel`CommunicationChannel, "NotebookMessageDialog", <|"Ref"->notebook, "Payload"-><|
        "List"->{}, "Expression"->editorView[[1]]
    |>, "Kernel"->Internal`Kernel`Hash, "Promise" -> (promise)|>];

    Then[promise, Function[result,
        EventFire[backpromise, Resolve, result === 1];
    ] ];

    backpromise
]

ChoiceDialogAsync[expr_, rules : {Rule[_, _]..} ] := With[{
    notebook = EvaluationNotebook[] // First,
    editorView = CreateFrontEndObject[EditorView[ToString[expr, StandardForm] ] ],
    editorViews = CreateFrontEndObject[EditorView[ToString[#, StandardForm] ] ]&/@ rules[[All, 1]],
    promise = Promise[],
    backpromise = Promise[]
},
    EventFire[Internal`Kernel`CommunicationChannel, "NotebookMessageDialog", <|"Ref"->notebook, "Payload"-><|
        "List"->(editorViews[[All,1]]), "Expression"->(editorView[[1]])
    |>, "Kernel"->Internal`Kernel`Hash, "Promise" -> (promise)|>];

    Then[promise, Function[result,
        Switch[result,
            False,
                EventFire[backpromise, Resolve, rules[[-1, 2]]];
            ,
            _,
                EventFire[backpromise, Resolve, rules[[result, 2]]];
        ];
        
    ] ];

    backpromise
]

ChoiceDialogAsync[expr_, rules : {Rule[_, _]..}, Rule["Notebook", n_] ] := With[{
    notebook = n // First,
    editorView = CreateFrontEndObject[EditorView[ToString[expr, StandardForm] ] ],
    editorViews = CreateFrontEndObject[EditorView[ToString[#, StandardForm] ] ]&/@ rules[[All, 1]],
    promise = Promise[],
    backpromise = Promise[]
},
    EventFire[Internal`Kernel`CommunicationChannel, "NotebookMessageDialog", <|"Ref"->notebook, "Payload"-><|
        "List"->(editorViews[[All,1]]), "Expression"->(editorView[[1]])
    |>, "Kernel"->Internal`Kernel`Hash, "Promise" -> (promise)|>];

    Then[promise, Function[result,
        Switch[result,
            False,
                EventFire[backpromise, Resolve, rules[[-1, 2]]];
            ,
            _,
                EventFire[backpromise, Resolve, rules[[result, 2]]];
        ];
        
    ] ];

    backpromise
]

ChoiceDialogAsync[expr_, rules : {Rule[_String, _]..} ] := With[{
    notebook = EvaluationNotebook[] // First,
    editorView = CreateFrontEndObject[EditorView[ToString[expr, StandardForm] ] ],
    editorViews = rules[[All, 1]],
    promise = Promise[],
    backpromise = Promise[]
},
    EventFire[Internal`Kernel`CommunicationChannel, "NotebookMessageDialog", <|"Ref"->notebook, "Payload"-><|
        "List"->(editorViews[[All]]), "Expression"->(editorView[[1]]), "StringBased"->True
    |>, "Kernel"->Internal`Kernel`Hash, "Promise" -> (promise)|>];

    Then[promise, Function[result,
        Switch[result,
            False,
                EventFire[backpromise, Resolve, rules[[-1, 2]]];
            ,
            _,
                EventFire[backpromise, Resolve, rules[[result, 2]]];
        ];
        
    ] ];

    backpromise
]

ChoiceDialogAsync[expr_, rules : {Rule[_String, _]..}, Rule["Notebook", n_] ] := With[{
    notebook = n // First,
    editorView = CreateFrontEndObject[EditorView[ToString[expr, StandardForm] ] ],
    editorViews = rules[[All, 1]],
    promise = Promise[],
    backpromise = Promise[]
},
    EventFire[Internal`Kernel`CommunicationChannel, "NotebookMessageDialog", <|"Ref"->notebook, "Payload"-><|
        "List"->(editorViews[[All]]), "Expression"->(editorView[[1]]), "StringBased"->True
    |>, "Kernel"->Internal`Kernel`Hash, "Promise" -> (promise)|>];

    Then[promise, Function[result,
        Switch[result,
            False,
                EventFire[backpromise, Resolve, rules[[-1, 2]]];
            ,
            _,
                EventFire[backpromise, Resolve, rules[[result, 2]]];
        ];
        
    ] ];

    backpromise
]

ChoiceDialogAsync[expr_String, rules : {Rule[_, _]..} ] := With[{
    notebook = EvaluationNotebook[] // First,
    editorViews = CreateFrontEndObject[EditorView[ToString[#, StandardForm] ] ]&/@ rules[[All, 1]],
    promise = Promise[],
    backpromise = Promise[]
},
    EventFire[Internal`Kernel`CommunicationChannel, "NotebookMessageDialog", <|"Ref"->notebook, "Payload"-><|
        "List"->(editorViews[[All,1]]), "Title"->expr
    |>, "Kernel"->Internal`Kernel`Hash, "Promise" -> (promise)|>];

    Then[promise, Function[result,
        Switch[result,
            False,
                EventFire[backpromise, Resolve, rules[[-1, 2]]];
            ,
            _,
                EventFire[backpromise, Resolve, rules[[result, 2]]];
        ];
        
    ] ];

    backpromise
]

ChoiceDialogAsync[expr_String, rules : {Rule[_, _]..}, Rule["Notebook", n_] ] := With[{
    notebook = n // First,
    editorViews = CreateFrontEndObject[EditorView[ToString[#, StandardForm] ] ]&/@ rules[[All, 1]],
    promise = Promise[],
    backpromise = Promise[]
},
    EventFire[Internal`Kernel`CommunicationChannel, "NotebookMessageDialog", <|"Ref"->notebook, "Payload"-><|
        "List"->(editorViews[[All,1]]), "Title"->expr
    |>, "Kernel"->Internal`Kernel`Hash, "Promise" -> (promise)|>];

    Then[promise, Function[result,
        Switch[result,
            False,
                EventFire[backpromise, Resolve, rules[[-1, 2]]];
            ,
            _,
                EventFire[backpromise, Resolve, rules[[result, 2]]];
        ];
        
    ] ];

    backpromise
]

ChoiceDialogAsync[expr_String, rules : {Rule[_String, _]..} ] := With[{
    notebook = EvaluationNotebook[] // First,
    editorViews = rules[[All, 1]],
    promise = Promise[],
    backpromise = Promise[]
},
    EventFire[Internal`Kernel`CommunicationChannel, "NotebookMessageDialogNative", <|"Ref"->notebook, "Type"->"SelectBox", "Payload"-><|
        "list"->editorViews, "message"->expr, "title"->"Select"
    |>, "Kernel"->Internal`Kernel`Hash, "Promise" -> (promise)|>];

    Then[promise, Function[result,
        Switch[result,
            _Integer,
                EventFire[backpromise, Resolve, rules[[result, 2]]];
            ,
            _,
                EventFire[backpromise, Resolve, rules[[-1, 2]]];
        ];
        
    ] ];

    backpromise
]

ChoiceDialogAsync[expr_String, rules : {Rule[_String, _]..}, Rule["Notebook", n_] ] := With[{
    notebook = n // First,
    editorViews = rules[[All, 1]],
    promise = Promise[],
    backpromise = Promise[]
},
    EventFire[Internal`Kernel`CommunicationChannel, "NotebookMessageDialogNative", <|"Ref"->notebook, "Type"->"SelectBox", "Payload"-><|
        "list"->editorViews, "message"->expr, "title"->"Select"
    |>, "Kernel"->Internal`Kernel`Hash, "Promise" -> (promise)|>];

    Then[promise, Function[result,
        Switch[result,
            _Integer,
                EventFire[backpromise, Resolve, rules[[result, 2]]];
            ,
            _,
                EventFire[backpromise, Resolve, rules[[-1, 2]]];
        ];
        
    ] ];

    backpromise
]



CoffeeLiqueur`Extensions`System`Internal`RequestDirectory;
CoffeeLiqueur`Extensions`System`Internal`RequestFile;

SystemDialogInput::noelectron = "WLJS Notebook Desktop application is required"
SystemDialogInput[any__] := (Message[SystemDialogInput::noelectron]; $Failed) /; !TrueQ[Internal`Kernel`ElectronQ]
SystemDialogInput[any__] := WaitAll[SystemDialogInputAsync[any], 99999]

SystemDialogInputAsync[any_, opts: OptionsPattern[] ] := SystemDialogInputAsync[any, False, opts]

fixPath[p_Promise] := With[{b = Promise[]},
    Then[p, Function[res, 
        If[!StringQ[res], EventFire[b, Resolve, False] ];
        EventFire[b, Resolve, res // URLDecode];
    ] ];
    b
]

fixPaths[p_Promise] := With[{b = Promise[]},
    Then[p, Function[res, 
        If[!ListQ[res], EventFire[b, Resolve, False] ];
        EventFire[b, Resolve, URLDecode /@ res];
    ] ];
    b
]

ff[any__] := FrontFetchAsync[any]

SystemDialogInputAsync["Directory", _, OptionsPattern[] ] := With[{title = OptionValue[WindowTitle], window = OptionValue["Window"]},
    ff[RequestDirectory[title], "Window"->window] // fixPath
] 

SystemDialogInputAsync["FileOpen", _, OptionsPattern[] ] := With[{title = OptionValue[WindowTitle], window = OptionValue["Window"]},
    ff[RequestFile[title, False, "Open"], "Window"->window] // fixPath
]
SystemDialogInputAsync["FileSave", _, OptionsPattern[] ] := With[{title = OptionValue[WindowTitle], window = OptionValue["Window"]},
    ff[RequestFile[title, False, "Save"], "Window"->window] // fixPath
]

SystemDialogInputAsync["OpenList", _, OptionsPattern[] ] := With[{title = OptionValue[WindowTitle], window = OptionValue["Window"]},
    ff[RequestFile[title, False, "OpenList"], "Window"->window] // fixPaths
]

stripWildCard[l_List] := stripWildCard /@ l 
stripWildCard[s_String] := StringTake[s, -3]

SystemDialogInputAsync["FileOpen", {_, filters_List}, OptionsPattern[] ] := With[{title = OptionValue[WindowTitle], window = OptionValue["Window"]},
    ff[RequestFile[title, Map[Function[format,
        <|"name"->format[[1]], "extensions"->stripWildCard[format[[2]]]|>
    ], filters], "Open"], "Window"->window] // fixPath
]
SystemDialogInputAsync["OpenList", {_, filters_List}, OptionsPattern[] ] := With[{title = OptionValue[WindowTitle], window = OptionValue["Window"]},
    ff[RequestFile[title, Map[Function[format,
        <|"name"->format[[1]], "extensions"->stripWildCard[format[[2]]]|>
    ], filters], "OpenList"], "Window"->window] // fixPaths
]
SystemDialogInputAsync["FileSave", {_, filters_List}, OptionsPattern[] ] := With[{title = OptionValue[WindowTitle], window = OptionValue["Window"]},
    ff[RequestFile[title, Map[Function[format,
        <|"name"->format[[1]], "extensions"->stripWildCard[format[[2]]]|>
    ], filters], "Save"], "Window"->window] // fixPath
]

Options[SystemDialogInputAsync] = {WindowTitle -> "Browser", "Window":>CurrentWindow[]}
Options[SystemDialogInput] = {WindowTitle -> "Browser", "Window":>CurrentWindow[]}


Unprotect[SystemOpen]
ClearAll[SystemOpen]


getType[str_String] := With[{},
    If[StringMatchQ[str, (LetterCharacter..)~~"://"~~___],
        "URL"
    ,
        If[FileExistsQ[str],
            If[DirectoryQ[str],
                "Folder",
                "File"
            ]
        ,
            $Failed
        ]
    ]
]

SystemOpen::notexist = "File `` does not exist"
SystemOpen::noelectron = "WLJS Notebook Desktop application is required"

SystemOpen[File[path_String], opts: OptionsPattern[] ] := (Message[SystemOpen::noelectron]; $Failed) /; !TrueQ[Internal`Kernel`ElectronQ]
SystemOpen[URL[path_String], opts: OptionsPattern[] ] := (Message[SystemOpen::noelectron]; $Failed) /; !TrueQ[Internal`Kernel`ElectronQ]
SystemOpen[path_String, opts: OptionsPattern[] ] := (Message[SystemOpen::noelectron]; $Failed) /; !TrueQ[Internal`Kernel`ElectronQ]


SystemOpen[File[path_String], opts: OptionsPattern[] ] := With[{win = OptionValue["Window"], file = {FindFile[File["test.txt"] ]} // Flatten // First},
    If[FailureQ[file],
        Message[SystemOpen::notexist, FileNameTake[path] ];
        $Failed
    ,
        FrontSubmit[SystemOpen[FileNameSplit[path // AbsoluteFileName], "File"], "Window"->win]
    ]
]

SystemOpen[URL[path_String], opts: OptionsPattern[] ] := With[{win = OptionValue["Window"]},
    FrontSubmit[SystemOpen[path, "URL" ], "Window"->win]
]

SystemOpen[path_String, OptionsPattern[] ] := With[{win = OptionValue["Window"], type = getType[path]},
    If[FailureQ[type],
        Message[SystemOpen::notexist, FileNameTake[path] ];
        $Failed
    ,
        FrontSubmit[SystemOpen[If[type =!= "URL", FileNameSplit[path // AbsoluteFileName], path],  type ], "Window"->win]
    ]  
]


Options[SystemOpen] = {"Window" :> CurrentWindow[]}


(* ClipBoard *)

Unprotect[CopyToClipboard];
Unprotect[Paste];

ClearAll[CopyToClipboard];
ClearAll[Paste];

CopyToClipboard[any_, opts: OptionsPattern[] ] := CopyToClipboard[ToString[any, InputForm], opts ]
CopyToClipboard[s_String, opts: OptionsPattern[] ] := With[{win = OptionValue["Window"] },
    FrontSubmit[opClipboard["Write", s//URLEncode], "Window"->win ];
]

Paste[opts: OptionsPattern[] ] := With[{win = OptionValue["Window"], context = System`$EvaluationContext },
    Then[FrontFetchAsync[opClipboard["Read"], "Window"->win ], Function[c,
        Block[{System`$EvaluationContext = context}, CellPrint[c//URLDecode] ]
    ] ];
]

Options[Paste] = {"Window" :> CurrentWindow[]}
Options[CopyToClipboard] = {"Window" :> CurrentWindow[]}

Unprotect[PasteButton]
ClearAll[PasteButton]

PasteButton[expr_String, opts: OptionsPattern[] ] := With[{context = System`$EvaluationContext}, 
    Button[expr, Print["Pasted"]; Block[{System`$EvaluationContext = context}, CellPrint[expr] ] ]
]

PasteButton[label_String, expr_, opts: OptionsPattern[] ] := With[{win = OptionValue["Window"], context = System`$EvaluationContext}, 
    Button[label, Print["Pasted"]; Block[{System`$EvaluationContext = context}, CellPrint[expr] ] ]
]

PasteButton[expr_, opts: OptionsPattern[] ] := With[{win = OptionValue["Window"], uid = CreateUUID[], context = System`$EvaluationContext}, 
    EventHandler[uid, {
        "Click" -> Function[Null,
            Print["Pasted"];
            Block[{System`$EvaluationContext = context}, CellPrint[expr] ]
        ]
    }];
    Pane[Panel[expr], "Event"->uid]
]

PasteButton[label_, expr_, opts: OptionsPattern[] ] := With[{win = OptionValue["Window"], uid = CreateUUID[], context = System`$EvaluationContext}, 
    EventHandler[uid, {
        "Click" -> Function[Null,
            Print["Pasted"];
            Block[{System`$EvaluationContext = context}, CellPrint[expr] ]
        ]
    }];
    Pane[Panel[label], "Event"->uid]
]



Options[PasteButton] = {"Window" :> CurrentWindow[]}


Unprotect[ClickToCopy]
ClearAll[ClickToCopy]

Options[ClickToCopy] = {"Window" :> CurrentWindow[]}

ClickToCopy[expr_String, opts: OptionsPattern[] ] := With[{win = OptionValue["Window"]}, 
    Button[expr, Print["Copied"]; CopyToClipboard[expr, "Window"->win] ]
]

ClickToCopy[label_String, expr_, opts: OptionsPattern[] ] := With[{win = OptionValue["Window"]}, 
    Button[label, Print["Copied"]; CopyToClipboard[expr, "Window"->win] ]
]

ClickToCopy[expr_, opts: OptionsPattern[] ] := With[{win = OptionValue["Window"], uid = CreateUUID[]}, 
    EventHandler[uid, {
        "Click" -> Function[Null,
            Print["Copied"];
            CopyToClipboard[expr, "Window"->win];
        ]
    }];
    Pane[Panel[expr], "Event"->uid]
]

ClickToCopy[label_, expr_, opts: OptionsPattern[] ] := With[{win = OptionValue["Window"], uid = CreateUUID[]}, 
    EventHandler[uid, {
        "Click" -> Function[Null,
            Print["Copied"];
            CopyToClipboard[expr, "Window"->win];
        ]
    }];
    Pane[Panel[label], "Event"->uid]
]

Unprotect[PrintTemporary];
ClearAll[PrintTemporary];

PrintTemporary[args__] := Print[args];
PrintTemporary[args__] := Module[{c = EvaluationCell[], cell, ev}, 
  cell = NotebookWrite[NotebookLocationSpecifier[c, "After"],
    ExpressionCell[Row[{args}], "Output"]
  ];
  
  ev = EventHandler[c, {"State" -> Function[state, (* WARNING: this leaks memory. Check RemoteCellsKernel.wl*)
    If[state === "Idle", 
      NotebookDelete[cell];
      EventRemove[ev];
    ]
  ]}];
  Null;
] /; MatchQ[EvaluationCell[], _RemoteCellObj]

End[]
EndPackage[]
