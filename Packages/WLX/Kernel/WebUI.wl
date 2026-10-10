BeginPackage["CoffeeLiqueur`WLX`WebUI`", {"CoffeeLiqueur`WLX`Importer`", "CoffeeLiqueur`WLX`", "CoffeeLiqueur`WebUSocketHandler`", "CoffeeLiqueur`Misc`Events`", "CoffeeLiqueur`Misc`Events`Promise`","CoffeeLiqueur`WLJS`Transport`"}]

WebUILazyLoad;
WebUISubmit;
WebUILocation;
WebUIClose;
WebUIRefresh;
WebUIContainer;
WebUIJSBind;
WebUIOnLoad;
WebUIEventListener;
WebUIKeyListener;
WebUIFetch;
WebUIInitializationScript;

WebUILazyLoadDataProvided;
WebUIContainerChild;

WebUIHeaderJS;

Begin["`Private`"]

WebUIHeaderJS[list1_String, OptionsPattern[]] := With[{list = OptionValue["List"]},
    StringRiffle[StringTemplate["<script type=\"module\" src=\"``\"></script>"]/@ Join[(StringTrim/@StringSplit[list1, "\n"]), list], "\n"]
]

WebUIHeaderJS[OptionsPattern[]] := With[{},
    StringRiffle[StringTemplate["<script type=\"module\" src=\"``\"></script>"]/@ OptionValue["List"], "\n"]
]

Options[WebUIHeaderJS] = {"List" -> {}}

{
    WebUILazyLoad, 
    WebUISubmit, 
    WebUILocation, 
    WebUIClose, 
    WebUIRefresh, 
    WebUIContainer, 
    WebUIJSBind, 
    WebUIOnLoad, 
    WebUIEventListener, 
    WebUIKeyListener, 
    WebUIFetch, 
    WebUIInitializationScript
} = ImportComponent[FileNameJoin[{$InputFileName // DirectoryName, "WebUI.wlx"}] ];

End[]
EndPackage[];
