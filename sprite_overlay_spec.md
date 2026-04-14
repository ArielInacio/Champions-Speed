# Sprite Overlay Specification

## Goal
Define how sprite overlays should visually encode a Pokemon configuration in the speed chart.

## Overlay Regions
- Bottom-left corner: Speed Points (SP) invested indicator
- Bottom-right corner: Nature indicator
- Top-right corner: Stage change indicator

## 1) Speed Points (SP) Overlay
- Position: bottom-left corner of the sprite
- Content: numeric value of SP invested
- Display rule:
  - If `SP = 0`: show nothing
  - If `SP > 0`: show the number (e.g., `4`, `16`, `32`)

## 2) Nature Overlay
- Position: bottom-right corner of the sprite
- Display exactly one symbol based on nature:
  - Positive nature: red `+`
  - Negative nature: blue `-`
  - Neutral nature: gray circle `o`

## 3) Stage Overlay
- Position: top-right corner of the sprite
- Content: stacked arrows, one per stage level
- Display rule:
  - Positive stages (`+1` to `+6`):
    - Red arrows pointing up
    - Quantity = stage value
  - Negative stages (`-1` to `-6`):
    - Blue arrows pointing down
    - Quantity = absolute stage value
  - Stage `0`:
    - Show nothing

## Examples
- `SP=0, nature=neutral, stage=0`
  - No SP text, gray `o`, no stage arrows
- `SP=32, nature=positive, stage=+3`
  - `32` at bottom-left, red `+` at bottom-right, three red up arrows at top-right
- `SP=8, nature=negative, stage=-2`
  - `8` at bottom-left, blue `-` at bottom-right, two blue down arrows at top-right

## Notes for implementation
- Overlays are visual markers on top of the sprite; base sprite URL remains the same.
- Overlays should update whenever nature, SP, or stage changes.
- Keep overlays readable on both desktop and mobile.
