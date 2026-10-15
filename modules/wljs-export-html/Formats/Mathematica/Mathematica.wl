BeginPackage["CoffeeLiqueur`Extensions`ExportImport`Mathematica`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`WLX`Importer`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`Notebook`Transactions`",
    "CodeParser`",
    "CoffeeLiqueur`Extensions`FrontendObject`"
}];

export;
decode;

Begin["`Internal`"];

Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];
Needs["CoffeeLiqueur`Notebook`LocalKernel`" -> "LocalKernel`"]

Needs["CoffeeLiqueur`Notebook`Cells`" -> "cell`"];
Needs["CoffeeLiqueur`Notebook`" -> "nb`"];

Needs["CoffeeLiqueur`Notebook`AppExtensions`" -> "AppExtensions`"];

System`RowBoxFlatten; (* needed to fix Kernel and Master definitions *)

Needs["CoffeeLiqueur`Notebook`Loader`" -> "loader`"];

{saveNotebook, loadNotebook, renameNotebook, cloneNotebook}         = {loader`save, loader`load, loader`rename, loader`clone};

(* Format input only. Temporarily hide WLJS decorations just as the Format
   snippet does, and accept the result only if its held meaning is unchanged. *)
formatterAvailableQ[] := formatterAvailableQ[] = (
  Quiet[Check[Needs["CodeFormatter`"], $Failed]];
  MemberQ[$Packages, "CodeFormatter`"]
)

balancedBracesQ[str_String] := StringCount[str, "[*)"] === StringCount[str, "(*]"]

formatInputSource[source_String] := Module[
  {original, masked, rules, index = 0, formatted, parsed, prefix = "wljsDecoration$" <> StringDelete[CreateUUID[], "-"]},
  If[StringTrim[source] === "" || !formatterAvailableQ[], Return[source]];
  original = Quiet[Check[ToExpression[source, InputForm, HoldComplete], $Failed]];
  If[!MatchQ[original, _HoldComplete], Return[source]];
  rules = StringCases[source,
    decoration:Shortest[
      "(*" ~~ (kind:WordCharacter..) ~~ "[*)" ~~
      (body__ /; balancedBracesQ[body]) ~~ "(*]" ~~ (endKind:WordCharacter..) ~~ "*)"
    ] /; kind === endKind :> (decoration -> (index++; prefix <> "$" <> ToString[index]))];
  masked = StringReplace[source, rules];
  formatted = Quiet[Check[TimeConstrained[
    Block[{CodeFormatter`$DefaultLineWidth = 120},
      CodeFormatter`CodeFormat[masked, CodeFormatter`Airiness -> -0.75,
        CodeFormatter`BreakLinesMethod -> "LineBreakerV2"]],
    5, $Failed], $Failed]];
  If[!StringQ[formatted], Return[source]];
  formatted = StringReplace[formatted, Reverse /@ rules];
  parsed = Quiet[Check[ToExpression[formatted, InputForm, HoldComplete], $Failed]];
  If[SameQ[heldInputSignature[original], heldInputSignature[parsed]], formatted, source]
]



(* better use this https://community.wolfram.com/groups/-/m/t/2142852 *)

transformHeadings[str_] := Which[
    StringMatchQ[str, "# "~~__],
    Cell[StringDrop[str, 2], "Title"],

    StringMatchQ[str, "## "~~__],
    Cell[StringDrop[str, 3], "Section"],

    StringMatchQ[str, "#### "~~__],
    Cell[StringDrop[str, 4], "Subsection"],

    StringMatchQ[str, "##### "~~__],
    Cell[StringDrop[str, 5], "Subsubsection"],

    True,
    str
]

dropFirstLine[s_String] := With[{l = StringSplit[s, "\n"]},
    If[Length[l] > 1,
         StringRiffle[Drop[l, 1], "\n"]
    ,
        s
    ]
]

mergeMarkdown[list_List] := Replace[SequenceReplace[list, {s1_String, s2__String} :> StringRiffle[{s1,s2}, "\n"] ], s_String :> Cell[s, "Text"], 1];

splitMarkdown[cell_cell`CellObj] := mergeMarkdown[transformHeadings /@ StringSplit[cell["Data"], "\n"] ]

OutputMarkdownQ[cell_cell`CellObj] := (cell["Display"] === "markdown") && cell`OutputCellQ[cell];
InputWolframQ[cell_cell`CellObj] := cell`InputCellQ[cell] && (language[cell["Data"] ] === "wolfram");
InputCodeCellQ[cell_cell`CellObj] := cell`InputCellQ[cell] && (language[cell["Data"] ] =!= "markdown" && language[cell["Data"] ] =!= "wolfram");


convertCell[cell_cell`CellObj?OutputMarkdownQ] := splitMarkdown[cell];
convertCell[cell_cell`CellObj] := Nothing;

language[s_String] := Which[
    StringMatchQ[s, ".md\n"~~__],
    "markdown",

    StringMatchQ[s, ".wlx\n"~~__],
    "wlx",

    StringMatchQ[s, ".html\n"~~__],
    "html",

    StringMatchQ[s, ".js\n"~~__],
    "js",

    StringMatchQ[s, ".mermaid\n"~~__],
    "mermaid",

    StringMatchQ[s, ".slide\n"~~__],
    "slides",

    StringMatchQ[s, "."~~(WordCharacter..)~~"\n"~~___],
    "unknown",

    StringMatchQ[s, (WordCharacter..)~~"."~~(WordCharacter..)~~"\n"~~___],
    "unknown",

    True,
    "wolfram"
]

convertToBoxes[s_] := With[{m = ToString[Unevaluated[s], InputForm]}, Cell[m, "Input" ] ]
convertToBoxes[s__] := convertToBoxes /@ Unevaluated[{s}]
SetAttributes[convertToBoxes, HoldAllComplete];
SetAttributes[convertToBoxes, Listable];

SplitExpression[astr_] := With[{str = StringReplace[astr, {"$Pi$"->"\[Pi]"}]},
  Select[Select[(StringTake[str, Partition[Join[{1}, #, {StringLength[str]}], 2]] &@
   Flatten[{#1 - 1, #2 + 1} & @@@
     Sort@
      Cases[
       CodeParser`CodeConcreteParse[str,
         CodeParser`SourceConvention -> "SourceCharacterIndex"][[2]],
       LeafNode[Token`Newline, _, a_] :> Lookup[a, Source, Nothing]]]), StringQ], (StringLength[#]>0) &]
];

convertCell[cell_cell`CellObj?InputWolframQ] := With[{splt = Flatten[{SplitExpression[cell["Data"] ] }]},
  With[{tomerge = With[{res = ToExpression[#, InputForm, convertToBoxes] },
    If[MatchQ[res, Cell["Null", _] ],
      Cell[#, "Input"]
    ,
      res
    ]
  ] &/@ splt},
    Cell[StringRiffle[enshureString /@ tomerge[[All, 1]], "\n"], "Input"]
  ]
]

enshureString[s_String] := s
enshureString[expr_] := ToString[expr]

convertCell[cell_cell`CellObj?InputCodeCellQ] := Cell[ dropFirstLine[ cell["Data"] ], "CodeText" ]

convertCell[_] := Nothing

export[path_, OptionsPattern[] ] := With[{
    notebook = OptionValue["Notebook"]
},
    With[{n = {Map[convertCell, notebook["Cells"] ] }// Flatten},
        Put[Notebook[n], path]
    ]
]

rootFolder = $InputFileName // DirectoryName // ParentDirectory // ParentDirectory;

export[outputPath_, notebookOnLine_nb`NotebookObj, path_, name_, ext_, settings_, proto_] := With[{},
    Module[{filename = outputPath},
        If[filename === Null, filename = path];
        If[DirectoryQ[filename], filename = FileNameJoin[{filename, name}] ];
        If[!StringMatchQ[filename, __~~".nb"],  filename = filename <> ".nb"];
        If[filename === ".nb", filename = name<>filename];
        If[DirectoryName[filename] === "", filename = FileNameJoin[{path, filename}] ];

        export[filename, "Root"->rootFolder, "Notebook" -> notebookOnLine, "Title"->name]
    ]
]

export[controls_, modals_, messager_, client_, notebookOnLine_nb`NotebookObj, path_, name_, ext_, _, _] := With[{

},
    With[{

    },

        With[{
            p = Promise[]
        },

       EventFire[modals, "SaveDialog", <|
           "Promise"->p,
           "title"->"Export as Mathematica notebook",
           "properties"->{"createDirectory", "dontAddToRecent"},
           "filters"->{<|"extensions"->"nb", "name"->"Mathematica Notebook"|>}
       |>];

       Then[p, Function[result,
           Module[{filename = If[StringQ[result], URLDecode @ result, URLDecode @ result["filePath"] ] },
               If[!StringQ[filename] || TrueQ[result["canceled"] ] || StringLength[filename] === 0,
                 Echo["Cancelled saving"]; Echo[result];
                 Return[];
               ];

                    If[!StringMatchQ[filename, __~~".nb"],  filename = filename <> ".nb"];
                    If[filename === ".nb", filename = name<>filename];
                    If[DirectoryName[filename] === "", filename = FileNameJoin[{path, filename}] ];

                    export[filename, "Root"->rootFolder, "Notebook" -> notebookOnLine, "Title"->name];
                    EventFire[messager, "Saved", "Exported to "<>filename];
                ];
            ], Function[result, Echo["Exported"]; Echo[result] ] ];

        ]
    ]
]

Options[export] = {"Root"->"", "Notebook" -> "", "Title"->""}



(* Importer *)

processString[str_String] := StringReplace[ExportString[str, "String"], "\\[NoBreak]" -> ""]

(* A BoxData list is a sequence of box fragments, not a list of expressions.
   Convert it in one request so whitespace and statement boundaries survive. *)
inputBoxes[boxes_List] := RowBox[boxes]
inputBoxes[boxes_] := boxes

parseHeldBoxes[boxes_List] := Module[{parts = parseHeldBoxes /@ boxes},
  If[AllTrue[parts, MatchQ[#, _HoldComplete] &],
    Join[HoldComplete[], Sequence @@ parts], $Failed]
]
parseHeldBoxes[box_String] /; StringMatchQ[box,
    (WhitespaceCharacter | "\[IndentingNewLine]") ...] := HoldComplete[]
parseHeldBoxes[held_HoldComplete] := Replace[held,
  HoldComplete[boxes_] :> Quiet[Check[
    ToExpression[Unevaluated[boxes], StandardForm, HoldComplete], $Failed]]]
parseHeldBoxes[boxes_] := Quiet[Check[
  ToExpression[boxes, StandardForm, HoldComplete], $Failed]]

(* StandardForm parsing treats adjacent RowBoxes as implicit multiplication,
   even when they contain separate semicolon-terminated input lines. Parse
   input lines independently, retaining native parsing for mathematical groups.
   Cached output boxes continue to use parseHeldBoxes unchanged. *)
inputNewlineQ[s_] := MemberQ[{"\[IndentingNewLine]", "\n", "\r", "\r\n"}, s]
inputWhitespaceQ[s_String] := StringMatchQ[s, (WhitespaceCharacter | "\[IndentingNewLine]") ...]
inputWhitespaceQ[_] := False

(* A statement RowBox is a syntax container, not parentheses. Flatten its
   explicit semicolons within surrounding code, including function bodies.
   Do not walk into InterpretationBox values, media, or other held literals. *)
inputStatementBoxes[RowBox[items_List]] := Module[{children = inputStatementBoxes /@ items},
  RowBox[Join @@ Map[Function[child,
    If[MatchQ[child, _RowBox] && MemberQ[child[[1]], ";"], child[[1]], {child}]], children]]
]
inputStatementBoxes[StyleBox[box_, opts___]] := StyleBox[inputStatementBoxes[box], opts]
inputStatementBoxes[FormBox[box_, form_]] := FormBox[inputStatementBoxes[box], form]
inputStatementBoxes[box_] := box

inputBoxLines[RowBox[items_List]] := Module[{content, groups},
  content = Select[items, !inputWhitespaceQ[#] &];
  If[Length[content] === 1 && MatchQ[First[content], _RowBox],
    Return[inputBoxLines[First[content]]]];
  groups = Select[SplitBy[items, inputNewlineQ],
    AnyTrue[#, !inputWhitespaceQ[#] &] &];
  RowBox /@ groups
]
inputBoxLines[StyleBox[box_, opts___]] := StyleBox[#, opts] & /@ inputBoxLines[box]
inputBoxLines[box_] := {box}
inputRowItems[RowBox[items_List]] := items
inputRowItems[box_] := {box}

parseHeldInputBoxes[HoldComplete[box_]] := parseHeldInputBoxes[Unevaluated[box]]
parseHeldInputBoxes[boxes_List] := Module[{parts = parseHeldInputBoxes /@ boxes},
  If[AllTrue[parts, MatchQ[#, _HoldComplete] &], Join[HoldComplete[], Sequence @@ parts], $Failed]
]
parseHeldInputBoxes[boxes_] := Module[{normalized, lines, parts = {}, pending = {}, parsed},
  normalized = inputStatementBoxes[boxes];
  lines = inputBoxLines[normalized];
  If[Length[lines] < 2,
    Return[If[lines === {}, HoldComplete[], parseHeldBoxes[First[lines]]]]];
  Do[
    pending = Join[pending, If[pending === {}, {}, {"\[IndentingNewLine]"}], inputRowItems[line]];
    parsed = parseHeldBoxes[RowBox[pending]];
    If[MatchQ[parsed, _HoldComplete], AppendTo[parts, parsed]; pending = {}],
    {line, lines}];
  If[pending =!= {}, Return[parseHeldBoxes[normalized]]];
  Join[HoldComplete[], Sequence @@ parts]
]

(* InputForm turns an empty line into a top-level Null. Notebook/editor blank
   lines are layout, so remove duplicate newline tokens only for validation.
   CST spans keep literal string/comment contents intact, including newlines.
   The original decorated source is retained for display and formatting. *)
parseHeldInputSource[source_String] := Module[{text = StringTrim[source], tree, spans, emptyLines, gap},
  tree = Quiet[Check[TimeConstrained[CodeParser`CodeConcreteParse[text,
    CodeParser`SourceConvention -> "SourceCharacterIndex"], 3, $Failed], $Failed]];
  spans = Sort[Cases[tree,
    CodeParser`LeafNode[Token`Newline, _, data_Association] :> data[CodeParser`Source], Infinity]];
  emptyLines = Cases[Partition[spans, 2, 1], {previous_, current_} /;
      (gap = If[current[[1]] === previous[[2]] + 1, "",
        StringTake[text, {previous[[2]] + 1, current[[1]] - 1}]];
       StringMatchQ[gap, (" " | "\t") ...]) :> current];
  If[emptyLines =!= {}, text = StringReplacePart[text, "", emptyLines]];
  Quiet[Check[ToExpression[text, InputForm, HoldComplete], $Failed]]
]

interactiveBoxesQ[boxes_] := !FreeQ[Unevaluated[boxes],
  _DynamicModuleBox | _DynamicBox | _AnimatorBox | _Manipulate`ManipulateBoxes |
    _Dynamic | _DynamicModule | _Manipulate | _Animate | _Refresh, Infinity]

(* Use only if the custom box converter cannot produce source. HoldComplete
   keeps the notebook's input from running during the fallback parse. *)
boxesConverterPath = FileNameJoin[{DirectoryName[$InputFileName], "..", "..", "..",
  "wljs-editor", "src", "BoxesConverter.wl"}];
masterBoxesConverterAvailableQ[] := masterBoxesConverterAvailableQ[] = (
  If[!MemberQ[$Packages, "BoxesConverter`"], Quiet[Check[Get[boxesConverterPath], $Failed]]];
  MemberQ[$Packages, "BoxesConverter`"]
)

(* Fallbacks and InterpretationBox values still deserve native math widgets.
   Rebox only on the pristine master, with the expression inside HoldForm.
   Do not reformat original cell text/comments or reconstruct media literals.
   Accept decoration only when it preserves the exact held input signature. *)
prettyHeldString[held_HoldComplete] := Module[{plain, boxes, candidate, parsed},
  plain = Replace[held, HoldComplete[expr_] :> ToString[Unevaluated[expr], InputForm]];
  If[FreeQ[held, _Subscript | _Sqrt | _Power | _Rational, Infinity] ||
      !FreeQ[held, _Graphics | _Graphics3D | _Image | _Image3D | _Sound, Infinity] ||
      !masterBoxesConverterAvailableQ[], Return[plain]];
  candidate = Quiet[Check[TimeConstrained[
    boxes = Replace[held, HoldComplete[expr_] :> MakeBoxes[HoldForm[expr], StandardForm]];
    With[{literal = boxes}, BoxesConverter`WLJSDisplayForm[literal]],
    3, $Failed], $Failed]];
  If[conversionFailedQ[candidate], Return[plain]];
  parsed = parseHeldInputSource[candidate];
  If[heldInputSignature[held] === heldInputSignature[parsed], candidate, plain]
]

heldInputString[boxes_] := Module[{held},
  held = parseHeldInputBoxes[boxes];
  Which[
    MatchQ[held, _HoldComplete],
      preserveInputMediaDecorations[StringRiffle[List @@ Map[
        Function[Null, prettyHeldString[HoldComplete[#]], HoldAllComplete], held], "\n"], boxes],
    True, "(* Unsupported notebook input boxes: " <>
      StringReplace[ToString[Unevaluated[boxes], InputForm],
        {"(*" -> "( *", "*)" -> "* )"}] <> " *)"
  ]
]

(* A master fallback must retain the image preview as well as its executable
   reference. StandardForm parsing consumes the decoration comments. *)
preserveInputMediaDecorations[source_String, boxes_] := Module[{decorations, rules},
  decorations = Cases[With[{literal = boxes}, HoldComplete[literal]],
    s_String /; StringStartsQ[s, "(*VB[*)(ReleaseHold[Uncompress[FrontEndRef["] :> s, Infinity];
  rules = Map[Function[decoration,
    Replace[ToExpression[decoration, InputForm, HoldComplete],
      HoldComplete[literal_] :> (ToString[Unevaluated[literal], InputForm] -> decoration)]
  ], DeleteDuplicates[decorations]];
  StringReplace[source, rules]
]

conversionFailedQ[reply_] := !StringQ[reply] ||
  StringTrim[reply] === "$Failed" || StringTrim[reply] === "$Aborted" ||
  StringContainsQ[reply, "(*Unsupported"]

(* The pristine InputForm writer normalizes syntactic differences introduced
   by parsing boxes versus source (nested products, signs and reciprocals).
   Compare that representation while the entire expression remains held. *)
heldInputSignature[held_HoldComplete] := ToString[held, InputForm, PageWidth -> Infinity]
heldInputSignature[other_] := other

(* Validate AFTER normalization: ExportString may turn a Cross into the letter
   x, and textual replacements may also change string literals. Never accept
   decorated source with a different held meaning from the original boxes. *)
convertedSource[reply_, boxes_, "Input" | "Code"] := Module[{source, original, parsed},
  If[conversionFailedQ[reply] || reply === "", Return[heldInputString[boxes]]];
  source = processString[filterBugs[reply]];
  If[StringTrim[source] =!= "", source = StringTrim[source]];
  original = parseHeldInputBoxes[boxes];
  parsed = parseHeldInputSource[source];
  If[MatchQ[parsed, _HoldComplete] &&
      (original === $Failed || SameQ[heldInputSignature[original], heldInputSignature[parsed]]),
    source, heldInputString[boxes]]
]

(* These boxes need pristine Mathematica parsing/formatting. Resolve them on
   the master and ship only literal strings inside HoldComplete to WLJS.
   Build replacement values before inserting them into the held tree. *)
prepareBoxes[boxes_] := Module[{held, positions, rules},
  held = With[{box = inputBoxes[boxes]}, HoldComplete[box]];
  positions = Position[held,
    _InterpretationBox | _GraphicsBox | _Graphics3DBox | _RasterBox |
      TemplateBox[_, "DateObject", ___], {1, Infinity}, Heads -> False];
  rules = Map[Function[position,
    position -> heldInputString[Extract[held, position, HoldComplete]]], positions];
  ReplacePart[held, rules]
]

(* Prepare cached media on the pristine master. The cell contains only a
   native FrontEndRef/ViewBox; numeric data belongs in the object store. *)
numericCompressedDataQ[data_] := MatchQ[data, HoldComplete[_List]] &&
  Cases[data, invalid : Except[_List | _Integer | _Real] :>
    HoldComplete[invalid], {1, Infinity}, Heads -> False] === {}

displayBoxes[TagBox[box_, ___] | StyleBox[box_, ___] | TooltipBox[box_, ___] |
    PaneBox[box_, ___] | FrameBox[box_, ___] | FormBox[box_, ___]] := displayBoxes[box]
displayBoxes[box_] := box

heldDisplayBoxes[HoldComplete[TagBox[box_, ___] | StyleBox[box_, ___] | TooltipBox[box_, ___] |
    PaneBox[box_, ___] | FrameBox[box_, ___] | FormBox[box_, ___]]] := heldDisplayBoxes[HoldComplete[box]]
heldDisplayBoxes[box_HoldComplete] := box

staticGraphicsOutputSource[boxes_, source_String, notebook_:None, input_:False] := Module[
  {held, compressed, rules, arrays, arrayRules, expanded, object, uid, payload, originalObject, reference},
  held = If[MatchQ[boxes, _HoldComplete],
    parseHeldBoxes[heldDisplayBoxes[boxes]], parseHeldBoxes[displayBoxes[boxes]]];
  If[!MatchQ[held, HoldComplete[_Graphics | _Graphics3D | _Image | _Image3D | _Sound]] ||
      interactiveBoxesQ[held], Return[source]];

  (* Mathematica plot boxes commonly contain CompressedData for vertices.
     The browser renderer needs numeric arrays. Uncompress with HoldComplete
     and accept only lists of numbers before putting them into the display. *)
  compressed = DeleteDuplicates[Cases[held,
    HoldPattern[CompressedData[data_String]] :> data, Infinity]];
  rules = Map[Function[data,
    Module[{decoded = Quiet[TimeConstrained[
        Uncompress[data, HoldComplete], 5, $Failed]], numbers},
      If[!numericCompressedDataQ[decoded], Return[$Failed]];
      numbers = Replace[decoded, HoldComplete[array_] :> array];
      With[{literal = data, values = numbers},
        HoldPattern[CompressedData[literal]] -> values]
    ]], compressed];
  If[MemberQ[rules, $Failed], Return[source]];
  expanded = held /. rules;

  (* Native image boxes carry atomic NumericArrays. The browser can decode
     their packed numeric contents directly; nesting them in NumericArray
     syntax makes its array reader consume an already-decoded packed array.
     Only inspect actual data objects, never evaluate a NumericArray call
     that might have been written into a notebook expression. *)
  arrays = DeleteDuplicates[Cases[expanded,
    array_NumericArray :> HoldComplete[array], Infinity]];
  arrayRules = Map[Function[item, Replace[item,
    HoldComplete[array_NumericArray] :>
      If[AtomQ[Unevaluated[array]],
        With[{literal = array, values = Normal[array]},
          HoldPattern[literal] -> values], $Failed]
  ]], arrays];
  If[MemberQ[arrayRules, $Failed], Return[source]];
  expanded = expanded /. arrayRules;
  (* Saved Mathematica boxes can encode a single tube as a batch of paths.
     WLJS's tube renderer expects the path itself. Coordinate tetrahedra also
     need explicit faces: its Tetrahedron renderer takes a center and scale.
     Rewrite only display syntax under the hold, never the original input. *)
  expanded = expanded /. {
    HoldPattern[Tube[{path:{{_, _, _}..}}, args___]] :>
      Unevaluated[Tube[path, args]],
    HoldPattern[Tetrahedron[{a:{_, _, _}, b:{_, _, _}, c:{_, _, _}, d:{_, _, _}}]] :>
      Unevaluated[GraphicsComplex[{a, b, c, a, d, b, a, c, d, b, d, c},
        Polygon[{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}, {10, 11, 12}}]]]
  };
  (* Mathematica uses None for grayscale interleaving. WLJS's image renderer
     expects a boolean and reads a grayscale matrix in interleaved mode. *)
  If[MatchQ[held, HoldComplete[_Image | _Image3D]],
    expanded = expanded /. HoldPattern[Interleaving -> None] -> (Interleaving -> True)
  ];
  (* Older notebooks label floating-point images "Real". The browser's image
     readers use the explicit storage names Real32/Real64. Change only this
     display tag; input source retains the exact original held literal. *)
  If[MatchQ[expanded, HoldComplete[Image[_, "Real", ___] | Image3D[_, "Real", ___]]],
    expanded = ReplacePart[expanded, {1, 2} -> "Real64"]
  ];
  (* CreateFrontEndObject normally evaluates its argument. Keep an inner Hold
     around imported content, including symbols with existing definitions.
     The frontend renders Hold transparently; the cached output never runs. *)
  object = Replace[expanded, HoldComplete[graphic_] :>
    CreateFrontEndObject[Hold[graphic]]];
  uid = First[object];
  rememberImportedObject[notebook, uid];
  payload = With[{id = uid}, Compress[Hold[FrontEndExecutable[id]]]];
  reference = "FrontEndRef[" <> ToString[uid, InputForm] <> "]";
  If[TrueQ[input],
    (* The preview contains browser-ready data and an extra Hold. Input must
       reconstruct the exact original literal, including NumericArray type,
       image metadata and compressed plot data, only when explicitly run.
       Store the compressed HoldComplete as a string, never as executable data. *)
    originalObject = CreateFrontEndObject[Compress[held]];
    rememberImportedObject[notebook, First[originalObject]];
    reference = "ReleaseHold[Uncompress[FrontEndRef[" <>
      ToString[First[originalObject], InputForm] <> "]]]"
  ];
  "(*VB[*)(" <> reference <> ")(*,*)(*" <> ToString[payload, InputForm] <> "*)(*]VB*)"
]

(* The importer's first save bypasses the editor's OnBeforeSave event. Attach
   each object immediately so the saved notebook works after a clean restart.
   populate Kernel too *)
rememberImportedObject[notebook_nb`NotebookObj, uid_String] := (
  If[!AssociationQ[notebook["Objects"]], notebook["Objects"] = <||>];
  notebook["Objects"] = Append[notebook["Objects"],
    uid -> <|"Public" -> CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects[uid, "Public"]|>];
  With[{ob = CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects[uid]},
    GenericKernel`SendAsync[notebook["Evaluator"]["Kernel"], CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects[uid] = ob;];
  ];
  notebook["ObjectFields"] = Union[notebook["ObjectFields"], {"Objects"}];
)
rememberImportedObject[_, _] := Null

convertedSource[reply_, boxes_, "Output", notebook_:None] := Module[{source},
  source = staticGraphicsOutputSource[boxes, "", notebook];
  If[source =!= "", source,
    If[interactiveBoxesQ[boxes] || conversionFailedQ[reply], "", processString[filterBugs[reply]]]]
]
convertedSource[reply_, _, _] := If[StringQ[reply], reply, ""]

convert[Cell[input_String, "Input" | "Code", ___], notebook_, kernel_] :=
  cell`CellObj["Data"->formatInputSource[convertedSource[input, input, "Input"]],
    "Type"->"Input", "Notebook"->notebook ];


filterBugs[s_String] := Module[{p = s},
  StringReplace[p, {
    "×" -> " * ",
    "(
)" -> "()"
  }]
]




emitConvertedCell[reply_, boxes_, type_, notebook_] :=
  With[{source = If[type === "Output", convertedSource[reply, boxes, type, notebook],
      formatInputSource[convertedSource[reply, boxes, type]]]},
    If[type =!= "Output" || StringTrim[source] =!= "",
      cell`CellObj["Data"->source, "Type"->(type/.{"Code"->"Input"}), "Notebook"->notebook]
    ]
  ]

(* Replace literal media before ANY box-to-source conversion or formatting.
   Work on box positions, so Image[...] constructors elsewhere in an input
   remain code rather than being mistaken for embedded image literals. *)
prepareMediaBoxes[boxes_, notebook_, input_:False] := Module[{held, positions, rules = {}, source},
  held = With[{literal = boxes}, HoldComplete[literal]];
  positions = Position[held,
    _GraphicsBox | _Graphics3DBox | _RasterBox | _InterpretationBox | _TagBox,
    {1, Infinity}, Heads -> False];
  Do[
    If[!AnyTrue[rules, Function[rule, Take[position, UpTo[Length[First[rule]]]] === First[rule]]],
      source = staticGraphicsOutputSource[Extract[held, position, HoldComplete], "", notebook, input];
      If[source =!= "", AppendTo[rules, position -> If[TrueQ[input], RowBox[{source}], source]]]
    ],
    {position, SortBy[positions, Length]}
  ];
  Replace[ReplacePart[held, rules], HoldComplete[literal_] :> literal]
]

convert[Cell[BoxData[boxes_], type: ("Input" | "Output" | "Code"), ___], notebook_, kernel_] := Module[
  {p = Promise[], source, prepared = boxes},
  If[type === "Output",
    source = staticGraphicsOutputSource[boxes, "", notebook];
    If[source =!= "",
      cell`CellObj["Data" -> source, "Type" -> "Output", "Notebook" -> notebook];
      EventFire[p, Resolve, True];
      Return[p]
    ];
    If[interactiveBoxesQ[boxes], Return[]];
    prepared = prepareMediaBoxes[boxes, notebook]
  ,
    prepared = prepareMediaBoxes[boxes, notebook, True]
  ];
  With[{promise = p, preparedBoxes = prepared},
    Then[convertInPlace[preparedBoxes, kernel], Function[reply,
      emitConvertedCell[reply, preparedBoxes, type, notebook];
      EventFire[promise, Resolve, True];
    ], Function[error,
      emitConvertedCell[$Failed, preparedBoxes, type, notebook];
      EventFire[promise, Resolve, True];
    ]];
  ];
  p
]

takeFirst[expr_, ___] := expr

toStringFormExperimental[boxes_] := Module[{},
  With[{r = Quiet[Check[ToExpression[boxes, StandardForm, HoldForm], $Failed]]},
    If[r === $Failed,
      If[MatchQ[boxes, StyleBox[_String, ___] ],
        Return[boxes[[1]]];
      ];
      Return[""];
    ];



    StringJoin[" ", ToString[r], " "]
  ]


]

toStringFormExperimental[s_String] := s

primeFunctionBoxQ[boxes_] := !FreeQ[boxes,
  RowBox[{_, primes_String /;
    StringMatchQ[primes, RegularExpression["'+"]]}], Infinity]

inlinePrimeTeX[boxes_] := StringReplace[
  ToString[DisplayForm[boxes], TeXForm],
  "\\text{''}" -> "^{\\prime\\prime}"]

toStringFormExperimental[boxes_BoxData] := Module[{r, tex},
  If[MatchQ[boxes[[1]], FormBox[_, TraditionalForm]] &&
      primeFunctionBoxQ[boxes[[1]]],
    tex = Quiet[Check[inlinePrimeTeX[boxes[[1]]], $Failed]];
    If[StringQ[tex], Return[" $" <> tex <> "$ "]]
  ];
  r = Quiet[Check[ToExpression[boxes[[1]], StandardForm, HoldForm], $Failed]];
  If[r === $Failed,
    If[MatchQ[boxes[[1]], FormBox[_, _]],
      tex = Quiet[Check[ToString[DisplayForm[boxes[[1]]], TeXForm], $Failed]];
      If[StringQ[tex], Return[" $" <> tex <> "$ "]];
    ];
    Return[toStringFormExperimental[boxes[[1]]]];
  ];
  StringJoin[" $", ToString[r // TeXForm, InputForm], "$ "]
]

toStringFormExperimental[FormBox[b_, _]] := toStringFormExperimental[b]
toStringFormExperimental[RotationBox[b_, ___]] := toStringFormExperimental[b]

toStringFormExperimental[StyleBox[s_, FontWeight->"Bold"] ] := With[{str = toStringFormExperimental[s] },
  StringTemplate["<b>``</b>"][str]
]

toStringFormExperimental[StyleBox[s_, FontSlant->"Italic"] ] := With[{str = toStringFormExperimental[s] },
  StringTemplate["<i>``</i>"][str]
]

toStringFormExperimental[StyleBox[s_, ___] ] := toStringFormExperimental[s]

toStringFormExperimental[Cell[b_BoxData, ___] ] := toStringFormExperimental[b]

toStringFormExperimental[RowBox[b_List] ] := StringJoin @@ (toStringFormExperimental /@ b)

toStringFormExperimental[ButtonBox[s_, ___] ] := toStringFormExperimental[s]

toStringFormExperimental[ButtonBox[s_, BaseStyle->"Hyperlink", ButtonData->{URL[url_String], None}, ___] ] := With[{linkLabel = toStringFormExperimental[s] },
  StringTemplate["<a href=\"``\" style=\"color:blue\" target=\"blank_\">``</a>"][url, linkLabel]
]

toStringFormExperimental[list_List] := toStringFormExperimental /@ list

toStringFormExperimental[boxes_Cell] := toStringFormExperimental[boxes[[1]]]
toStringFormExperimental[TextData[data_]] := toStringFormExperimental[data]

finalizeString[s_String] := s
finalizeString[s_] := StringJoin @@ (ToString /@ ({toStringFormExperimental[s]} // Flatten))

stringTest[s_String] := s
stringTest[_] := ""

markdownCell[r_String, notebook_] := If[StringTrim[r] =!= "",
  cell`CellObj["Data" -> ".md\n" <> r, "Type" -> "Input", "Notebook" -> notebook,
    "Props" -> <|"Hidden" -> True|>];
  cell`CellObj["Data" -> r, "Display" -> "markdown", "Type" -> "Output",
    "Notebook" -> notebook]
]

(* TextData often holds an inline Cell[BoxData[...]] without a cell style. *)
convert[Cell[TextData[c_Cell], "Text", ___], notebook_, _] :=
  markdownCell[finalizeString[c], notebook]

convert[Cell[data_, "Text", ___], notebook_, kernel_] := Module[{r = finalizeString[data ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];

  cell`CellObj["Data"->stringTest[StringJoin[".md\n", r ] ], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->stringTest[r ], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];

]

convert[Cell[s_String, "Abstract", ___], notebook_, kernel_] := Module[{r = finalizeString[s ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];

  cell`CellObj["Data"->stringTest[StringJoin[".md\n", StringTemplate["<i>``</i>"][r]  ] ], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->stringTest[ StringTemplate["<i>``</i>"][r]  ], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];
]

convert[Cell[t: TextData[data_], "Text", ___], notebook_, kernel_] := Module[{r = finalizeString[data ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];

  cell`CellObj["Data"->stringTest[StringJoin[".md\n", r  ] ], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->stringTest[ r  ], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];
]

convert[Cell[t: TextData[data_List], "Text", ___], notebook_, kernel_] := Module[{r = finalizeString[data ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];

  cell`CellObj["Data"->stringTest[StringJoin[".md\n", r  ] ], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->stringTest[r ], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];
]

convert[Cell["", "Text", ___], notebook_, kernel_] := Null

convert[Cell[text_String, "Subsubsection", ___], notebook_, kernel_] := Module[{r = finalizeString[text ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];

  cell`CellObj["Data"->StringJoin[".md\n#### <span style=\"color:rgb(189, 117, 60)\">", r, "</span>"], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->StringJoin["#### <span style=\"color:rgb(189, 117, 60)\">", r, "</span>"], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];
]

convert[Cell[text_String, "Subsection", ___], notebook_, kernel_] := Module[{r = finalizeString[text ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];

  cell`CellObj["Data"->StringJoin[".md\n### <span style=\"color:rgb(189, 117, 60)\">", r, "</span>"], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->StringJoin["### <span style=\"color:rgb(189, 117, 60)\">", r, "</span>"], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];
]

convert[Cell[text_String, "Section", ___], notebook_, kernel_] := Module[{r = finalizeString[text ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];

  cell`CellObj["Data"->StringJoin[".md\n## <span style=\"color:rgb(182, 86, 36)\">", r, "</span>"], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->StringJoin["## <span style=\"color:rgb(182, 86, 36)\">", r, "</span>"], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];
]

toStrNoBx[data_] := ToString[data /. {RowBox -> StringJoin} /. {StyleBox[dta_, ___] :> dta}]

convert[Cell[text_String | TextData[StyleBox[text_, ___], ___], "Title", ___], notebook_, kernel_] := Module[{r = finalizeString[text ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];


  cell`CellObj["Data"->StringJoin[".md\n# <span style=\"color:rgb(140, 43, 29)\">", r , "</span>"], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->StringJoin["# <span style=\"color:rgb(140, 43, 29)\">", r , "</span>"], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];
]

convert[Cell[text_String | TextData[StyleBox[text_, ___], ___], "Subtitle", ___], notebook_, kernel_] := Module[{r = finalizeString[text ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];


  cell`CellObj["Data"->StringJoin[".md\n<span style=\"color:rgb(50, 50, 50); font-size:larger\">", r , "</span>"], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->StringJoin["<span style=\"color:rgb(50, 50, 50); font-size:larger\">", r , "</span>"], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];
]


convert[Cell[TextData[data_RowBox], "Text", ___], notebook_, kernel_] := Module[{r = finalizeString[data ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];

  cell`CellObj["Data"->stringTest[StringJoin[".md\n",   r] ], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->stringTest[ r  ], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];

]

(* Mathematica notebooks use additional heading styles, especially in
   documentation notebooks. These styles carry real content. *)
convert[Cell[data_, style: ("SectionTitle" | "NumberedSection"), ___], notebook_, _] :=
  With[{heading = If[style === "SectionTitle", "# ", "## "]},
    markdownCell[heading <> finalizeString[data], notebook]
  ]

convert[Cell[data_, "Chapter", ___], notebook_, _] :=
  markdownCell["# " <> finalizeString[data], notebook]

convert[Cell[data_, "CodeText", ___], notebook_, _] :=
  markdownCell[finalizeString[data], notebook]

convert[Cell[data_TextData, "Subtitle", ___], notebook_, _] :=
  markdownCell["<span style=\"font-size:larger\">" <> finalizeString[data] <> "</span>", notebook]

convert[Cell[data_TextData, "Abstract", ___], notebook_, _] :=
  markdownCell["<i>" <> finalizeString[data] <> "</i>", notebook]

convert[Cell[data_TextData, style: ("Title" | "Section" | "Subsection" | "Subsubsection"), ___], notebook_, _] :=
  With[{heading = Switch[style, "Title", "# ", "Section", "## ",
    "Subsection", "### ", "Subsubsection", "#### "]},
    markdownCell[heading <> finalizeString[data], notebook]
  ]

convert[Cell[TextData[data_] | data_String, "Item", ___], notebook_, kernel_] := Module[{r = finalizeString[data ]},
  If[StringLength[StringTrim[r] ] == 0, Return[] ];

  cell`CellObj["Data"->stringTest[StringJoin[".md\n",   StringTemplate["<ul><li>``</li></ul>"][r] ] ], "Type"->"Input", "Notebook"->notebook , "Props"-><|"Hidden"->True|>];
  cell`CellObj["Data"->stringTest[ StringTemplate["<ul><li>``</li></ul>"][r]  ], "Display"->"markdown", "Type"->"Output", "Notebook"->notebook ];

]


ApplySync[f_, w_, {first_, rest___}, final_] := f[w@@first, Function[Null, ApplySync[f,w, {rest}, final]]]
ApplySync[f_, w_, {}, final_] := final[];

convert[Cell[CellGroupData[list_List, ___], ___], notebook_, kernel_] := With[{p = Promise[]},
  ApplySync[Then, convert, {
          #, notebook, kernel
      } &/@ list, Function[Null,

      EventFire[p, Resolve, True];
  ] ];
  p
]

convertInPlace[expr_, k_] := With[{p = Promise[], prepared = prepareBoxes[expr]},
    GenericKernel`Send[k,  (
        Needs["BoxesConverter`"->None];
        EventFire[Internal`Kernel`RemoteEvent[ p // First ], Resolve,
          With[{},
            TimeConstrained[BoxesConverter`WLJSDisplayForm[prepared], 10, "$Failed"]
          ]
        ];
    )];
    p
]

decode[opts__][path_String, secondaryOpts___] := Module[{
  str, cells, objects, notebook, nb, store, options
},
With[{
    dir = DirectoryName[path],
    name = FileBaseName[path],
    promise = Promise[],
    spinner = Notifications`Spinner["Topic"->"Converting to notebook", "Body"->"Please, wait"](*`*)
},
    Echo["Convering Mathematica Notebook..."];
    nb = Import[path];


    notebook = nb`NotebookObj[];
    With[{n = notebook},
        n["Quick"] = True;
        n["HaveToSaveAs"] = True;
        n["Path"] = FileNameJoin[{dir, name<>".wln"}];
    ];


    options = Join[Association[List[opts] ], Association[ List[secondaryOpts] ] ];

    If[Length[options["Kernels"] //ReleaseHold ] === 0,
      EventFire[options["Messager"], "Error", "The converting process is not possible without working Kernels"];
      Return[promise];
    ];

    Print["requesting modal...."];
      With[{promiseRequest = Promise[]},
        Then[promiseRequest, Function[result,
          Switch[result,
              _Integer,
                With[{data = ReleaseHold[options["Kernels"] ][[result]], currentNotebook = notebook},
                  If[TrueQ[data["ContainerReadyQ"] ],
                    Echo[data];

                    currentNotebook["Evaluator"] = data["Container"];
                    EventFire[currentNotebook, "AquairedKernel", True];
                    currentNotebook["AutoconnectKernel"] = data["Hash"];
                    EventFire[options["Messager"], spinner, True];

                    ApplySync[Then, convert, {
                      #, notebook, data
                    } &/@ nb[[1]], Function[Null,
                      Then[saveNotebook[notebook["Path"], notebook, "NoCache"->True], Function[Null,
                        EventFire[promise, Resolve, notebook["Path"] ];
                        Delete /@ notebook["Cells"];
                        Delete[notebook];
                      ] ];
                    ] ];

                ,
                    EventFire[options["Messager"], "Error", "Container is not ready! Try again later"];
                ];
              ];
              ,
              _,
              EventFire[options["Messager"], "Error", "The process is not possible without a working kernel"];
          ];
        ] ];


        Print["fire!"];
        EventFire[options["Modals"], "SelectBox", <|
            "Promise"->promiseRequest, "message"->"Choose an evaluation kernel",
            "title"->"Kernel list", "list"->Map[Function[k, k["Name"]], ReleaseHold[options["Kernels"]]]
        |>];
    ];

    (**)

   promise
] ]

End[];
EndPackage[];
