(* ::Package:: *)

PacletObject[
  <|
    "Name" -> "CoffeeLiqueur/WLX",
    "Description" -> "Wolfram Language XML syntax extension (a superset of WL and XML)",
    "Creator" -> "Kirill Vasin",
    "License" -> "GPL-3.0-only",
    "PublisherID" -> "JerryI",
    "Version" -> "2.0.9",
    "WolframVersion" -> "13+",
    "Extensions" -> {
      {
        "Kernel",
        "Root" -> "Kernel",
        "Context" -> {
          {"CoffeeLiqueur`WLX`", "WLX.wl"},
          {"CoffeeLiqueur`WLX`Importer`", "Importer.wl"},
          {"CoffeeLiqueur`WLX`WebUI`", "WebUI.wl"}
        },
        "Symbols" -> {}
      },
      {
        "Asset",
        "Assets" -> {
          {"ReadMe", "./README.md"},
          {"Kit", {"Kernel", "WebUI.wlx"}},
          {"ExamplesFolder", "./Examples"},
          {"Image", "./logo.png"}
        }
      }
    },
    "PrimaryContext" -> "CoffeeLiqueur`WLX`"
  |>
]
