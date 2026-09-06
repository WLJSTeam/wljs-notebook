BeginPackage["CoffeeLiqueur`Extensions`PrintRedirect`", {
    "CoffeeLiqueur`Misc`Events`",
    "CoffeeLiqueur`Misc`Events`Promise`",
    "CoffeeLiqueur`Misc`Async`",
    "CoffeeLiqueur`Extensions`RemoteCells`"
}];

Begin["`Internal`"]

time = AbsoluteTime[];
cnt = 0;

DefineOutputStreamMethod["MasterEchoPrint",
   {
      "ConstructorFunction" -> 
   Function[{streamname, isAppend, caller, opts},
    With[{state = Unique["CoffeeLiqueur`Extensions`PrintRedirect`Internal`PassthroughOutputStream"]},
     state["pos"] = 0;
     state["buffer"] = {};
     {True, state}
     ] ],
  
  "CloseFunction" -> 
   Function[state,  ClearAll[state] ],
  
  "StreamPositionFunction" -> Function[state, {state["pos"], state}],

  "FlushFunction" -> Function[{state},
    Block[{$Output = {}},
        With[{str = (Join @@ state["buffer"]) // ByteArrayToString // StringTrim},
            If[StringLength[str] > 0 && str =!= "Null" && str =!= ">> Null" && !StringMatchQ[str, "OutputStream"~~__],
                
                If[AbsoluteTime[] - time > 1,
                    time = AbsoluteTime[];
                    cnt = 0;
                ];

               If[cnt >= 0, 

                cnt = cnt + 1;

                If[cnt > 7,
                    cnt = -1;
                    EventFire[Internal`Kernel`RemoteEvent[ Internal`Kernel`Hash ], Notifications`NotificationMessage["System"], "Too many print messages. The output is suppressed"]; 
                ,

                    If[AssociationQ[System`$EvaluationContext],
                        If[StringTake[str, Min[2, StringLength[str] ] ] == ">>",
                            CellPrint[str, "Display"->"print", "SkipOutputs"->True];
       
                        ,
                            CellPrint[ToString[ToExpression[str, InputForm], StandardForm], "Display"->"print", "SkipOutputs"->True];
                            
                        ]
                    ,
                        EventFire[Internal`Kernel`RemoteEvent[ Internal`Kernel`Hash ], Notifications`NotificationMessage["Print"], 
                            If[StringTake[str, Min[2, StringLength[str] ] ] == ">>",
                                str
                            ,
                                ToString[ToExpression[str, InputForm], OutputForm] 
                            ]
                            
                        ]; 
                    ];       
                ]; 
              ];    
            ];
        ];   
    ]; 
    state["buffer"] = {};

    {Null, state}
  ],
  
  "WriteFunction" ->
   Function[{state, bytes},
    Module[{result, nBytes},
     nBytes = Length[bytes];
     
    state["buffer"] = Append[state["buffer"], ByteArray[bytes] ];
     state["pos"] += nBytes;
     {nBytes, state}
     ]
    ]
  }
]

DefineOutputStreamMethod["MasterEchoWarning",
   {
      "ConstructorFunction" -> 
   Function[{streamname, isAppend, caller, opts},
    With[{state = Unique["CoffeeLiqueur`Extensions`PrintRedirect`Internal`PassthroughOutputStream2"]},
     state["pos"] = 0;
     {True, state}
     ] ],
  
  "CloseFunction" -> 
   Function[state,  ClearAll[state]],
  
  "StreamPositionFunction" -> Function[state, {state["pos"], state}],
  
  "WriteFunction" ->
   Function[{state, bytes},
    Module[{result, nBytes},
     nBytes = Length[bytes];
     Block[{$Output = {}},
        With[{str = bytes // ByteArray // ByteArrayToString // StringTrim},
            If[StringLength[str] > 0 && str =!= "Null", EventFire[Internal`Kernel`RemoteEvent[ Internal`Kernel`Hash ], "Warning", str] ]; 
        ];
     ];
     state["pos"] += nBytes;
     {nBytes, state}
     ]
    ]
  }
]

OverrideListener := With[{},
    If[Internal`Kernel`Type =!= "LocalKernel",
        Echo["Error. PrintRedirect package can only for on LocalKernel. MasterKernel is not allowed!"];
    ,
        $Messages = {OpenWrite[Method -> "MasterEchoWarning"]};
        $Output = {OpenWrite[Method -> "MasterEchoPrint"]};      
    ];
];



End[]
EndPackage[]