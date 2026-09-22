BeginPackage["CoffeeLiqueur`Misc`Async`", {"CoffeeLiqueur`Misc`Events`", "CoffeeLiqueur`Misc`Events`Promise`"}]; 

SetTimeout::usage = "SetTimeout[expr, milliseconds_Number] async scheldued task once after period"
SetInterval::usage = "SetInterval[expr, milliseconds_Number] async scheldued task every period"
CancelTimeout::usage = "CancelTimeout[task] cancel the timer"
CancelInterval::usage = "CancelInterval[task] cancel the timer"


AsyncFunction::usage = "AsyncFunction[args, body] is a pure (or \"anonymous\") async function. Returns Promise"
Await::usage = "Await[expr] is used in AsyncFunction to pause the execution until expr is resolved"

PauseAsync::usage = "Async version of Pause[n], that returns promise"

TableAsync::usage = "TableAsync[expr, {i,1,5}}] where expr can be async expression  and the interator syntax is the same as for Table. Returns Promise with list";
DoAsync::usage = "DoAsync[expr, {i,1,5}}] where expr can be async expression and the interator syntax is the same as for Do. Returns Promise";
WhileAsync::usage = "WhileAsync[test, body] evaluates body repeatedly while test is True. test and body can contain Await, Break, Continue, and Return. Returns Promise";

MicrotasksRun::usage = "MicrotasksRun[] runs microtasks";
MicrotaskSubmit::usage = "MicrotaskSubmit[expr_] submit held expression to a microtask loop run by MicrotasksRun"

Begin["`Private`"]; 


SetTimeout[expr_, timeout_] := SessionSubmit[ScheduledTask[expr, {Quantity[timeout/1000, "Seconds"]}] ]
SetTimeout[expr_, timeout_Quantity] := SessionSubmit[ScheduledTask[expr, {timeout}] ]
CancelTimeout[t_TaskObject] := TaskRemove[t]

SetInterval[expr_, timeout_] := SessionSubmit[ScheduledTask[expr, Quantity[timeout/1000, "Seconds"] ] ]
SetInterval[expr_, timeout_Quantity] := SessionSubmit[ScheduledTask[expr, timeout ] ]
CancelInterval[t_TaskObject] := TaskRemove[t]

SetAttributes[SetTimeout, HoldFirst]
SetAttributes[SetInterval, HoldFirst]


asyncTransform;
SetAttributes[asyncTransform, HoldFirst]

asyncReturn;
(* Return must be carried as data once execution continues in a promise callback. *)
asyncReturned;
asyncBreak;
asyncContinue;

asyncControlQ[result_] := MatchQ[result, _asyncReturned | _asyncBreak | _asyncContinue]

asyncTransform[a_] := a

asyncTransform[CompoundExpression[b_]] := asyncTransform[b]

asyncTransform[Await[a_]] := asyncReturn[a]

asyncTransform[Break[]] := asyncBreak[]

asyncTransform[Continue[]] := asyncContinue[]

asyncTransform[Return[]] := asyncReturned[Null]

asyncTransform[Return[value_]] := With[{result = asyncTransform[value]},
  If[MatchQ[result, _asyncReturn],
    Module[{p = Promise[]},
      Then[Extract[result, 1], Function[resolved,
        EventFire[p, Resolve, If[MatchQ[resolved, _asyncReturned], resolved, asyncReturned[resolved]]];
      ], Function[null0,
        EventFire[p, Reject, $Failed];
      ] ];

      asyncReturn[p]
    ]
  ,
    asyncReturned[result]
  ]
]

asyncTransform[Module[vars_, body_]] := Module[vars, asyncTransform[body]]

asyncTransform[With[vars_, body_]] := With[vars, asyncTransform[body]]

asyncTransform[If[cond_, a_]] := asyncTransform[If[cond, a, Null]]

asyncTransform[If[cond_, a_, b_]] := With[{condition = asyncTransform[cond]},
  If[asyncControlQ[condition],
    condition
  ,
  If[MatchQ[condition, _asyncReturn],
    Module[{cp = Promise[]},
      Then[Extract[condition, 1], Function[result,
        If[asyncControlQ[result],
          EventFire[cp, Resolve, result];
        ,
          With[{branch = asyncTransform[If[result, a, b]]},
            If[MatchQ[branch, _asyncReturn],
              Then[Extract[branch, 1], Function[resolved,
                EventFire[cp, Resolve, resolved];
              ], Function[null1,
                EventFire[cp, Reject, $Failed];
              ] ]
            ,
              EventFire[cp, Resolve, branch];
            ]
          ]
        ]
      ], Function[null0,
        EventFire[cp, Reject, $Failed];
      ]];

      asyncReturn[cp]
    ]
  ,
    If[TrueQ[condition],
      With[{ares = asyncTransform[a]},
        If[MatchQ[ares, _asyncReturn],
          Module[{cap = Promise[]},
          
            Then[Extract[ares, 1], Function[result,
              EventFire[cap, Resolve, result];
            ], Function[null0,
              EventFire[cap, Reject, $Failed];
            ]];
            
            asyncReturn[cap]
          ]
        ,
          ares
        ]
      ]
    ,
      With[{bres = asyncTransform[b]},
        If[MatchQ[bres, _asyncReturn],
          Module[{cbp = Promise[]},
          
            Then[Extract[bres, 1], Function[result,
              EventFire[cbp, Resolve, result];
            ], Function[null0,
              EventFire[cbp, Reject, $Failed];
            ]];
            
            asyncReturn[cbp]
          ]
        ,
          bres
        ]
      ]    
    ]
  ]
  ]
]

asyncTransform[Which[]] := Null

asyncTransform[Which[condition_, value_, rest___]] :=
  asyncTransform[If[condition, value, Which[rest]]]

SetAttributes[asyncSwitchCases, HoldAll]

asyncSwitchCases[value_, original_, pattern_, branch_, rest__] :=
  If[MatchQ[value, pattern],
    asyncTransform[branch]
  ,
    asyncSwitchCases[value, original, rest]
  ]

asyncSwitchCases[value_, original_, pattern_, branch_] :=
  If[MatchQ[value, pattern],
    asyncTransform[branch]
  ,
    ReleaseHold[original]
  ]

asyncTransform[Switch[selector_, cases__]] := Module[{switchValue},
  asyncTransform[
    switchValue = selector;
    asyncSwitchCases[
      switchValue,
      HoldComplete[Switch[switchValue, cases]],
      cases
    ]
  ]
]

SetAttributes[TableAsync, HoldAll]
SetAttributes[DoAsync, HoldAll]

TableAsync[expr_, {max_?IntegerQ}] := Module[{iterator = 1}, TableAsync[expr, {iterator, 1, max, 1}] ]
TableAsync[expr_, {iterator_Symbol, max_?IntegerQ}] := TableAsync[expr, {iterator, 1, max, 1}]
TableAsync[expr_, {iterator_Symbol, min_?NumberQ, max_?NumberQ}] := TableAsync[expr, {iterator, min, max, 1}]
TableAsync[expr_, {iterator_Symbol, min_?NumberQ, max_?NumberQ, step_?NumberQ}] :=  With[{range = Range[min, max, step]}, TableAsync[expr, {iterator, range}] ]
TableAsync[expr_, {iterator_Symbol, range_?ListQ}] := Module[{results = range}, With[{
  p = Promise[],
  wrapperFunction = AsyncFunction[iterator, 
    expr
  ]
},
  applySyncCollect[results, range, wrapperFunction, 0, Length[range], Function[Null,
    EventFire[p, Resolve, results];
  ] ]; 

  p
] ]

DoAsync[expr_, {max_?IntegerQ}] := Module[{iterator = 1}, DoAsync[expr, {iterator, 1, max, 1}] ]
DoAsync[expr_, {iterator_Symbol, max_?IntegerQ}] := DoAsync[expr, {iterator, 1, max, 1}]
DoAsync[expr_, {iterator_Symbol, min_?NumberQ, max_?NumberQ}] := DoAsync[expr, {iterator, min, max, 1}]
DoAsync[expr_, {iterator_Symbol, min_?NumberQ, max_?NumberQ, step_?NumberQ}] :=  With[{range = Range[min, max, step]}, DoAsync[expr, {iterator, range}] ]
DoAsync[expr_, {iterator_Symbol, range_?ListQ}] := With[{
  p = Promise[],
  wrapperFunction = AsyncFunction[iterator,  
    expr
  ] 
},
  applySync[range, wrapperFunction, 0, Length[range], Function[Null,
    EventFire[p, Resolve, Null];
  ] ]; 

  p
] 

SetAttributes[WhileAsync, HoldAll]
SetAttributes[whileAsyncCreate, HoldAll]

whileAsyncCreate[test_, body_] := Module[{
  p = Promise[], run, runBody, resumeCondition, resumeBody, reject
},
  reject[null_] := EventFire[p, Reject, $Failed];

  resumeCondition[result_] := Which[
    MatchQ[result, _asyncReturned], EventFire[p, Resolve, result],
    MatchQ[result, _asyncBreak], EventFire[p, Resolve, Null],
    MatchQ[result, _asyncContinue], run[],
    TrueQ[result], runBody[],
    True, EventFire[p, Resolve, Null]
  ];

  resumeBody[result_] := Which[
    MatchQ[result, _asyncReturned], EventFire[p, Resolve, result],
    MatchQ[result, _asyncBreak], EventFire[p, Resolve, Null],
    MatchQ[result, _asyncContinue], run[],
    True, run[]
  ];

  runBody[] := With[{result = asyncTransform[body]},
    If[MatchQ[result, _asyncReturn],
      Then[Extract[result, 1], resumeBody, reject]
    ,
      resumeBody[result]
    ]
  ];

  run[] := Module[{
    conditionResult, bodyResult, synchronous, completed, rejected
  },
    While[True,
      conditionResult = asyncTransform[test];

      If[MatchQ[conditionResult, _asyncReturn],
        synchronous = True;
        completed = False;
        rejected = False;

        Then[Extract[conditionResult, 1], Function[result,
          If[synchronous,
            conditionResult = result;
            completed = True;
          ,
            resumeCondition[result]
          ]
        ], Function[null0,
          If[synchronous,
            rejected = True;
            completed = True;
          ,
            reject[null0]
          ]
        ] ];

        synchronous = False;

        If[!completed,
          Return[Null, Module];
        ];

        If[rejected,
          reject[Null];
          Return[Null, Module];
        ];
      ];

      If[MatchQ[conditionResult, _asyncReturned],
        EventFire[p, Resolve, conditionResult];
        Return[Null, Module];
      ];

      If[MatchQ[conditionResult, _asyncBreak],
        EventFire[p, Resolve, Null];
        Return[Null, Module];
      ];

      If[MatchQ[conditionResult, _asyncContinue],
        Continue[];
      ];

      If[!TrueQ[conditionResult],
        EventFire[p, Resolve, Null];
        Return[Null, Module];
      ];

      bodyResult = asyncTransform[body];

      If[MatchQ[bodyResult, _asyncReturn],
        synchronous = True;
        completed = False;
        rejected = False;

        Then[Extract[bodyResult, 1], Function[result,
          If[synchronous,
            bodyResult = result;
            completed = True;
          ,
            resumeBody[result]
          ]
        ], Function[null0,
          If[synchronous,
            rejected = True;
            completed = True;
          ,
            reject[null0]
          ]
        ] ];

        synchronous = False;

        If[!completed,
          Return[Null, Module];
        ];

        If[rejected,
          reject[Null];
          Return[Null, Module];
        ];
      ];

      If[MatchQ[bodyResult, _asyncReturned],
        EventFire[p, Resolve, bodyResult];
        Return[Null, Module];
      ];

      If[MatchQ[bodyResult, _asyncBreak],
        EventFire[p, Resolve, Null];
        Return[Null, Module];
      ];

      If[MatchQ[bodyResult, _asyncContinue],
        Continue[];
      ];
    ]
  ];

  run[];
  p
]

WhileAsync[test_, body_] := Module[{
  loop = whileAsyncCreate[test, body],
  p = Promise[]
},
  Then[loop, Function[result,
    EventFire[p, Resolve, If[MatchQ[result, _asyncReturned], Extract[result, 1], result]];
  ], Function[null0,
    EventFire[p, Reject, $Failed];
  ] ];

  p
]

asyncTransform[WhileAsync[test_, body_]] := asyncReturn[whileAsyncCreate[test, body]]

applySyncCollect[resultArray_, array_, f_, length_, length_, cbk_] := cbk[resultArray];

applySyncCollect[resultArray_, array_, f_, index_, length_, cbk_] := With[{r = f[array[[index+1]]]},

  If[PromiseQ[r],
    Then[r, Function[resolved, 
      resultArray[[index+1]] = resolved;
      applySyncCollect[resultArray, array, f, index+1, length, cbk];
    ], Function[rejected, 
      resultArray[[index+1]] = $Failed;
      applySyncCollect[resultArray, array, f, index+1, length, cbk];
    ] ]
  ,
    resultArray[[index+1]] = r;

    applySyncCollect[resultArray, array, f, index+1, length, cbk];
  ];
]

SetAttributes[applySyncCollect, HoldFirst]

applySync[array_, f_, length_, length_, cbk_] := cbk[resultArray];

applySync[array_, f_, index_, length_, cbk_] := With[{r = f[array[[index+1]]]},
  If[PromiseQ[r],
    Then[r, Function[resolved, 
      applySync[array, f, index+1, length, cbk];
    ], Function[rejected, 
      applySync[array, f, index+1, length, cbk];
    ] ]
  ,
    applySync[array, f, index+1, length, cbk];
  ];
]


asyncTransform[Set[a_, b_]] := With[{res = asyncTransform[b]},
  If[asyncControlQ[res],
    res
  ,
  If[MatchQ[res, _asyncReturn],
    Module[{p5 = Promise[]},
      Then[Extract[res, 1], Function[resolved,
        If[asyncControlQ[resolved],
          EventFire[p5, Resolve, resolved];
        ,
          EventFire[p5, Resolve, Set[a, resolved] ];
        ]
      ], Function[null0,
        EventFire[p5, Reject, $Failed];
      ] ];
      
      asyncReturn[p5]
    ]
  ,
    Set[a, res]
  ]
  ]
]

asyncTransform[CompoundExpression[a_, b__]] := With[{first = asyncTransform[a]},
  If[asyncControlQ[first],
    first
  ,
  If[MatchQ[first, _asyncReturn],
    Module[{p = Promise[]},
      Then[Extract[first, 1], Function[result,
        If[asyncControlQ[result],
          EventFire[p, Resolve, result];
        ,
          With[{rest = asyncTransform[CompoundExpression[b] ]},
            If[MatchQ[rest, _asyncReturn],
              Then[Extract[rest, 1], Function[resolved,
                EventFire[p, Resolve, resolved];
              ], Function[null1,
                EventFire[p, Reject, $Failed];
              ] ]
            ,
              EventFire[p, Resolve, rest];
            ];
          ];
        ]
      ], Function[null2,
            EventFire[p, Reject, $Failed];
      ] ];

      asyncReturn[p]
    ]
  ,
    asyncTransform[CompoundExpression[b] ]
  ]
  ]
]

AsyncFunction[vars_, body_] := Function[vars, 
  With[{return = asyncTransform[body]},
    If[MatchQ[return, _asyncReturn],
      Module[{mainPromise = Promise[]},
        Then[Extract[return, 1], Function[result,
          EventFire[mainPromise, Resolve, If[MatchQ[result, _asyncReturned], Extract[result, 1], result]];
        ], Function[null0,
          EventFire[mainPromise, Reject, $Failed];
        ] ];
        
        mainPromise
      ]
    ,
      If[MatchQ[return, _asyncReturned], Extract[return, 1], return]
    ]
  ]
]

SetAttributes[AsyncFunction, HoldAll]

PauseAsync[n_Real | n_Integer] := With[{p = Promise[]}, 
    SessionSubmit[ScheduledTask[EventFire[p, Resolve, True];, {Quantity[n, "Seconds"]}] ];
    p
]



MicrotasksRun[] := Module[{},
    If[!microtasksQ, Return[] ];
    If[Keys[tasks] === {}, microtasksQ = False,
        With[{task = tasks[#]},
            Module[{}, task["Expr"] ]; 
            If[!task["Continuous"], tasks[#] = .; ];
        ] &/@ Keys[tasks];
    ];
]

MicrotaskSubmit[expr_, OptionsPattern[] ] := With[{uid = CreateUUID[] },
    tasks[ uid ] = <|"Expr" :> expr, "Continuous" -> OptionValue["Continuous"]|>;
    microtasksQ = True;
    Microtask[uid]
]

Microtask /: Delete[Microtask[uid_String] ] := tasks[uid] = .;

SetAttributes[MicrotaskSubmit, HoldFirst]

Options[MicrotaskSubmit] = {"Continuous" -> False}

tasks = <||>
microtasksQ = True

End[];

EndPackage[];
