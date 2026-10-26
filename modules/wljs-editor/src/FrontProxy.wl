BeginPackage["FrontProxy`", { 
    "CoffeeLiqueur`Extensions`Communication`",
    "CoffeeLiqueur`WLJS`Tools`","CoffeeLiqueur`WLJS`Transport`"
}]

Create::usage = "Create[{args}, body] creates proxy object for frontend execution"
Proxy::usage = "Proxy[{args}, body] creates proxy object for frontend execution"
FrontProxy`Reference;

FrontProxy`Dispatch::usage = "Dispatch[f_Reference] dispatches all changes made"

Buffer::usage = "Buffer[f_Reference, i_Integer] returns raw i-th buffer"
BufferSet::usage = "BufferSet[f_FrontProxy`Reference, i_Integer, data_] sets i-th buffer to data"

FrontProxy`Remove::usage = "Remove[f_Reference, uid_List]"

FrontProxy`AddTo::usage = "AddTo[f_Reference, {args__}] or AddTo[f_Reference, {{arg1__}, {arg2__}}]"
FrontProxy`FullForm::usage = "FullForm[f_Reference, uid_List]"

Begin["`Private`"]

bufferStore = System`Utilities`HashTable[];
generatorStore = System`Utilities`HashTable[];
constructorStore = System`Utilities`HashTable[];
groupsStore = System`Utilities`HashTable[];
constantsStore = System`Utilities`HashTable[];

sizeStore = System`Utilities`HashTable[];

Create = Proxy

FrontProxy`AddTo[FrontProxy`Reference[prehash_], args_List] := System`Utilities`HashTableGet[constructorStore, prehash] @@ args

FrontProxy`AddTo[FrontProxy`Reference[prehash_], args__List] := With[{a = System`Utilities`HashTableGet[constructorStore, prehash]},
  MapApply[a, {args}]
]




Proxy[vars_List, body_, public_:Automatic] := With[{
  
},
Module[{buffers, private, flags, arguments, explodeArgs,  type, index, minBufferLength = 0, currentLength = 0, buffersLength = 0, groups, updateBuffers, constructor},
  With[{generated = Module[vars, {body, vars, public}]},
    
    {type, buffers, private} = generated;
    arguments = buffers;

    If[public === Automatic || public === All, 
        private = None, 
        With[{p = private}, private = Complement[buffers, p]; buffers = p];
        explodeArgs = With[{arguments = arguments, pbody = {buffers, private}}, Function @@ {arguments, pbody}];
    ];
    


    With[{t = type},
      With[{prehash = Hash[CreateUUID[] ] },


        With[{generator = If[private === None,
                With[{function = Offload[t] /. Map[(# -> #[[index]])&, buffers] // Quiet},
                    Function @@ {index, function}
                ]
            ,
                With[{
                    function = Offload[t] /. Map[(# -> #[[index]])&, buffers] // Quiet,
                    args = Join[{index}, private]
                },
                    With[{
                        f = Function @@ {args, function}
                    },
                        Function[iIndex, With[{
                            rest = Join[{iIndex}, System`Utilities`HashTableGet[constantsStore, prehash + iIndex ] ]
                        },
                            f @@ rest
                        ] ]
                    ]
                ]                
            ]
        
        },
          With[{buffers = buffers},

            System`Utilities`HashTableAdd[generatorStore, prehash, generator];
            System`Utilities`HashTableAdd[bufferStore, prehash, Hold[buffers] ];
            System`Utilities`HashTableAdd[sizeStore, prehash, Hold[minBufferLength] ];
          
            updateBuffers[length_, defaults_] := 
              (
              MapIndexed[Function[{item, ii},
                If[ListQ[item],
                  item = Developer`ToPackedArray @ PadRight[item, length, {defaults[[ii[[1]]]]}]
                ,
                  item = Developer`ToPackedArray @ Table[defaults[[ii[[1]]]], {length}]
                ]
              , HoldFirst], Unevaluated[buffers] ];
              );

            constructor[opts__] := With[{list = If[private === None, {{opts}, Null}, 
                explodeArgs[opts]
            ]},



                If[currentLength > 0, currentLength = 1 ];

                While[System`Utilities`HashTableContainsQ[groupsStore, prehash + currentLength ] || currentLength == 0,
                  currentLength++;
                  If[buffersLength < currentLength,

                      buffersLength = currentLength * 2;
                      
                      updateBuffers[buffersLength, {opts}]; 
                      currentLength = 1;

                      While[System`Utilities`HashTableContainsQ[groupsStore, prehash + currentLength ],
                        currentLength++;
                      ];

                      
                  ];
                ];

                System`Utilities`HashTableSet[constantsStore, prehash + currentLength, list[[2]]];
                
                With[{i = currentLength, blist = list[[1]]},
                  MapIndexed[Function[{item, ii}, item[[i]] = blist[[ii[[1]]]], HoldFirst], Unevaluated@buffers]
                ];


                With[{},
                  With[{currentLength=currentLength},

                    If[minBufferLength < currentLength, minBufferLength = currentLength];

                    System`Utilities`HashTableSet[groupsStore, prehash + currentLength, FrontInstanceGroup[] // First];
                    
                    currentLength
                  ]
                ]
                 
            ];

            System`Utilities`HashTableAdd[constructorStore, prehash, constructor];

            FrontProxy`Reference[prehash]
          ]
        ]
      ]
    ]
  ]
] ]



FrontProxy`Reference /: MakeBoxes[f_FrontProxy`Reference, StandardForm] := Module[{above, below},

        BoxForm`ArrangeSummaryBox[
           FrontProxy`Reference, (* head *)
           f,      (* interpretation *)
           None,     (* icon, use None if not needed *)
           (* above and below must be in a format suitable for Grid or Column *)
           None,    (* always shown content *)
           Null (* expandable content. Currently not supported!*)
        ]
    ];

SetAttributes[FrontProxy`Reference, HoldAll]



FrontProxy`FullForm[FrontProxy`Reference[prehash_], index_Integer] := With[{o = System`Utilities`HashTableGet[generatorStore, prehash][index]},
  With[{group = System`Utilities`HashTableGet[groupsStore, prehash + index] // FrontInstanceGroup},
    group[o]
  ]
]

FrontProxy`FullForm[FrontProxy`Reference[prehash_], indexes_List] := With[{gen = System`Utilities`HashTableGet[generatorStore, prehash]},
  With[{
      os = ((System`Utilities`HashTableGet[groupsStore, prehash + #] // FrontInstanceGroup)[ gen[#] ]) &/@ indexes
    },

    os
  ]
]


FrontProxy`Remove[FrontProxy`Reference[prehash_], index_Integer] := FrontProxy`Remove[FrontProxy`Reference[prehash], {index}]
FrontProxy`Remove[FrontProxy`Reference[prehash_], indexes_List] := With[{
  hashes = (prehash + #) &/@ indexes
},
  With[{groups = FrontInstanceGroup[System`Utilities`HashTableGet[groupsStore, #] ] &/@ hashes},
    Delete @@ groups;
    System`Utilities`HashTableRemove[groupsStore, #]& /@ hashes;
    System`Utilities`HashTableRemove[constantsStore, #]& /@ hashes;
  ]
]



icon = Graphics[{ColorData[97][1], Rectangle[{-1,-1}, {1,1}], ColorData[97][4],Disk[{0.5,0.5},1]}, ImageSize->{25,25}, "Controls"->False];

FrontProxy`Dispatch[FrontProxy`Reference[prehash_] ] := With[{r = System`Utilities`HashTableGet[bufferStore, prehash]},
  Function[buffers, Map[Function[buffer, With[{b = buffer}, buffer = b];, HoldFirst], Unevaluated @ buffers], HoldFirst] @@ r;
]


validateObjects[prehash_] := With[{length = System`Utilities`HashTableGet[sizeStore, prehash] // ReleaseHold},
  validateObjects[prehash, length]
]

validateObjects[prehash_, length_] := With[{},
  If[length == 0, Return[{}] ];
  Table[System`Utilities`HashTableContainsQ[groupsStore, prehash + i ], {i, length}]
]

Buffer[FrontProxy`Reference[prehash_], index_Integer ] := With[{r = System`Utilities`HashTableGet[bufferStore, prehash], length = System`Utilities`HashTableGet[sizeStore, prehash] // ReleaseHold},
  If[length == 0, Return[{}] ];
  Developer`ToPackedArray @ Take[Extract[r, {1, index}], length]
]

Buffer[FrontProxy`Reference[prehash_], All ] := With[{r = System`Utilities`HashTableGet[bufferStore, prehash], length = System`Utilities`HashTableGet[sizeStore, prehash] // ReleaseHold},
  If[length == 0, Return[{}] ];

  With[{v = validateObjects[prehash, length]},
    Developer`ToPackedArray @ Join[Take[#, length] &/@ ReleaseHold[r], {v}]
  ]
]

Buffer[FrontProxy`Reference[prehash_], -1 ] := Developer`ToPackedArray @ validateObjects[prehash]

Buffer[FrontProxy`Reference[prehash_], 0 ] := Developer`ToPackedArray @ Range[System`Utilities`HashTableGet[sizeStore, prehash] // ReleaseHold]


BufferSet[FrontProxy`Reference[prehash_], index_Integer, payload_] := With[{r = System`Utilities`HashTableGet[bufferStore, prehash], length = System`Utilities`HashTableGet[sizeStore, prehash] // ReleaseHold},
  If[length == 0, Return[] ];
  Extract[r, {1, index}, Function[p, p[[;;length]] = payload, HoldFirst] ];
]

BufferSet[FrontProxy`Reference[prehash_], All, payload_] := With[{r = System`Utilities`HashTableGet[bufferStore, prehash], length = System`Utilities`HashTableGet[sizeStore, prehash] // ReleaseHold},
  If[length == 0, Return[] ];

  Do[Extract[r, {1, j}, Function[p, p[[;;length]] = payload[[j]], HoldFirst] ], {j, Length[payload] - 1}];
]

End[]
EndPackage[]