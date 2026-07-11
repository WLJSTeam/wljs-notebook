BeginPackage["CoffeeLiqueur`Extensions`Notifications`", {"CoffeeLiqueur`Misc`Events`", "CoffeeLiqueur`Misc`Events`Promise`", "CoffeeLiqueur`Extensions`RemoteCells`"}]


HapticFeedback::usage = "HapticFeedback[] make a haptic feedback on MacOS devices (Desktop App only)"


Begin["`Private`"]

notRule[_Rule] = False
notRule[_] = True

Unprotect[Beep]
ClearAll[Beep]
Beep[]  := EventFire[Internal`Kernel`RemoteEvent[ Internal`Kernel`Hash ], Notifications`Beeper[], True]; 
Beep[s_String] := EventFire[Internal`Kernel`RemoteEvent[ Internal`Kernel`Hash ], Notifications`Beeper[], s]; 
Beep[_] := Beep[]



HapticFeedback[]  := EventFire[Internal`Kernel`RemoteEvent[ Internal`Kernel`Hash ], Notifications`Rumble[], True]; 
HapticFeedback[_] := HapticFeedback[]


Unprotect[EchoLabel];

EchoLabel["Warning"][expr_] := (EventFire[Internal`Kernel`RemoteEvent[ Internal`Kernel`Hash ], "Warning", ToString[expr] ]; expr); 
EchoLabel["Error"][expr_] := (EventFire[Internal`Kernel`RemoteEvent[ Internal`Kernel`Hash ], "Error", ToString[expr] ]; expr) 
EchoLabel["Notification"][expr_] := (EventFire[Internal`Kernel`RemoteEvent[ Internal`Kernel`Hash ], Notifications`NotificationMessage["Kernel"], ToString[expr] ]; expr)

EchoLabel["Spinner"][expr_] := With[{p = Unique[], uid = CreateUUID[]},
    EventFire[Internal`Kernel`CommunicationChannel, "CreateSpinner", <|
                    "UId" -> uid,
                    "Kernel"->Internal`Kernel`Hash,
                    "Topic"->"Kernel",
                    "Data"->ToString[expr]
    |>];

    p["Properties"] = {"Cancel"};
    p["Cancel"] := (EventFire[Internal`Kernel`CommunicationChannel, "RemoveSpinner", uid ]; ClearAll[p]);

    p /: Delete[p] := (EventFire[Internal`Kernel`CommunicationChannel, "RemoveSpinner", uid ]; ClearAll[p]);

    p
]

EchoLabel["ProgressBar"][expr_] := With[{p = Unique[], uid = CreateUUID[]},
    EventFire[Internal`Kernel`CommunicationChannel, "CreateProgressBar", <|
                    "UId" -> uid,
                    "Kernel"->Internal`Kernel`Hash,
                    "Topic"->"Kernel",
                    "Data"->ToString[expr]
    |>];

    p["Properties"] = {"Cancel", "Set", "SetMessage"};
    p["Cancel"] := (EventFire[Internal`Kernel`CommunicationChannel, "RemoveProgressBar", uid ]; ClearAll[p]);
    p["Set", n_Real | n_Integer] := (EventFire[Internal`Kernel`CommunicationChannel, "SetProgressBar", <|
                    "UId" -> uid,
                    "Kernel"->Internal`Kernel`Hash,
                    "Bar"->n
    |> ]; n);

    p["SetMessage", n_String] := (EventFire[Internal`Kernel`CommunicationChannel, "SetProgressBarMessage", <|
                    "UId" -> uid,
                    "Kernel"->Internal`Kernel`Hash,
                    "Message"->n
    |> ]; n);    

    p /: Delete[p] := (EventFire[Internal`Kernel`CommunicationChannel, "RemoveProgressBar", uid ]; ClearAll[p]);

    p
]

Protect[EchoLabel];



End[]
EndPackage[]
