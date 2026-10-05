BeginPackage["CoffeeLiqueur`Extensions`FrontendObject`MissingFetcher`", {
    "CoffeeLiqueur`Extensions`FrontendObject`",
    "CoffeeLiqueur`Extensions`Communication`",
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`"
}]

Begin["`Internal`"]

(* if doen't exists, try to fetch it from an active Window *)
CoffeeLiqueur`Extensions`FrontendObject`Internal`$MissingHandler[uid_String, "Private"] := With[{win = CurrentWindow[]},
    With[{result = FrontFetch[CoffeeLiqueur`Extensions`FrontendObject`Tools`UIObjects["Get", uid], "Window"->win]},
        If[FailureQ[result] || MatchQ[result, _$Failed],
            (* try to fetch from Master *)
            With[{promise = Promise[]},
                EventFire[Internal`Kernel`CommunicationChannel, "FetchFrontEndObject", <|"UId"->uid, "Promise" -> promise, "Kernel"->Internal`Kernel`Hash|>];
                With[{result = WaitAll[promise, 15]},
                    If[MissingQ[result], $Failed, result]
                ]
            ] 
        ,
            (* cache it *)
            CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects[uid] = <|"Private" -> result, "Public" :> (CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects[uid, "Private"])|>;
            result
        ]
    ]
]


End[]
EndPackage[]