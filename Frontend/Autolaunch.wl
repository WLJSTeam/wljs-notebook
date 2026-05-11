BeginPackage["CoffeeLiqueur`Notebook`KernelAutolaunch`", {
  "CoffeeLiqueur`Misc`Events`",
  "CoffeeLiqueur`Misc`Events`Promise`",
  "CoffeeLiqueur`CSockets`",
  "CoffeeLiqueur`Internal`",
  "CoffeeLiqueur`TCPServer`",
  "CoffeeLiqueur`WebSocketHandler`",
  "CoffeeLiqueur`Misc`WLJS`Transport`"
}];

autostart;

Begin["`Internal`"];

Needs["CoffeeLiqueur`ExtensionManager`" -> "WLJSPackages`"];
Needs["CoffeeLiqueur`Notebook`Kernel`" -> "GenericKernel`"];

appendHeld[Hold[list_], a_] := list = Append[list, a];
removeHeld[Hold[list_], a_] := list = (list /. a -> Nothing);
SetAttributes[appendHeld, HoldFirst];
SetAttributes[removeHeld, HoldFirst];

autostart[kernel_, KernelList_, initKernel_, deinitKernel_] := Module[{},
  Echo["Kernel autolaunch >> autostart"];
  appendHeld[KernelList, kernel];

  EventHandler[EventClone[kernel], {
    "Exit" -> Function[Null, removeHeld[KernelList, kernel]; deinitKernel[kernel] ],
    "Connected" -> Function[Null, initKernel[kernel] ]
  }];


  kernel // GenericKernel`Start;
  Echo["Kernel autolaunch >> started"];
];

End[]
EndPackage[]