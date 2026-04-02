BeginPackage["CoffeeLiqueur`Extensions`FrontendObject`"]

(* we have to expose them to System, otherwise Boxes won't work from Mathematica's packages *)

System`CreateFrontEndObject;
System`FrontEndRef;
System`FrontEndExecutable;
System`FrontEndVirtual;

CreateFrontEndObject::usage = "CreateFrontEndObject[expr_, uid_, opts] to force an expression to be evaluated on the frontend inside the container. There are two copies (on Kernel, on Frontend) can be specified using \"Store\"->\"Kernel\", \"Frontend\" or All (by default)"
FrontEndRef::usage = "A readable representation of a stored expression on the kernel"
FrontEndExecutable::usage = "A representation of a stored expression on the frontend"

FrontEndVirtual::usage = ""

Begin["`Internal`"]



$MissingHandler[_, _] := $Failed

(* predefine for the future *)
System`WLXForm;

Objects = <||>
Symbols = <||>


(* ::: Compression for large frontend objects :::*)

Compressed[string_String, {"ExpressionJSON", "ZLIB"}] := ImportByteArray[ByteArray[Developer`RawUncompress[BaseDecode[string]//Normal]], "ExpressionJSON"] // ReleaseHold

compression;

(* [NOTE] This is a deferred compression method, i.e. it is only applied when the object is requested via net / link *)
(*        Otherwise ExpressionJSON uncontrollably lifts the context from symbols depending where forntend object was created, *)
(*        this leads to some symbols to be falsly assumed to be in Global`, which will throw errors on the frontend *)
(*        The only way to avoid this is to deffer compression and ExpressionJSON convertion.                        *)
(* [FIXME] for the future: switch to Compress and WXF formats instead of JSON !!! *)

(* apply only on large objects*)
compression[expr_, {"ExpressionJSON", "ZLIB", "Defer"}] := Hold[expr] /; (ByteCount[expr] < 0.1 * 1024 * 1024);

SetAttributes[releaseCompression, HoldAll]

releaseCompression[compression[expr_, {"ExpressionJSON", "ZLIB", "Defer"}]] := With[{arr = Normal[ExportByteArray[expr, "ExpressionJSON"] ]},
        With[{data = BaseEncode[ByteArray[Developer`RawCompress[arr] ] ]},
            Compressed[data, {"ExpressionJSON", "ZLIB"}] // Hold
        ]
] 

releaseCompression[expr_] := expr




CreateFrontEndObject[expr_, uid_String, OptionsPattern[] ] := With[{},
    With[{
        data = Switch[OptionValue["Store"]
            , "Kernel"
            , <|"Private" -> compression[expr, {"ExpressionJSON", "ZLIB", "Defer"}]|>

            , "Frontend"
            , <|"Public"  -> compression[expr, {"ExpressionJSON", "ZLIB", "Defer"}]|>

            ,_
            , <|"Private" -> compression[expr, {"ExpressionJSON", "ZLIB", "Defer"}], "Public" :> Objects[uid, "Private"]|>
        ]
    },
        If[!AssociationQ[Objects], 
            Echo["Frontend Objects >> FATAL Error >> Objects are no longer an association"];
            Echo["Rebuilding..."];
            Objects = <||>;
        ];

        If[KeyExistsQ[Objects, uid],
            Objects[uid] = Join[Objects[uid], data ];    
        ,
            Objects[uid] = data;    
        ];    
    ];
    
    FrontEndExecutable[uid]
]

CreateFrontEndObject[expr_, opts: OptionsPattern[] ] := CreateFrontEndObject[expr, CreateUUID[], opts]

Options[CreateFrontEndObject] = {"Store" -> All}

FrontEndRef[uid_String] := If[KeyExistsQ[Objects, uid], 
    With[{o = Objects[uid, "Private"]},
        releaseCompression[o] (*Ehhhh Okay... we need to release it anyway *)
    ] // ReleaseHold
,
    $MissingHandler[uid, "Private"] // ReleaseHold
]

FrontEndExecutable /: MakeBoxes[FrontEndExecutable[uid_String], StandardForm] := RowBox[{"(*VB[*)(FrontEndRef[\"", uid, "\"])(*,*)(*", ToString[Compress[Hold[FrontEndExecutable[uid]]], InputForm], "*)(*]VB*)"}]

GetObject[uid_String] := With[{},
    (*Echo["Getting object >> "<>uid];*)
    If[KeyExistsQ[Objects, uid],
        With[{ c = Objects[uid, "Public"] },
            releaseCompression[c]
        ]
    ,
        $Failed
    ]
]

End[]


Begin["`Tools`"]

UIObjects;
ListObjects[] := Keys[CoffeeLiqueur`Extensions`FrontendObject`Internal`Objects]


End[]

EndPackage[]