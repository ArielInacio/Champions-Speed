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
- [ ] Confirm with user whether stage `-1` should be `2/3` (recommended) or `2/6` exactly as doc.

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
- [ ] Create `src/chart/renderSpeedChart.js`.
- [ ] Render vertical speed lane from min to max final speed among visible entries.
- [ ] Place each Pokémon sprite at computed y-position, with label and final speed value.
- [ ] Handle overlaps for equal speeds (stack/jitter horizontally).
- [ ] Add axis ticks and min/max markers.
- [ ] Re-render on any config change (nature/SP/stage/visibility).

### 4) Sprite variation module (pending detailed rules)
- [ ] Create `src/sprites/resolveSpriteForConfig.js`.
- [ ] Initial placeholder behavior:
  - default to `front_default`.
  - expose a mapping layer for future variant rules.
- [ ] Define requested behavior with user before full implementation:
  - whether sprite changes are visual badges/overlays vs alternate artwork URLs
  - exact mapping from nature/SP/stage to sprite variant
  - fallback behavior when variant is unavailable.

### 5) Default configuration support
- [ ] Add `default_chart_config.json` containing initial chart entries:
  - each entry includes `pokemonKey`, `nature`, `speedPoints`, `stage`, `visible`.
  - supports repeated `pokemonKey` with different configs.
- [ ] Load defaults on app start; merge with current data source.
- [ ] Add reset-to-default action in UI.

## Suggested delivery order
- [x] Milestone A: steps 1 + 2 (compute engine + interactive controls)
- [ ] Milestone B: step 3 (chart rendering)
- [ ] Milestone C: step 5 (default config persistence/loading)
- [ ] Milestone D: step 4 (sprite variation rules after clarification)

## Definition of done
- [ ] User can add multiple entries for same Pokémon with different settings.
- [ ] Final speed updates instantly when nature/SP/stage changes.
- [ ] Chart positions match computed final speed.
- [ ] Default configuration loads on first render.
- [ ] Sprite module is integrated with chart render path and ready for rule expansion.
