BeginPackage["CoffeeLiqueur`Patches`NoWR`"]

Begin["`Private`"]

(* Credits to https://gist.github.com/trag1c/f74b2ab3589bc4ce5706f934616f6195 *)
nouns = StringSplit[Import[FileNameJoin[{$InputFileName//DirectoryName, "Nouns.txt"}], "Text"], "\n"];
nouns = Select[nouns, StringMatchQ[WordCharacter..] ];


Internal`NoWR`RandomWord[] := RandomChoice @ nouns;
Internal`NoWR`RandomWord[n_Integer] := RandomChoice[nouns, n];

End[]

EndPackage[]