BeginPackage["CoffeeLiqueur`Misc`Workers`", {
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`"
}]; 

Workers::usage = "Workers[] list all active workers";
WorkerLaunch::usage = "WorkerLaunch[expr_ | path_String] launches a worker thread with expr or filepath loaded as WL.\nWorkers run isolated, use EventHandler and EventFire to exchange data with them.";
WorkerClose::usage = "WorkerClose[workerObject] terminates a worker";
WorkerReadyQ::usage = "WorkerReadyQ[workerObject] checks if worker is running or valid";

WorkerObject;

Begin["`Private`"];

workersPool = {};
workersTimer = Null;
cachedId[s_] := cachedId[s] = ToString[s];

Internal`WorkerEventPacket;

startPolling := (workersTimer = SetInterval[
  If[Length[workersPool] == 0,
   stopPolling;,
   Do[With[{w = worker[[1]]}, {link = Check[LinkReadyQ[w], $Failed]}, 
    If[FailureQ[link], workersPool = workersPool /. worker -> Nothing];
    If[link, With[{r = LinkRead[w]},
      If[MatchQ[r, EnterExpressionPacket[_Internal`WorkerEventPacket]],
        EventFire[worker[[2]], r[[1,1]], r[[1,2]]];
      ]
    ] ]
  ], {worker, workersPool}];
], 1]) /; workersTimer === Null;

Workers[] := workersPool;

stopPolling := (TaskRemove[workersTimer]; workersTimer = Null; ) /; workersTimer =!= Null

WorkerLaunch[str_String] := Module[{file = Import[str, "Text"]},
  If[FailureQ[file], Return[$Failed]];
  With[{text = file},
    WorkerLaunch[ImportString[text, "WL"]]
  ]
];

WorkerLaunch[f_File] := Module[{file = Import[f, "Text"]},
  If[FailureQ[file], Return[$Failed]];
  With[{text = file},
    WorkerLaunch[ImportString[text, "WL"]]
  ]
];

WorkerLaunch[expr_] := Module[{kernel, cmd = $CommandLine//First},
    kernel = Quiet@LinkLaunch[cmd<>" -noicon -wstp -noinit -subkernel"];
    If[FailureQ[kernel], 
      cmd = If[$OperatingSystem === "Windows", "\'"<>cmd<>"\'", "'"<>cmd<>"'"];
      kernel = LinkLaunch[cmd<>" -noicon -wstp -noinit -subkernel"];
    ];
    If[FailureQ[kernel], Return[$Failed]];

    With[{uid = CreateUUID[]}, {w = WorkerObject[kernel, uid]},
    
      LinkWrite[kernel, Unevaluated[EnterExpressionPacket[
        Unprotect[EventFire, EventHandler]; ClearAll[EventHandler];
        Unprotect[Rasterize]; ClearAll[Rasterize];
        EventFire[Null, rest__] := LinkWrite[$ParentLink, EnterExpressionPacket[Internal`WorkerEventPacket[rest]]];
        EventFire[Null, rest_] := LinkWrite[$ParentLink, EnterExpressionPacket[Internal`WorkerEventPacket["Message", rest]]];
        EventHandler[Null, rest_] := Internal`EventHandlerWorker = {_ -> rest};
        EventHandler[Null, rest_List] := Internal`EventHandlerWorker = rest;
        Internal`EventHandlerWorkerRun[data_] := Internal`EventHandlerWorkerRun["Message", data];
        Internal`EventHandlerWorkerRun[topic_, data_] := (topic /. Internal`EventHandlerWorker)[data];
      ]]];

      With[{comp = Compress[Hold[expr]]},
        LinkWrite[kernel, Unevaluated[EnterExpressionPacket[Uncompress[comp]//ReleaseHold;]]];
      ];

   
      AppendTo[workersPool, w];
      startPolling;
      
      w
    ]
];

WorkerObject /: MakeBoxes[w: WorkerObject[link_, uid_], StandardForm] := With[{
  ready = Refresh[WorkerReadyQ[w], 1]
},
      Module[{above, below},
        above = { 
          {BoxForm`SummaryItem[{"Name: ", link[[1]]}]},
          {BoxForm`SummaryItem[{"Ready: ", ready}]}
        };
        BoxForm`ArrangeSummaryBox[
           WorkerObject, (* head *)
           w,      (* interpretation *)
           Null,    (* icon, use None if not needed *)
           (* above and below must be in a format suitable for Grid or Column *)
           above,    (* always shown content *)
           Null (* expandable content. Currently not supported!*)
        ]
    ]
]

WorkerObject /: EventHandler[w: WorkerObject[_, uid_], rest_] := (
  EventHandler[uid, rest];
  w
)

WorkerObject /: EventFire[w: WorkerObject[link_, uid_], rest_] := (
  LinkWrite[link, Unevaluated[EnterExpressionPacket[Internal`EventHandlerWorkerRun[rest]]]];
)

WorkerObject /: EventFire[w: WorkerObject[link_, uid_], rest__] := (
  LinkWrite[link, Unevaluated[EnterExpressionPacket[Internal`EventHandlerWorkerRun[rest]]]];
)

WorkerObject /: EventClone[w: WorkerObject[_, uid_]] := (
  EventClone[uid]
)

WorkerObject /: EventRemove[w: WorkerObject[_, uid_], rest___] := (
  EventRemove[uid, rest]
)

WorkerReadyQ[w_WorkerObject] := MatchQ[LinkReadyQ[w[[1]]], True | False] // Quiet

WorkerClose[w_WorkerObject] := (LinkClose[w[[1]]]; EventRemove[w[[2]]])// Quiet;

SetAttributes[WorkerLaunch, HoldFirst];

End[]
EndPackage[]