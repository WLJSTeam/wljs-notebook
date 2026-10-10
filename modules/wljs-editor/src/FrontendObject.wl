BeginPackage["CoffeeLiqueur`Extensions`FrontendObject`"]

(* we expose them to System *)

System`CreateFrontEndObject;
System`FrontEndRef;
System`FrontEndExecutable;
System`FrontEndVirtual;

CreateFrontEndObject::usage = "CreateFrontEndObject[expr_, uid_] compresses and expression to a frontend object. \nThe output is only evaluatable on the frontend. To get the original expression apply FrontEndRef on the generated uid"
FrontEndRef::usage = "A readable by kernel representation of a frontend object"
FrontEndExecutable::usage = "A readable by frontend representation of a frontend object"

FrontEndVirtual::usage = "[LEGACY]"

Begin["`Internal`"]

$MissingHandler[_, _] := $Failed

(* predefine for the future *)
System`WLXForm;

Objects = <||>
Symbols = <||>


(* ::: Compression for large frontend objects :::*)

Compressed[string_String, {"ExpressionJSON", "ZLIB"}] := ImportByteArray[ByteArray[Developer`RawUncompress[BaseDecode[string]//Normal]], "ExpressionJSON"] // ReleaseHold

compression;

exportWithContext[expr_] :=
 Block[
   {
     $Context = "cwc$`",
     $ContextPath = {"cwc$`", "System`", "Global`"}
   },
   ExportByteArray[expr, "ExpressionJSON"]
 ];

(* apply only on large objects*)

compression[expr_, {"ExpressionJSON", "ZLIB"}] := Hold[expr];

compression[expr_, {"ExpressionJSON", "ZLIB"}] := With[{arr = Normal[exportWithContext[expr] ]},
    With[{data = BaseEncode[ByteArray[Developer`RawCompress[arr] ] ]},
        Compressed[data, {"ExpressionJSON", "ZLIB"}] // Hold
    ]
] /; (ByteCount[expr] > 0.07 * 1024 * 1024)

CreateFrontEndObject[expr_, uid_String, OptionsPattern[] ] := With[{},
    With[{
        data = Switch[OptionValue["Store"]
            , "Kernel"
            , <|"Private" -> compression[expr, {"ExpressionJSON", "ZLIB"}]|>

            , "Frontend"
            , <|"Public"  -> compression[expr, {"ExpressionJSON", "ZLIB"}]|>

            ,_
            , <|"Private" -> compression[expr, {"ExpressionJSON", "ZLIB"}], "Public" :> Objects[uid, "Private"]|>
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

(* Hash[] function causes colisions, we have to use UUID instead *)
(* CreateFrontEndObject[expr_, opts: OptionsPattern[] ] := CreateFrontEndObject[expr, StringTemplate["F``"][Hash[expr]], opts] *)
CreateFrontEndObject[expr_, opts: OptionsPattern[] ] := CreateFrontEndObject[expr, StringTemplate["F``"][CreateUUID[]], opts]

Options[CreateFrontEndObject] = {"Store" -> All}

FrontEndRef[uid_String] := If[KeyExistsQ[Objects, uid], 
    With[{o = Objects[uid, "Private"]},
        o
    ] // ReleaseHold
,
    $MissingHandler[uid, "Private"] // ReleaseHold
]

FrontEndExecutable /: MakeBoxes[FrontEndExecutable[uid_String], StandardForm] := RowBox[{"FrontEndRef[\"", uid, "\"]"}]

GetObject[uid_String] := With[{},
    If[KeyExistsQ[Objects, uid],
        With[{ c = Objects[uid, "Public"] },
            c
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