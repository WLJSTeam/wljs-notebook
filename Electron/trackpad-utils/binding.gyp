{
    "targets": [
        {
            "target_name": "addon",
            "sources": [],
            "conditions": [
                [
                    "OS==\"mac\"",
                    {
                        "sources": [
                            "addon.mm"
                        ]
                    }
                ]
            ],
            "include_dirs": [
                "<!@(node -p \"require('node-addon-api').include\")"
            ],
            "libraries": [],
            "defines": [
                "NAPI_DISABLE_CPP_EXCEPTIONS"
            ],
            "xcode_settings": {
                "MACOSX_DEPLOYMENT_TARGET": "10.15",
                "OTHER_CPLUSPLUSFLAGS": [
                    "-std=c++14",
                    "-stdlib=libc++"
                ],
                "OTHER_LDFLAGS": [
                    "-framework CoreFoundation -framework AppKit"
                ]
            }
        }
    ]
}
