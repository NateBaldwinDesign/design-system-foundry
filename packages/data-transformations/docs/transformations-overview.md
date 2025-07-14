## Transformation overview

_NOTE: This section highlights a few use cases that may benefit from being added to the core schema.json as enums in order to ensure future tight coupling between known existing modes when handling CSS-specific transformations._

Transformations follow specific patterns relative to the schema, and rely upon specific user data (when present) in order to configure the format and and outputs of the transformations. The following data / schema properties have key behaviors in transformation:
1. `tokenCollections`
2. `dimensions`, `modes`, and `dimensionOrder`
3. `platforms`
4. `resolvedValueTypes` and `valueFormatters`

Tokens have specific key behaviors relative to:
5. `codeSyntax` `formattedName`
6. `valuesByMode`
7. `value` (with child property `value` or `tokenId`)
8. `resolvedValueTypeId`
9. `propertyTypes`

### 1. `tokenCollections`
These are used to create user-specified "groups" of tokens. Transformers will have different outputs, but the concept is the same. Below are examples.
#### W3C Token JSON
```js
{
  "myTokenCollection": { // tokenCollection.name transformed to camelCase
    // tokens of this collection nested here
  }
}
```
#### Figma 
Each collection will require a single corresponding variable mode entry as well. All initial modes have an action of "UPDATE" always.
```js
{
  "variableCollections": [
    {
      "action": "CREATE", // CREATE if new or UPDATE if existing in Figma
      "name": "My Token Collection"
      "id": "myTokenCollectionId" // or existing Figma ID for the collection
      "initialModeId": "myCollectionModeId" // ID for the initial mode
    }
  ],
  "variableModes": [
    {
      "action": "UPDATE", // Always UPDATE for the initial mode
      "name": "Value" // All singular modes originating of a 'tokenCollection' will be named "Value"
      "id": "myCollectionModeId" // or existing Figma ID for the collection
      "variableCollectionId": "myTokenCollectionId" // Id of the collection it belongs to
    }
  ]
}
```

### 2. `dimensions`, `modes`, and `dimensionOrder`
Dimensions are essentially just a group of mutually exclusive modes. Transformers will handle these very differently based on the needs of the output format. Below are examples.
#### W3C Token JSON
Separate files for each mode, named in the format `{mode}.json`. Combinatory modes are named in order of the `dimensionOrder` data.
`light.json`
```js
{
  "myToken": { 
    "$value": "#333333" // light or light + regular mode value
  }
}
```
`light-high.json`
```js
{
  "myToken": { 
    "$value": "#000000" // light + high contrast mode value
  }
}
```

#### CSS 
CSS output may have two different approaches based on what is available. A "color-scheme" dimension with only "light" and "dark" mode options could be returned using `light-dark()`
```css
--myToken: light-dark(#000000, #ffffff);
```
Alternatively, 'color-scheme' dimensions could use media query format as well as a 'contrast'
```css
@media (prefers-color-scheme: light) {
  --myToken: #000000;
}
@media (prefers-color-scheme: dark) {
  --myToken: #FFFFFF;
}
```
If both contrast AND color-scheme dimensions exist, it is important to reference `dimensionOrder` to determine how to NEST these queries. For example, if the data has `dimensionOrder: ["contrastId", "colorSchemeId"] then we would nest like so:
```css
/* "Regular" contrast has no 'prefers-contrast' query */
@media (prefers-color-scheme: light) {
  --myToken: #333333; /* modeIds [light, regular] value of a tokens' valuesByMode */
}
@media (prefers-color-scheme: dark) {
  --myToken: #aaaaaa; /* modeIds [dark, regular] value of a tokens' valuesByMode */
}
/* Nest low and high contrast appropriately per dimensionOrder */
@media (prefers-contrast: more) {
  @media (prefers-color-scheme: light) {
    --myToken: #000000; /* modeIds [light, high] value of a tokens' valuesByMode */
  }
  @media (prefers-color-scheme: dark) {
    --myToken: #FFFFFF; /* modeIds [dark, regular] value of a tokens' valuesByMode */
  }
}
@media (prefers-contrast: less) {
  @media (prefers-color-scheme: light) {
    --myToken: #888888; /* modeIds [light, low] value of a tokens' valuesByMode */
  }
  @media (prefers-color-scheme: dark) {
    --myToken: #cccccc; /* modeIds [light, low] value of a tokens' valuesByMode */
  }
}
```

#### Figma
Each `dimension` will be created as a 'variableCollection' in our Figma output. 
```js
{
  "variableCollections": [
    {
      "action": "CREATE", // CREATE if new or UPDATE if existing in Figma
      "name": "Color scheme"
      "id": "myDimensionId" // or existing Figma ID for the collection
      "initialModeId": "mode-light"
    },
    {
      "action": "CREATE", // CREATE if new or UPDATE if existing in Figma
      "name": "Contrast"
      "id": "myContrastDimensionId" // or existing Figma ID for the collection
      "initialModeId": "mode-regular"
    },
  ]
}
```
Modes must be created separately and reference the collection ID of the dimension's variable collection
```js
{
  "variableModes": [
    {
      "action": "UPDATE", // UPDATE for the initial mode 
      "name": "Light"
      "id": "mode-light" // or existing Figma ID for the collection
      "variableCollectionId": "myDimensionId" // The id of the dimenison collection it belongs to
    },
    {
      "action": "CREATE", // CREATE if new (and not the initial mode) or UPDATE if existing in Figma or the initial mode
      "name": "Dark"
      "id": "mode-dark" // or existing Figma ID for the collection
      "variableCollectionId": "myDimensionId" // The id of the dimenison collection it belongs to
    },
    {
      "action": "UPDATE", // UPDATE for the initial mode 
      "name": "Regular"
      "id": "mode-regular" // or existing Figma ID for the collection
      "variableCollectionId": "myContrastDimensionId" // The id of the dimenison collection it belongs to
    },
    {
      "action": "CREATE", // CREATE if new (and not the initial mode) or UPDATE if existing in Figma or the initial mode
      "name": "High"
      "id": "mode-high" // or existing Figma ID for the collection
      "variableCollectionId": "myContrastDimensionId" // The id of the dimenison collection it belongs to
    },
    {
      "action": "CREATE", // CREATE if new (and not the initial mode) or UPDATE if existing in Figma or the initial mode
      "name": "Low"
      "id": "mode-low" // or existing Figma ID for the collection
      "variableCollectionId": "myContrastDimensionId" // The id of the dimenison collection it belongs to
    },
  ]
}
```

### 3. `platforms`
Each platform will have to have an entirely separate set of data when processed through the transformers. Platforms may have unique transformer options based on desired outputs, however the following must have **strict** formatting rules in our transformers:
1. W3C Design Token
2. Figma

### 4. `resolvedValueTypes` and `valueFormatters`
Each platform can specify `valueFormatters` which relate to `resolvedValueTypes` and how to format or transform a token's value.

Each token is designated a `resolvedValueTypeId` which corresponds to one of the standard enum types of a `resolvedValueType` or a custom type. 

Transformers must be aware of the platforms' `valueFormatters` (if present in the data), and their correlation to a token's values based on the tokens' `resolvedValueTypeId`. For the following examples we will use this data:
```json
{
  "platforms": [
    {
      "id": "platform-css",
      "displayName": "CSS",
      "valueFormatters": {
        "color": "lch",
        "dimension": "rem",
        "numberPrecision": 2
      }
    },
    {
      "id": "platform-iOS",
      "displayName": "iOS",
      "valueFormatters": {
        "color": "p3-rgb",
        "dimension": "pt",
        "numberPrecision": 2
      }
    }
  ],
  "tokens": [
    {
      "id": "token-blue-500",
      "displayName": "Blue 500",
      "valuesByMode": [
        {
          "modeIds": [],
          "value": {
            "value": "#3B82F6"
          }
        }
      ]
    },
    {
      "id": "token-spacing-100",
      "displayName": "Spacing 100",
      "valuesByMode": [
        {
          "modeIds": [],
          "value": {
            "value": 8
          }
        }
      ]
    }
  ]
}
```
#### CSS
The above data would be transformed like this for CSS based on the data example above
```css
--blue-500: lch(54.62% 66.37 277.6); /* Converted to CSS-formatted LCH color */
--spacing-100: 8px; /* Number value appended with 'px' */
```
#### iOS
The above data would be transformed like this for iOS based on the data example above
```swift
let Blue500 = UIColor(displayP3Red: 0.3047, green: 0.5035, blue: 0.9338, alpha: 1.0) // Converted to Swift, UIColor-formatted display P3 color 
let Spacing100 = 8 // Number value should automatically be points in iOS 
```

### 5. `codeSyntax` `formattedName`
The actual names of tokens generated by the transformers should already be defined for each Token.
```json
{
  "tokens": [
    {
      "id": "token-123456",
      "displayName": "Blue 500",
      "codeSyntax": [
        {
          "platformId": "platform-css",
          "formattedName": "--color-blue-500"
        },
        {
          "platformId": "platform-w3c",
          "formattedName": "color-blue-500"
        },
        {
          "platformId": "platform-figma",
          "formattedName": "Color/Blue/500"
        }
      ]
    }
  ]
}
```
#### W3C Design Token
```js
{
  "color-blue-500": { // formattedName from codeSyntax object with platformId matching id of "W3C Design Token" platform in data
    "value": "value"
  }
}
```
#### CSS
```css
:root {
  --color-blue-500: 'value'; /* formattedName from codeSyntax object with platformId matching id of "CSS" platform in data */
}
```

### Figma
The Figma variable's name will follow the same pattern. The primary difference with Figma is that it will include its own `codeSyntax` data, which only supports specific properties `WEB` (maps to CSS platform), `ANDROID`, and `iOS`.
```js
{
  "variables": [
    {
      "action": "CREATE", // Create or update if already exists in Figma file
      "id": "token-123456", // tokenId if doesn't exist in Figma, otherwise the existing corresponding Figma Varaible's ID
      "name": "Blue/500" // formattedName from codeSyntax object with platformId matching id of "Figma" platform in data
      "codeSyntax": {
        "WEB": "--blue-500" // formattedName from codeSyntax object with platformId matching id of "CSS" in platform data
        "ANDROID": "BLUE_500" // formattedName from codeSyntax object with platformId matching id of "Android" in platform data
        "iOS": "Blue500" // formattedName from codeSyntax object with platformId matching id of "iOS" in platform data
      }
    }
  ]
}
```

### 6. `valuesByMode`
This property is a simple and elegant solution for housing combinatory mode values in our source data schema. However we must resolve these to more rigid, hierarchical structures for each platform. Some platforms are more complicated than others

#### W3C Design Token
Each mode and combination of modes will be output as separate files. For each of these files, the tokens' value must correspond with the combination of modes the file represents.
```js
// light-high.json
{
  "my-token": {
    "value": "value" // value from valuesByMode ['mode-id-light', 'mode-id-high']
  }
}
```

#### CSS
```css
@media (prefers-color-scheme: light) {
  --my-token: value; /* value from valuesByMode ['mode-id-light'] or ['mode-id-light', 'mode-id-regular'] */

  @media (prefers-contrast: more) {
    --my-token: value /* value from valuesByMode ['mode-id-light', 'mode-id-high'] */
  }
}
```

#### Figma
Figma POST data has a unique structure, where values by mode are a unique object, detached from the variable JSON data.

Combinatory data from our source data needs de-structured and linked through aliasing across collection modes, which are "daisy-chained" in the order defined by `dimensinoOrder`. If the token belongs to a `tokenCollection`, that variable will be the final alias of the "daisy-chain". 

For example, if we have "Accent" color that supports color schemes (light/dark) and contrast modes (regular/low/high), and our `tokenCollection` of "Color" includes `resolvedValueTypeId` of the color resolved value type, we would assume this chain:

```js
// Source data:
{
  "tokens": [
    {
      "id": "token-654321",
      "displayName": "Accent Background",
      "valuesByMode": [
        {
          "modeIds": [ "mode-light" ],
          "value": {
            "value": "#3B82F6"
          }
        },
        {
          "modeIds": ["mode-light", "mode-high"],
          "value": {
            "tokenId": "#123456"
          }
        },
        {
          "modeIds": ["mode-light", "mode-low"],
          "value": {
            "tokenId": "#654321"
          }
        },
        {
          "modeIds": [ "mode-dark"],
          "value": {
            "value": "#60A5FA"
          }
        },
        {
          "modeIds": [ "mode-dark", "mode-high"],
          "value": {
            "value": "#fffff"
          }
        },
        {
          "modeIds": [ "mode-dark", "mode-low"],
          "value": {
            "value": "#abcdef"
          }
        },
      ]
    }
  ],
  "dimensionOrder": ['dimension-id-color-scheme', 'dimension-id-contrast']
}
```
```js
{
  "variables": [
    // Intermediary variables will need to be created in this use case.
    // See Daisy-chaining structure (for Figma) section of this document for detail.
    {
      "name": "Accent background (color scheme - regular),
      "id": "123"
    },
    {
      "name": "Accent background (color scheme - low),
      "id": "456"
    },
    {
      "name": "Accent background (color scheme - high),
      "id": "789"
    }
    {
      "name": "Accent background (contrast),
      "id": "963"
    }
  ]
}
{
  "variableModeValues": [
      //
      {
          "variableId": "123",  // uses ID matching itermediary variable in the "color scheme" collection
          "modeId": "mode-light", // mode id for 'light'
          "value": "value" // value for ['mode-light', 'mode-regular']
      },
      {
          "variableId": "123",  // uses ID matching itermediary variable in the "color scheme" collection
          "modeId": "mode-dark", // mode id for 'dark'
          "value": "value" // value for ['mode-dark', 'mode-regular']
      },
      {
          "variableId": "456",  // uses ID matching itermediary variable in the "color scheme" collection
          "modeId": "mode-light", // mode id for "light"
          "value": "value" // value for ['mode-light', 'mode-low']
      },
      {
          "variableId": "456",  // uses ID matching itermediary variable in the "color scheme" collection
          "modeId": "mode-dark", // mode id for 'dark'
          "value": "value" // value for ['mode-dark', 'mode-low']
      },
      {
          "variableId": "789",  // uses ID matching itermediary variable in the "color scheme" collection
          "modeId": "mode-light", // mode id for "light"
          "value": "value" // value for ['mode-light', 'mode-high']
      },
      {
          "variableId": "789",  // uses ID matching itermediary variable in the "color scheme" collection
          "modeId": "mode-dark", // mode id for 'dark'
          "value": "value" // value for ['mode-dark', 'mode-high']
      },
      {
          "variableId": "963",  // uses ID matching itermediary variable in the "contrast" collection
          "modeId": "mode-regular", // mode id for "regular"
          "value": { "tokenId": "123" } // daisy-chain to token from color scheme collection named "regular", which houses the [mode-light, mode-regular] resolved value.
      },
      {
          "variableId": "963",  // uses ID matching itermediary variable in the "contrast" collection
          "modeId": "mode-low", // mode id for "low"
          "value": { 
            "type": "VARIABLE_ALIAS", // value is an alias in order to reference an intermediary variable
            "id": "456"  // daisy-chain to token from color scheme collection named "regular", which houses the [mode-light, mode-low] resolved value.
          }
      },
      {
          "variableId": "963",  // uses ID matching itermediary variable in the "contrast" collection
          "modeId": "mode-high", // mode id for "high"
          "value": { 
            "type": "VARIABLE_ALIAS", // value is an alias in order to reference an intermediary variable
            "id": "789"  // daisy-chain to token from color scheme collection named "regular", which houses the [mode-light, mode-high] resolved value.
          }
      }
  ]
}
```

### 7. `value` (with child property `value` or `tokenId`)
The value object of a token can have a value property that is either `value` or `tokenId`. Values should be transformed based on the `platform` `valueFormatters` or by the strict rules of specific transformers.

The `tokenId` value is used to reference another token ("reference token") in the data and is transformed differently for each transformer.

#### W3C Design Token
```js
{
  "my-token": {
    "$value": "{group-name.reference-token-name}"
  }
}
```

#### CSS
```css
  --my-token: var(--reference-token-name);
```

#### Figma
```js
// variable mode value object
{
  "value": { 
    "type": "VARIABLE_ALIAS", // if using a `tokenId` reference token, value is an object with type VARIABLE_ALIAS
    "id": "456"  // id should match the variable ID used in Figma for the token (ie, the variableID assigned to token with id of `tokenId`)
  }
}
```

### 8. `resolvedValueTypeId`
Every token has a `resolvedValueTypeId` property, which will have a value that matches one of the `resolvedValueTypes` in the data source.

All `value`s from a tokens `valuesByMode` will need to conform to transformation rules based on the assigned `resolvedValueType`. For example, all `values` (except when using `tokenId`) should be treated as a color and transformed based on existing rules and transformers.

### 9. `propertyTypes`
Currently this is only a Figma-specific piece of data in our source data. When transforming data for Figma, `propertyTypes` will need to be translated to `scopes` based on the `resolvedValueType` and Figma's expected rules and options:
Valid scopes for FLOAT variables:
`ALL_SCOPES`
`CORNER_RADIUS`
`TEXT_CONTENT`
`WIDTH_HEIGHT`
`GAP`
`STROKE_FLOAT`
`OPACITY`
`EFFECT_FLOAT`
`FONT_WEIGHT`
`FONT_SIZE`
`LINE_HEIGHT`
`LETTER_SPACING`
`PARAGRAPH_SPACING`
`PARAGRAPH_INDENT`
Valid scopes for STRING variables:
`ALL_SCOPES`
`TEXT_CONTENT`
`FONT_FAMILY`
`FONT_STYLE`
`FONT_VARIATIONS`
Valid scopes for COLOR variables:
`ALL_SCOPES`
`ALL_FILLS`
`FRAME_FILL`
`SHAPE_FILL`
`TEXT_FILL`
`STROKE_COLOR`
`EFFECT_COLOR`

## Daisy-chaining structure (for Figma)
### Variable Daisy-Chain Structure Analysis
#### Core Pattern
Example of a three-stage decomposition process:

1. Color scheme collection (Dark/Light modes)
2. Contrast collection (Regular/Low/High modes)
3. Final token collection (References final intermediary)

#### Decomposition Rules
##### Original Token Structure:
```json
{
  token: "Accent color",
  modeIds: ['mode-dark', 'mode-regular'],
  value: "#52A3FF"
}
```
##### Decomposed Structure:
Stage 1: Color Scheme Collection
```
Collection: "Color scheme"
├── Variable: "Accent color (color scheme - regular)"
│   ├── Dark: #52A3FF (ID: 789)
│   └── Light: #00499B (ID: 789)
├── Variable: "Accent color (color scheme - low)" 
│   ├── Dark: #1683FF (ID: 987)
│   └── Light: #006ECA (ID: 987)
└── Variable: "Accent color (color scheme - high)"
    ├── Dark: #0060CF (ID: 456)
    └── Light: #1482FF (ID: 456)
```

Stage 2: Contrast Collection
```
Collection: "Contrast"
├── Variable: "Accent color (contrast)" [references Stage 1]
│   ├── Regular: →"Accent color (color scheme - regular)" (ID: 789)
│   ├── Low: →"Accent color (color scheme - low)" (ID: 987)
│   └── High: →"Accent color (color scheme - high)" (ID: 456)
```

Stage 3: Final Token Collection
```
Collection: "Color (tokenCollection)"
└── Variable: "Accent color" [references Stage 2]
    └── Value: →"Accent color (contrast)" (ID: 654 → 123)
```

### AI Implementation Instructions
#### Algorithm for Decomposition:

1. Identify Mode Dimensions: Extract all unique mode types from modeIds
  * Example: ['mode-dark', 'mode-regular'] → dimensions: [color-scheme, contrast]

2. Create Intermediary Collections: For each mode dimension except the last:
```
For dimension D with modes [m1, m2, ...]:
Create collection "D"
For each unique combination excluding dimension D:
  Create variable "{token} ({dimension} - {mode})"
  Assign actual values for each mode in dimension D
```
3. Create Reference Chain: Each subsequent collection references the previous in the order specified in dimensionOrder of source data:
```
Collection N+1 variables reference Collection N variables
Final collection references the last intermediary collection
```
4. Naming Convention:
  * Intermediaries: "{token} ({dimension} - {specific-mode})" or "{token} ({dimension})"
  * Final: "{original-token-name}"

#### Key Rules:
* **Intermediary variables** are created only when there are multiple mode combinations
* **Reference IDs** are preserved through the chain (789 → 789, etc.)
* **Final token** always uses the original token name without modification
* **Collection names** reflect the dimension they handle
* **Value assignment** happens only at the first level; subsequent levels use references

This structure enables systematic flattening of combinatory design tokens while maintaining clear relationships and enabling proper mode-switching behavior in design systems.