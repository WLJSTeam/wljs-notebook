BeginPackage["CoffeeLiqueur`Extensions`Shallow`"]

Begin["`Internal`"]

(* ─── Opaque-head registry ─────────────────────────────────────────────── *)

$OpaqueHeads::usage = "
Alternatives pattern of heads whose internals are suppressed,
rendered as Head[\[Ellipsis]] rather than recursed into.";

$OpaqueHeads = Alternatives[
  TemporalData, TimeSeries, EventSeries, Dataset, SparseArray, Graph, Image, Image3D,
  ByteArray, NumericArray, QuantityArray,
  PredictorFunction, SequencePredictorFunction, ClassifierFunction,
  TimeSeriesModel,
  NormalDistribution, LaplaceDistribution, LogisticDistribution,
  StudentTDistribution, SmoothKernelDistribution, KernelMixtureDistribution,
  EmpiricalDistribution,
  ARMAProcess, SARMAProcess, ARCHProcess, ARIMAProcess, ARProcess,
  WienerProcess, TransformedProcess, TransformedDistribution,
  TruncatedDistribution, SARIMAProcess, FARIMAProcess,
  OrnsteinUhlenbeckProcess, MAProcess, HiddenMarkovProcess,
  GeometricBrownianMotionProcess, GARCHProcess,
  FractionalGaussianNoiseProcess, FractionalBrownianMotionProcess,
  DiscreteMarkovProcess, CoxIngersollRossProcess,
  MultivariateTDistribution, MultinormalDistribution,
  WeibullDistribution, VarianceGammaDistribution,
  StableDistribution, HyperbolicDistribution
];

(* ─── Main module ──────────────────────────────────────────────────────── *)


  {iShape, formatAtom, formatNode, skeletonType, formatElided,
   compressRuns, elideChildren, boundedChildren, columnHeld,
   wrapTuple, wrapRepeated, shortNode,
   depthQ, nextDepth, withBudget, budget,
   $typeDepth = 6};                    (* max depth used for type inference *)

  SetAttributes[iShape, HoldFirst];

  (* ── Depth helpers ───────────────────────────────────────────────────── *)
  depthQ[Infinity]            := True;
  depthQ[d_Integer ] := True /; d >= 0;
  depthQ[_]                   := False;

  nextDepth[Infinity]  := Infinity;
  nextDepth[d_Integer] := d - 1;

  (* ── Node budget guard ───────────────────────────────────────────────── *)
  (* Bounds TOTAL compound nodes expanded, regardless of depth/breadth.
     This is what keeps huge / shared / deeply nested expressions safe.    *)
  SetAttributes[withBudget, HoldAll];
  withBudget[ell_, body_] := (budget--; If[budget < 0, ell, body]);

  (* ── formatAtom ──────────────────────────────────────────────────────── *)
  formatAtom[e_String, mSL_Integer] :=
    If[StringLength[e] <= mSL,
      "\"" <> e <> "\"",
      "\"" <> StringTake[e, mSL] <> "\[Ellipsis]\""];

  formatAtom[e_, _Integer] := ToString[Unevaluated[e], InputForm];

  (* ── formatNode ──────────────────────────────────────────────────────── *)
  formatNode[List, inner_String] := "{" <> inner <> "}";
  formatNode[h_,   inner_String] :=
    ToString[Unevaluated[h], InputForm] <> "[" <> inner <> "]";

  (* ── shortNode : Short-style  head[<<n>>] / {<<n>>} ──────────────────── *)
  SetAttributes[shortNode, HoldFirst];
  shortNode[e_] :=
    With[{n = Length[Unevaluated[e]], h = Head[Unevaluated[e]]},
      formatNode[h, If[n === 0, "", "<<" <> ToString[n] <> ">>"]]];

  (* ── boundedChildren ─────────────────────────────────────────────────── *)
  (* First `cap` children of each held element, capped overall at `cap`.    *)
  boundedChildren[held_HoldComplete, cap_Integer] :=
    Take[
      Join @@ (List @@ Map[
        Function[Null, Take[HoldComplete @@ #, UpTo[cap]], HoldFirst],
        held]),
      UpTo[cap]];

  (* ── columnHeld ──────────────────────────────────────────────────────── *)
  (* The p-th child of every element, gathered as one held group.          *)
  columnHeld[held_HoldComplete, p_Integer] :=
    Join @@ (List @@ Map[
      Function[Null, Extract[#, {p}, HoldComplete], HoldFirst],
      held]);

  (* ── type-string wrappers (produce valid WL patterns) ────────────────── *)
  wrapTuple[hstr_String, parts_List] :=          (* {_Real, _Real} *)
    If[hstr === "List",
      "{" <> StringRiffle[parts, ", "] <> "}",
      hstr <> "[" <> StringRiffle[parts, ", "] <> "]"];

  wrapRepeated[hstr_String, t_String] :=         (* {_Real..} == {Repeated[_Real]} *)
    If[hstr === "List",
      "{" <> t <> "..}",
      hstr <> "[" <> t <> "..]"];

  (* ── skeletonType : width- and depth-bounded, length-aware ───────────── *)
  skeletonType[held0_HoldComplete, d_?depthQ, mEl_Integer, mSL_Integer] :=
    Module[{cap, dEff, posCap, held, heads, uniqueHeads, allAtomic, hstr, lens, L},
      cap    = Max[mEl, 1] * 8;          (* sibling sampling width cap *)
      dEff   = Min[d, $typeDepth];       (* clamp Infinity -> $typeDepth *)
      posCap = Min[Max[mEl, 1], 12];     (* max tuple positions to expand *)
      held   = If[Length[held0] > cap, Take[held0, cap], held0];

      heads       = List @@ Map[Function[Null, ToString[Head[#], InputForm], HoldFirst], held];
      uniqueHeads = DeleteDuplicates[heads];

      Which[
        Length[uniqueHeads] > 1,
          StringRiffle[("_" <> #) & /@ uniqueHeads, " | "],   (* _Integer | _String *)

        (allAtomic = And @@ Map[Function[Null, AtomQ[#], HoldFirst], held]),
          "_" <> First[uniqueHeads],                          (* _Real *)

        dEff === 0,
          "_" <> First[uniqueHeads],                          (* _List (contents hidden) *)

        True,
          hstr = First[uniqueHeads];
          lens = List @@ Map[Function[Null, Length[#], HoldFirst], held];
          If[Length[DeleteDuplicates[lens]] === 1,
            (* ── uniform length ── *)
            L = First[lens];
            Which[
              L === 0,
                wrapTuple[hstr, {}],                          (* {} *)
              L <= posCap,
                wrapTuple[hstr,                               (* {_Real, _Real} *)
                  Table[
                    skeletonType[columnHeld[held, p], nextDepth[dEff], mEl, mSL],
                    {p, L}]],
              True,
                wrapRepeated[hstr,                            (* {_Real..} (uniform but long) *)
                  skeletonType[boundedChildren[held, cap], nextDepth[dEff], mEl, mSL]]
            ],
            (* ── variable length ── *)
            wrapRepeated[hstr,                                (* {_Real..} *)
              skeletonType[boundedChildren[held, cap], nextDepth[dEff], mEl, mSL]]
          ]
      ]
    ];

  (* ── formatElided : <<n>> when depth-limited, else <<n, type>> ───────── *)
  formatElided[held_HoldComplete, d_?depthQ, mEl_Integer, mSL_Integer] :=
    If[d <= 0,
      "<<" <> ToString[Length[held]] <> ">>",
      "<<" <> ToString[Length[held]] <> ", " <>
        skeletonType[held, d, mEl, mSL] <> ">>"];

  (* ── compressRuns (Join @@ : no evaluation leak, no double-wrap) ─────── *)
  compressRuns[heldList_List, d_?depthQ, mEl_Integer, mSL_Integer] :=
    Module[{headOf, runs},
      headOf[hc_HoldComplete] :=
        hc /. HoldComplete[x_] :> ToString[Head[Unevaluated[x]], InputForm];
      runs = SplitBy[heldList, headOf];
      Map[Function[run, formatElided[Join @@ run, d, mEl, mSL]], runs]
    ];

  elideChildren[rendered_List, heldTail_List, d_?depthQ, mEl_Integer, mSL_Integer] :=
    Join[rendered, compressRuns[heldTail, d, mEl, mSL]];

  (* ── iShape dispatch ─────────────────────────────────────────────────── *)

  (* Rule 1 — opaque objects (deliberately kept as Head[…]) *)
  iShape[e_,
         _?depthQ, _Integer, _Integer] :=
    ToString[Head[Unevaluated[e]], InputForm] <> "[\[Ellipsis]]" /; MatchQ[Head[Unevaluated[e]], $OpaqueHeads];

  (* Rule 2 — atoms *)
  iShape[e_, _?depthQ, _Integer, mSL_Integer] :=
    formatAtom[Unevaluated[e], mSL]/; AtomQ[Unevaluated[e]];

  (* Rule 3 — depth limit reached: head[<<n>>] *)
  iShape[e_, 0, _Integer, _Integer] := shortNode[e];

  (* Rule 4 — Association *)
  iShape[e_Association, d_?depthQ, mEl_Integer, mSL_Integer] :=
    withBudget[
      shortNode[e],
      Module[{pairs, total, shown, renderedPairs, heldTail, tailTokens, allTokens},
        pairs = KeyValueMap[HoldComplete, Unevaluated[e]];
        total = Length[pairs];
        If[total === 0, "<||>",
          shown = Min[mEl, total];
          renderedPairs = Table[
            pairs[[i]] /. HoldComplete[k_, v_] :>
              (iShape[k, nextDepth[d], mEl, mSL] <> " -> " <>
               iShape[v, nextDepth[d], mEl, mSL]),
            {i, shown}];
          heldTail = Drop[pairs, shown];
          tailTokens =
            Module[{dt = nextDepth[d], hk, hv, kt, vt},
              Which[
                Length[heldTail] === 0, {},
                dt <= 0, {"<<" <> ToString[Length[heldTail]] <> ">>"},
                True,
                  hk = heldTail /. HoldComplete[k_, _] :> HoldComplete[k];
                  hv = heldTail /. HoldComplete[_, v_] :> HoldComplete[v];
                  kt = skeletonType[Join @@ hk, dt, mEl, mSL];
                  vt = skeletonType[Join @@ hv, dt, mEl, mSL];
                  {"<<" <> ToString[Length[heldTail]] <> ", " <>
                     kt <> " -> " <> vt <> ">>"}
              ]];
          allTokens = Join[renderedPairs, tailTokens];
          "<|" <> StringRiffle[allTokens, ", "] <> "|>"
        ]
      ]
    ] /; d =!= 0;

  (* Rule 5 — Rule *)
  iShape[e_Rule, d_?depthQ, mEl_Integer, mSL_Integer] :=
    Replace[HoldComplete @@ Unevaluated[e],
      HoldComplete[k_, v_] :>
        (iShape[k, nextDepth[d], mEl, mSL] <> " -> " <>
         iShape[v, nextDepth[d], mEl, mSL])];

  (* Rule 6 — RuleDelayed *)
  iShape[e_RuleDelayed, d_?depthQ, mEl_Integer, mSL_Integer] :=
    Replace[HoldComplete @@ Unevaluated[e],
      HoldComplete[k_, v_] :>
        (iShape[k, nextDepth[d], mEl, mSL] <> " :> " <>
         iShape[v, nextDepth[d], mEl, mSL])] /; d =!= 0 ;

  (* Rule 7 — general compound expression *)
  iShape[e_, d_?depthQ, mEl_Integer, mSL_Integer] :=
    withBudget[
      shortNode[e],
      Module[{h, total, held, heldList, shown, renderedHead, heldTail, allTokens},
        h     = Head[Unevaluated[e]];
        total = Length[Unevaluated[e]];
        held  = HoldComplete @@ Unevaluated[e];
        If[total === 0,
          formatNode[h, ""],
          heldList = List @@ Map[Function[Null, HoldComplete[#], HoldFirst], held];
          shown    = Min[mEl, total];
          renderedHead = Table[
            heldList[[i]] /. HoldComplete[x_] :> iShape[x, nextDepth[d], mEl, mSL],
            {i, shown}];
          heldTail  = Drop[heldList, shown];
          allTokens = elideChildren[renderedHead, heldTail, nextDepth[d], mEl, mSL];
          formatNode[h, StringRiffle[allTokens, ", "]]
        ]
      ]
    ] /; d =!= 0 ;

expressionSchema[
    expr_,
    maxDepth_        : Infinity,
    maxElements_Integer     : 3,
    maxStringLength_Integer : 80,
    maxNodes_Integer        : 5000
] := (budget = maxNodes; iShape[expr, maxDepth, maxElements, maxStringLength]);

Options[fitToBudget] = {"Depth" -> Infinity, "MaxElements" -> 5, "MaxStringLength" -> 40};

fitToBudget[expr_, maxChars_Integer, OptionsPattern[]] :=
  Catch@Module[
    {d  = OptionValue["Depth"],
     me = OptionValue["MaxElements"],
     sl = OptionValue["MaxStringLength"],
     cache, len, lo, hi, mid},

    (* memoize: each render costs <= n nodes; never recompute the same n *)
    cache[n_] := cache[n] = expressionSchema[Unevaluated[expr], d, me, sl, n];
    len[n_]   := StringLength[cache[n]];

    (* 1. exponentially grow the budget until we overshoot or saturate     *)
    hi = 32;
    While[len[hi] <= maxChars,
      If[len[hi] === len[2 hi], Throw[cache[hi]]];  (* whole expr fits: done *)
      hi *= 2];

    (* 2. len[hi] now exceeds the limit; make sure the floor fits          *)
    lo = 1;
    If[len[lo] > maxChars, Throw[cache[lo]]];        (* can't do better      *)

    (* 3. binary-search the largest budget that still fits                  *)
    While[hi - lo > 1,
      mid = Quotient[lo + hi, 2];
      If[len[mid] <= maxChars, lo = mid, hi = mid]];

    cache[lo]
];

Unprotect[Shallow];
ClearAll[Shallow];

Shallow /: MakeBoxes[Shallow[expr_], StandardForm] := fitToBudget[expr, 1000]
Shallow /: MakeBoxes[Shallow[expr_, depth_Integer], StandardForm] := expressionSchema[expr, depth, 3, 80, 1500]
Shallow /: MakeBoxes[Shallow[expr_, {depth_Integer, length_Integer}], StandardForm] := expressionSchema[expr, depth, length, 80, 1500]

Shallow /: MakeBoxes[Shallow[expr_, {depth_Integer, length_Integer, string_Integer}], StandardForm] := expressionSchema[expr, depth, length, string, 1500]

Shallow /: MakeBoxes[Shallow[expr_, {depth_Integer, length_Integer, string_Integer, max_Integer}], StandardForm] := expressionSchema[expr, depth, length, string, max]

Protect[Shallow]

End[]
EndPackage[]