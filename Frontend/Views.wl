Begin["CoffeeLiqueur`Notebook`Views`"];

{EmptyComponent,       EmptyScript}        = ImportComponent["Views/Empty.wlx"];
{NotebookComponent,    NotebookScript}     = ImportComponent["Views/Notebook/Notebook.wlx"];

{NotebookMessage, NotebookMessageScript}   = ImportComponent["Views/Notebook/Message.wlx"];
{NotebookFailure}                          = ImportComponent["Views/Notebook/Failure.wlx"];

(* /* view router */ *)
View[opts__] := With[{list = Association[ List[opts] ]},
    Router[ list["Path"] , list["AppEvents"], list["Messanger"] ][opts]
];

(* /* Default */ *)
Router[any_, _, _] := With[{},
    Print["Default router"];
    ({EmptyComponent[##], EmptyScript[##]} &)
];

(* /* Notebook */ *)
NotebookQ[path_] := FileExtension[path] === "wln";
Router[any_?NotebookQ, appevents_String, logs_String] := With[{}, 
    With[{n = loader`load[any, "Events"->appevents]},
        Print["Notebook router"];

        Switch[n
            ,_nb`NotebookObj
            ,    ({NotebookComponent[##, "Notebook"->n], NotebookScript[##]} &)
            ,_Association
            ,    ({NotebookMessage[##, "Data"->n], NotebookMessageScript[##]} &)
            ,_
            ,    (NotebookFailure[##, "Data"->n] &)

        ] 
    ] 
];


End[];

CoffeeLiqueur`Notebook`Views`View