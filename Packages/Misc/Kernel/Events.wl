BeginPackage["CoffeeLiqueur`Misc`Events`"]; 

(* 
    An event system package 
    following KISS principle 

    This package replaces EventHandler of WL Standard Library
    used in communication with Frontend. Therefore all symbols
    are available in System context.
*)

System`EventObject;
System`EventJoin;
System`EventClone;
System`EventRemove;
System`EventFire;
System`EventHandler;
System`EventListener;

EventObject::usage = "EventObject[] creates a new event object with an auto-generated UUID. EventObject[uid_String] wraps an existing string ID. EventObject[assoc_Association] stores metadata directly; fields are accessible via EventObject[...][\"key\"]. Use EventHandler to attach handlers and EventFire to dispatch data. Delete[ev] and DeleteObject[ev] are aliases for EventRemove[ev]."

EventJoin::usage = "EventJoin[ev1, ev2, ...] returns a new EventObject that fires whenever any of the source events fires, forwarding the original pattern and data unchanged. Association-valued \"Initial\" fields from all sources are merged into the resulting event's own \"Initial\" data. Also available as Join[ev1, ev2, ...]."

EventClone::usage = "EventClone[ev] returns a new EventObject that receives every future firing of ev. Both the original and the clone share all existing handlers via an internal EventRouter fan-out. The clone inherits ev's metadata Association."

EventRemove::usage = "EventRemove[ev] removes all handlers attached to ev. EventRemove[ev, pattern] removes only the handler whose key matches pattern. Accepts an EventObject or a plain string ID."

EventFire::usage = "EventFire[ev] fires ev with Null data, or with the event's stored \"Initial\" value if one is present. EventFire[ev, data] dispatches data to all registered catch-all handlers. EventFire[ev, pattern, data] dispatches data only to handlers whose key matches pattern. Accepts an EventObject or a plain string ID."

Unprotect[EventHandler]
ClearAll[EventHandler]

EventHandler::usage = "EventHandler[ev, {pat1 -> f1, pat2 :> f2, ...}] attaches handler functions to ev, where ev is a String ID, EventObject, or Null. Each rule maps a fired pattern to a handler f called as f[data]. EventHandler[ev, f] attaches f as a catch-all handler (equivalent to {_String -> f}). EventHandler[Null, rules] creates a standalone EventListener instead of binding to an existing event. Returns ev unchanged."

EventListener::usage = "EventListener[source, rules] is an object representing a listener created by EventHandler[Null, rules]. source is the originating event ID or Null; rules map each fired pattern to the internal handler UUID registered for it."

Begin["`Private`"]; 

EventObject[] := EventObject[<|"Id" -> CreateUUID[]|>]
EventObject[uid_String] := EventObject[<|"Id" -> uid|>]
EventObject[a_Association][field_] := a[field]


listener[p_, list_] := With[{uid = CreateUUID[]}, With[{
    rules = Map[Function[rule, rule[[1]] -> uid ], list]
},
    EventHandler[uid, list];
    EventListener[p, rules]
] ]

EventHandler[Null, p_List] := listener[Null, p]


EventHandler[EventObject[a_Association], f_] := With[{},
    EventHandler[a["Id"], f];
    EventObject[a]
]

EventHandler[a_String, f_] := With[{},
    EventHandler[a, {_String -> f}];
    a
]

EventHandler[a_String, f_List] := With[{},
    If[!AssociationQ[EventHandlers[a] ], EventHandlers[a] = <||>];
    EventHandlers[a] = Join[EventHandlers[a], Association[f] ];
    a 
]

EventRemove[a_String, part_] := (EventHandlers[a] = KeyDrop[EventHandlers[a], part]);
EventRemove[a_String] := (EventHandlers[a] = .)

EventRemove[EventObject[a_Association] ] := EventRemove[ a["Id"] ]
EventRemove[EventObject[a_Association], t_] := EventRemove[ a["Id"], t ]

EventObject /: Delete[EventObject[a_Association], opts___] := EventRemove[EventObject[a], opts]
EventObject /: DeleteObject[EventObject[a_Association], opts___] := EventRemove[EventObject[a], opts]

EventFire[EventObject[a_Association] ] := With[{uid = a["Id"]}, 
    If[KeyExistsQ[a, "Initial"],
        EventFire[ uid, a["Initial"] ]
    ,
        EventFire[ uid, Null ]
    ];

    EventObject[a]
]

EventFire[EventObject[a_Association], data_] := With[{uid = a["Id"]}, 
    EventFire[ uid, data ]
]

EventFire[EventObject[a_Association], part_, data_] := With[{uid = a["Id"]}, 
    EventFire[ uid, part, data]
]

EventFire[uid_String, part_, data_] := EventFire[EventHandlers[uid], part, data]

EventFire[assoc_Association, part_, data_] := With[{replacements = assoc},
    (part /. Normal[replacements])[data]
]

EventFire[router_EventRouter, part_, data_] := With[{},
    EventFire[#, part, data] &/@ router[[1]]
]

EventFire[uid_String, data_] := EventFire[uid, "!_-_!", data]

EventRouter /: Append[EventRouter[data_List], uid_String] := EventRouter[Join[data, {uid}]];

EventClone[assocId_String] := (
    With[{t = EventHandlers[assocId], id = assocId, cuid = CreateUUID[]}, 
        Switch[Head[t],
            EventRouter,

            (*Print["Events >> adding new event to an existing chain"];*)
            t = Append[t, cuid];
        ,
            EventHandlers,

            (*Print["Events >> making a router from an empty event object"];*)
            t = EventRouter[{cuid}];
        ,
            Association,

            (*Print["Events >> reroute existing handlers"];*)
            With[{nid = CreateUUID[]},
                EventHandlers[nid] = t;
                EventHandlers[assocId] = EventRouter[{nid, cuid}];
            ];
        ,
            _,
            Print[StringTemplate["Events >> Internal error! Head `` is not valid"][Head[t] ] ];
            Return[$Failed];
        ];

        EventObject[<|"Id" -> cuid|>]
    ]
)

EventClone[EventObject[assoc_]] := EventObject[Join[assoc, EventClone[assoc["Id"] ][[1]] ] ]

EventJoin[seq__] := With[{list = List[seq], joined = CreateUUID[]},
Module[{data = <||>},
    With[{cloned = #},
        Switch[Head[#],
            String,
            Null;
        ,   
            EventObject,
            If[KeyExistsQ[cloned[[1]], "Initial"], With[{},
                (* check if types convertion is needed *)
                (* associations will be merged together *)
  
                If[AssociationQ[cloned[[1]]["Initial"] ], data = Join[data, cloned[[1]]["Initial"] ] ];
            ] ];
        ];
        
        With[{},
            EventHandler[cloned, {any_ :> Function[d,
                EventFire[joined, any, d]
            ]} ];
        ];
    ]&/@list;

    EventObject[<|"Id" -> joined, "Initial" -> data, "storage" -> Hold[data]|>]
] ] 

EventObject /: Join[evs__EventObject] := EventJoin[evs]


End[];

EndPackage[];

