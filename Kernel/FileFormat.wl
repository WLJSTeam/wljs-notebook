BeginPackage["CoffeeLiqueur`Notebook`FileFormat`"];

readNotebook;
writeNotebook;

endOfLine = EndOfLine | "\r";
newLine[1] = "\n" | "\r\n";
newLine[2] = "\n\n" | "\r\n\r\n";

Begin["`Private`"];

(* Unicode workarounds *)
(* keep special MMA symbols, but convert all unicode *)

hexDigit[c_] := Which[
  48 <= c <= 57, c - 48,      (* 0-9 *)
  65 <= c <= 70, c - 55,      (* A-F *)
  97 <= c <= 102, c - 87      (* a-f *)
]

convertCp[list_] := Fold[16 #1 + #2 &, 0, hexDigit /@ list]

utf8[n_] := Which[
  n <= 16^^7F,
    {n},

  n <= 16^^7FF,
    {
      16^^C0 + Quotient[n, 64],
      16^^80 + Mod[n, 64]
    },

  n <= 16^^FFFF,
    {
      16^^E0 + Quotient[n, 4096],
      16^^80 + Mod[Quotient[n, 64], 64],
      16^^80 + Mod[n, 64]
    },

  n <= 16^^10FFFF,
    {
      16^^F0 + Quotient[n, 262144],
      16^^80 + Mod[Quotient[n, 4096], 64],
      16^^80 + Mod[Quotient[n, 64], 64],
      16^^80 + Mod[n, 64]
    }
]

toMMAUTF8[str_String] := FromCharacterCode[
  SequenceReplace[
    ExportString[str, "String"] // ToCharacterCode,
    {
      {92, 124, a_, b_, c_, d_, e_, f_} :>
        Sequence @@ utf8[convertCp[{a, b, c, d, e, f}]],

      {92, 58, a_, b_, c_, d_} :>
        Sequence @@ utf8[convertCp[{a, b, c, d}]]
    }
  ]
]

fromUTF8MMA[str_String] := FromCharacterCode[ToCharacterCode[str], "UTF8"]

(* end of workarounds *)

takeKeys[nb_, keys_] := Association@Map[(# -> nb[#])&, keys]

genSeparator[size_, name_] := Module[{fill, left, right},
  fill = size - StringLength[name] - 2 - 2;
  left = Floor[fill/2];
  right = Ceiling[fill/2];
  StringJoin[
    "%",
    StringRepeat["-", left],
    "%",
    name,
    "%",
    StringRepeat["-", right],
    "%"
  ]
]

genSeparator[size_] := Module[{fill, left, right},
  fill = size - 2;
  left = Floor[fill/2];
  right = Ceiling[fill/2];
  StringJoin[
    "%",
    StringRepeat["-", left],
    StringRepeat["-", right],
    "%"
  ]
]
parseScalar[s_String] := Module[{t = StringTrim[s]},
  Switch[t,
    "true", True,
    "false", False,
    _, If[StringMatchQ[t, NumberString], ToExpression[t], t]
  ]
];

parseProps[lines_List] :=
  Association @ Map[
    Function[line,
      With[
        {parts =
          StringTrim /@
            StringSplit[StringTrim[line], ":", 2]
        },
        parts[[1]] -> parseScalar[parts[[2]]]
      ]
    ],
    Select[lines, StringTrim[#] =!= "" &]
  ];

parseList[lines_List] :=
  Map[
    parseScalar[
      StringTrim @ StringReplace[StringTrim[#], StartOfString ~~ "- " -> ""]
    ] &,
    Select[lines, StringTrim[#] =!= "" &]
  ];

parseNested[lines_List] := Module[
  {clean = Select[lines, StringTrim[#] =!= "" &]},
  If[
    clean === {},
    <||>,
    If[
      AllTrue[clean, StringStartsQ[StringTrim[#], "- "] &],
      parseList[clean],
      parseProps[clean]
    ]
  ]
];

parseMiniYAML[s_String] := Module[
  {lines = StringSplit[s, "\n"], i = 1, n, out = <||>, key, val, nested},

  n = Length[lines];

  While[i <= n,
    If[StringTrim[lines[[i]]] === "",
      i++;
      Continue[];
    ];

    {key, val} = StringTrim /@ StringSplit[lines[[i]], ":", 2];

    If[val =!= "",
      out[key] = parseScalar[val];
      i++;,
      nested = {};
      i++;
      While[
        i <= n &&
        (StringTrim[lines[[i]]] === "" ||
         StringMatchQ[lines[[i]], WhitespaceCharacter .. ~~ ___]),

        If[StringTrim[lines[[i]]] =!= "",
          AppendTo[
            nested,
            StringReplace[lines[[i]], StartOfString ~~ WhitespaceCharacter .. -> ""]
          ]
        ];
        i++;
      ];

      out[key] = parseNested[nested];
    ];
  ];

  out
];

ClearAll[emitScalar, emitBlock, assocToMiniYAML];

emitScalar[x_] := Switch[x,
  True, "true",
  False, "false",
  _String, x,
  _, ToString[x, InputForm]
];

emitBlock[key_, sub_Association, indent_: 0] := Module[
  {
    pad = StringRepeat[" ", indent],
    pad2 = StringRepeat[" ", indent + 2]
  },
  StringRiffle[
    Join[
      {pad <> ToString[key] <> ":"},
      KeyValueMap[
        If[AssociationQ[#2] || ListQ[#2],
          emitBlock[#1, #2, indent + 2],
          pad2 <> ToString[#1] <> ": " <> emitScalar[#2]
        ] &,
        sub
      ]
    ],
    "\n"
  ]
];

emitBlock[key_, sub_List, indent_: 0] := Module[
  {
    pad = StringRepeat[" ", indent],
    pad2 = StringRepeat[" ", indent + 2]
  },
  StringRiffle[
    Join[
      {pad <> ToString[key] <> ":"},
      Map[
        pad2 <> "- " <> emitScalar[#] &,
        sub
      ]
    ],
    "\n"
  ]
];

assocToMiniYAML[a_Association] := StringRiffle[
  KeyValueMap[
    If[
      AssociationQ[#2] || ListQ[#2],
      emitBlock[#1, #2],
      ToString[#1] <> ": " <> emitScalar[#2]
    ] &,
    a
  ],
  "\n"
];

writeNotebook[stream_, nb_] := With[
    {file = stream}
    ,
    Module[
        {temp, buffer}
        ,
        WriteString[file, genSeparator[75, "Notebook"] ];
        WriteString[file, "\n"];
        With[
            {
                keys = Select[
                    Complement[nb["PublicFields"], {"Properties", "PublicFields"}]
                    ,
                    Function[k,
                        MemberQ[nb["Properties"], k]
                    ]
                ]
            }
            ,
            WriteString[file, assocToMiniYAML[takeKeys[nb, keys]]]; WriteString[file, "\n"]; WriteString[file, genSeparator[75]]; WriteString[file, "\n\n"];
        ];
        WriteString[file, "\n"];
        WriteString[file, genSeparator[75, "Cells"]];
        WriteString[file, "\n"];
        Function[cell,
            WriteString[
                file
                ,
                assocToMiniYAML[
                    Association[
                        Function[prop,
                            If[MemberQ[{"Type", "Display", "Props", "Invisible"}, prop],
                                Which[
                                    prop == "Display" && cell[prop] === "codemirror",
                                        Nothing
                                    ,
                                    prop == "Invisible" && cell[prop] === False,
                                        Nothing
                                    ,
                                    AssociationQ[cell[prop]] && Length[cell[prop]] == 0,
                                        Nothing
                                    ,
                                    True,
                                        prop -> cell[prop]
                                ]
                                ,
                                Nothing
                            ]
                        ] /@ cell["Properties"]
                    ]
                ]
            ];
            WriteString[file, "\n"];
            WriteString[file, genSeparator[75]];
            WriteString[file, "\n"];
            WriteString[file, cell["Data"] // toMMAUTF8 ];
            WriteString[file, "\n\n"];
            If[cell =!= nb["Cells"][[-1]],
                WriteString[file, genSeparator[75]]; WriteString[file, "\n"];
                ,
                WriteString[file, genSeparator[75, "EndOfCells"]]; WriteString[file, "\n\n\n"];
            ];
        ] /@ nb["Cells"];
        With[{
            assocs = Function[l,
                If[MemberQ[nb["Properties"], l],
                    nb[l]
                    ,
                    Association[]
                ]
            ] /@ nb["ObjectFields"]
        },
            MapThread[
                Function[{name, data},
                    WriteString[file, "\n"];
                    WriteString[file, genSeparator[75, name]];
                    WriteString[file, "\n"];
                    If[Length[data] == 0,
                        WriteString[file, genSeparator[75, "EndOf" <> name]]; WriteString[file, "\n\n\n"];
                        ,
                        KeyValueMap[
                            Function[{key, value},
                                WriteString[file, assocToMiniYAML[Association["Key" -> key]]];
                                WriteString[file, "\n"];
                                WriteString[file, genSeparator[75]];
                                WriteString[file, "\n"];
                                WriteString[file, ToString[value, InputForm]];
                                WriteString[file, "\n\n"];
                                If[value =!= data[[-1]],
                                    WriteString[file, genSeparator[75]]; WriteString[file, "\n"];
                                ];
                            ]
                            ,
                            data
                        ];
                        WriteString[file, genSeparator[75, "EndOf" <> name]];
                        WriteString[file, "\n\n\n"];
                    ];
                ]
                ,
                {nb["ObjectFields"], assocs}
            ];
        ];
        WriteString[file, "\n\n\n"];
        WriteString[file, genSeparator[75, "EndOfNotebook"] ];
    ]
];

readNotebook[stream_, timeout_:10] := Module[
    {
        temp
        ,
        notebookHeader
        ,
        buffer
        ,
        file = stream
        ,
        list = {}
        ,
        keys = Association[]
    }
    ,
    With[
        {
            testIfEnd = Function[p,
                StringMatchQ[ReadString[file, newLine[1], TimeConstraint -> timeout], StartOfString ~~ p ~~ "%" ~~ ___]
            ]
        }
        ,
        temp = Check[
            ReadString[
                file
                ,
                ___ ~~ "%" ~~ Repeated["-", {17, 100}] ~~ "%Notebook%" ~~ Repeated["-", {17, 100}] ~~ "%" ~~ endOfLine
                ,
                TimeConstraint -> timeout
            ]
            ,
            $Failed
        ];
        If[FailureQ[temp],
            Return[ Failure["InvalidWLN", <|"Message" -> "Could not find %Notebook% header"|>] ]
        ];
        temp = Check[
            ReadString[
                file
                ,
                StartOfLine ~~ "%" ~~ Repeated["-", {17, 100}] ~~ Repeated["-", {17, 100}] ~~ "%" ~~ endOfLine
                ,
                TimeConstraint -> timeout
            ]
            ,
            $Failed
        ];
        If[FailureQ[temp],
             Return[ Failure["InvalidWLN", <|"Message" -> "Separator after %Notebook% not found"|>] ]
        ];
        notebookHeader = parseMiniYAML[StringTrim[temp]];
        
        
        list = {};
        temp = Check[
            ReadString[
                file
                ,
                StartOfLine ~~ "%" ~~ Repeated["-", {17, 100}] ~~ "%" ~~ "Cells" ~~ "%" ~~ Repeated["-", {17, 100}] ~~ "%" ~~ endOfLine ~~ newLine[1]..
                ,
                TimeConstraint -> timeout
            ]
            ,
            $Failed
        ];
        If[FailureQ[temp],
            Return[ Failure["InvalidWLN", <|"Message" -> "Could not find %Cells% header"|>] ]
        ];
        temp = Check[
            ReadString[
                file
                ,
                StartOfLine ~~ "%" ~~ Repeated["-", {17, 100}] ~~ Repeated["-", {17, 100}] ~~ "%" ~~ endOfLine ~~ newLine[1]
                ,
                TimeConstraint -> timeout
            ]
            ,
            $Failed
        ];
        If[FailureQ[temp],
            Return[ Failure["InvalidWLN", <|"Message" -> "Separator after %Cells% header not found"|>] ]
        ];
        temp = parseMiniYAML[StringTrim[temp]];
        buffer = ReadString[file, newLine[2] ~~ StartOfLine ~~ "%" ~~ Repeated["-", {16, 100}] ~~ "%", TimeConstraint -> timeout];
        If[FailureQ[buffer],
            Return[ Failure["InvalidWLN", <|"Message" -> "Could not parse first cell"|>] ]
        ];
        AppendTo[list, Append[temp, "Data" -> fromUTF8MMA[buffer] ]];
        While[
            !testIfEnd["EndOfCells"]
            ,
            temp = Check[
                ReadString[
                    file
                    ,
                    StartOfLine ~~ "%" ~~ Repeated["-", {17, 100}] ~~ Repeated["-", {17, 100}] ~~ "%" ~~ endOfLine ~~ newLine[1]
                    ,
                    TimeConstraint -> timeout
                ]
                ,
                $Failed
            ];
            If[FailureQ[temp],
                Return[ Failure["InvalidWLN", <|"Message" -> "Failed to parse the next cell"|>] ]
            ];
            temp = parseMiniYAML[StringTrim[temp]];
            buffer = ReadString[file, newLine[2] ~~ StartOfLine ~~ "%" ~~ Repeated["-", {16, 100}] ~~ "%", TimeConstraint -> timeout];
            If[FailureQ[buffer],
                Return[ Failure["InvalidWLN", <|"Message" -> "Could not find separator for the next cell"|>] ]
            ];
            AppendTo[list, Append[temp, "Data" -> fromUTF8MMA[buffer] ]];
        ];
        If[FailureQ[temp] || FailureQ[buffer],
            Return[ Failure["InvalidWLN", <|"Message" -> "Could not parse any next cells"|>] ]
        ];
        keys["Cells"] = list;
        Do[
            With[
                {field = field}
                ,
                list = Association[];
                temp = Check[
                    ReadString[
                        file
                        ,
                        StartOfLine ~~ "%" ~~ Repeated["-", {17, 100}] ~~ "%" ~~ field ~~ "%" ~~ Repeated["-", {17, 100}] ~~ "%" ~~ endOfLine ~~ newLine[1]..
                        ,
                        TimeConstraint -> timeout
                    ]
                    ,
                    $Failed
                ];
                If[FailureQ[temp],
                    Return[ Failure["InvalidWLN", <|"Message" -> "Could not parse %"<>field<>"% data"|>] ]
                ];
                temp = Check[
                    ReadString[
                        file
                        ,
                        (StartOfLine ~~ "%" ~~ Repeated["-", {17, 100}] ~~ Repeated["-", {17, 100}] ~~ "%" ~~ endOfLine ~~ newLine[1]) | (StartOfLine ~~ "%" ~~ Repeated["-", {17, 100}] ~~ "%EndOf" ~~ field ~~ "%" ~~ Repeated["-", {17, 100}] ~~ "%" ~~ endOfLine ~~ newLine[1])
                        ,
                        TimeConstraint -> timeout
                    ]
                    ,
                    $Failed
                ];
                If[FailureQ[temp],
                    Return[ Failure["InvalidWLN", <|"Message" -> "Could not parse data of %"<>field<>"%"|>] ]
                ];
                If[StringLength[StringTrim[temp]] == 0,
                    keys[field] = Association[]; Continue[];
                ];
                temp = parseMiniYAML[StringTrim[temp]];
                buffer = ReadString[file, newLine[2] ~~ StartOfLine ~~ "%" ~~ Repeated["-", {16, 100}] ~~ "%", TimeConstraint -> timeout];
                If[FailureQ[buffer],
                    Return[ Failure["InvalidWLN", <|"Message" -> "Could not separator of %"<>field<>"%"|>] ]
                ];
                AppendTo[list, temp["Key"] -> ToExpression[buffer, InputForm]];
                While[
                    !testIfEnd["EndOf" <> field]
                    ,
                    temp = Check[
                        ReadString[
                            file
                            ,
                            StartOfLine ~~ "%" ~~ Repeated["-", {17, 100}] ~~ Repeated["-", {17, 100}] ~~ "%" ~~ endOfLine ~~ newLine[1]
                            ,
                            TimeConstraint -> timeout
                        ]
                        ,
                        $Failed
                    ];
                    If[FailureQ[temp],
                        Return[ Failure["InvalidWLN", <|"Message" -> "Could not parse ending of %"<>field<>"% data"|>] ]
                    ];
                    temp = parseMiniYAML[StringTrim[temp]];
                    buffer = ReadString[file, newLine[2] ~~ StartOfLine ~~ "%" ~~ Repeated["-", {16, 100}] ~~ "%", TimeConstraint -> timeout];
                    If[FailureQ[buffer],
                        Return[ Failure["InvalidWLN", <|"Message" -> "Could not parse header of %"<>field<>"% data"|>] ]
                    ];
                    AppendTo[list, temp["Key"] -> ToExpression[buffer, InputForm]];
                ];
                If[FailureQ[temp] || FailureQ[buffer],
                    Return[ Failure["InvalidWLN", <|"Message" -> "Could not parse %"<>field<>"% data end"|>] ]
                ];
                keys[field] = list;
            ]
            ,
            {field, notebookHeader["ObjectFields"]}
        ];
        
        notebookHeader = Append[notebookHeader, "PublicFields"->(Keys[notebookHeader]/.{"ObjectFields"->Nothing})];
        Join[notebookHeader, keys]
    ]
];

End[]
EndPackage[]