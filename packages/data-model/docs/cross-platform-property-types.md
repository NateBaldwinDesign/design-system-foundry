# Cross-Platform Design Token Property Mapping

## Color Properties

| Token Property Type | Figma Scope | CSS Properties | iOS/SwiftUI | Android/Material |
|------------|-------------|----------------|-------------|-------------------|
| **Background Color** | `FRAME_FILL`, `SHAPE_FILL` | `background`, `background-color` | `.background()`, `.backgroundColor` | `background`, `colorBackground` |
| **Text Color** | `TEXT_FILL` | `color` | `.foregroundColor()`, `.foregroundStyle()` | `textColor`, `colorOnSurface` |
| **Border Color** | `STROKE_COLOR` | `border-color`, `border-*-color` | `.border()`, `.strokeColor` | `strokeColor`, `colorOutline` |
| **Shadow Color** | `EFFECT_COLOR` | `box-shadow`, `text-shadow` | `.shadow()`, `.shadowColor` | `shadowColor`, `elevation` |

## Spacing & Dimensions

| Token Property Type | Figma Scope | CSS Properties | iOS/SwiftUI | Android/Material |
|------------|-------------|----------------|-------------|-------------------|
| **Width/Height** | `WIDTH_HEIGHT` | `width`, `height`, `min-width`, `max-width`, `min-height`, `max-height` | `.frame()`, `.width()`, `.height()` | `layout_width`, `layout_height` |
| **Padding** | `GAP` | `padding`, `padding-*` | `.padding()` | `padding`, `paddingStart`, `paddingEnd` |
| **Margin** | `GAP` | `margin`, `margin-*` | `.offset()` | `layout_margin`, `marginStart`, `marginEnd` |
| **Gap/Spacing** | `GAP` | `gap`, `row-gap`, `column-gap` | `.spacing()` | `layout_spaceBetween`, `space` |
| **Border Radius** | `CORNER_RADIUS` | `border-radius`, `border-*-radius` | `.cornerRadius()`, `.clipShape()` | `cornerRadius`, `shapeAppearance` |

## Typography

| Token Property Type | Figma Scope | CSS Properties | iOS/SwiftUI | Android/Material |
|------------|-------------|----------------|-------------|-------------------|
| **Font Family** | `FONT_FAMILY` | `font-family` | `.font()`, `.fontFamily()` | `fontFamily`, `typeface` |
| **Font Size** | `FONT_SIZE` | `font-size` | `.font()`, `.fontSize()` | `textSize`, `fontSize` |
| **Font Weight** | `FONT_WEIGHT` | `font-weight` | `.fontWeight()`, `.font()` | `textStyle`, `fontWeight` |
| **Font Style** | `FONT_STYLE` | `font-style` | `.italic()`, `.font()` | `textStyle`, `fontStyle` |
| **Line Height** | `LINE_HEIGHT` | `line-height` | `.lineSpacing()`, `.lineHeight()` | `lineHeight`, `lineSpacingMultiplier` |
| **Letter Spacing** | `LETTER_SPACING` | `letter-spacing` | `.kerning()`, `.tracking()` | `letterSpacing`, `textLetterSpacing` |
| **Text Alignment** | `TEXT_CONTENT` | `text-align` | `.multilineTextAlignment()` | `textAlignment`, `gravity` |
| **Text Transform** | `TEXT_CONTENT` | `text-transform` | `.textCase()` | `textAllCaps`, `textTransform` |

## Effects & Appearance

| Token Property Type | Figma Scope | CSS Properties | iOS/SwiftUI | Android/Material |
|------------|-------------|----------------|-------------|-------------------|
| **Opacity** | `OPACITY` | `opacity` | `.opacity()` | `alpha`, `opacity` |
| **Shadow** | `EFFECT_FLOAT` | `box-shadow`, `filter: drop-shadow()` | `.shadow()` | `elevation`, `shadowDx`, `shadowDy` |
| **Blur** | `EFFECT_FLOAT` | `filter: blur()` | `.blur()` | `renderEffect`, `blurRadius` |
| **Border Width** | `STROKE_FLOAT` | `border-width`, `border-*-width` | `.border()` | `strokeWidth`, `borderWidth` |

## Layout & Positioning

| Token Property Type | Figma Scope | CSS Properties | iOS/SwiftUI | Android/Material |
|------------|-------------|----------------|-------------|-------------------|
| **Position** | `ALL_SCOPES` | `position`, `top`, `right`, `bottom`, `left` | `.position()`, `.offset()` | `layout_marginTop`, `layout_marginStart` |
| **Z-Index** | `ALL_SCOPES` | `z-index` | `.zIndex()` | `elevation`, `translationZ` |
| **Flex Properties** | `ALL_SCOPES` | `flex`, `flex-grow`, `flex-shrink`, `flex-basis` | `.layoutPriority()` | `layout_weight`, `flex` |

## Animation & Motion

| Token Property Type | Figma Scope | CSS Properties | iOS/SwiftUI | Android/Material |
|------------|-------------|----------------|-------------|-------------------|
| **Duration** | `EFFECT_FLOAT` | `animation-duration`, `transition-duration` | `.animation()` | `duration`, `animationDuration` |
| **Easing** | `ALL_SCOPES` | `animation-timing-function`, `transition-timing-function` | `.animation()` | `interpolator`, `animationInterpolator` |
| **Delay** | `EFFECT_FLOAT` | `animation-delay`, `transition-delay` | `.animation()` | `startDelay`, `animationDelay` |

## Usage Notes

### Platform-Specific Considerations:

**CSS:**
- Most comprehensive property support
- Uses kebab-case naming convention
- Supports shorthand properties (e.g., `border` vs `border-width`)

**iOS/SwiftUI:**
- Uses camelCase naming convention
- Combines multiple properties in single modifiers (e.g., `.font()` handles family, size, weight)
- Some properties require different approaches between UIKit and SwiftUI

**Android/Material:**
- Uses camelCase for programmatic access, snake_case for XML
- Material Design provides semantic naming (e.g., `colorPrimary`, `colorSurface`)
- Different approaches for View system vs Compose

### Token Value Types:

- **FLOAT**: Numeric values (dimensions, opacity, weights)
- **STRING**: Text values (font families, content)
- **COLOR**: Color values (hex, rgba, named colors)

### Implementation Strategy:

1. **Start with the most restrictive platform** to ensure compatibility
2. **Use semantic naming** that abstracts platform differences
3. **Provide fallback values** for properties not supported on all platforms
4. **Consider design system tokens** like Material's color roles or iOS's dynamic type