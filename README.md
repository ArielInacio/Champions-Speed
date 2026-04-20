# Champions Speed Explorer

A browser-based tool for visualising and comparing the final speed stats of Pokémon in **Pokémon Champions**, across different natures, Speed EVs (SP), and stat stages.

## What is this?

Pokémon Champions introduces custom Mega Evolutions and regional forms with unique base stats. This tool lets you:

- Add any Pokémon (including Champions-specific forms) to a comparison chart.
- Configure nature (`positive / neutral / negative`), Speed Points (`0–32`), and stat stage (`-6 to +6`) per entry.
- See every entry placed on a vertical speed chart — faster Pokémon render higher, slower ones lower.
- Add the same Pokémon multiple times with different configs to compare scenarios side by side.
- Click any chart badge to jump to that entry's config card in the left panel.

## How to use the web app

1. **Add a Pokémon** — type in the search field under "Add Pokemon", pick a nature, SP, and stage, then click **Add**.
2. **Configure entries** — use the "Selected Pokemon" dropdown to pick an entry; edit its nature/SP/stage in the card below.
3. **Read the chart** — the right panel shows all visible entries positioned by final speed. Click a badge to highlight it.
4. **Manage your list** — use **Export** to save a text config, **Import** to load one, **Reset** to restore defaults, and **Clear All** to start fresh.

## How to run locally

No build step required. The app is plain HTML/CSS/ES modules.

```bash
# Python 3
python -m http.server 8000
# then open http://localhost:8000
```

Any static file server works. The Service Worker caches assets for offline use after the first load.

## Data pipeline

Pokémon data is pre-processed into `processed_pokemon.json` via two Python scripts:

| Script | Input | Output |
|---|---|---|
| `champions_list.py` | Manual list | `pokemon_champions.json` — Champions roster with custom forms |
| `api_caller.py` | `pokemon_champions.json` + PokéAPI | `processed_pokemon.json` — base speed + sprite URL per entry |

To regenerate data after roster changes:

```bash
python champions_list.py
python api_caller.py
```

Bump the Service Worker cache version in `sw.js` after regenerating so clients pick up the new data.

## Contributing

- **No build toolchain** — plain ES modules, no bundler needed.
- **Speed formula** is documented in `speed_calculation_formula.md`.
- **Sprite overlay spec** is in `sprite_overlay_spec.md`.
- Default chart entries live in `default_chart_config.json`.
- Open an issue or PR for new Champions forms, formula corrections, or UI improvements.
