BeginPackage["CoffeeLiqueur`Notebook`AppExtensions`"]

(*
    Application Extensions Interface
    This package defines shared events, templates, directories and objects to be used by the whole application as well as extensions
*)

AppExtensions;
ExtensionEvent;

AppEvents;
AppProtocol;
FrontendEnv;

SidebarIcons;

HTTPFileExtensions;

WebServers;

HTTPUHandler;
KernelList;

QuickNotesDir;
BackupsDir;
DefaultDocumentsDir;
DemosDir;
ExtensionsDir;
AppDataDir;
AppConfig;

AppGlobals;

Templates;
TemplateInjection;

Begin["`Internal`"];

templates = <||>;

emptyStringFunction[x__] := ""

AppGlobals;

WebServers = <||>;

Templates[ opts: OptionsPattern[] ] := With[{template = OptionValue["Template"]},
    If[KeyExistsQ[templates, template],
        #[opts] &/@ templates[template]
    ,
        emptyStringFunction[opts]
    ]
]

HTTPUHandler = Null

sidebarIcons = {};
SidebarIcons := sidebarIcons
SidebarIcons /: Set[SidebarIcons, list_List] := (sidebarIcons = Join[sidebarIcons, list])

Options[Templates] = {"Template" -> ""}

(* global event object *)
AppEvents      = "AppEvents"; 
AppProtocol = "AppProtocol$::";

TemplateInjection /: Set[TemplateInjection[template_String], function_] := With[{},
    If[KeyExistsQ[templates, template],
        templates[template] = Append[templates[template], function];
    ,
        templates[template] = {function}
    ];
]


End[]
EndPackage[]