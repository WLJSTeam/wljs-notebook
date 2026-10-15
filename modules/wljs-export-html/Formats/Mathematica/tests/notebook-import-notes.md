# Mathematica notebook import notes

`Formats/Mathematica/Mathematica.wl` imports `.nb` on the master kernel and
walks `CellGroupData` recursively. Box conversion is sent held to the selected
evaluation kernel, where `BoxesConverter.wl` handles the subset of Mathematica
boxes that WLJS can display. Avoid evaluating imported cells or changing
`BoxesWorkarounds.wl` to make the import parser work: WLJS replaces many box
format definitions on the evaluation kernel.

Input cells take priority. `InterpretationBox` contents and graphics are
converted under a hold, and a failed custom input conversion falls back to a
held StandardForm parse on the master kernel. If that parse fails, the importer
keeps the original input box expression in a comment for inspection. Complex
dynamic/Manipulate-like output is intentionally skipped; it needs native WLJS
behavior rather than a box-level translation.

`BoxesWorkarounds.wl` lines 1926 onward replace `FormatValues[Inactive]` on the
evaluation kernel, and later rules redefine `FormBox` behavior. Those rules
affect how held expressions are formatted after import, but they are not the
notebook structure parser. Import fixes should therefore stay in the master-side
walk and the held box converter; relying on evaluation-kernel format rules to
decode `.nb` input makes the result kernel-dependent.

Notebook fixtures and generated imports are in
`modules/wljs-export-html/Formats/Mathematica/tests/notebooks`, including
`differential_equations_multiline.nb`, `christoffel_symbols_and_geodesics_multiline.nb`, and
`crystal_structure_visualization.nb`. The regression discovers the `.nb`
fixtures in that directory; `.wln` files are saved import artifacts.

With the supplied `tests/nbs` samples, the differential-equations sample has 18
input cells and 95 styled text/heading cells; the Christoffel/geodesic sample
has 13 and 28; the crystal-structure sample has 26 and 10. The styled and input
cells are retained by the conversion rules and recursive notebook walk. A live
WLJS import of the differential-equations sample exposed a separator bug: a
newline box fragment was treated as failed conversion and serialized as `Null`,
joining adjacent statements. `convertedSource` now accepts nonempty whitespace
replies, and the regression checks the `eqn`/`ibc` boundary. `processString`
still uses Mathematica's `"String"` export to normalize private syntax
characters such as `\[Equal]` to `==`; it no longer deletes literal `Null`
substrings. In the crystal-structure sample it also turns the private
association delimiters into `<|` and `|>`. `NotebookDownload` GUI controls in
the differential-equations sample are intentionally not imported as content.
These counts exercise the conversion rules; inspect saved `.wln` files after a
live import to verify the editor path as well. The differential-equations source
also has four styled cells and two `SectionNumber` counter cells in an embedded
stylesheet; they are definitions, not notebook content, and are excluded from
these counts. Seven more `Cell[..., "Input"]` objects are inline within
`TextData` and are rendered as part of their parent text cells.

Live imports saved 95 Markdown display cells and 18 original input cells across
the differential-equations sample's four split WLJS notebooks, 28 Markdown cells
and 13 original input cells for the Christoffel/geodesic sample, and 10 Markdown
cells and 26 original input cells for the crystal-structure sample. The
crystal-structure sample's saved source includes its `Graphics3D[...]` input.
After a full WLJS restart, the differential-equations sample preserved the
`eqn`/`ibc` newlines and `==` syntax, and the crystal-structure sample preserved
the `colors` association and newline before `radius`.

Some `TraditionalForm` inline equations in the differential-equations sample
cannot be parsed by `ToExpression[..., HoldForm]`. For those text-only boxes,
the master kernel now uses `ToString[DisplayForm[box], TeXForm]` to keep
fractions and derivatives in Markdown. A held `InterpretationBox` sentinel check
confirms this formatting does not run its embedded assignment. After a second
full WLJS restart, the differential-equations sample imported with the TeX
fraction and derivative in the saved Markdown, no private `\[DifferentialD]`
glyphs, and no joined `Null` statements.

Run `wolframscript -f modules/wljs-export-html/Formats/Mathematica/tests/notebook-import-regression.wls`
for the held-input, input-preservation, group-walk, and text/heading checks.
The runner discovers the repository root and fixtures relative to its own
location. Historical `tests/nbs` paths below refer to imports before this move.

The Plot3D output in the differential-equations sample originally appeared as a
huge red `Graphics3D[GraphicsComplex[CompressedData[...]]]` source string.
Native WLJS graphics outputs use a `(*VB[*)` ViewBox marker with
`Hold[Graphics3D[...]]` as the compressed display payload. The importer now
creates this marker for static `GraphicsBox` and `Graphics3DBox` output cells.
Numeric `CompressedData` in plot boxes is expanded under `HoldComplete` for the
browser renderer; the saved source stays compact and editable. Input cells still
use plain source. The differential-equations sample has five graphics output
boxes: three static ones are wrapped, while the two
`NamespaceBox`/`DynamicModuleBox` graph outputs remain skipped as interactive
GUI output. The crystal-structure sample has eight static Graphics3D outputs,
all wrapped in the pristine-kernel scan. The ViewBox metadata was checked to
contain a held graphic with no remaining `CompressedData`.

The first live ViewBox attempt showed `···` in the editor. The browser console
revealed an unevaluated `Module[...]` in the held graphics payload: a delayed
replacement for `CompressedData` had inserted conversion code inside
`HoldComplete` instead of running it. Numeric replacement rules are now built
before substituting into the held graphic. A synthetic check on the WLJS kernel
confirms the expanded graphic contains neither `CompressedData` nor `Module`.

After the next full WLJS restart, a fresh import of the differential-equations
sample opened a split WLJS notebook with the Plot3D surface and axes rendered
beneath the original input cell. The huge red source dump and the `···` error
placeholder were gone.

In the differential-equations sample, the original TraditionalForm boxes
explicitly spell out `x f''(x) = x^2` and `f'(0) = 5`. The held semantic TeX
route flattened the derivative application into `f'' x` and `f' 0`, losing the
visible parentheses. Inline TraditionalForm expressions containing prime boxes
now use TeX from `DisplayForm` instead, with double primes normalized to
`^{\prime\prime}`. Other inline equations retain the previous route because
direct box TeX changes the notation of some partial derivatives. The regression
checks the two initial-value expressions and the other sample notebook content.
After a fresh WLJS restart and reimport, the first saved split WLJS notebook
contains `$x f^{\prime\prime}(x)=x^2$` and `$f'(0)=5$`. The live editor
accessibility tree also shows the first equation with `(x)` and the last
condition with `(0)` rendered as separate MathJax text nodes.

The Christoffel/geodesic sample live visual check: the Christoffel equation
renders with upper/lower indices and three partial-derivative fractions. Its
geodesic equation remains assembled from the original mixture of styled text and
separate inline math boxes; it is readable, but the spacing differs from a
single TeX expression. The crystal-structure sample contains no comparable
inline TeX equations in its converted Markdown.

## Extended import regression coverage (2026-10-15)

The regression now discovers every `.nb` fixture in `tests/nbs`, including
`hello_world`, `syntax`, `layout_typography`, `latitude_longitude_sphere`, and
`electromagnetic_waves_from_a_linear_antenna`. Across the eight current samples
it retains 68 input cells (including an empty input) and 221 styled text cells.
`Chapter`, `CodeText`, and rich-text subtitles/abstracts are supported as well.

Input conversion now validates the normalized decorated source against the
original expression on the master. Both parses use `HoldComplete`; comparison
uses the pristine InputForm writer to account for harmless differences in
product grouping, signs, and reciprocal notation. A changed expression,
invalid source, timeout, aborted conversion, or rejected conversion falls back
to master-generated source. Unparseable boxes remain in an escaped comment.
For example, Mathematica's `"String"` exporter changes `\[Cross]` into `x`;
the antenna input now retains `Cross` instead of silently changing its physics.
String literals and embedded interpretation expressions are checked too.

`BoxData` fragment lists make one evaluation-kernel request per cell. They are
joined for display conversion while the master preserves their separate held
expressions for validation and fallback. This retains multiline boundaries and
avoids treating newline fragments as failed conversions.

Before sending an input conversion request, the master resolves interpretation, graphics/raster,
and date boxes to literal source strings inside a `HoldComplete` box tree.
`WLJSDisplayForm` consumes that tree with `HoldAllComplete`. The importer thus
does not depend on the evaluation kernel's versions of `InterpretationBox`,
`FormBox`, or graphics parsing. `BoxesWorkarounds.wl` is unchanged. Existing
direct converter callers retain their previous interface.

Static `Graphics`, `Graphics3D`, `Image`, `Image3D`, and `Sound` outputs use
short ViewBoxes containing `FrontEndRef` and `FrontEndExecutable` references.
The media payload is stored separately using `CreateFrontEndObject`, including
displays wrapped in presentation boxes. Static displays
can still be recovered if the remote converter fails. Compressed plot arrays
are inspected structurally while held, then expanded only if every element is
numeric. The regression covers real Mathematica-generated image boxes and
NumericArrays, plus assignments hidden inside nonnumeric plot data.

Dynamic/Manipulate/Animate outputs are discarded, including nested dynamic
boxes. The current samples retain 17 static display outputs and discard nine
dynamic outputs. This is stricter than the earlier the differential-equations sample scan: hover-driven
graphics containing `DynamicBox` are now excluded as requested. Ordinary math
and grid outputs remain supported; `RowDefault` and `RowWithSeparators`
templates now use WLJS's normal single-row grid display, alongside Column,
Grid, and MatrixForm.

The standalone suite exercises the production preparation, Promise callbacks,
and recursive walk with a local `Send` stub preserving its `HoldRest` contract.
It also tests box heads with rewriting definitions and restores those test
definitions explicitly. It starts no additional evaluation kernel. These
checks verify held source and display payloads; browser rendering still needs
a live WLJS server, separately from `wolframscript` because of the license
constraint.

The live check exposed a further image-specific issue: a ViewBox containing
`Image[NumericArray[...], ...]` or `Image3D[NumericArray[...], ...]` reached the
browser with an already-decoded packed array inside its NumericArray wrapper.
Both image readers failed with `arr.slice(...).map is not a function`.
The master now expands only actual atomic NumericArray data objects to their
numeric contents in the display payload. Source text stores native arrays as
deferred `Uncompress[...]` calls. Grayscale `Interleaving -> None` is also normalized
to `True` in that payload because the image renderer expects a boolean.
No image expression is evaluated to perform this conversion.

The final standalone run passes 226 assertions. After restarting WLJS to load
the updated master importer, a fresh `.nb` import visibly renders Graphics,
Graphics3D, Image, and Image3D, as well as equations, plain/separated Rows,
Column, Grid, and MatrixForm. Dynamic output cells are absent. A sentinel
assignment in the imported input stays unassigned on the evaluation kernel.
Hashes of the existing FormBox, InterpretationBox, GraphicsBox, Graphics3DBox,
and GridBox definitions and Inactive formatting remain unchanged across
converter loading and live imports. The syntax sample retains its eight input
and eight cached output cells; the typography sample renders all 13 text cells,
including its three Chapter headings. Live artifacts are isolated in
`tests/nbs`.

Importing the latitude sample also exposed source bloat: InputForm expanded
its four cached image arrays pixel by pixel, producing a 72 MiB `.wln` from a
734 KiB `.nb`. The compact source rules now retain those arrays as literal
`Uncompress` calls under the source hold, while the display payload contains
only ready-to-render numeric data. A regression checks that a 64 by 64 image
stays compact and that its display payload contains neither NumericArray nor
unevaluated Uncompress calls.

Fresh live imports with the compact source rules save the latitude sample as
1,866,540 bytes (36 Markdown outputs, one original input, four rendered cached
images) and the antenna sample as 5,832,381 bytes (39 Markdown outputs, one
original input, four rendered cached images). Neither saved notebook contains
unsupported-box placeholders. The antenna source retains `Cross[Ev[...],
Hv[...]]`. Both sets of cached snapshots were inspected in the application;
the original inputs were not evaluated. The final evaluation-kernel check
again reports unchanged box definitions and no imported field definitions or
sentinel assignments.


## Frontend object storage and input formatting (2026-10-15)

Embedding media source and compressed display data directly in an output cell
can freeze the editor, even when the full file is modest in size. Imported
static media now follows the native MakeBoxes storage pattern: the cell holds
only `FrontEndRef[uid]` and a compressed `Hold[FrontEndExecutable[uid]]`.
`CreateFrontEndObject` stores the prepared data on the master. An inner Hold
protects imported expressions and existing symbol values during storage; the
frontend renders that Hold transparently. No evaluation-kernel box or formatting
definitions are changed. Numeric array preparation remains on the master.

The initial importer save bypasses the editor's OnBeforeSave hooks, so imported
objects are attached immediately to the notebook's `Objects` field and the field
is included in `ObjectFields`. The regression round-trips a cached image through
the production WLN writer and reader, verifying that its reference and object
survive the first save. Media nested in rows and grids is replaced with short
references before the surrounding boxes reach the evaluation kernel. Static
Sound data is recovered from its InterpretationBox without importing the dynamic
Mathematica player controls. Dynamic expressions remain excluded.

Every original Input/Code cell is passed through CodeFormatter on the master,
using the Format snippet's compact settings and a 120-column target. WLJS
box decorations are temporarily masked and restored byte for byte. The formatted
source is accepted only if its held InputForm signature matches the original;
unavailable formatting, invalid code, timeouts, or changed meaning retain the
original source. Output cells and generated Markdown are not code-formatted.

The standalone suite passes 289 assertions across the current fixtures,
including short media cells, native compressed object storage, held assignments,
media in layouts, first-save persistence, formatting and source equivalence.
The older live-import sizes and screenshots above describe the previous inline
payload implementation. Fresh imports are saved in `tests/nbs/live-checks`.
The static-media fixture visibly renders Graphics, Graphics3D, Image and Image3D;
the antenna fixture renders its large cached snapshots and reloads successfully.
All four media cells in each notebook are 197 characters and reference four
separate stored objects. The antenna file is 4,769,103 bytes; its media data is
in the Objects section, outside the editor's cell text. The live evaluation
kernel confirms unchanged box definitions, no imported sentinel assignment and
no imported field definitions. Original input cells were not evaluated.
Existing imports made with the inline implementation need to be reimported.


## Embedded media in input cells (2026-10-15)

`tests/nbs/diffraction.nb` reproduces a freeze from an embedded image in
`Диффракция.nb`. Previously, input conversion printed its NumericArray pixels
into the editor and passed that expanded source to CodeFormatter. Literal media
boxes are now replaced before either operation, including images within RowBox
and BoxData fragment lists. Image constructors written as code are preserved.

Each input literal uses two native frontend objects: a browser-ready preview,
and a compressed string containing the exact original HoldComplete expression.
The editable source is `ReleaseHold[Uncompress[FrontEndRef[uid]]]`; only an
explicit evaluation reconstructs the original literal. Both objects are saved
with the notebook. The first-save and simulated missing-object-fetch tests
verify that a synthetic input image still evaluates correctly after reopening.
Master fallbacks preserve the preview decoration as well as the short source.

Box subtrees are extracted with HoldComplete and passed to ToExpression with
Unevaluated, preserving held contents during preparation. Older floating-point
image tags (`"Real"`) are normalized to `"Real64"` only in the browser preview;
the stored input keeps its original type and metadata. The input-meaning checks
restore references under a hold and compare the held expressions, accepting
identical structures before the existing InputForm-signature normalization.

The final standalone run passes 352 assertions. A fresh live import is saved as
`tests/nbs/live-checks/diffraction_input_media.wln`: all 25 inputs are retained,
15 embedded input images use references, and the largest input source is 540
characters. The native WLJS editor renders both the input images and cached
outputs, including the legacy floating-point previews; scrolling and reloading
remain responsive. The saved notebook contains 35 frontend objects (15 source
literals, 15 input previews, and five output previews). No original input was
evaluated, and the evaluation kernel's box definitions remain unchanged.
The user's independently changed kernel-selection behavior is preserved.

## Saved 3D primitives and math decorations (2026-10-15)

`DM in FeV2O4.nb` contains six static Graphics3D outputs. Five crashed in
`TubeArrow` because their saved tubes contain one extra path-list level:
`Arrow[Tube[{path}]]`. The master now unwraps singleton 3D tube batches only
in the held display payload. Coordinate tetrahedra are represented as four
explicit triangular faces; separate vertices keep face normals flat. WLJS's
existing Tetrahedron renderer otherwise draws its default centered solid.
Embedded input previews use the same normalization; the separately stored
original input expression retains its exact syntax for explicit evaluation.

The regression exercises all six imported payloads through the real JavaScript
interpreter and Three.js geometry code, checking finite attributes/transforms
and valid vertex indices. This CPU-only smoke test skips DOM text rendering
and root camera/lighting setup, which require a live UI check. It reproduced
the TubeArrow exception before the fix and passes afterward.

Fallback source and InterpretationBox values now retain native math widgets
for subscripts, square roots, powers and fractions. Reboxing happens on the
pristine master inside HoldForm, using the namespaced BoxesConverter package;
the result is accepted only if its held InputForm signature is unchanged.
Original cell text/comments are not reboxed, and media literals are excluded.
FractionBox/SqrtBox formatting options no longer make their widgets unsupported.
`math_typesetting.nb` covers ordinary boxes and InterpretationBox values in
both Input and Output cells. The suite also excludes deliberately empty styled
cells from its retention count, matching the existing importer behavior.

The standalone suite passes 703 assertions across the current fixtures,
including held-coordinate sentinels, original 3D input preservation, math
decorations and the JavaScript geometry smoke test. BoxesWorkarounds.wl and
the user's kernel-selection behavior remain unchanged.

Fresh live imports are in `tests/nbs/live-checks/dm_fev2o4_rendering.wln`
and `math_typesetting.wln`. All six saved 3D scenes draw without the TubeArrow
exception. The math fixture visibly renders nested subscripts, square roots,
powers and fractions in both cell types, including InterpretationBox fallbacks.
The evaluation kernel reports unchanged box-definition hashes and no definitions
for the imported notebook's `coords`, `min`, `func`, `S` or `dir` symbols.

The live check also exposed a fixed unit-radius default in the JavaScript
TubeArrow renderer, which obscured these small diagrams after their import
crash was fixed. Automatic shaft radius and head dimensions now scale with
arrow length; explicit Tube radii and Arrowheads dimensions retain their
existing interpretation. Packed NumericArray paths are decoded consistently
on creation and update. The renderer bundles were rebuilt, and a hard reload
visibly restores thin spin arrows around the tetrahedron and orbital surfaces.
The JavaScript regression adds twelve assertions across three diagram scales
and explicit sizing, and reruns all six imported geometry payloads successfully.
The inspected 3D notebook was also saved as `dm_fev2o4_rendering_checked.wln`.

## Multiline statement validation (2026-10-15)

`ПОЛНАЯ ФОРМУЛА.nb` exposed an incorrect validation oracle: pristine
`ToExpression[..., StandardForm, HoldComplete]` parses adjacent statement
RowBoxes as implicit multiplication, including semicolon-terminated assignments
on different lines. Consequently the importer rejected correctly decorated
input and emitted a product of assignments from its fallback. The previous
fixture comparison used that same oracle and missed the error.

Input validation/fallback now use a separate line-aware held parser. Explicit
statement RowBoxes are flattened within surrounding code; complete input lines
are parsed independently, with incomplete lines accumulated for continuations
and bracketed function bodies. Mathematical grouping remains native. The walk
does not descend into InterpretationBox values or literal media. Cached output
parsing is unchanged. Leading/trailing layout whitespace is trimmed before
validating converted input. Blank lines are ignored for comparison using CST
newline spans, preserving strings, comments and explicit Null expressions.
Formatting keeps its existing stricter held-source comparison.

The suite passes 731 assertions. Independent expectations verify the formula's
13 ordered assignment targets and all four math widget types; synthetic tests
cover forced fallbacks, continuations, groups, function bodies and held
assignment sentinels. Additional assertions check the differential-equations
PDE/initial-condition/solution statement order and the Christoffel notebook's
metric, affine derivative/sum/table structure and geodesic definition. Plain
linear powers such as `r^2` are retained, per the user's preference.

Fresh live imports after restarting WLJS are saved in
`tests/nbs/live-checks/full_formula_multiline.wln`,
`differential_equations_import_only.wln`, and
`christoffel_symbols_and_geodesics_multiline.wln`. The formula visibly retains
separate assignment lines and its subscript, fraction, root and power widgets;
held parsing of the saved source confirms all 13 ordered targets and no product
of statement expressions. The differential-equations PDE cell retains its three
ordered assignments. The Christoffel import retains the 4x4 metric, affine
SetDelayed/Set/Simplify/Table nesting with three derivatives and one sum, and
the geodesic definition with one sum. Its cached equations and matrices render.

The first differential-equations display check used MCP `project_cell`, which
executes the input as well as projecting its result. It evaluated the test PDE
cell. Its three newly created definitions were cleared, and a separate fresh
`differential_equations_import_only.nb` import was checked without projection.
After that import, H, metric, eqn, ibc, sln, affine and geodesic all have zero
OwnValues. Hashes of the evaluation kernel's FractionBox, SqrtBox,
SuperscriptBox, SubscriptBox, InterpretationBox and FormBox DownValues remain
unchanged across the live imports. No original notebook inputs or saved source
files were modified by these checks.

## Crystal structure rendering and saved options (2026-10-15)

The crystal-structure notebook saves axis arrows as `Arrow[Line[points]]`.
The JavaScript Arrow renderer previously interpreted the inner Line as geometry,
then tried to spread entries of that Three.js Line object as coordinates. This
reproduces the reported `TypeError: undefined is not iterable`. Arrow now reads
the Line's coordinate argument directly on creation and update. Ordinary paths,
packed NumericArrays and Tube arrows keep their existing rendering paths. The
saved notebook and imported input source do not need rewriting.

The live check then exposed missing ViewSize/ImageCache option symbols and
missing Parallelepiped/PointSize renderers. These now resolve locally. A
Parallelepiped reuses Cuboid geometry with the full affine basis matrix, keeping
skew cell shear on creation and update. Most importantly, BoxRatios -> Automatic
was treated as a numeric triple and produced NaN scene transforms. Only finite,
positive numeric triples now override the default scale; Automatic follows the
same path as an omitted option. Explicit ratios and existing large-model scaling
are preserved, and flat extents no longer cause division by zero.

The renderer test includes 38 assertions for arrows, skew cells, updates and
Automatic/explicit box scaling. It also parses saved option names strictly and
checks world transforms after applying the production scaling helper. All 12
crystal scenes extracted under HoldComplete from the reported `.wln` produce
finite geometry with their original options, as do all seven FeV2O4 displays
(six cached outputs and an embedded input preview). The user confirmed the
crystal notebook renders after Window -> Force Reload. No notebook input was
executed by these checks, and checked kernel box definitions stayed unchanged.
Browser bundles were rebuilt. The Wolfram regression now includes the crystal
notebook's static displays as well as the six FeV2O4 output scenes; that
standalone Wolfram suite was not rerun while WLJS was running.
Both regression entry points locate the repository and fixtures from their new
directory, and fixture-specific checks recognize the descriptive notebook names.
