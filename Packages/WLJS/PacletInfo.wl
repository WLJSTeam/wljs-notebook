(* ::Package:: *)

PacletObject[
  <|
    "Name" -> "CoffeeLiqueur/WLJS",
    "Description" -> "WLJS package acting as a bridge between JS and WL",
    "Creator" -> "Kirill Vasin",
    "License" -> "MIT",
    "PublisherID" -> "JerryI",
    "Version" -> "1.0.0",
    "WolframVersion" -> "14+",
    "PrimaryContext" -> "CoffeeLiqueur`WLJS`",
    "Extensions" -> {
      {
        "Kernel",
        "Root" -> "Kernel",
        "Context" -> {
          {"CoffeeLiqueur`WLJS`Tools`", "Tools.wl"}, 
          {"CoffeeLiqueur`WLJS`Transport`", "Transport.wl"}
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
