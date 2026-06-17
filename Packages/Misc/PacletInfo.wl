(* ::Package:: *)

PacletObject[
  <|
    "Name" -> "CoffeeLiqueur/Misc",
    "Description" -> "Misc package with helpful tools",
    "Creator" -> "Kirill Vasin",
    "License" -> "MIT",
    "PublisherID" -> "JerryI",
    "Version" -> "0.5.7",
    "WolframVersion" -> "5+",
    "PrimaryContext" -> "CoffeeLiqueur`Misc`",
    "Extensions" -> {
      {
        "Kernel",
        "Root" -> "Kernel",
        "Context" -> {
          {"CoffeeLiqueur`Misc`Events`", "Events.wl"}, 
          {"CoffeeLiqueur`Misc`Parallel`", "Parallel.wl"}, 
          {"CoffeeLiqueur`Misc`Events`Promise`", "Promise.wl"},
          {"CoffeeLiqueur`Misc`WLJS`Transport`", "WLJSIO.wl"}, 
          {"CoffeeLiqueur`Misc`Async`", "Async.wl"}, 
          {"CoffeeLiqueur`Misc`Workers`", "Workers.wl"},
          {"CoffeeLiqueur`Misc`Language`", "Language.wl"}
        },
        "Symbols" -> {}
      },
 
      {
        "Asset",
        "Assets" -> {
          {"Assets", "InterpreterExtension.js"},
          {"Assets", "ServerAPI.js"}
        }
      }
    }
  |>
]
