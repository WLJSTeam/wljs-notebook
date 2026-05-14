(* ::Package:: *)

PacletObject[
  <|
    "Name" -> "CoffeeLiqueur/CUSockets",
    "Description" -> "Sockets powered by C and UV",
    "Creator" -> "Kirill Belov",
    "License" -> "MIT",
    "PublisherID" -> "KirillBelov",
    "Version" -> "1.2.0",
    "WolframVersion" -> "13+",
    "PrimaryContext" -> "CoffeeLiqueur`CUSockets`",
    "Extensions" -> {
      {
        "Kernel",
        "Root" -> "Kernel",
        "Context" -> {
          {"CoffeeLiqueur`CUSockets`", "CSockets.wl"}, 
          {"CoffeeLiqueur`CUSockets`EventsExtension`", "EventsExtension.wl"},
          {"CoffeeLiqueur`CUSockets`Interface`Windows`", "Windows.wl"},
          {"CoffeeLiqueur`CUSockets`Interface`Unix`", "Unix.wl"}
        },
        "Symbols" -> {
          "CoffeeLiqueur`CUSockets`USocketObject",
          "CoffeeLiqueur`CUSockets`USocketListener",
          "CoffeeLiqueur`CUSockets`USocketOpen",
          "CoffeeLiqueur`CUSockets`USocketConnect"
        }
      },
      {"LibraryLink", "Root" -> "LibraryResources"},
      {
        "Asset",
        "Assets" -> {
          {"License", "./LICENSE"},
          {"ReadMe", "./README.md"},
          {"Source", "./Source"},
          {"Scripts", "./Scripts"}
        }
      }
    }
  |>
]
