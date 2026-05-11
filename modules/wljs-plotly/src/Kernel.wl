BeginPackage["CoffeeLiqueur`Extensions`Plotly`", {
	"CoffeeLiqueur`Misc`Events`",
	"CoffeeLiqueur`Extensions`Communication`",
    "CoffeeLiqueur`Extensions`FrontendObject`"
}]

Plotly::usage = "Plotly[expr_, {var_, min_, max_}] or Plotly[{a__Association}, opts] _PlotlyInstance plots an expr using Plotly.js library"
PlotlyInstance;

PlotlyAddTraces::usage = "PlotlyAddTraces[p_PlotlyInstance, traces_List] appends new traces"
PlotlyDeleteTraces::usage = ""
PlotlyExtendTraces::usage = ""
PlotlyPrependTraces::usage = ""
PlotlyAnimate::usage = ""

PlotlyAddTraces::usage = "PlotlyAddTraces[p_PlotlyInstance, traces_List] appends new traces"
PlotlyDeleteTraces::usage = ""
PlotlyExtendTraces::usage = ""
PlotlyPrependTraces::usage = ""
PlotlyAnimate::usage = ""

PlotlyReact::usage = ""
PlotlyRestyle::usage = ""
PlotlyRelayout::usage = ""

ListPlotly::usage = "ListPlotly plots a list of expressions using Plotly.js library"
ListLinePlotly::usage = "ListLinePlotly plots a list of expressions using Plotly.js library. Supports dynamic updates"

Begin["`Private`"]

windows = CreateDataStructure["HashTable"];

Plotly[f_, range_List, op : OptionsPattern[Plot] ] := Plot[f, range, op] // Cases[#, Line[x_] :> x, All] & // ListLinePlotly[#, op] & ;

Plotly[a_Association, opts: OptionsPattern[] ] := Plotly @@ Join[{{a}}, {Join[Association[Options[Plotly] ], Association[opts] ]} ]
Plotly[a_List, opts: OptionsPattern[] ] := Plotly @@ Join[{a}, {Join[Association[Options[Plotly] ], Association[opts] ]} ]
Plotly[a_Association, layout_Association, opts: OptionsPattern[] ] := Plotly[{a}, layout, opts]
Plotly[a_List, layout_Association, opts: OptionsPattern[] ] := With[{uid = CreateUUID[]},
    windows["Insert", uid -> {"Awaiting", Null} ];
    EventHandler[uid, Function[Null, With[{win = CurrentWindow[]},
        windows["Insert", uid -> {"Alive", win} ];
        EventHandler[win, {"Closed" -> Function[Null,
            windows["Insert", uid -> {"Closed", win} ];
        ]}];
    ] ] ];

    PlotlyInstance[uid, <|"Data"->a, "Layout"->Join[Join[Association[Options[Plotly] ], Association[opts] ],  layout ]|>, CurrentWindow[] ]
]

Options[Plotly] = {"margin"->"autoexpand", ImageSize->500};

iPlotlyNewPlot;
PlotlyInstance[i_iPlotlyNewPlot, w_] := PlotlyInstance[i[[3,2]], <|"Data"->i[[1]], "Layout"->i[[2]]|>, w]

PlotlyInstance /: MakeBoxes[PlotlyInstance[uid_String, data_, w_] , StandardForm] := With[{o = CreateFrontEndObject[iPlotlyNewPlot[data["Data"], data["Layout"], "SystemEvent"->uid, Epilog->FrontInstanceReference[uid] ]]},
    {out = MakeBoxes[o, StandardForm]},
    ViewBox[RowBox[{ToString[PlotlyInstance, InputForm], "[", out, ",", ToString[w, InputForm], "]"}], o]
]

PlotlyInstance /: MakeBoxes[PlotlyInstance[uid_String, data_, _] , WLXForm] := With[{o = CreateFrontEndObject[iPlotlyNewPlot[data["Data"], data["Layout"], "SystemEvent"->uid,  Epilog->FrontInstanceReference[uid] ]]},
    MakeBoxes[o, WLXForm]
]

conditionalSend[option_, uid_, function_, args__] := If[option === Inherited, With[{state = windows["Lookup", uid]},
    Switch[state[[1]],
        "Awaiting",
            Missing["NotConnected"],

        "Alive",
            function[args, "Window"->state[[2]]],

        "Closed",
            Missing["Closed"],
              
        _,
            $Failed
    ]
],
    function[args, "Window"->option]
]

iPlotlyAddTraces;
iPlotlyDeleteTraces;
iPlotlyExtendTraces;
iPlotlyPrependTraces;
iPlotlyAnimate;
iPlotlyReact;
iPlotlyRestyle;
iPlotlyRelayout;

PlotlyInstance /: PlotlyAddTraces[ PlotlyInstance[uid_, _, win_], traces_, opts: OptionsPattern[] ] := conditionalSend[OptionValue["Window"], uid, FrontSubmit, iPlotlyAddTraces[traces], FrontInstanceReference[uid] ]
PlotlyInstance /: PlotlyDeleteTraces[ PlotlyInstance[uid_, _, win_], traces_, opts: OptionsPattern[] ] := conditionalSend[OptionValue["Window"], uid, FrontSubmit, iPlotlyDeleteTraces[traces], FrontInstanceReference[uid] ]
PlotlyInstance /: PlotlyExtendTraces[ PlotlyInstance[uid_, _, win_], traces_, arr_, opts: OptionsPattern[] ] := conditionalSend[OptionValue["Window"], uid, FrontSubmit, iPlotlyExtendTraces[traces, arr], FrontInstanceReference[uid] ]
PlotlyInstance /: PlotlyPrependTraces[ PlotlyInstance[uid_, _, win_], traces_, arr_, opts: OptionsPattern[] ] := conditionalSend[OptionValue["Window"], uid, FrontSubmit, iPlotlyPrependTraces[traces, arr], FrontInstanceReference[uid] ]

PlotlyInstance /: PlotlyAnimate[ PlotlyInstance[uid_, _, win_], traces_, arr_ , opts: OptionsPattern[] ] := conditionalSend[OptionValue["Window"], uid, FrontSubmit, iPlotlyAnimate[traces, arr], FrontInstanceReference[uid] ]

PlotlyInstance /: PlotlyReact[ PlotlyInstance[uid_, _, win_], data_, opts: OptionsPattern[] ] := conditionalSend[OptionValue["Window"], uid, FrontSubmit, iPlotlyReact[data, <||>], FrontInstanceReference[uid] ]
PlotlyInstance /: PlotlyReact[ PlotlyInstance[uid_, _, win_], data_, lay_, opts: OptionsPattern[] ] := conditionalSend[OptionValue["Window"], uid, FrontSubmit, iPlotlyReact[data, lay], FrontInstanceReference[uid] ]

PlotlyInstance /: PlotlyRestyle[ PlotlyInstance[uid_, _, win_], data_, traces_, opts: OptionsPattern[] ] := conditionalSend[OptionValue["Window"], uid, FrontSubmit, iPlotlyRestyle[data, traces], FrontInstanceReference[uid] ]
PlotlyInstance /: PlotlyRestyle[ PlotlyInstance[uid_, _, win_], data_, opts: OptionsPattern[] ] := conditionalSend[OptionValue["Window"], uid, FrontSubmit, iPlotlyRestyle[data], FrontInstanceReference[uid] ]

PlotlyInstance /: PlotlyRelayout[ PlotlyInstance[uid_, _, win_], data_, opts: OptionsPattern[] ] := conditionalSend[OptionValue["Window"], uid, FrontSubmit, iPlotlyRelayout[data], FrontInstanceReference[uid] ]


PlotlyInstance /: Delete[ PlotlyInstance[uid_, _, win_] ] := windows["KeyDrop", uid]

iListLinePlotly;
iListPlotly;

ListPlotly[i_iListPlotly] := ListPlotly @@ i
ListLinePlotly[i_iListLinePlotly] := ListLinePlotly @@ i

ListLinePlotly /: MakeBoxes[ListLinePlotly[args__], StandardForm] := With[{o = CreateFrontEndObject[iListLinePlotly[args]]}, {out = MakeBoxes[o, StandardForm]}, ViewBox[RowBox[{ToString[ListLinePlotly, InputForm], "[", out, "]"}], o]  ]
ListPlotly /: MakeBoxes[ListPlotly[args__], StandardForm] := With[{o = CreateFrontEndObject[iListPlotly[args]]}, {out = MakeBoxes[o, StandardForm]}, ViewBox[RowBox[{ToString[ListPlotly, InputForm], "[", out, "]"}], o] ]

ListLinePlotly /: MakeBoxes[ListLinePlotly[args__], WLXForm] := With[{o = CreateFrontEndObject[iListLinePlotly[args]]}, MakeBoxes[o, WLXForm]]
ListPlotly /: MakeBoxes[ListPlotly[args__], WLXForm] := With[{o = CreateFrontEndObject[iListPlotly[args]]}, MakeBoxes[o, WLXForm]]


Options[PlotlyAddTraces] = {"Window" -> Inherited}
Options[PlotlyDeleteTraces] = Options[PlotlyAddTraces]
Options[PlotlyExtendTraces] = Options[PlotlyAddTraces]
Options[PlotlyPrependTraces] = Options[PlotlyAddTraces]
Options[PlotlyAnimate] = Options[PlotlyAddTraces]

Options[PlotlyRestyle] = Options[PlotlyAddTraces]
Options[PlotlyReact] = Options[PlotlyAddTraces]
Options[PlotlyRelayout] = Options[PlotlyAddTraces]







End[]
EndPackage[]