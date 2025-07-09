{
    "tokens": [
        {
        "id": "token-7777-7777-7777",
        "displayName": "Black",
        "description": "Pure black",
        "codeSyntax": [
            {
            "platformId": "platform-000000",
            "formattedName": "Black"
            },
            {
            "platformId": "platform-111111",
            "formattedName": "--spblack"
            },
            {
            "platformId": "platform-222222",
            "formattedName": "SpBlack"
            },
            {
            "platformId": "platform-333333",
            "formattedName": "SPBLACK"
            }
        ],
        "valuesByMode": [
            {
            "modeIds": [],
            "value": {
                "value": "#000000"
            }
            }
        ]
        },
        {
        "id": "token-8888-88888-88888",
        "displayName": "Blue 500",
        "description": "Midtone blue",
        "codeSyntax": [
            {
            "platformId": "platform-000000",
            "formattedName": "Blue/500"
            },
            {
            "platformId": "platform-111111",
            "formattedName": "--spblue-500"
            },
            {
            "platformId": "platform-222222",
            "formattedName": "SpBlue_500"
            },
            {
            "platformId": "platform-333333",
            "formattedName": "SPBLUE_500"
            }
        ],
        "valuesByMode": [
            {
            "modeIds": [
                "modeId-light"
            ],
            "value": {
                "value": "#274DEA"
            },
            "platformOverrides": [
                {
                "platformId": "platform-111111",
                "value": "lch(57% 67 290)",
                "metadata": {
                    "description": "Using LCH for better color display on Web"
                }
                }
            ]
            },
            {
            "modeIds": [
                "modeId-dark"
            ],
            "value": {
                "value": "#6995FE"
            }
            }
        ]
        },
        {
        "id": "token-9999-9999-9999",
        "displayName": "Accent text color",
        "description": "Color of text using a shade of the accent color hue",
        "codeSyntax": [
            {
            "platformId": "platform-000000",
            "formattedName": "Text/Accent"
            },
            {
            "platformId": "platform-111111",
            "formattedName": "--sptext-accent"
            },
            {
            "platformId": "platform-222222",
            "formattedName": "SpText_Accent"
            },
            {
            "platformId": "platform-333333",
            "formattedName": "SPTEXT_ACCENT"
            }
        ],
        "valuesByMode": [
            {
            "modeIds": [
                "modeId-light",
                "modeId-low"
            ],
            "value": {
                "tokenId": "token-8888-88888-88888"
            },
            "platformOverrides": [
                {
                "platformId": "platform-222222",
                "value": "#FF00AA"
                },
                {
                "platformId": "platform-333333",
                "value": "#00FFAA"
                }
            ]
            },
            {
            "modeIds": [
                "modeId-light",
                "modeId-regular"
            ],
            "value": {
                "value": "#4C6FFE"
            },
            "platformOverrides": [
                {
                "platformId": "platform-222222",
                "value": "#4C6FFF"
                },
                {
                "platformId": "platform-333333",
                "value": "#4C6F00"
                }
            ]
            },
            {
            "modeIds": [
                "modeId-light",
                "modeId-high"
            ],
            "value": {
                "value": "#092FCC"
            }
            },
            {
            "modeIds": [
                "modeId-dark",
                "modeId-low"
            ],
            "value": {
                "tokenId": "token-8888-88888-88888"
            },
            "platformOverrides": [
                {
                "platformId": "platform-222222",
                "value": "#FF00BB"
                }
            ]
            },
            {
            "modeIds": [
                "modeId-dark",
                "modeId-regular"
            ],
            "value": {
                "value": "#346EF9"
            },
            "platformOverrides": [
                {
                "platformId": "platform-222222",
                "value": "#346EFF"
                }
            ]
            },
            {
            "modeIds": [
                "modeId-dark",
                "modeId-high"
            ],
            "value": {
                "value": "#A7C1FF"
            },
            "platformOverrides": [
                {
                "platformId": "platform-222222",
                "value": "#A7C1AA"
                }
            ]
            }
        ]
    }
    ]
}