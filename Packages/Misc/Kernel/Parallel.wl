BeginPackage["CoffeeLiqueur`Misc`Parallel`", {
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`"
}]; 

Needs["Parallel`Developer`" -> None];

ParallelSubmitAsync::usage = "ParallelSubmitAsync[expr_] _Promise executes expr on a parallel kernel"
ParallelSubmitFunctionAsync::usage = "ParallelSubmitFunctionAsync[func_, args__] _Promise executes func[args, cbk], where cbk can be called by task on parallel kernel"

Begin["`Private`"]

que = <||>;
$TimeInterval = 50;
$timer = False;

checkQ := If[$timer == False, $timer = SetInterval[checkState, $TimeInterval]];

checkState := If[!Parallel`Developer`QueueRun[] && Length[que//Keys] == 0, 
  CancelInterval[$timer];
  $timer = False;
];

remoteResolve[result_, p_Promise] := (
  que[p] = .;
  EventFire[p, Resolve, result];
)

SetSharedFunction[remoteResolve]

ParallelSubmitAsync::nokernels = "No parallel kernels available!"

ParallelSubmitAsync[expr_] := With[{p = Promise[]},
  If[$KernelCount == 0, Message[ParallelSubmitAsync::nokernels]; Return[$Failed] ];
  
  que[p] = ParallelSubmit[remoteResolve[expr, p]];  
  checkQ;
  p
]

ParallelSubmitFunctionAsync::nokernels = "No parallel kernels available!"

ParallelSubmitFunctionAsync[expr_, args__] := With[{p = Promise[]},
  If[$KernelCount == 0, Message[ParallelSubmitFunctionAsync::nokernels]; Return[$Failed] ];

  With[{
    joined = Sequence[args, Function[$res, remoteResolve[$res, p]]]
  },
    que[p] = ParallelSubmit[expr @ joined];  
    checkQ;
    p  
  ]
]


SetAttributes[ParallelSubmitAsync, HoldFirst]
SetAttributes[ParallelSubmitFunctionAsync, HoldFirst]


End[]
EndPackage[]
