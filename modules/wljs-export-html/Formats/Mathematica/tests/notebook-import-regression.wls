(* Run with: wolframscript -f modules/wljs-export-html/Formats/Mathematica/tests/notebook-import-regression.wls *)
testDirectory = DirectoryName[$InputFileName];
repo = testDirectory;
While[!FileExistsQ[FileNameJoin[{repo, "Packages", "Misc", "Kernel", "Events.wl"}]],
  If[ParentDirectory[repo] === repo, Print["Cannot locate WLJS repository root"]; Exit[1]];
  repo = ParentDirectory[repo]
];
SetDirectory[repo];

Quiet[Get["Packages/Misc/Kernel/Events.wl"]];
Quiet[Get["Packages/Misc/Kernel/Promise.wl"]];
Quiet[Get["modules/wljs-editor/src/FrontendObject.wl"]];
Quiet[Get["modules/wljs-editor/src/BoxesConverter.wl"]];
Quiet[Get["modules/wljs-export-html/Formats/Mathematica/Mathematica.wl"]];

checks = 0;
assert[condition_, message_] := (checks++;
  If[!TrueQ[condition], Print["FAIL: ", message]; Exit[1]]);

Clear[sentinel];
source = BoxesConverter`WLJSDisplayForm[InterpretationBox["x", Set[sentinel, 1]]];
assert[!ValueQ[sentinel] && StringContainsQ[source, "sentinel"],
  "InterpretationBox must be serialized without evaluation"];

source = CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`heldInputString[
  InterpretationBox["x", Set[sentinel, 1]]];
assert[!ValueQ[sentinel] && StringContainsQ[source, "sentinel"],
  "held input fallback must not evaluate notebook code"];

Clear[inlineSentinel];
CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`toStringFormExperimental[
  BoxData[FormBox[InterpretationBox["x", Set[inlineSentinel, 1]], StandardForm]]];
assert[!ValueQ[inlineSentinel],
  "inline TeX formatting must not evaluate InterpretationBox contents"];

assert[CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`processString[
    "Null + NullSpace"] === "Null + NullSpace",
  "input text containing Null must be preserved"];
assert[CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`processString[
    "a\[Equal]b"] === "a==b",
  "Mathematica private equality must become WLJS source"];

assert[CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convertedSource[
    "\n", "\\[IndentingNewLine]", "Input"] === "\n",
  "a newline box fragment must not fall back to Null"];

assert[BoxesConverter`WLJSDisplayForm[
    TemplateBox[<|"color" -> RGBColor[1, 0, 0]|>, "RGBColorSwatchTemplate"]] ===
    "RGBColor[1, 0, 0]", "color swatch input must retain its value"];

ClearAll[cell`CellObj];
cell`CellObj[args___] := (AppendTo[emitted, Association[args]]; Null);
(* Exercise the real preparation and callback code without starting a second
   licensed kernel. Send retains its production HoldRest contract. *)
SetAttributes[GenericKernel`Send, HoldRest];
GenericKernel`Send[Null, request_] := (lastRequest = HoldComplete[request]; request);
Internal`Kernel`RemoteEvent[id_] := id;

convertBox[box_, type_:"Input"] := (
  emitted = {};
  CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convert[
    Cell[BoxData[box], type], None, Null];
  assert[Length[emitted] === 1, "synthetic " <> type <> " cell was lost"];
  emitted[[1]]["Data"]
);
heldSource[source_String] := Quiet[Check[ToExpression[source, InputForm, HoldComplete], $Failed]];

(* Inspect actual native object storage without releasing imported content. *)
referencedDisplay[source_String] := Module[{id, stored, display},
  id = First[Cases[heldSource[source], FrontEndRef[uid_String] :> uid, Infinity]];
  stored = CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects[id, "Public"];
  display = Replace[stored, {
    Hold[CoffeeLiqueur`Extensions`FrontendObject`Internal`Compressed[data_String, {"ExpressionJSON", "ZLIB"}]] :>
      ImportByteArray[ByteArray[Developer`RawUncompress[Normal[BaseDecode[data]]]], "ExpressionJSON"],
    Hold[value_Hold] :> value
  }];
  Replace[display, Hold[value_] :> HoldComplete[Hold[value]]]
];

(* Restore input references under a hold, without running the input or image.
   Only the native object containing a compressed string is fetched here. *)
restoreInputMedia[held_HoldComplete] := Module[{ids, rules},
  ids = DeleteDuplicates[Cases[held,
    HoldPattern[ReleaseHold[Uncompress[FrontEndRef[id_String]]]] :> id, Infinity]];
  rules = Map[Function[id, With[{uid = id},
    Replace[Uncompress[FrontEndRef[id], HoldComplete],
      HoldComplete[HoldComplete[literal_]] :>
        (HoldPattern[ReleaseHold[Uncompress[FrontEndRef[uid]]]] :> Unevaluated[literal])]
  ]], ids];
  held /. rules
];

Clear[transportSentinel];
source = convertBox[RowBox[{InterpretationBox["x", transportSentinel = 1], "+", "1"}]];
assert[!ValueQ[transportSentinel] && heldSource[source] === HoldComplete[(transportSentinel = 1) + 1],
  "nested interpretation contents must keep their meaning and never execute"];
assert[FreeQ[lastRequest, _InterpretationBox | _Cell | _BoxData, Infinity],
  "the evaluation kernel must receive prepared held boxes, without cell objects"];

source = convertBox[RowBox[{"a", "\[Cross]", "b"}]];
assert[heldSource[source] === HoldComplete[Cross[a, b]],
  "Cross must not turn into multiplication or an identifier during normalization"];
source = convertBox[RowBox[{"x", "=", "\"a\[Times]b\[Equal]NullSpace\""}]];
assert[heldSource[source] === HoldComplete[x = "a\[Times]b\[Equal]NullSpace"],
  "normalization must preserve operators and Null inside string literals"];
source = convertBox[{RowBox[{"a", "=", "1", ";"}], "\[IndentingNewLine]",
  RowBox[{"b", "=", "2"}]}];
assert[heldSource[source] === HoldComplete[a = 1;, b = 2],
  "BoxData fragments must remain separate held expressions"];
Clear[lineSentinel, nextLineSentinel];
Do[
  boxes = RowBox[{"\[IndentingNewLine]", RowBox[{
    RowBox[{SubscriptBox["lineSentinel", "1"], "=", "1", ";"}],
    "\[IndentingNewLine]", RowBox[{"nextLineSentinel", "=", "2", ";"}]}]}];
  source = If[fallback,
    CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convertedSource[$Failed, boxes, "Input"],
    convertBox[boxes]];
  assert[heldSource[source] === HoldComplete[Subscript[lineSentinel, 1] = 1;, nextLineSentinel = 2;],
    "nested statement RowBoxes must remain sequential inputs, never a product"];
  assert[StringContainsQ[source, "(*SbB[*)"],
    "multiline statement conversion and fallback must retain subscript widgets"],
  {fallback, {False, True}}
];
assert[!ValueQ[lineSentinel] && !ValueQ[nextLineSentinel],
  "multiline parsing must not run imported assignments"];
assert[CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`parseHeldInputSource[
    "a;\n\nNull\n\nx=\"first\n\nsecond\""] === HoldComplete[a;, Null, x = "first\n\nsecond"],
  "blank-line validation must retain explicit Null expressions and string contents"];
Do[
  {box, expected} = example;
  source = convertBox[box];
  assert[heldSource[source] === expected,
    "input line parsing changed a continuation, function body or mathematical group"],
  {example, {
    {RowBox[{RowBox[{"a", "+", "b"}], " ", "c"}], HoldComplete[(a + b) c]},
    {RowBox[{RowBox[{"a", "+", "b"}], "\[IndentingNewLine]", "c"}], HoldComplete[a + b, c]},
    {RowBox[{"a", "+", "\[IndentingNewLine]", "b"}], HoldComplete[a + b]},
    {RowBox[{RowBox[{"lineSentinel", "=", "1", ";"}], "\[IndentingNewLine]", "a", "+", "\[IndentingNewLine]", "b"}],
      HoldComplete[lineSentinel = 1;, a + b]},
    {RowBox[{"f", "[", RowBox[{RowBox[{"lineSentinel", "=", "1", ";"}],
      "\[IndentingNewLine]", RowBox[{"nextLineSentinel", "=", "2", ";"}]}], "]"}],
      HoldComplete[f[lineSentinel = 1; nextLineSentinel = 2;]]},
    {RowBox[{"f", "[", "\[IndentingNewLine]", RowBox[{"lineSentinel", "=", "1", ";"}],
      "\[IndentingNewLine]", "nextLineSentinel", "=", "2", ";", "\[IndentingNewLine]", "]"}],
      HoldComplete[f[lineSentinel = 1; nextLineSentinel = 2;]]},
    {RowBox[{"x", "=", "\"first\nsecond\""}], HoldComplete[x = "first\nsecond"]}
  }}
];
assert[heldSource[convertBox[RowBox[{"2", "+", "3"}], "Code"]] === HoldComplete[2 + 3],
  "Code cells must follow the same source-preservation path as Input cells"];
assert[convertBox[""] === "", "empty input cells must be retained"];

(* Catch accidental evaluation when this same held tree reaches a kernel
   whose box heads have definitions, as they do in WLJS. *)
prepared = CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`prepareBoxes[
  RowBox[{FormBox["x", StandardForm], "+", InterpretationBox["y", transportSentinel = 2]}]];
Clear[boxEvaluationSentinel];
savedFormDefinitions = DownValues[FormBox];
savedInterpretationDefinitions = DownValues[InterpretationBox];
savedFormAttributes = Attributes[FormBox];
savedInterpretationAttributes = Attributes[InterpretationBox];
Unprotect[FormBox, InterpretationBox];
FormBox[___] := (boxEvaluationSentinel = True; "rewritten");
InterpretationBox[___] := (boxEvaluationSentinel = True; "rewritten");
With[{literal = prepared}, source = BoxesConverter`WLJSDisplayForm[literal]];
DownValues[FormBox] = savedFormDefinitions;
DownValues[InterpretationBox] = savedInterpretationDefinitions;
Attributes[FormBox] = savedFormAttributes;
Attributes[InterpretationBox] = savedInterpretationAttributes;
assert[!ValueQ[boxEvaluationSentinel] && !ValueQ[transportSentinel] &&
    StringContainsQ[source, "transportSentinel"],
  "evaluation-kernel box definitions must not run during held conversion"];

Do[
  source = CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convertedSource[
    reply, RowBox[{"x", "=", "1"}], "Input"];
  assert[heldSource[source] === HoldComplete[x = 1],
    "failed or partial box conversion must fall back to held input"],
  {reply, {$Failed, $Aborted, "$Failed", "$Aborted", "", "x+(*Unsupported Box*)1", "x="}}
];
source = CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`heldInputString[
  UnknownNotebookBox["*) escaped (*", "\"quoted\""]];
assert[heldSource[source] === HoldComplete[Null],
  "unparseable boxes must be preserved inside a syntactically valid comment"];
Clear[compressedSentinel];
assert[!CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`numericCompressedDataQ[
    HoldComplete[{compressedSentinel = 1}]] && !ValueQ[compressedSentinel],
  "validating compressed plot data must not evaluate nonnumeric elements"];

(* Real Mathematica boxes, including the ImageTag wrappers and NumericArrays
   emitted by MakeBoxes, must become held WLJS ViewBox display payloads. *)
staticDisplays = {
  Graphics[{Red, Disk[]}], Graphics3D[{Blue, Sphere[]}],
  Image[{{0., 1.}, {1., 0.}}],
  Image3D[{{{0., 1.}, {1., 0.}}, {{1., 0.}, {0., 1.}}}],
  Sound[SampledSoundList[{0., 0.1, -0.1, 0.}, 8000]]
};
Do[
  boxes = With[{literal = display}, MakeBoxes[literal, StandardForm]];
  source = convertBox[boxes, "Output"];
  assert[StringStartsQ[source, "(*VB[*)("],
    ToString[Head[display]] <> " output must use a rendered ViewBox"];
  assert[StringStartsQ[
      CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convertedSource[
        $Failed, boxes, "Output"], "(*VB[*)("],
    "static displays must survive an evaluation-kernel conversion failure"];
  payload = First[StringCases[source,
    "(*,*)(*" ~~ data:Shortest[__] ~~ "*)(*]VB*)" :> data]];
  assert[MatchQ[Uncompress[payload, HoldComplete], HoldComplete[Hold[_FrontEndExecutable]]],
    "the cell display payload must contain only a frontend object reference"];
  assert[StringLength[source] < 500 && StringStartsQ[source, "(*VB[*)(FrontEndRef["],
    "media cells must contain only a short reference, without embedded source"];
  rendered = referencedDisplay[source];
  expected = Replace[
    CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`parseHeldBoxes[boxes],
    HoldComplete[literal_] :> HoldComplete[Hold[literal]]];
  nativeArrays = DeleteDuplicates[Cases[expected, array_NumericArray :> array, Infinity]];
  arrayRules = Map[Function[array, With[{literal = array, values = Normal[array]},
    HoldPattern[literal] -> values]], nativeArrays];
  expected = expected /. arrayRules /. HoldPattern[Interleaving -> None] -> (Interleaving -> True);
  assert[SameQ[rendered, expected],
    ToString[Head[display]] <> " display payload changed or lost its hold"];
  assert[FreeQ[rendered, _NumericArray, Infinity],
    "image display payloads must not wrap decoded packed data in NumericArray"];
  source = convertBox[TagBox[StyleBox[boxes, FontSize -> 14], Identity], "Output"];
  assert[StringStartsQ[source, "(*VB[*)("], "wrapped static displays must render"],
  {display, staticDisplays}
];
(* Legacy saved 3D boxes use a singleton batch for Tube and four explicit
   vertices for Tetrahedron. Normalize the preview, retaining held input. *)
legacy3DBoxes = InterpretationBox["legacy 3D", Graphics3D[{
  Arrow[Tube[{{{0., 0., 0.}, {0., 0., 1.}}}, 0.02]],
  Tetrahedron[{{1, 0, 0}, {0, 1, 0}, {0, 0, 1}, {0, 0, 0}}]
}]];
source = convertBox[legacy3DBoxes, "Output"];
rendered = referencedDisplay[source];
assert[!FreeQ[rendered, HoldPattern[Arrow[Tube[{{0., 0., 0.}, {0., 0., 1.}}, 0.02]]], Infinity],
  "legacy singleton tube batches must become a renderable path"];
assert[FreeQ[rendered, _Tetrahedron, Infinity] &&
    !FreeQ[rendered, HoldPattern[GraphicsComplex[_, Polygon[faces_ /; Length[faces] === 4]]], Infinity],
  "coordinate tetrahedra must have their four explicit display faces"];
source = convertBox[legacy3DBoxes];
assert[restoreInputMedia[heldSource[source]] ===
    CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`parseHeldBoxes[legacy3DBoxes],
  "3D display compatibility must preserve the original held input literal"];
Clear[primitiveSentinel];
source = convertBox[InterpretationBox["held", Graphics3D[{
  Tetrahedron[{{primitiveSentinel = 1, 0, 0}, {0, 1, 0}, {0, 0, 1}, {0, 0, 0}}],
  Arrow[Tube[{{{primitiveSentinel = 2, 0, 0}, {0, 0, 1}}}]]
}]], "Output"];
assert[!ValueQ[primitiveSentinel] &&
    Count[referencedDisplay[source], HoldPattern[Set[primitiveSentinel, _]], Infinity] === 4,
  "3D display rewrites must not evaluate coordinates"];

largeImageBoxes = With[{literal = Image[ConstantArray[0., {64, 64}]]},
  MakeBoxes[literal, StandardForm]];
source = convertBox[largeImageBoxes, "Output"];
assert[StringLength[source] < 500 && !StringContainsQ[source, "Image[" | "Uncompress["],
  "cached images must store pixels outside the cell text"];
payload = First[StringCases[source,
  "(*,*)(*" ~~ data:Shortest[__] ~~ "*)(*]VB*)" :> data]];
assert[FreeQ[referencedDisplay[source], _Uncompress | _NumericArray, Infinity],
  "stored image data must be fully prepared for rendering"];

(* Both small and compressed native objects must retain cached data, without
   running an imported assignment or resolving existing symbol definitions. *)
Clear[cachedOutputSentinel, cachedSymbol];
cachedSymbol = 99;
source = convertBox[InterpretationBox["cached",
  Graphics[{Point[{cachedSymbol, 0}], cachedOutputSentinel = 1}]], "Output"];
assert[!ValueQ[cachedOutputSentinel] && !FreeQ[referencedDisplay[source],
    HoldPattern[cachedOutputSentinel = 1], Infinity],
  "frontend object creation must not evaluate cached expressions"];
Clear[cachedSymbol];
boxes = With[{literal = Graphics[Table[Point[{i, i}], {i, 2000}]]}, MakeBoxes[literal, StandardForm]];
source = convertBox[boxes, "Output"];
assert[StringLength[source] < 500 && MatchQ[referencedDisplay[source], HoldComplete[Hold[_Graphics]]],
  "large compressed frontend objects must round-trip outside cell text"];

boxes = With[{literal = Row[{Image[{{0., 1.}, {1., 0.}}], Graphics[Disk[]]}]},
  MakeBoxes[literal, StandardForm]];
source = convertBox[boxes, "Output"];
assert[StringLength[source] < 2000 && StringCount[source, "FrontEndRef["] === 2 &&
    StringContainsQ[source, "(*GB[*)"],
  "media nested in a Row must use references and retain its layout"];
assert[FreeQ[lastRequest, _GraphicsBox | _Graphics3DBox | _RasterBox, Infinity],
  "nested media data must not be sent to the evaluation kernel as source"];

Clear[formatSentinel];
source = "f[x_]:=Module[{a=1,b=2},If[x>0,a+x,b-x]]";
formatted = CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`formatInputSource[source];
assert[formatted =!= source && StringContainsQ[formatted, "\n"] &&
    heldSource[formatted] === heldSource[source],
  "input formatting must add readable spacing and indentation without changing meaning"];
source = convertBox[RowBox[{"formatSentinel", "=", "1"}]];
assert[!ValueQ[formatSentinel] && StringContainsQ[source, " = "],
  "input formatting must never evaluate assignments"];
assert[CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`formatInputSource["broken["] === "broken[",
  "unparseable input must survive formatting unchanged"];
decorated = BoxesConverter`WLJSDisplayForm[FractionBox["1", "2"]];
formatted = CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`formatInputSource["a=" <> decorated];
assert[StringContainsQ[formatted, decorated] &&
    heldSource[formatted] === heldSource["a=" <> decorated],
  "formatting must preserve WLJS box decorations byte for byte"];

(* Embedded media in INPUT must be compact before the formatter/remote
   converter runs, while ordinary Image[...] code remains ordinary code. *)
Do[
  boxes = With[{literal = display}, MakeBoxes[literal, StandardForm]];
  original = CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`parseHeldBoxes[boxes];
  source = convertBox[RowBox[{"embedded", "=", boxes, ";", "embedded"}]];
  parsed = restoreInputMedia[heldSource[source]];
  expected = Replace[original, HoldComplete[literal_] :> HoldComplete[embedded = literal; embedded]];
  assert[SameQ[parsed, expected] && !ValueQ[embedded],
    "embedded input media must preserve exact held semantics without assigning symbols"];
  assert[StringLength[source] < 1000 && StringContainsQ[source, "ReleaseHold[Uncompress[FrontEndRef["],
    "embedded " <> ToString[Head[display]] <> " input media must contain short references"];
  assert[FreeQ[lastRequest, _GraphicsBox | _Graphics3DBox | _RasterBox | _NumericArray, Infinity],
    "the remote converter must not receive embedded image or plot data"],
  {display, staticDisplays}
];
boxes = RowBox[{"Image", "[", RowBox[{"Abs", "[", "unassignedImageData", "]"}], "]"}];
source = convertBox[boxes];
assert[heldSource[source] === HoldComplete[Image[Abs[unassignedImageData]]] &&
    !StringContainsQ[source, "FrontEndRef["],
  "Image constructors written as code must not be replaced by stored literals"];
boxes = With[{literal = Image[ConstantArray[0., {512, 512}]]}, MakeBoxes[literal, StandardForm]];
source = convertBox[{boxes, "\[IndentingNewLine]", RowBox[{"nextStatement", "=", "1", ";"}]}];
assert[StringLength[source] < 1000 && MatchQ[restoreInputMedia[heldSource[source]],
    HoldComplete[_Image, nextStatement = 1;]] && !ValueQ[nextStatement],
  "a large image followed by another statement must stay compact and keep its newline"];

legacyImageBoxes = InterpretationBox["legacy image",
  Image[{{0., 1.}, {1., 0.}}, "Real", ColorSpace -> Automatic, Interleaving -> None]];
source = convertBox[legacyImageBoxes, "Output"];
assert[MatchQ[referencedDisplay[source], HoldComplete[Hold[Image[_, "Real64", ___]]]],
  "legacy Real images must use a supported browser display type"];
source = convertBox[legacyImageBoxes];
assert[MatchQ[restoreInputMedia[heldSource[source]], HoldComplete[Image[_, "Real", ___]]],
  "normalizing a legacy image preview must not change its original input type"];

(* Exercise the first-save path with the production WLN serializer. *)
Quiet[Get["Kernel/FileFormat.wl"]];
notebookState = <|"Objects" -> <||>, "ObjectFields" -> {}, "Cells" -> {},
  "PublicFields" -> {"ObjectFields"}|>;
nb`NotebookObj /: nb`NotebookObj["import-test"][key_String] :=
  If[key === "Properties", Keys[notebookState], notebookState[key]];
nb`NotebookObj /: Set[nb`NotebookObj["import-test"][key_String], value_] := (notebookState[key] = value);
source = CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convertedSource[
  $Failed, largeImageBoxes, "Output", nb`NotebookObj["import-test"]];
assert[Length[notebookState["Objects"]] === 1 && MemberQ[notebookState["ObjectFields"], "Objects"],
  "imported objects must be attached before the notebook's first save"];
notebookState["Cells"] = {<|"Data" -> source, "Type" -> "Output", "Properties" -> {"Data", "Type"}|>};
file = CreateTemporary[];
stream = OpenWrite[file];
CoffeeLiqueur`Notebook`FileFormat`writeNotebook[stream, nb`NotebookObj["import-test"]];
Close[stream];
stream = OpenRead[file, BinaryFormat -> True];
restored = CoffeeLiqueur`Notebook`FileFormat`readNotebook[stream];
Close[stream];
DeleteFile[file];
assert[AssociationQ[restored] && restored["Objects"] === notebookState["Objects"] &&
    restored["Cells"][[1]]["Data"] === source,
  "the first saved notebook must retain referenced object data and reload its cell"];

notebookState = <|"Objects" -> <||>, "ObjectFields" -> {}, "Cells" -> {},
  "PublicFields" -> {"ObjectFields"}|>;
Clear[embeddedInputTest];
source = CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`prepareMediaBoxes[
  RowBox[{"embeddedInputTest", "=", largeImageBoxes}], nb`NotebookObj["import-test"], True];
source = CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`heldInputString[source];
assert[Length[notebookState["Objects"]] === 2 && !ValueQ[embeddedInputTest],
  "input image source and preview must both be saved without evaluating the cell"];
notebookState["Cells"] = {<|"Data" -> source, "Type" -> "Input", "Properties" -> {"Data", "Type"}|>};
file = CreateTemporary[];
stream = OpenWrite[file];
CoffeeLiqueur`Notebook`FileFormat`writeNotebook[stream, nb`NotebookObj["import-test"]];
Close[stream];
stream = OpenRead[file, BinaryFormat -> True];
restored = CoffeeLiqueur`Notebook`FileFormat`readNotebook[stream];
Close[stream];
DeleteFile[file];
assert[restored["Objects"] === notebookState["Objects"] && restored["Cells"][[1]]["Data"] === source,
  "input image source and preview objects must survive saving and reopening"];
(* Emulate the real evaluation kernel's missing-object fetch after reload. *)
With[{savedObjects = restored["Objects"]},
  Block[{CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects = <||>,
      CoffeeLiqueur`Extensions`FrontendObject`Internal`$MissingHandler},
    CoffeeLiqueur`Extensions`FrontendObject`Internal`$MissingHandler[uid_String, "Private"] :=
      savedObjects[uid]["Public"];
    evaluatedImage = ToExpression[source, InputForm];
  ]
];
assert[ImageQ[evaluatedImage] && ImageDimensions[evaluatedImage] === {64, 64} &&
    ImageData[evaluatedImage] === ConstantArray[0., {64, 64}],
  "explicitly evaluating an imported input must reconstruct the original image after a frontend fetch"];
Clear[embeddedInputTest];

Do[
  emitted = {};
  CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convert[
    Cell[BoxData[dynamicBox], "Output"], None, Null];
  assert[emitted === {}, "dynamic output must be discarded"],
  {dynamicBox, {DynamicBox[ToBoxes[x]], DynamicModuleBox[{x = 0}, "x"],
    AnimatorBox[Dynamic[x]], TagBox[DynamicBox["x"], Identity],
    InterpretationBox["animation", Animate[x, {x, 0, 1}]],
    InterpretationBox["controls", Manipulate[x, {x, 0, 1}]]}}
];
Do[
  source = convertBox[box, "Output"];
  assert[StringLength[source] > 0 && !StringContainsQ[source, "Unsupported"],
    "ordinary mathematical and layout outputs must be retained"],
  {box, {RowBox[{"x", "\[Equal]", "y"}], FractionBox["1", "2"],
    GridBox[{{"1", "2"}, {"3", "4"}}, DefaultBaseStyle -> "Matrix"],
    GridBox[{{"a", "b"}}], GridBox[{{"a"}, {"b"}}]}}
];
mathBoxes = RowBox[{SubscriptBox["x", "i"], "+",
  FractionBox[SqrtBox[RowBox[{"1", "+", SuperscriptBox["x", "2"]}]], "2"]}];
Do[
  source = convertBox[mathBoxes, type];
  assert[AllTrue[{"(*SbB[*)", "(*SqB[*)", "(*SpB[*)", "(*FB[*)"}, StringContainsQ[source, #] &],
    type <> ": nested subscripts, roots, powers and fractions must keep their widgets"];
  assert[heldSource[source] ===
      CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`parseHeldBoxes[mathBoxes],
    type <> ": math widgets must retain held meaning"],
  {type, {"Input", "Output"}}
];
Do[
  source = convertBox[InterpretationBox["math", Subscript[x, i] + Sqrt[1 + x^2]/2], type];
  assert[AllTrue[{"(*SbB[*)", "(*SqB[*)", "(*SpB[*)", "(*FB[*)"}, StringContainsQ[source, #] &],
    type <> ": InterpretationBox math must retain native widgets"],
  {type, {"Input", "Output"}}
];
source = CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convertedSource[
  $Failed, mathBoxes, "Input"];
assert[AllTrue[{"(*SbB[*)", "(*SqB[*)", "(*SpB[*)", "(*FB[*)"}, StringContainsQ[source, #] &],
  "the master fallback must retain math widgets"];
Clear[mathSentinel];
source = convertBox[InterpretationBox["held math", Subscript[x, mathSentinel = 1] + Sqrt[mathSentinel = 2]]];
assert[!ValueQ[mathSentinel] && heldSource[source] ===
    HoldComplete[Subscript[x, mathSentinel = 1] + Sqrt[mathSentinel = 2]],
  "math prettification must not evaluate assignments inside boxes"];
source = convertBox[FractionBox["a", "b", MultilineFunction -> None], "Output"];
assert[StringContainsQ[source, "(*FB[*)"], "fraction box options must not remove the fraction widget"];
Do[
  boxes = With[{literal = layout}, MakeBoxes[literal, StandardForm]];
  source = convertBox[boxes, "Output"];
  assert[StringContainsQ[source, "(*GB[*)"] && !StringContainsQ[source, "Unsupported"],
    ToString[Head[layout]] <> " output must retain its rendered grid layout"],
  {layout, {Row[{aa, bb, cc}], Row[{aa, bb, cc}, ","], Column[{aa, bb, cc}],
    Grid[{{aa, bb}, {cc, dd}}], MatrixForm[{{aa, bb}, {cc, dd}}]}}
];
Print["Synthetic held transport, source semantics, static displays and dynamic-output checks passed"];

savedConverterDefinitions = DownValues[CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convertInPlace];
ClearAll[CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convertInPlace];
CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convertInPlace[_, _] :=
  With[{p = Promise[]}, EventFire[p, Reject, $Failed]; p];
emitted = {}; completed = False;
Then[CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convert[
  Cell[BoxData[RowBox[{"x", "=", "1"}]], "Input"], None, Null],
  Function[Null, completed = True]];
assert[completed && Length[emitted] === 1 &&
    heldSource[emitted[[1]]["Data"]] === HoldComplete[x = 1],
  "a rejected conversion must preserve input and resolve the notebook walk"];
emitted = {}; completed = False;
Then[CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convert[
  Cell[BoxData[largeImageBoxes], "Input"], None, Null],
  Function[Null, completed = True]];
assert[completed && Length[emitted] === 1 && StringLength[emitted[[1]]["Data"]] < 1000 &&
    StringContainsQ[emitted[[1]]["Data"], "(*VB[*)"] &&
    MatchQ[restoreInputMedia[heldSource[emitted[[1]]["Data"]]], HoldComplete[_Image]],
  "a rejected conversion must preserve compact input image references"];
DownValues[CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convertInPlace] = savedConverterDefinitions;
assert[convertBox[RowBox[{"2", "+", "3"}], "Output"] === "2+3",
  "the rejection fixture must restore the production converter"];

(* Follow notebook cell groups, but do not count inline Cell objects in TextData. *)
structuralCells[list_List] := Flatten[structuralCells /@ list, 1];
structuralCells[Cell[CellGroupData[list_List, ___], ___]] := structuralCells[list];
structuralCells[c_Cell] := {c};
structuralCells[_] := {};

styles = {"Text", "Abstract", "Title", "Subtitle", "SectionTitle",
  "NumberedSection", "Chapter", "CodeText", "Section", "Subsection", "Subsubsection", "Item"};
Do[
  i = Switch[FileBaseName[path],
    "differential_equations" | "differential_equations_multiline" | "differential_equations_import_only", 1,
    "christoffel_symbols_and_geodesics" | "christoffel_symbols_and_geodesics_multiline", 2,
    "crystal_structure_visualization", 3, _, 0];
  If[FileExistsQ[path],
    emitted = {};
    notebook = Import[path];
    cells = structuralCells[notebook[[1]]];
    styled = Cases[cells,
      c:Cell[_, s_String, ___] /; MemberQ[styles, s] && !MatchQ[c, Cell["", ___]] :> c];
    Quiet[Scan[CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convert[
      #, notebook, Null] &, styled]];
    actual = Count[emitted, a_Association /; Lookup[a, "Display", None] === "markdown"];
    assert[actual === Length[styled], path <> ": a styled cell was lost"];
    If[i === 1,
      assert[AnyTrue[emitted,
          StringContainsQ[Lookup[#, "Data", ""], "\\frac{d^n"] &],
        "differential_equations: TraditionalForm inline math was flattened instead of rendered as TeX"];
      assert[AnyTrue[emitted,
          StringContainsQ[Lookup[#, "Data", ""],
            "x f^{\\prime\\prime}(x)=x^2"] &],
        "differential_equations: f''(x) must retain its argument parentheses"];
      assert[AnyTrue[emitted,
          StringContainsQ[Lookup[#, "Data", ""], "f'(0)=5"] &],
        "differential_equations: f'(0) must retain its argument parentheses"]
    ];
    Print[path, ": ", actual, " styled cells retained"];

    emitted = {};
    inputs = Cases[cells, c:Cell[_, "Input", ___] :> c];
    Quiet[Scan[CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convert[
      #, notebook, Null] &, inputs]];
    actual = Count[emitted, a_Association /; Lookup[a, "Type", None] === "Input"];
    assert[actual === Length[inputs], path <> ": an input cell was lost"];
    assert[AllTrue[emitted, StringQ[Lookup[#, "Data", None]] &],
      path <> ": an input cell has no source string"];
    If[i === 1,
      assert[AnyTrue[emitted,
          StringContainsQ[Lookup[#, "Data", ""], RegularExpression["eqn\\s*="]] &&
          StringContainsQ[Lookup[#, "Data", ""], RegularExpression["\n\\s*ibc\\s*="]] &&
          !StringContainsQ[Lookup[#, "Data", ""], "Nullibc="] &],
        "differential_equations: multiline input statements must remain separated"];
      pdeSource = SelectFirst[emitted,
        StringContainsQ[Lookup[#, "Data", ""], RegularExpression["eqn\\s*="]] &&
          StringContainsQ[Lookup[#, "Data", ""], RegularExpression["ibc\\s*="]] &]["Data"];
      pdeHeld = CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`parseHeldInputSource[pdeSource];
      assert[Length[pdeHeld] === 3 &&
          Cases[pdeHeld, HoldPattern[Set[lhs:(eqn | ibc | sln), _]] :> HoldComplete[lhs], Infinity] ===
            {HoldComplete[eqn], HoldComplete[ibc], HoldComplete[sln]},
        "differential_equations: PDE, initial conditions and solution must remain three ordered statements"]
    ];
    If[i === 2,
      affineSource = SelectFirst[emitted,
        StringContainsQ[Lookup[#, "Data", ""], RegularExpression["affine\\s*:="]] &]["Data"];
      affineHeld = CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`parseHeldInputSource[affineSource];
      assert[MatchQ[affineHeld, HoldComplete[SetDelayed[affine, Set[affine,
          Simplify[Table[_, {i, 1, n}, {j, 1, n}, {k, 1, n}]]]]]] &&
          Count[affineHeld, _D, Infinity] === 3 && Count[affineHeld, _Sum, Infinity] === 1,
        "christoffel_symbols_and_geodesics: wrapped affine derivative/sum/table structure changed"];
      metricSource = SelectFirst[emitted,
        StringContainsQ[Lookup[#, "Data", ""], RegularExpression["^metric\\s*="]] &]["Data"];
      assert[MatchQ[CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`parseHeldInputSource[metricSource],
          HoldComplete[Set[metric, {{_, _, _, _}, {_, _, _, _}, {_, _, _, _}, {_, _, _, _}}]]],
        "christoffel_symbols_and_geodesics: the metric must remain a four-by-four matrix assignment"];
      geodesicSource = SelectFirst[emitted,
        StringContainsQ[Lookup[#, "Data", ""], RegularExpression["geodesic\\s*:="]] &]["Data"];
      geodesicHeld = CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`parseHeldInputSource[geodesicSource];
      assert[MatchQ[geodesicHeld, HoldComplete[SetDelayed[geodesic, Set[geodesic,
          Simplify[Table[_, {i, 1, n}]]]]]] && Count[geodesicHeld, _Sum, Infinity] === 1,
        "christoffel_symbols_and_geodesics: wrapped geodesic definition changed"]
    ];
    If[i === 3,
      assert[AnyTrue[emitted, MatchQ[restoreInputMedia[heldSource[Lookup[#, "Data", ""]]], HoldComplete[_Graphics3D]] &],
        "crystal_structure_visualization: Graphics3D input was not preserved"];
      assert[AnyTrue[emitted,
          StringContainsQ[Lookup[#, "Data", ""], RegularExpression["^colors\\s*=\\s*<\\|"]] &&
          StringContainsQ[Lookup[#, "Data", ""], RegularExpression["\n\\s*radius\\s*="]] &],
        "crystal_structure_visualization: association syntax and multiline input were not preserved"]
    ];
    Print[path, ": ", actual, " input cells retained"];

    If[FileBaseName[path] === "full_formula_multiline" ||
        StringStartsQ[FileBaseName[path], FromCharacterCode[{1055, 1054, 1051, 1053, 1040, 1071}]],
      firstSource = First[emitted]["Data"];
      firstHeld = CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`parseHeldInputSource[firstSource];
      assert[Length[firstHeld] === 13 && FreeQ[firstHeld,
          HoldPattern[Times[___, _CompoundExpression, ___]], Infinity],
        "full formula: its first input must retain 13 sequential statements"];
      assert[Cases[firstHeld, HoldPattern[Set[lhs_, _]] :> HoldComplete[lhs], Infinity] ===
          {HoldComplete[Subscript[A, 1]], HoldComplete[Subscript[A, 2]], HoldComplete[Subscript[B, 1]],
           HoldComplete[Subscript[CC, 1]], HoldComplete[Subscript[CC, 2]], HoldComplete[Subscript[CC, 3]],
           HoldComplete[Subscript[\[CapitalPhi], 1]], HoldComplete[Subscript[\[CapitalPhi], 2]],
           HoldComplete[Subscript[\[CapitalPhi], 3]], HoldComplete[Subscript[\[CapitalPhi], 4]],
           HoldComplete[Subscript[\[CapitalPhi], 5]], HoldComplete[Subscript[\[CapitalPhi], 6]], HoldComplete[H]},
        "full formula: assignment targets or statement order changed"];
      assert[AllTrue[{"(*SbB[*)", "(*SqB[*)", "(*SpB[*)", "(*FB[*)"}, StringContainsQ[firstSource, #] &],
        "full formula: rejecting multiplied statements must not remove its math widgets"]
    ];

    Do[
      original = CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`parseHeldInputBoxes[input[[1, 1]]];
      emitted = {};
      CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convert[input, notebook, Null];
      parsed = CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`parseHeldInputSource[emitted[[1]]["Data"]];
      assert[original === $Failed || original === HoldComplete[] ||
          SameQ[original, restoreInputMedia[parsed]] || SameQ[
          CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`heldInputSignature[original],
          CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`heldInputSignature[restoreInputMedia[parsed]]],
        path <> ": converted input changed its held meaning"],
      {input, inputs}
    ];

    If[i === 1,
      graphicBox = First[Cases[cells,
        Cell[BoxData[b_Graphics3DBox], "Output", ___] :> b]];
      graphicSource = CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convertedSource[
        "Graphics3D[]", graphicBox, "Output"];
      assert[StringStartsQ[graphicSource, "(*VB[*)(FrontEndRef["],
        "differential_equations: static Graphics3D output must use a WLJS ViewBox"];
      graphicPayload = First[StringCases[graphicSource,
        "(*,*)(*" ~~ payload:Shortest[__] ~~ "*)(*]VB*)" :> payload]];
      assert[MatchQ[referencedDisplay[graphicSource], HoldComplete[Hold[_Graphics3D]]],
        "differential_equations: the graphics display payload must stay held"];
      assert[FreeQ[referencedDisplay[graphicSource], _CompressedData, Infinity],
        "differential_equations: numeric plot data must be expanded for browser rendering"];
      assert[FreeQ[referencedDisplay[graphicSource], _Module | _Uncompress, Infinity],
        "differential_equations: graphic data conversion must finish before it enters a hold"];
      assert[!StringContainsQ[CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convertedSource[
          "Graphics3D[Sphere[]]", graphicBox, "Input"], "(*VB[*)"],
        "differential_equations: a graphics input must remain editable source"]
    ];

    emitted = {};
    completed = False;
    TimeConstrained[
      CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`ApplySync[
        Then, CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convert,
        {#, notebook, Null} & /@ notebook[[1]],
        Function[Null, completed = True]],
      30, Null];
    assert[completed, path <> ": recursive group conversion did not finish"];
    actual = Count[emitted, a_Association /; Lookup[a, "Type", None] === "Input"];
    assert[actual >= Length[inputs], path <> ": recursive group conversion lost input"];
    Print[path, ": recursive notebook walk retained input"];

    outputs = Cases[cells, c:Cell[BoxData[_], "Output", ___] :> c];
    staticOutputs = Select[outputs, Function[output,
      With[{parsed = CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`parseHeldBoxes[
          CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`displayBoxes[output[[1, 1]]]]},
        !CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`interactiveBoxesQ[parsed] &&
          (MatchQ[parsed, HoldComplete[_Graphics | _Graphics3D | _Image | _Image3D | _Sound]] ||
            (!CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`interactiveBoxesQ[output[[1, 1]]] &&
              !FreeQ[parsed, _Graphics | _Graphics3D | _Image | _Image3D | _Sound, Infinity]))
      ]
    ]];
    actual = Count[emitted, a_Association /; Lookup[a, "Type", None] === "Output" &&
      StringContainsQ[Lookup[a, "Data", ""], "(*VB[*)(FrontEndRef["]];
    assert[actual === Length[staticOutputs], path <> ": a static display output was lost (expected " <> ToString[Length[staticOutputs]] <> ", got " <> ToString[actual] <> ")"];
    dynamicOutputs = Select[outputs,
      CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`interactiveBoxesQ[#[[1, 1]]] &&
        !MemberQ[staticOutputs, #] &];
    Do[
      emitted = {};
      CoffeeLiqueur`Extensions`ExportImport`Mathematica`Internal`convert[output, notebook, Null];
      assert[emitted === {}, path <> ": dynamic output must be skipped"],
      {output, dynamicOutputs}
    ];
    Print[path, ": ", Length[staticOutputs], " static displays retained; ",
      Length[dynamicOutputs], " dynamic outputs discarded"];
    If[MemberQ[{"DM in FeV2O4", "dm_fev2o4_rendering", "crystal_structure_visualization"}, FileBaseName[path]],
      displayPayloads = Map[Function[output,
        source = convertBox[output[[1, 1]], "Output"];
        referencedDisplay[source]], staticOutputs];
      If[FileBaseName[path] === "crystal_structure_visualization",
        assert[Length[displayPayloads] > 1 &&
            !FreeQ[displayPayloads, HoldPattern[Arrow[Line[_], ___]], Infinity],
          "crystal structure: saved Arrow[Line[points]] displays must exercise the renderer"],
        assert[Length[displayPayloads] === 6 && FreeQ[displayPayloads, _Tetrahedron, Infinity],
          "FeV2O4: all six 3D previews must contain explicit tetrahedron faces"]
      ];
      file = CreateTemporary[];
      Export[file, displayPayloads, "ExpressionJSON"];
      renderCheck = RunProcess[{"node", FileNameJoin[{testDirectory, "notebook-import-renderer-regression.cjs"}],
        file, ToString[Length[displayPayloads]]}];
      DeleteFile[file];
      assert[renderCheck["ExitCode"] === 0,
        FileBaseName[path] <> ": renderer geometry check failed: " <> renderCheck["StandardError"]];
      Print[StringTrim[renderCheck["StandardOutput"]]]
    ];
  ],
  {path, FileNames["*.nb", FileNameJoin[{testDirectory, "notebooks"}]]}
];

Print["Notebook import regression checks passed (", checks, " assertions)"];
