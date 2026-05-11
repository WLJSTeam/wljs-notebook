BeginPackage["CoffeeLiqueur`Extensions`EditorView`", {"CoffeeLiqueur`Misc`Events`","CoffeeLiqueur`Misc`Events`Promise`", "CoffeeLiqueur`Misc`Parallel`", "CoffeeLiqueur`Extensions`FrontendObject`"}]

System`EditorView; (*make it available everywhere*)
System`CellView;

FrontEditorSelected::usage = "FrontEditorSelected[\"Get\"] gets the selected content.\nFrontEditorSelected[\"Set\", value] inserts or replaces content"
EditorView::usage = "EditorView[string] represents a virtual editor, that renders string expression as in input cell"

CellView::usage = "CellView[Cell[\"Hello World\", \"Output\", \"markdown\"]] renders cell expression as markdown or other subtype"

InputEditor::usage = "InputEditor[string_] _EventObject"

MMAView::usage = "MMAView[expr] returns a rasterized version of expr using Wolfram Mathematica frontened"

MMAViewAsync::usage = "Async version of MMAView"

FrontTextSelected::usage = "FrontTextSelected[\"Get\"] gets the selected text (anywhere)"

Begin["`Private`"]

MMAView[ head_[all__], opts: OptionsPattern[] ] := (
  If[Length[Kernels[] ] == 0, LaunchKernels[1] ];
  WaitAll[ParallelSubmitFunctionAsync[Function[{args, cbk},
    cbk @ Rasterize[head @@ args, opts]
  ], {all}], 60 ]
)

MMAViewAsync[ head_[all__], opts: OptionsPattern[] ] := (
  If[Length[Kernels[] ] == 0, LaunchKernels[1] ];
  ParallelSubmitFunctionAsync[Function[{args, cbk},
    cbk @ Rasterize[head @@ args, opts]
  ], {all}]
)

SetAttributes[MMAView, HoldFirst]
SetAttributes[MMAViewAsync, HoldFirst]

Options[MMAView] = {ImageSize -> Automatic}
Options[MMAViewAsync] = {ImageSize -> Automatic}


InputEditor[str_String] := With[{id = CreateUUID[]},
    EventObject[<|"Id"->id, "Initial"->str, "View"->EditorView[str, "Event"->id]|>]
]

InputEditor[] := InputEditor[""]

InputEditor[str_] := With[{id = CreateUUID[]},
    EventObject[<|"Id"->id, "Initial"->First[str], "View"->EditorView[str, "Event"->id]|>]
]

System`WLXForm;
System`ViewBox;

EditorView /: MakeBoxes[e_EditorView, WLXForm] := With[{o = CreateFrontEndObject[e]}, MakeBoxes[o, WLXForm] ]
CellView /: MakeBoxes[e_CellView, WLXForm] := With[{o = CreateFrontEndObject[e]}, MakeBoxes[o, WLXForm] ]

EditorView /: MakeBoxes[e_EditorView, StandardForm] := With[{o = CreateFrontEndObject[e]}, {out = MakeBoxes[o, StandardForm]}, 
  ViewBox[out, o]
]

CellView /: MakeBoxes[e_CellView, StandardForm] := With[{o = CreateFrontEndObject[e]}, {out = MakeBoxes[o, StandardForm]}, 
  ViewBox[out, o]
]

Options[CellView] = {"Display" -> "codemirror", "Class" -> "", "Style"->""}

End[]
EndPackage[]
