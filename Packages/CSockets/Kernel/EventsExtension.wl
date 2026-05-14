BeginPackage["CoffeeLiqueur`CUSockets`EventsExtension`", {"CoffeeLiqueur`CUSockets`", "CoffeeLiqueur`Misc`Events`"}]; 

CSocketsClosingHandler = (EventFire["csocket-"<>ToString[#2 // First], #1, True])&

Begin["`Private`"]

USocketObject /: EventFire[USocketObject[uid_], opts__] := EventFire["csocket-"<>ToString[uid], opts ]
USocketObject /: EventRemove[USocketObject[uid_] ] := EventRemove["csocket-"<>ToString[uid] ]
USocketObject /: EventClone[USocketObject[uid_] ]  := EventClone["csocket-"<>ToString[uid] ]
USocketObject /: EventHandler[USocketObject[uid_], opts__ ]  := EventHandler["csocket-"<>ToString[uid], opts ]

End[]
EndPackage[]