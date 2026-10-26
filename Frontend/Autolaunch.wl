BeginPackage["CoffeeLiqueur`Notebook`KernelAutolaunch`", {
  "CoffeeLiqueur`Misc`Events`",
  "CoffeeLiqueur`Misc`Events`Promise`",
  "CoffeeLiqueur`CUSockets`",
  "CoffeeLiqueur`UInternal`",
  "CoffeeLiqueur`TCPUServer`",
  "CoffeeLiqueur`WebUSocketHandler`",
  "CoffeeLiqueur`WLJS`Tools`","CoffeeLiqueur`WLJS`Transport`"
}];

(* 
    Kernel autolaunch helper
*)

autostart;

Begin["`Internal`"];

Needs["CoffeeLiqueur`ExtensionManager`" -> "WLJSPackages`"];
Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];

appendHeld[Hold[list_], a_] := list = Append[list, a];
removeHeld[Hold[list_], a_] := list = (list /. a -> Nothing);
SetAttributes[appendHeld, HoldFirst];
SetAttributes[removeHeld, HoldFirst];

autostart[kernel_, KernelList_, initKernel_, deinitKernel_] := Module[{},
  Echo["[Frontend/Autolaunch] Starting the configured kernel automatically."];
  appendHeld[KernelList, kernel];

  EventHandler[EventClone[kernel], {
    "Exit" -> Function[Null, removeHeld[KernelList, kernel]; deinitKernel[kernel] ],
    "Connected" -> Function[Null, initKernel[kernel] ]
  }];


  kernel // GenericKernel`Start;
  Echo["[Frontend/Autolaunch] Automatic kernel startup completed."];
];

End[]
EndPackage[]
