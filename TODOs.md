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

### 7) Chart readability fixes
- [x] Fix vertical orientation so faster Pokemon render higher and slower lower.
- [x] Ensure speed number labels are shown on the axis for each speed tier that has entries.
- [x] Increase horizontal offset from axis and avoid overlap within same speed tier.
- [x] Add collision-aware column placement so close speed tiers do not overlap vertically.

### 8) Offline cache + persistent state + import UX
- [x] Add local asset caching strategy:
  - use browser Cache API via Service Worker for app shell + `processed_pokemon.json` + sprite URLs
  - version cache names and clear old caches on activation
  - keep graceful fallback if Service Worker is unavailable
- [x] Cache validation and staleness policy:
  - prefer cache-first for sprite images
  - stale-while-revalidate for local JSON/config assets
  - define explicit cache version bump workflow when data schema changes
- [x] Persist selected entries locally between sessions:
  - save current entries to `localStorage` on state updates
  - restore saved entries on startup before falling back to defaults
  - keep compatibility with legacy `pokemonKey` formats
- [x] Add reset semantics for persistence:
  - `Reset To Defaults` should overwrite saved local state
  - optionally add “Clear Saved State” action (if user wants true fresh start)
- [x] Implement text import button for configurations:
  - add `Import Text` action in selected section header
  - parse a compact line-based format (e.g. `Pokemon:form,nature,sp,stage,visible`)
  - support comments/blank lines and validate per-line with clear success+error counts
- [x] Import behavior decisions:
  - choose default mode: replace current entries vs append
  - define duplicate handling strategy
  - ensure imported entries are sorted with current ordering rules

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

---

## New Feature Backlog

### TODO-1: Searchable dropdown for Selected Pokemon (one visible at a time)
- [x] Replace the entries list (which shows all cards simultaneously) with a single-entry view controlled by a searchable dropdown.
- [x] The dropdown lists all selected entries (by name + final speed); selecting one shows that entry's card below.
- [x] Keyboard-accessible: type to filter entries in the dropdown.
- [x] Only one entry card rendered/visible at a time in the left panel.

### TODO-2: Clicking chart badge scrolls/shows its entry in the left panel
- [x] When a pokemon badge (speed-marker) in the chart is clicked, the "Manage Pokemon" selected section should switch to show that entry's card (i.e., set the dropdown selection to that entry).
- [x] Extends existing `highlightEntryForMarker` to also update the dropdown selection.

### TODO-3: Unify "Add Pokemon" + "Selected Pokemon" into "Manage Pokemon"
- [ ] Merge the two left-panel sections into a single "Manage Pokemon" panel.
- [ ] Add-form and selected-entry view/controls coexist within this unified section.
- [ ] Maintain all existing functionality (add, remove, clone, visibility, nature/SP/stage editing).

### TODO-4: Improve overlay readability — cleaner SVG for stages and nature
- [ ] Replace text/emoji overlays on pokemon badges with clean inline SVGs.
- [ ] Stage indicator: SVG arrows (up/down) stacked by absolute stage value, colored green/red.
- [ ] Nature indicator: SVG icon (e.g. upward triangle = positive, downward = negative, circle = neutral).
- [ ] Ensure overlays remain legible at small sprite sizes.

### TODO-5: Rewrite README.md for open-source audience
- [ ] Remove internal implementation-plan prose.
- [ ] Add clear sections: What is this, How to use the web app, How to run locally, Data pipeline explanation, Contributing notes.
- [ ] Keep it accurate to current actual state of the project.

### TODO-6: Add footer with custom text and GitHub repo link
- [ ] Add a `<footer>` element below the main app shell.
- [ ] Footer includes a short tagline/text and a clickable GitHub repo link.
- [ ] Styled consistently with the existing dark theme.

### TODO-7: Info icon on title with usage tooltip/popover
- [ ] Add an info icon (SVG) next to the app title in the header.
- [ ] On hover (and focus for a11y), show a popover/tooltip explaining how to use the tool.
- [ ] Popover content: brief step-by-step usage guide (add pokemon, configure, read chart).
- [ ] No external libraries; pure CSS + HTML for the tooltip.

### TODO-8: Increase entry card height — fix input overflow
- [ ] The entry card is currently too short; nature/SP/stage inputs overflow the bottom edge.
- [ ] Increase `.entry-card` height (or remove fixed height and let it size to content).
- [ ] Verify card fits cleanly at all panel widths without double-scrollbar issues.
- [ ] If necessary, increase the section height to accommodate the new card height.

### TODO-9: Pokemon badge hover tooltip with full info
- [ ] When hovering over a speed-marker badge in the chart, show a tooltip with: Pokémon name, final speed, nature, SP, stage.
- [ ] Tooltip should be styled consistently (dark panel, accent border), appear above the badge, and not overflow chart bounds.
- [ ] Disappears on mouse-out; does not interfere with click-to-highlight.

### TODO-10: Import/export — `:base` form suffix is optional
- [ ] In the export format, omit the `:base` suffix so base-form Pokémon export as plain names (e.g. `Venusaur` instead of `Venusaur:base`).
- [ ] In the import parser, if a token has no `:` separator, try resolving it first as a plain key, then append `:base` as fallback — already partially handled in `resolvePokemonKeyFromToken`, verify and tighten.
- [ ] Ensure round-trip: export then re-import produces identical entries.
