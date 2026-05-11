BeginPackage["CoffeeLiqueur`Extensions`CommandPalette`VFX`"]

MagicWand;

Begin["`Internal`"]

MagicWand[element_] := iMagicWand[element];
MagicWand[element_, "Circle"]  := iMagicWand[element, "Circle"];
MagicWand[element_, "Stop"]  := iMagicWand[element, "Stop"];

End[]
EndPackage[]