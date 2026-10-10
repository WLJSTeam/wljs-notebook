BeginPackage["CoffeeLiqueur`Extensions`FrontendObject`MissingFetcher`", {
    "CoffeeLiqueur`Extensions`FrontendObject`",
    "CoffeeLiqueur`Extensions`Communication`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`"
}]

Begin["`Internal`"]

(* if doen't exists, try to fetch it from master *)
CoffeeLiqueur`Extensions`FrontendObject`Internal`$MissingHandler[uid_String, "Private"] := With[{promise = Promise[]},
    EventFire[Internal`Kernel`CommunicationChannel, "FetchFrontEndObject", <|"UId"->uid, "Promise" -> promise, "Kernel"->Internal`Kernel`Hash|>];
    With[{result = WaitAll[promise, 15]},
        If[MissingQ[result], $Failed, result]
    ]
]


End[]
EndPackage[]