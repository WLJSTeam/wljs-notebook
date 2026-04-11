BeginPackage["CoffeeLiqueur`Extensions`InputsOutputs`", {
	"CoffeeLiqueur`Misc`Events`",
	"CoffeeLiqueur`Misc`Events`Promise`",
	"CoffeeLiqueur`WLX`",
    "CoffeeLiqueur`WLX`Importer`",
	"CoffeeLiqueur`Misc`WLJS`Transport`",
	"CoffeeLiqueur`Misc`Language`",
	"CoffeeLiqueur`Extensions`EditorView`",
	"CoffeeLiqueur`Extensions`FrontendObject`",
	"CoffeeLiqueur`Extensions`Communication`"
}]

InputRange::usage = "InputRange[min, max, step:1, initial:(max+min)/2, \"Label\"->\"\", \"Topic\"->\"Default\"] _EventObject."
InputCheckbox::usage = "InputCheckbox[state_Bool, \"Label\"->, \"Description\"->, , \"Topic\"->\"Default\"] _EventObject. A standard checkbox"
InputButton::usage = "InputButton[label_String, \"Topic\"->\"Default\"] _EventObject. A standard button"

InputRaster::usage = "InputRaster[opts] _EventObject. A raster input. InputRaster[img_Image, opts] "

InputText::usage = "InputText[initial_String, opts] _EventObject"
InputFile::usage = "InputFile[opts, \"Label\"->, \"Description\"->] _EventObject"
InputTable::usage = ""
InputSelect::usage = "InputSelect[{expr1 -> val1, expr2 -> val2}, defaultexp] _EventObject"
InputRadio::usage = "InputRadio[{expr1 -> val1, expr2 -> val2}, defaultexp] _EventObject"

InputTerminal::usage = "InputTerminal[] _EventObject creates an interactive terminal element"

InputAutocomplete::usage = "InputAutocomplete[autocompleteFunction_] _EventObject"

InputGroup::usage = "groups event objects"

InputJoystick::usage = "InputJoystick[] _EventObject describes a 2D controller"

TextView::usage = "TextView[symbol_, opts] shows a dynamic text-field. A generalized low-level version of InputText"
HTMLView::usage = "HTMLView[string, opts] will be rendered as DOM. A dynamic component"
TableView::usage = "TableView[data_] A generalized view to shows big chunks of data"

WindowEventListener::usage = "WindowEventListener[eventObject] attaches eventObject to capture events from a window, where the element is placed\nWindowEventListener[\"Id\" -> eventObject] alternative form"

Begin["`Tools`"]

TemplateProcessor;
SetAttributes[TemplateProcessor, HoldFirst]

WLXProcessor;

AnonymousJavascript;
SetAttributes[AnonymousJavascript, HoldFirst]

Unprotect[Tabular];
FormatValues[Tabular] = {};

IntegrationHelper[zero_List:{0,0}][function_] := IntegrationHelper[zero, 0.01][function]
IntegrationHelper[zero_List:{0,0}, delta_][function_] := IntegrationHelper[zero, {delta, delta}][function]
IntegrationHelper[zero_List:{0,0}, delta_List][function_] := Module[{
	accumulated = zero,
	handler
},
	handler[dxy_] := (
		accumulated = accumulated + (dxy delta);
		function[accumulated]
	);

	handler
]

End[]

Begin["`Private`"]




$ContextAliases["htmlTool`"] = "CoffeeLiqueur`Extensions`InputsOutputs`Tools`";

$troot = FileNameJoin[{$RemotePackageDirectory, "templates"}];

TerminalX = ImportComponent[FileNameJoin[{$troot, "Terminal.wlx"}] ];

InputTerminal[OptionsPattern[] ] := With[{
	height = If[ListQ[#], #[[2]], #] &@ OptionValue[ImageSize],
	width = If[ListQ[#], #[[1]], #] &@ OptionValue[ImageSize],
	uid = CreateUUID[],
	suid = CreateUUID[],
	client = Unique["System`tinyXtermCli"],
	controlSymbol = Unique["System`tinyXtermControl"]
},
	EventHandler[suid, {
		"Mount" -> Function[Null,
			client = CurrentWindow[];
		],
		rest_ :> Function[data,
			Then[EventFire[uid, rest, data], Function[result,
				If[ListQ[result],
					With[{str = Select[result, StringQ]},
						If[Length[str] > 0, FrontSubmit[controlSymbol["normal", str], "Window"->client] // Quiet ]
					];
				,
					If[StringQ[result], FrontSubmit[controlSymbol["normal", result], "Window"->client] // Quiet ]
				];
			] ];
		]
	}];

	EventObject[<|"StandardOutput"->Block[{Pipe = Function[str,
		FrontSubmit[controlSymbol["normal", str], "Window"->client] // Quiet
	]}, OpenWrite[Method->"xxxInputTerminalStream"] ], "StandardError"->Block[{Pipe = Function[str,
		FrontSubmit[controlSymbol["error", str], "Window"->client] // Quiet
	] }, OpenWrite[Method->"xxxInputTerminalStream"] ], 
	"Id"->uid, "View"->HTMLView[ TerminalX[SymbolName[controlSymbol], suid, height, width], Prolog->htmlTool`TemplateProcessor[<|"instanceId" -> CreateUUID[]|>] ]|>]
]

Options[InputTerminal] = {ImageSize -> {500,200}}

DefineOutputStreamMethod["xxxInputTerminalStream",
   {
      "ConstructorFunction" -> 
   Function[{streamname, isAppend, caller, opts},
    With[{state = Unique["xxxInputTerminalStreamState"]},
     state["pipe"] = Pipe;
     state["pos"] = 0;
     state["buffer"] = {};
     {True, state}
     ] ],
  
  "CloseFunction" -> 
   Function[state,  ClearAll[state] ],
  
  "StreamPositionFunction" -> Function[state, {state["pos"], state}],

  "FlushFunction" -> Function[{state},
    Block[{$Output = {}},
        With[{str = (Join @@ state["buffer"]) // ByteArrayToString},
            If[StringLength[str] > 0 && str =!= "Null" && str =!= ">> Null" && !StringMatchQ[str, "OutputStream"~~__],
                state["pipe"][str];
            ];
        ];   
    ]; 
    state["buffer"] = {};

    {Null, state}
  ],
  
  "WriteFunction" ->
   Function[{state, bytes},
    Module[{result, nBytes},
     nBytes = Length[bytes];
     
    state["buffer"] = Append[state["buffer"], ByteArray[bytes] ];
     state["pos"] += nBytes;
     {nBytes, state}
     ]
    ]
  }
]


HTMLX = ImportComponent[FileNameJoin[{$troot, "HTML.wlx"}] ];

HTMLView[expr_List, opts: OptionsPattern[] ] := HTMLView[StringRiffle[expr, "\n"], opts]
Options[HTMLView] = {Epilog->Null, Prolog->Identity, "Style"->"", "Class"->""}

HTMLView /: MakeBoxes[w_HTMLView, frmt_] := With[{o = CreateFrontEndObject[w]}, MakeBoxes[o, frmt] ]



notString[_String] := False
notString[_List] := False
notString[_] := True

HTMLView[value_?notString, opts: OptionsPattern[] ] := With[{},
	HTMLView[ HTMLX[opts], Prolog->htmlTool`TemplateProcessor[<|"instanceId" -> CreateUUID[]|>], Epilog-> InternalElementUpdate[value, "html-string", "innerHTML"] ]
]



RangeX = ImportComponent[FileNameJoin[{$troot, "Range.wlx"}] ];

InputRange[min_?NumberQ, max_?NumberQ, step_?NumberQ, initial_?NumberQ, opts: OptionsPattern[] ] := With[{uid = OptionValue["Event"]},
	If[OptionValue["TrackedExpression"] === Null,
		EventObject[<|"Id"->uid, "Initial"->initial, "View"->HTMLView[ RangeX["Min"->min, "Max"->max, "Step"->step, "Initial"->initial, "Event"->uid, opts], Prolog->htmlTool`TemplateProcessor[<|"instanceId" -> CreateUUID[]|>] ]|>]
	,
		With[{trId = CreateUUID[]},
			If[MatchQ[OptionValue["TrackedExpression"], {_, "Debounce"}],
				EventObject[<|"Id"->uid, "Initial"->initial, "View"->HTMLView[ RangeX["Min"->min, "Max"->max, "Step"->step, "Initial"->initial, "Event"->uid, "TrackedSymbolUId"->{trId, "Debounce"}, opts], Prolog->htmlTool`TemplateProcessor[<|"instanceId" -> CreateUUID[]|>], Epilog->InternalElementCallback[trId, OptionValue["TrackedExpression"][[1]] ] ]|>]
			,
				EventObject[<|"Id"->uid, "Initial"->initial, "View"->HTMLView[ RangeX["Min"->min, "Max"->max, "Step"->step, "Initial"->initial, "Event"->uid, "TrackedSymbolUId"->trId, opts], Prolog->htmlTool`TemplateProcessor[<|"instanceId" -> CreateUUID[]|>], Epilog->InternalElementCallback[trId, OptionValue["TrackedExpression"] ] ]|>]
			]
		]
	]
]

InputRange[min_?NumberQ, max_?NumberQ, step_?NumberQ, opts: OptionsPattern[] ] := With[{middle = Round[(max + min) / 2, step]},
	InputRange[min, max, step, middle, opts]
]

InputRange[min_?NumberQ, max_?NumberQ, opts: OptionsPattern[] ] := InputRange[min, max, 1, opts ]

InputRange[EventObject[a_Association], rest__] := InputRange[rest, "Event" -> a["Id"] ]

Options[InputRange] = {Appearance->Automatic, "Label"->"", "Event":>CreateUUID[], "Topic"->"Default", "Class"->"", "Style"->"", "LabelClass"->"", "LabelStyle"->"", "CounterClass"->"", "CounterStyle"->"", "SliderClass"->"", "SliderStyle"->"", "TrackedExpression"->Null}

InputAutocompleteX = ImportComponent[FileNameJoin[{$troot, "Autocomplete.wlx"}] ];

InputAutocomplete[autocomplete_, opts: OptionsPattern[] ] := With[{},
	InputAutocomplete[autocomplete, "", opts]
]

InputAutocomplete[autocomplete_, default_String, opts: OptionsPattern[] ] := With[{},
	With[{uid = OptionValue["Event"], handler = Unique["System`xhxComplete"]},
		handler[data_String][cbk_] := autocomplete[data // URLDecode, cbk];

		EventObject[<|
	     "Id"->uid, 
	     "View"->HTMLView[ 
	       InputAutocompleteX["Event"->uid, "Default"->default, "HandlerSymbol"->handler, opts],
	       Prolog->htmlTool`TemplateProcessor[<|"instanceId" -> CreateUUID[]|>] 
	    ]|>]
	]
]

InputAutocomplete[EventObject[a_Association], rest__] := InputAutocomplete[rest, "Event" -> a["Id"] ]

Options[InputAutocomplete] = {"Label"->"", "Event":>CreateUUID[], "ClearOnSubmit"->True}

RasterX = ImportComponent[FileNameJoin[{$troot, "Raster.wlx"}] ];

InputRaster[opts: OptionsPattern[] ] := With[{id = OptionValue["Event"], topic = OptionValue["Topic"],handler = Unique["handler"], internal = CreateUUID[]},
	EventHandler[internal, {
		_ -> Function[data, 
			EventFire[id, topic, ImportString[data, "Base64"] ]
		]
	}];

	If[MatchQ[OptionValue["OverlayImage"], _Image],
		EventObject[<|"Id"->id, "View"->HTMLView[RasterX["Event"->internal, opts, "Handler"->handler],  Epilog->{OptionValue["OverlayImage"] // CreateFrontEndObject, handler}, Prolog->htmlTool`TemplateProcessor[<|"instanceId" -> CreateUUID[]|>] ]|>]
	,
		EventObject[<|"Id"->id, "View"->HTMLView[RasterX["Event"->internal, opts, "Handler"->handler],  Epilog->{handler}, Prolog->htmlTool`TemplateProcessor[<|"instanceId" -> CreateUUID[]|>] ]|>]
	]
]

InputRaster::err = "`1`";

InputRaster[img_Image, opts: OptionsPattern[] ] := With[{id = OptionValue["Event"], handler = Unique["handler"], topic = OptionValue["Topic"], internal = CreateUUID[]},
	EventHandler[internal, {
		_ -> Function[data, 
			EventFire[id, topic, ImportString[data, "Base64"] ]
		]
	}];
	
	If[MatchQ[OptionValue["OverlayImage"], _Image],
		Message[InputRaster::err, "OverlayImage is not supported if an Image was provided"];
		$Failed
	,
		EventObject[<|"Id"->id, "View"->HTMLView[RasterX["Event"->internal, opts, "Handler"->handler],  Epilog->{img // CreateFrontEndObject, handler}, Prolog->htmlTool`TemplateProcessor[<|"instanceId" -> CreateUUID[]|>] ]|>]
	]
]

InputRaster[EventObject[a_Association], rest__] := InputRaster[rest, "Event" -> a["Id"] ]
InputRaster[EventObject[a_Association], rest_]  := InputRaster[rest, "Event" -> a["Id"] ]
InputRaster[EventObject[a_Association] ]  := InputRaster["Event" -> a["Id"] ]

Options[InputRaster] = {"AllowUpdateWhileDrawing"->False, "Topic"->"Default", "Event":>CreateUUID[], ImageSize->350, Magnification->1, "OverlayImage"->None}

Knob = ImportComponent[FileNameJoin[{$troot, "Button.wlx"}] ];

InputButton[label_String:"Click", opts: OptionsPattern[] ] := With[{id = OptionValue["Event"]},
    EventObject[<|"Id"->id, "Initial"->False, "View"->HTMLView[Knob["Label"->label, "Event"->id, opts], Prolog->htmlTool`TemplateProcessor[<|"instanceId" -> CreateUUID[]|>] ]|>]
];

InputButton[EventObject[a_Association], rest__] := InputButton[rest, "Event" -> a["Id"] ]
InputButton[EventObject[a_Association], rest_]  := InputButton[rest, "Event" -> a["Id"] ]
InputButton[EventObject[a_Association] ]  := InputButton["Event" -> a["Id"] ]

Options[InputButton] = {"Class"->"", "Style"->"", "Topic"->"Default", "Event":>CreateUUID[]}

Unprotect[Button]
ClearAll[Button]

(* replacement for button *)

Button[label_, action_, opts: OptionsPattern[] ] := With[{context = System`$EvaluationContext, uid = CreateUUID[]},
	EventHandler[uid, {
        "Click" -> Function[Null,
            Block[{System`$EvaluationContext = context}, action]
        ]
    }];
    Pane[Panel[label], "Event"->uid]
]

Button[label_String, action_, opts: OptionsPattern[] ] := With[{rules = FilterRules[{opts}, Options[InputButton] ]},
	EventHandler[InputButton[label, Sequence @@ rules], Function[Null,
		action
	] ]
]



SetAttributes[Button, HoldRest]

CheckboxX = ImportComponent[FileNameJoin[{$troot, "Checkbox.wlx"}] ];

InputCheckbox[initial_:False, opts: OptionsPattern[] ] := With[{id = OptionValue["Event"]},
	EventObject[<|"Id"->id, "Initial"->initial, "View"->HTMLView[CheckboxX["Checked"->initial, "Event"->id, opts], Prolog->htmlTool`TemplateProcessor[<|"instanceId" -> CreateUUID[]|>] ]|>]
]

InputCheckbox[EventObject[a_Association], rest_]  := InputCheckbox[rest, "Event" -> a["Id"] ]
InputCheckbox[EventObject[a_Association], rest__] := InputCheckbox[rest, "Event" -> a["Id"] ]
InputCheckbox[EventObject[a_Association] ] := InputCheckbox["Event" -> a["Id"] ]

Options[InputCheckbox] = {"Label"->"", "Description"->"", "Style"->"", "Class"->"", "LabelClass"->"", "LabelStyle"->"", "Topic"->"Default", "Event":>CreateUUID[]}

TextX = ImportComponent[FileNameJoin[{$troot, "Text.wlx"}] ];

InputText[initial_:"", opts: OptionsPattern[] ] := With[{id = OptionValue["Event"]},
	EventObject[<|"Id"->id, "Initial"->initial, "View"->HTMLView[TextX[initial, "Event"->id, opts], Prolog->htmlTool`TemplateProcessor[<|"instanceId" -> CreateUUID[]|>] ]|>]
]

InputText[EventObject[a_Association], rest_]  := InputText[rest, "Event" -> a["Id"] ]
InputText[EventObject[a_Association], rest__] := InputText[rest, "Event" -> a["Id"] ]
InputText[EventObject[a_Association] ] := InputText["Event" -> a["Id"] ]

Options[InputText] = {"Label"->"", "Description"->"", "Placeholder"->"", "Topic"->"Default", "Event":>CreateUUID[], ImageSize->Automatic, "Style"->"", "Class"->"", "LabelClass"->"", "LabelStyle"->""}

TextView[value_, opts: OptionsPattern[] ] := With[{id = CreateUUID[]},
	HTMLView[ TextX["Placeholder"->"...", "UId" -> id, opts], Prolog->htmlTool`TemplateProcessor[<|"instanceId" -> CreateUUID[]|>], Epilog-> InternalElementUpdate[value, "text-string", "value"] ]
]

JoystickX = ImportComponent[FileNameJoin[{$troot, "Joystick.wlx"}] ];

InputJoystick[opts: OptionsPattern[] ] := With[{id = OptionValue["Event"]},
	EventObject[<|"Id"->id, "Initial"->{0,0}, "View"->{HTMLView[JoystickX["Event"->id, opts], Prolog->htmlTool`TemplateProcessor[<|"instanceId" -> CreateUUID[]|>] ], InternalWLXDestructor[id]}|>]
]

InputJoystick[EventObject[a_Association], rest_]  := InputJoystick[rest, "Event" -> a["Id"] ]
InputJoystick[EventObject[a_Association], rest__] := InputJoystick[rest, "Event" -> a["Id"] ]
InputJoystick[EventObject[a_Association] ] := InputJoystick["Event" -> a["Id"] ]

Options[InputJoystick] = {"Topic"->"Default", "Event":>CreateUUID[]}


TextView /: MakeBoxes[t_TextView, frmt_] := With[{o = CreateFrontEndObject[t]},
	MakeBoxes[o, frmt]
]

Options[TextView] = {"CSS"->"", "Class"->"", "Style"->"", "Label"->"", "Description"->"", "Placeholder"->"", "Event"->Null, ImageSize->Automatic, Appearance->Automatic, "LabelClass"->"", "LabelStyle"->""}





DropX = ImportComponent[FileNameJoin[{$troot, "Drop.wlx"}] ];

filechunks = <||>;
InputFile[opts: OptionsPattern[] ] := With[{id = OptionValue["Event"], internal = CreateUUID[]},
	EventHandler[internal, {
		"Transaction" -> (EventFire[id, "Transaction", #]&), (* forward to the main event *)
		"File" -> (EventFire[id, "File", #]&), (* forward to the main event *)

		"Chunk" -> Function[payload, With[{hash = StringJoin[payload["Name"], payload["Transaction"] ], chunk = payload["Chunk"] },

			If[!KeyExistsQ[filechunks, hash ], filechunks[hash] = <||>];
			filechunks[hash] = Join[filechunks[hash], <|chunk -> payload["Data"]|>];

			If[Length[Keys[filechunks[hash] ] ] === payload["Chunks"],
				With[{merged = StringJoin @@ (KeySort[filechunks[hash] ] // Values)},
					filechunks[hash] = .;
					
					EventFire[id, "File", <|"Transaction" -> payload["Transaction"], "Name" -> payload["Name"], "Data" -> merged|>];
				]
			]
		] ]
	}];

	EventObject[<|"Id"->id, "View"->HTMLView[DropX["Event"->internal, opts], Prolog->htmlTool`TemplateProcessor[<|"instanceId" -> CreateUUID[]|>] ]|>]
]

Options[InputFile] = {"Label"->"Drop file", "Event":>CreateUUID[], "Class"->""}

InputFile[EventObject[a_Association], rest_]  := InputFile[rest, "Event" -> a["Id"] ]
InputFile[EventObject[a_Association], rest__] := InputFile[rest, "Event" -> a["Id"] ]
InputFile[EventObject[a_Association] ] := InputFile["Event" -> a["Id"] ]

RadioX = ImportComponent[FileNameJoin[{$troot, "Radio.wlx"}] ];

InputRadio[apt_List, DefaultItem_:Null, opts: OptionsPattern[] ] := Module[{assoc = <||>}, 
	With[{
		id = CreateUUID[], 
		uid = OptionValue["Event"], 
		Selected = If[DefaultItem === Null,
			ToString @ Hash[apt // First // First]
		,
			ToString @ Hash[DefaultItem]
		]
	},
	Map[Function[item,
		With[{
			keyvaluename = If[MatchQ[item, _Rule],
				{ToString @ Hash[item // First], item // First, item // Last}
			,
				{ToString @ Hash[item], item, ToString[item]}
			]
		},
			assoc[keyvaluename[[1]]] = <|"Value" -> keyvaluename[[2]], "Name" -> keyvaluename[[3]]|>;
		]
	], apt];

	EventHandler[id, {_ -> Function[selected,
		EventFire[uid, OptionValue["Topic"], assoc[[selected, "Value"]] ]
	]}];

	EventObject[<|"Id"->uid, "Initial"->assoc[Selected, "Value"], "View"->HTMLView[RadioX[ "List" -> ({assoc[#, "Name"], #}&/@ Keys[assoc]), "Event"->id, "Selected"->Selected, "Label"->OptionValue["Label"], opts ], Prolog->htmlTool`TemplateProcessor[<|"instanceId" -> CreateUUID[]|>] ]|>]	
] ]

Options[InputRadio] = {"Label" -> "", "Style"->"", "Class"->"", "LabelClass"->"", "LabelStyle"->"", "ButtonClass"->"", "ButtonStyle"->"", "ContainerClass"->"", "ContainerStyle"->"", "ItemLabelClass"->"", "ItemLabelStyle"->"", "Topic" -> "Default", "Event":>CreateUUID[]}

InputRadio[EventObject[a_Association], rest_]  := InputRadio[rest, "Event" -> a["Id"] ]
InputRadio[EventObject[a_Association], rest__] := InputRadio[rest, "Event" -> a["Id"] ]

SelectX = ImportComponent[FileNameJoin[{$troot, "Select.wlx"}] ];

InputSelect[apt_List, DefaultItem_:Null, opts: OptionsPattern[] ] := Module[{assoc = <||>}, 
	With[{
		id = CreateUUID[], 
		uid = OptionValue["Event"], 
		Selected = If[DefaultItem === Null,
			ToString @ Hash[apt // First // Last]
		,
			ToString @ Hash[DefaultItem]
		]
	},
	Map[Function[item,
		With[{
			keyvaluename = If[MatchQ[item, _Rule],
				{ToString @ Hash[item // First], item // First, item // Last}
			,
				{ToString @ Hash[item], item, ToString[item]}
			]
		},
			assoc[keyvaluename[[1]]] = <|"Value" -> keyvaluename[[2]], "Name" -> keyvaluename[[3]]|>;
		]
	], apt];

	EventHandler[id, {_ -> Function[selected,
		EventFire[uid, OptionValue["Topic"], assoc[selected, "Value"] ]
	]}];

	EventObject[<|"Id"->uid, "InternalId"->id, "HashSelected"->Selected, "HashList"->Keys[(#["Name"]&/@ assoc)], "Initial"->assoc[Selected, "Value"], "View"->HTMLView[SelectX[ #["Name"]&/@ assoc, "Event"->id, "Selected"->Selected, "Label"->OptionValue["Label"], opts ], Prolog->htmlTool`TemplateProcessor[<|"instanceId" -> CreateUUID[]|>] ]|>]	
] ]

InputSelect[EventObject[a_Association], rest_]  := InputSelect[rest, "Event" -> a["Id"] ]
InputSelect[EventObject[a_Association], rest__] := InputSelect[rest, "Event" -> a["Id"] ]

Options[InputSelect] = {"Label" -> "", "Class"->"", "Style"->"", "LabelClass"->"", "LabelStyle"->"", "SelectClass"->"", "SelectStyle"->"", "Topic" -> "Default", "Event":>CreateUUID[], "TrackedExpression"->Null}

GroupX = ImportComponent[FileNameJoin[{$troot, "Group.wlx"}] ];

InputGroup[{in__EventObject}, opts: OptionsPattern[] ] := With[{evid = OptionValue["Event"], groupid = CreateUUID[]},
	inputGroup[evid] = #[[1]]["Initial"] &/@ List[in];
	
	MapIndexed[With[{n = #2[[1]]},
		EventHandler[#1, {any_ :> Function[data, 
			inputGroup[evid] = ReplacePart[inputGroup[evid], n->data];
			EventFire[evid, any, inputGroup[evid] ];
		]}] 
	]&, List[in] ]; 

	
	With[{view = HTMLView[ GroupX[opts], Epilog->HandleGroup[Table[CreateFrontEndObject[ i[[1]]["View"] ], {i, List[in]}] ] ]},
		EventObject[<|"Id"->evid, "Initial"->inputGroup[evid], "View"->view|>]
	]
];

Options[InputGroup] = {"Label" -> "", "Style"->"", "Class"->"", "LabelClass"->"", "LabelStyle"->"", "ContainerClass"->"", "ContainerStyle"->"", "Description"->"", "Event":>CreateUUID[], "Layout"->"Vertical"}

InputGroup[EventObject[a_Association], rest_]  := InputGroup[rest, "Event" -> a["Id"] ]
InputGroup[EventObject[a_Association], rest__] := InputGroup[rest, "Event" -> a["Id"] ]


AssocEventsListQ[i_] := If[AssociationQ[i],
	MatchQ[Values[i], {__EventObject}]
,
	False
]

InputGroup[in_?AssocEventsListQ, opts: OptionsPattern[] ] := With[{evid = CreateUUID[], groupid = CreateUUID[]},
	inputGroup[evid] = #[[1]]["Initial"] &/@ in;
	
	Map[With[{key = #, val = in[#]},
		EventHandler[val, {any_ :> Function[data, 
			inputGroup[evid] = Join[inputGroup[evid], <|key -> data|>];
			EventFire[evid, any, inputGroup[evid] ];
		]}] 
	]&, Keys[in] ]; 

	
	With[{view = HTMLView[ GroupX[opts], Epilog->HandleGroup[Table[CreateFrontEndObject[ i[[1]]["View"] ], {i, Values[in]}] ] ]},
		EventObject[<|"Id"->evid, "Initial"->inputGroup[evid], "View"->view|>]
	]
];


Unprotect[TableView]
ClearAll[TableView]


(* convert it to Dataset *)
TableView[list_List, opts: OptionsPattern[] ] := If[OptionValue[TableHeadings] =!= Null,
  With[{heading = OptionValue[TableHeadings]},
	Dataset[
       Map[Function[row, 
         MapIndexed[Function[{cell, index}, heading[[index//First]] -> cell], row] // Association
       ], list]
   , opts] // Quiet
  ]
,
	Dataset[list, opts]
]

TableView[data_Association, opts: OptionsPattern[] ] := Dataset[data, opts]

Options[TableView] = {TableHeadings -> Null, ImageSize->Automatic}


Dataset;

System`ProvidedOptions;


applyPatch := (
	Dataset;
	Dataset`MakeDatasetBoxes;

	Unprotect[Dataset];
	FormatValues[Dataset] = {};

	Unprotect[Tabular];
	FormatValues[Tabular] = {};

	Dataset /: MakeBoxes[d_Dataset, StandardForm] := Block[{}, If[ByteCount[d] > Internal`Kernel`$FrontEndObjectSizeLimit*1024*1024/10.0, 
		DatasetWrapperBox[d   // Normal, StandardForm] (*FIXME do not use Normal*)
	,

		With[{o = CreateFrontEndObject[d   ]},
			MakeBoxes[o, StandardForm]
		]
	] ];

	Dataset /: MakeBoxes[d_Dataset, WLXForm ] := Block[{}, If[ByteCount[d] > Internal`Kernel`$FrontEndObjectSizeLimit*1024*1024/10.0, 
		DatasetWrapperBox[d   // Normal, WLXForm] (*FIXME do not use Normal*)
	,
		With[{o = CreateFrontEndObject[d  ]},
			MakeBoxes[o, WLXForm]
		]
	] ];

	Tabular /: MakeBoxes[d_Tabular, StandardForm] := With[{
		tab = Unique["tabular"]
	},
	{
		box = ViewBox[tab, TabularPreviewBox[d] ]
	},	
		tab = d;
		box
	];

	Tabular /: MakeBoxes[d_Tabular, WLXForm] := With[
	{
		o = TabularPreviewBox[d]
	},	
		MakeBoxes[o, WLXForm]
	];		
);

applyPatch;

Internal`AddHandler["GetFileEvent",
 If[MatchQ[#, HoldComplete["Dataset`",_,_] | HoldComplete["Tabular`",_,_] ],
    applyPatch;
    (* TODO: remove this handler!!! *)
 ]&
];

Unprotect[Dataset]

System`WLXForm;

Dataset /: MakeBoxes[d_Dataset, WLXForm ] := Block[{}, If[ByteCount[d] > Internal`Kernel`$FrontEndObjectSizeLimit*1024*1024/10.0, 
	DatasetWrapperBox[d // Normal, WLXForm] (*FIXME do not use Normal*)
,
	With[{o = CreateFrontEndObject[d]},
		MakeBoxes[o, WLXForm]
	]
] ];

Dataset`MakeDatasetWLXBoxes[d_Dataset ] := Block[{}, If[ByteCount[d] > Internal`Kernel`$FrontEndObjectSizeLimit*1024*1024/10.0, 
	DatasetWrapperBox[d // Normal, WLXForm] (*FIXME do not use Normal*)
,
	With[{o = CreateFrontEndObject[d]},
		MakeBoxes[o, WLXForm]
	]
] ];

splitDataset[test_, threshold_: 0.1] := Module[
  {
    length = Length[test],
    piece, size, number, partLength, tail
  },
  
  If[length == 0, Return[{}]];

  piece = ByteCount[First[test]];
  size = ByteCount[test];

  (* Max size in bytes *)
  maxBytes = threshold * 1024 * 1024;
  
  (* How many parts to split into, but can't have more parts than elements *)
  number = Min[length, Ceiling[size / maxBytes]];
  
  (* Compute part length, at least 1 *)
  partLength = Max[1, Floor[length / number]];
  tail = length - partLength * number;

  If[tail == 0,
    Partition[test, partLength],
    Join[
      Partition[Drop[test, -tail], partLength],
      {Take[test, tail]}
    ]
  ]
]

splitDataset[test_, threshold_: 0.1] := Module[
  {
    length = Length[test],
    piece, size, number, partLength, tail
  },
  
  If[length == 0, Return[{}]];

  piece = ByteCount[First[test]];
  size = ByteCount[test];

  (* Max size in bytes *)
  maxBytes = threshold * 1024 * 1024;
  
  (* How many parts to split into, but can't have more parts than elements *)
  number = Min[length, Ceiling[size / maxBytes]];
  
  (* Compute part length, at least 1 *)
  partLength = Max[1, Floor[length / number]];
  tail = length - partLength * number;

  If[tail == 0,
    Partition[test, partLength],
    Join[
      Partition[Drop[test, -tail], partLength],
      {Take[test, tail]}
    ]
  ]
]

garbage = {};

DatasetWrapperBox[ l: List[__List], form_ ] := With[{
	parts = splitDataset[l],
	req = Unique["tableRequest"],
	event = CreateUUID[]
},

	LeakyModule[{store},
		With[{
				o = CreateFrontEndObject[ProvidedOptions[parts // First // Dataset, "RequestEvent" -> event, "RequestCallback" -> ToString[req, InputForm], "Total"->Length[l], "Parts"->Length[parts], "HashFunction"->"V2" ] ]
			},

				EventHandler[event, {
					"Part"->Function[part,
						WLJSTransportSend[req[store[[part]]], Global`$Client ] 
					],
					"Sort"->Function[spec,
						Echo[spec];
						With[{col = spec[[1]], dir = spec[[2]]},
							With[{sorted = If[dir === 0, l, SortBy[l, #[[col]]&, If[dir === -1, ReverseOrder, Order] ] ]},
								store = splitDataset[sorted];
								WLJSTransportSend[req[store[[1]]], Global`$Client ]
							]
						]
					]
				} ];

				With[{view = MakeBoxes[o, form]},
					AppendTo[garbage, Hold[store ] ];
					store = parts;
					
					view
				]
		]	
	]
]

DatasetWrapperBox[ l: List[__List], StandardForm] := With[{
	parts = splitDataset[l],
	req = Unique["tableRequest"],
	event = CreateUUID[]
},

	LeakyModule[{store},

		EventHandler[event, {
			"Part"->Function[part,
				WLJSTransportSend[req[store[[part]]], Global`$Client ] 
			],
			"Sort"->Function[spec,
				With[{col = spec[[1]], dir = spec[[2]]},
					With[{sorted = If[dir === 0, l, SortBy[l, #[[col]]&, If[dir === -1, ReverseOrder, Order] ] ]},
						store = splitDataset[sorted];
						WLJSTransportSend[req[store[[1]]], Global`$Client ]
					]
				]
			]
		} ];

		With[{
				o = CreateFrontEndObject[ProvidedOptions[parts // First // Dataset, "RequestEvent" -> event, "RequestCallback" -> ToString[req, InputForm], "Total"->Length[l], "Parts"->Length[parts], "HashFunction"->"V2" ] ]
			},
			With[{view = RowBox[{"(*VB[*)(Dataset[Join@@", ToString[store, InputForm], "])(*,*)(*", ToString[Compress[Hold[o] ], InputForm], "*)(*]VB*)"}]},
				AppendTo[garbage, Hold[store ] ];
				store = parts;
				view
			]
		]	
	]
]

DatasetWrapperBox[ l_List , form_ ] := With[{
	parts = splitDataset[l],
	req = Unique["tableRequest"],
	event = CreateUUID[]
},

	LeakyModule[{store},

		EventHandler[event, {
			"Part"-> Function[part,
				WLJSTransportSend[req[store[[part]]], Global`$Client ] 
			],
			"Sort"->Function[spec,
				With[{col = spec[[1]], dir = spec[[2]]},
					With[{sorted = If[dir === 0, l, SortBy[l, #[[col]]&, If[dir === -1, ReverseOrder, Order] ] ]},
						store = splitDataset[sorted];
						WLJSTransportSend[req[store[[1]]], Global`$Client ]
					]
				]
			]
		} ];

		With[{
				o = CreateFrontEndObject[ProvidedOptions[parts // First // Dataset, "RequestEvent" -> event, "RequestCallback" -> ToString[req, InputForm], "Total"->Length[l], "Parts"->Length[parts], "HashFunction"->"V2" ] ]
			},
				With[{view = MakeBoxes[o, form]},
					AppendTo[garbage, Hold[store ] ];
					store = parts;
					view
				]
		]	
	]
]

DatasetWrapperBox[ l_List , StandardForm] := With[{
	parts = splitDataset[l],
	req = Unique["tableRequest"],
	event = CreateUUID[]
},

	LeakyModule[{store},

		EventHandler[event, {
			"Part"->Function[part,
				WLJSTransportSend[req[store[[part]]], Global`$Client ] 
			],
			"Sort"->Function[spec,
				With[{col = spec[[1]], dir = spec[[2]]},
					With[{sorted = If[dir === 0, l, SortBy[l, #[[col]]&, If[dir === -1, ReverseOrder, Order] ] ]},
						store = splitDataset[sorted];
						WLJSTransportSend[req[store[[1]]], Global`$Client ]
					]
				]
			]
		} ];

		With[{
				o = CreateFrontEndObject[ProvidedOptions[parts // First // Dataset, "RequestEvent" -> event, "RequestCallback" -> ToString[req, InputForm], "Total"->Length[l], "Parts"->Length[parts], "HashFunction"->"V2" ] ]
			},
			With[{view = RowBox[{"(*VB[*)(Dataset[Join@@", ToString[store, InputForm],"])(*,*)(*", ToString[Compress[Hold[o] ], InputForm], "*)(*]VB*)"}]},
				AppendTo[garbage, Hold[store ] ];
				store = parts;
				view
			]
		]	
	]
]

DatasetWrapperBox[ a: Association[r: Rule[_, _List]..] , form_ ] := With[{d = Dataset[a]},
	With[{o = CreateFrontEndObject[d]},
		MakeBoxes[o, form]
	]
];

DatasetWrapperBox[ a: Association[r: Rule[_, _Association]..] , form_ ] := With[{d = Dataset[a]},
	With[{o = CreateFrontEndObject[d]},
		MakeBoxes[o, form]
	]
];

DatasetWrapperBox[ l : List[__Association] , form_] := With[{
	parts = splitDataset[l],
	req = Unique["tableRequest"],
	event = CreateUUID[],
	assocKeys = Keys[First[l]]
},

	LeakyModule[{store},

		EventHandler[event, {
			"Part"-> Function[part,
				WLJSTransportSend[req[store[[part]]], Global`$Client ] 
			],
			"Sort"->Function[spec,
				With[{col = spec[[1]], dir = spec[[2]]},
					With[{sorted = If[dir === 0, l, SortBy[l, #[assocKeys[[col]] ]&, If[dir === -1, ReverseOrder, Order] ] ]},
						store = splitDataset[sorted];
						WLJSTransportSend[req[store[[1]]], Global`$Client ]
					]
				]
			]
		} ];

		With[{
				o = CreateFrontEndObject[ProvidedOptions[parts // First // Dataset, "RequestEvent" -> event, "RequestCallback" -> ToString[req, InputForm], "Total"->Length[l], "Parts"->Length[parts], "HashFunction"->"V2" ] ]
			},
				With[{view = MakeBoxes[o, form]},
					AppendTo[garbage, Hold[store ] ];
					store = parts;
					view
				]
		]	
	]
]

$tabularRowsLimit = 126 6; (* kilobytes *)
tbView;

keyToString[s_String] := s
keyToString[n_?NumberQ] := ToString[n]
keyToString[expr_] := TextString[expr]

transformProp[a_Association] := transformProp[a["ElementType"] ]
transformProp[s_String] := {"Generic", s}
transformProp[TypeSpecifier[type_][t_TabularColumn ]  ] := If[StringQ[t["ElementType"] ],{"Generic",t["ElementType"]}, "Unknown"]
transformProp[TypeSpecifier[type_][rest__] ] := Select[Flatten[{{type, rest} /. {
	TypeSpecifier[any_][ab__] :> {any, ab}, TypeSpecifier[any_][ab_] :> {any, ab}
} /. {TabularColumn -> List}}], StringQ]

takePart[t_, size_Integer, transform_][part_Integer] :=
  With[{offset = size (part - 1)},
    transform /@ enshureNormal[Take[t, {Min[Max[offset + 1,1], Length[t] ], Min[offset + size, Length[t] ]}] ]
  ]

(* WL 14.1 does not support Normal on Tabular*)
enshureNormal[t_Tabular] := With[{n = Normal[t]},
	If[Head[n] === Tabular,
		n[[1]]
	,
		n
	]
]

enshureNormal[t_] := t

TabularPreviewBox[t_Tabular] := With[{},
	EditorView[ToString[Style["Tabular requires WL > 14.2", Red, Frame->True], StandardForm]]
] /; $VersionNumber < 14.2

TabularPreviewBox[t_Tabular] := With[{
	trueLength = Length[t],
	reduced = Max[1, Min[Min[Length[t], Floor[$tabularRowsLimit/(ByteCount[t]/(1024.0 Length[t]))] ], 200] ]
},
{
	data = enshureNormal @ Take[t, reduced],
	parts = Floor[trueLength/reduced + 0.5],
	schema = TabularSchema[t][[1]],
	req = Unique["Tabular`tabularRequest"],
	event = CreateUUID[]
},
	If[AssociationQ[data[[1]]],
		With[{
			keys = Keys[data // First]
		},
		{
			transform = Function[row, Map[Function[key, row[key] ], keys] ],
			heading = keyToString /@ keys,
			props = Function[key, transformProp[schema["ColumnProperties"][key] ] ] /@ keys
		},
			With[{out = tbView[ transform /@ data, props, heading, Context[req]<>SymbolName[req], event, trueLength, parts] // CreateFrontEndObject},
				EventHandler[event, {
					"Part"->Function[part,
						WLJSTransportSend[req[takePart[t, reduced, transform][part] ], Global`$Client ] 
					],
					"Sort"->Function[spec,
						With[{col = spec[[1]], dir = spec[[2]]},
							With[{sorted = Which[dir === 0, t, dir === 1, SortBy[t, #[keys[[col]] ]& ], True, Reverse @ enshureNormal @ SortBy[t, #[keys[[col]] ]& ] ]},
								WLJSTransportSend[req[takePart[sorted, reduced, transform][1] ], Global`$Client ]
							]
						]
					]
				} ];
				out
			]
		]
	,
		With[{
			heading = ToString /@ Range[ Length[data[[1]]] ]
		},
			With[{out = tbView[data, transformProp /@ schema["ColumnProperties"], heading, Context[req]<>SymbolName[req], event, trueLength, parts] // CreateFrontEndObject},
				EventHandler[event, {
					"Part"-> Function[part,
						WLJSTransportSend[req[takePart[t, reduced, Identity][part] ], Global`$Client ] 
					],
					"Sort"->Function[spec,
						With[{col = spec[[1]], dir = spec[[2]]},
							With[{sorted = Which[dir === 0, t, dir === 1, SortBy[t, #[[col]]& ], True, Reverse @ enshureNormal @ SortBy[t, #[[col]]& ] ]},
								WLJSTransportSend[req[takePart[sorted, reduced, Identity][1] ], Global`$Client ]
							]
						]
					]
				} ];				
				out
			]
		]
	]
]

DatasetWrapperBox[ l : List[__Association] ,  StandardForm] := With[{
	parts = splitDataset[l],
	req = Unique["tableRequest"],
	event = CreateUUID[],
	assocKeys = Keys[First[l]]
},

	LeakyModule[{store},

		EventHandler[event, {
			"Part"-> Function[part,
				WLJSTransportSend[req[store[[part]]], Global`$Client ] 
			],
			"Sort"->Function[spec,
				With[{col = spec[[1]], dir = spec[[2]]},
					With[{sorted = If[dir === 0, l, SortBy[l, #[assocKeys[[col]] ]&, If[dir === -1, ReverseOrder, Order] ] ]},
						store = splitDataset[sorted];
						WLJSTransportSend[req[store[[1]]], Global`$Client ]
					]
				]
			]
		} ];

		With[{
				o = CreateFrontEndObject[ProvidedOptions[parts // First // Dataset, "RequestEvent" -> event, "RequestCallback" -> ToString[req, InputForm],  "Total"->Length[l], "Parts"->Length[parts], "HashFunction"->"V2" ] ]
			},
			With[{view = RowBox[{"(*VB[*)(Dataset[Join@@", ToString[store, InputForm],"])(*,*)(*", ToString[Compress[Hold[o] ], InputForm], "*)(*]VB*)"}]},
				AppendTo[garbage, Hold[store ] ];
				store = parts;
				view
			]
		]	
	]
]

(* Not related to WLJS. Bugs in Wolfram Kernel *)
buggedDefs = {
	(* If TemporalData is converted to ExpressionJSON and back it rounds n to Integer, which is not suported by TemporalData *)
	TemporalData[TimeSeries, list_List, bool_, n_Integer] :> TemporalData[TimeSeries, list, bool, N[n] ] 
}

DatasetMakeBox[expr_String, uid_String] := CreateFrontEndObject[EditorView[ToString[ImportString[ToString[expr, OutputForm, CharacterEncoding -> "UTF8"], "ExpressionJSON"] /. buggedDefs, StandardForm], "ReadOnly"->True, "Selectable"->False], uid] // Quiet


listener[p_, list_, uid_] := With[{}, With[{
    rules = Map[Function[rule, rule[[1]] -> uid ], list]
},
    EventHandler[uid, list];
    EventListener[p, rules]
] ];

eventListener[w_, Rule["Closed", function_] ] := With[{c = EventClone[ w["Socket"] ]},
	EventHandler[c, {"Closed" -> function}]
]

WindowObj /: EventHandler[w_WindowObj, list_List] := With[{
	unique = Unique["WindowObjHandlers"]
},
	With[{handlers = eventListener[w, #] &/@ list},
		unique /: EventRemove[unique] := With[{},
			Print["WindowObj handlers were removed"];
			EventRemove /@ handlers;
		];
	];
	
	unique
] 

WindowObj::clone = "Clonning of WindowObj is not supported for now";

WindowObj /: EventClone[w_WindowObj] := With[{},
	Message[WindowObj::clone]
]

winScript;

WindowEventListener /: MakeBoxes[WindowEventListener[opts: OptionsPattern[] ], form: StandardForm | WLXForm] := With[{w = WindowEventListener[ OptionValue[WindowEventListener, opts, "Id"] ]}, MakeBoxes[ w, form ] ]
WindowEventListener /: MakeBoxes[WindowEventListener[event_EventObject | event_String], form: StandardForm | WLXForm] := With[{Id = If[StringQ[event], event, event["Id"] ]},
	EventHandler[Id, {"_Mounted" -> Function[Null, With[{w = CurrentWindow[]},
		EventHandler[w, {"Closed" -> Function[Null,
			EventFire[Id, "Closed", w];
		]}];
		EventFire[Id, "Mounted", w];
	] ]}];

	With[{c = CreateFrontEndObject[ winScript[Id] ]},
		MakeBoxes[c, form]
	]
] 

WindowEventListener;
Options[WindowEventListener] = {"Id"->"OptionalEventId"}

End[]
EndPackage[]

$ContextAliases["HTMLView`"] = "CoffeeLiqueur`Extensions`InputsOutputs`Tools`";
$ContextAliases["InputTable`"] = "CoffeeLiqueur`Extensions`InputsOutputs`Tools`";
$ContextAliases["InputJoystick`"] = "CoffeeLiqueur`Extensions`InputsOutputs`Tools`";
