BeginPackage["CoffeeLiqueur`Patches`NoWR`"]

Begin["`Private`"]

(* Credits to https://gist.github.com/trag1c/f74b2ab3589bc4ce5706f934616f6195 *)
nouns = StringSplit[Import[{$InputFileName//DirectoryName, "Nouns.txt"}, "Text"], "\n"];

Unprotect[RandomWord];

ClearAll[RandomWord];
RandomWord[] := RandomChoice @ nouns;
RandomWord[n_Integer] := RandomChoice[nouns, n];

End[]

EndPackage[]