# Champions Speed - TODOs

## Current state (verified)
- Data pipeline exists in Python:
  - `champions_list.py` builds `pokemon_champions.json`
  - `api_caller.py` builds `processed_pokemon.json`
- `processed_pokemon.json` now includes `speed` and `front_default`.
- No web app scaffold is present yet (no HTML/CSS/JS app files in repo root).

## Considerations before implementation
- The formula doc fixes level at 50 and uses Speed Points in range `0..32`; we should enforce these as UI constraints.
- Stage table in `speed_calculation_formula.md` has a likely typo at stage `-1` (`2/6`). Standard behavior would be `2/3`.
- Pokémon should be allowed multiple times in chart with different configs, so we need stable per-row IDs (not keyed only by Pokémon name).
- Step 4 (sprite changes based on nature/investment/stage) needs clear product rules because PokeAPI `front_default` is not stat-dependent.

## Implementation plan

### 1) Final speed calculation module
- [x] Create `src/speed/calculateFinalSpeed.js` with:
  - `getNatureMultiplier(nature)` where nature is `positive | neutral | negative`.
  - `getStageMultiplier(stage)` for `-6..+6`.
  - `calculateFinalSpeed({ baseSpeed, nature, speedPoints, stage, level=50, iv=31 })`.
- [x] Use formula from `speed_calculation_formula.md`:
  - `preNature = floor(((2*B + IV) * L)/100) + 5 + SP`
  - `natureApplied = floor(preNature * N)`
  - `finalSpeed = floor(natureApplied * stageMultiplier)`
- [x] Add guardrails:
  - clamp `speedPoints` to `0..32`
  - clamp `stage` to `-6..+6`
  - throw on missing `baseSpeed`.
- [ ] Add unit tests for:
  - neutral/positive/negative nature
  - min/max SP
  - min/max stage
  - duplicate Pokémon with distinct configs.
- [x] Confirm with user whether stage `-1` should be `2/3` (recommended) or `2/6` exactly as doc.

### 2) Web app base (selection + controls)
- [x] Create minimal app scaffold:
  - `index.html`
  - `styles.css`
  - `src/main.js`
  - `src/state.js`
  - `src/data/loadPokemon.js`
- [x] Load `processed_pokemon.json` client-side and normalize each entry with a unique key:
  - suggested key: `${ndex}:${name}:${ig ?? "base"}`
- [x] Build control panel to add chart entries:
  - Pokémon selector (searchable dropdown)
  - Nature selector (`positive | neutral | negative`)
  - SP input (`0..32`)
  - Stage selector (`-6..+6`)
- [x] Add entry list UI:
  - duplicate entries allowed
  - per-entry remove/clone controls
  - toggle visibility on/off per entry.

### 3) Chart visualization
- [x] Create `src/chart/renderSpeedChart.js`.
- [x] Render vertical speed lane from min to max final speed among visible entries.
- [x] Place each Pokémon sprite at computed y-position.
- [x] Handle overlaps for equal speeds (stack/jitter horizontally).
- [x] Add axis ticks and min/max markers.
- [x] Re-render on any config change (nature/SP/stage/visibility).

### 6) High-volume chart scalability pass
- [x] Move app to split layout:
  - left column with title/subtitle/add/select config controls
  - right column dedicated to chart
- [x] Set left column to at most ~1/3 width on desktop and stack on small screens.
- [x] Increase chart top/bottom safety margins to avoid clipping min/max sprites.
- [x] Reduce sprite + overlay footprint for dense charts.
- [x] Remove per-sprite name labels below markers.
- [x] Place axis line on the left and markers to the right of it.
- [x] Use speed ticks on the axis as labels (deduplicated by speed), reducing repeated text.

### 4) Sprite variation module (pending detailed rules)
- [x] Create `src/sprites/resolveSpriteForConfig.js`.
- [x] Implement visual overlays on top of `front_default`:
  - SP number at bottom-left (hidden when `SP=0`)
  - nature indicator at bottom-right (`+`, `-`, `o`)
  - stage arrows at top-right (stacked by absolute stage value)
- [x] Define requested behavior with user before full implementation:
  - rules captured in `sprite_overlay_spec.md`

### 5) Default configuration support
- [x] Add `default_chart_config.json` containing initial chart entries:
  - each entry includes `pokemonKey`, `nature`, `speedPoints`, `stage`, `visible`.
  - supports repeated `pokemonKey` with different configs.
- [x] Load defaults on app start; merge with current data source.
- [x] Add reset-to-default action in UI.

## Suggested delivery order
- [x] Milestone A: steps 1 + 2 (compute engine + interactive controls)
- [x] Milestone B: step 3 (chart rendering)
- [x] Milestone C: step 5 (default config persistence/loading)
- [x] Milestone D: step 4 (sprite variation rules after clarification)

## Definition of done
- [ ] User can add multiple entries for same Pokémon with different settings.
- [ ] Final speed updates instantly when nature/SP/stage changes.
- [ ] Chart positions match computed final speed.
- [ ] Default configuration loads on first render.
- [ ] Sprite module is integrated with chart render path and ready for rule expansion.
