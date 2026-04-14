import { loadPokemonData } from "./data/loadPokemon.js";
import { loadDefaultConfig } from "./data/loadDefaultConfig.js";
import { createStore } from "./state.js";
import { calculateFinalSpeed } from "./speed/calculateFinalSpeed.js";
import { renderSpeedChart } from "./chart/renderSpeedChart.js";

const store = createStore({
  pokemonRows: [],
  entries: [],
  defaultConfigEntries: [],
});

const STAGE_MIN = -6;
const STAGE_MAX = 6;
const SP_MIN = 0;
const SP_MAX = 32;

let nextEntryId = 1;

const els = {
  form: document.getElementById("add-entry-form"),
  pokemonInput: document.getElementById("pokemon-input"),
  pokemonList: document.getElementById("pokemon-list"),
  natureInput: document.getElementById("nature-input"),
  spInput: document.getElementById("sp-input"),
  stageInput: document.getElementById("stage-input"),
  feedback: document.getElementById("form-feedback"),
  emptyState: document.getElementById("entries-empty"),
  entriesList: document.getElementById("entries-list"),
  chartRoot: document.getElementById("speed-chart"),
  chartSummary: document.getElementById("chart-summary"),
  resetDefaults: document.getElementById("reset-defaults"),
};

function clampInteger(value, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return min;
  }
  return Math.min(max, Math.max(min, parsed));
}

function byKey(rows) {
  const map = new Map();
  for (const row of rows) {
    map.set(row.pokemonKey, row);
  }
  return map;
}

function buildComputedEntries(state) {
  const pokemonMap = byKey(state.pokemonRows);
  return state.entries
    .map((entry) => {
      const pokemon = pokemonMap.get(entry.pokemonKey);
      if (!pokemon) {
        return null;
      }
      return {
        ...entry,
        displayName: pokemon.displayName,
        baseSpeed: pokemon.speed,
        frontDefault: pokemon.front_default,
        finalSpeed: calculateFinalSpeed({
          baseSpeed: pokemon.speed,
          nature: entry.nature,
          speedPoints: entry.speedPoints,
          stage: entry.stage,
        }),
      };
    })
    .filter(Boolean);
}

function createEntry({ pokemonKey, nature, speedPoints, stage, visible = true }) {
  return {
    id: nextEntryId++,
    pokemonKey,
    nature: nature ?? "neutral",
    speedPoints: clampInteger(speedPoints, SP_MIN, SP_MAX),
    stage: clampInteger(stage, STAGE_MIN, STAGE_MAX),
    visible: Boolean(visible),
  };
}

function hydrateEntriesFromConfig(configEntries, pokemonRows) {
  const validKeys = new Set(pokemonRows.map((row) => row.pokemonKey));
  return configEntries
    .filter((item) => item && validKeys.has(item.pokemonKey))
    .map((item) => createEntry(item));
}

function updateEntry(entryId, updater) {
  store.setState((state) => ({
    ...state,
    entries: state.entries.map((entry) => {
      if (entry.id !== entryId) {
        return entry;
      }
      return { ...entry, ...updater(entry) };
    }),
  }));
}

function removeEntry(entryId) {
  store.setState((state) => ({
    ...state,
    entries: state.entries.filter((entry) => entry.id !== entryId),
  }));
}

function cloneEntry(entryId) {
  store.setState((state) => {
    const found = state.entries.find((entry) => entry.id === entryId);
    if (!found) {
      return state;
    }
    return {
      ...state,
      entries: [...state.entries, createEntry(found)],
    };
  });
}

function buildPokemonOptions(rows) {
  els.pokemonList.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (const pokemon of rows) {
    const option = document.createElement("option");
    option.value = pokemon.displayName;
    option.label = `${pokemon.displayName} (Base ${pokemon.speed})`;
    fragment.appendChild(option);
  }

  els.pokemonList.appendChild(fragment);
}

function findPokemonByInput(value, rows) {
  return rows.find((pokemon) => pokemon.displayName.toLowerCase() === value.trim().toLowerCase());
}

function renderEntries(state) {
  const pokemonMap = byKey(state.pokemonRows);
  const computedEntries = buildComputedEntries(state);
  const computedById = new Map(computedEntries.map((item) => [item.id, item]));

  els.entriesList.innerHTML = "";

  els.emptyState.style.display = state.entries.length ? "none" : "block";

  for (const entry of state.entries) {
    const pokemon = pokemonMap.get(entry.pokemonKey);
    const card = document.createElement("article");
    card.className = "entry-card";
    card.dataset.entryId = String(entry.id);

    const head = document.createElement("div");
    head.className = "entry-head";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "entry-title";
    title.textContent = pokemon ? pokemon.displayName : "Unknown Pokemon";
    titleWrap.appendChild(title);

    const subtitle = document.createElement("p");
    subtitle.className = "entry-subtitle";
    const computed = computedById.get(entry.id);
    subtitle.textContent = pokemon && computed
      ? `Base Speed: ${pokemon.speed} | Final Speed: ${computed.finalSpeed}`
      : "Missing pokemon data";
    titleWrap.appendChild(subtitle);
    head.appendChild(titleWrap);

    const visibilityLabel = document.createElement("label");
    visibilityLabel.textContent = "Visible";
    const visibility = document.createElement("input");
    visibility.type = "checkbox";
    visibility.checked = entry.visible;
    visibility.addEventListener("change", () => {
      updateEntry(entry.id, () => ({ visible: visibility.checked }));
    });
    visibilityLabel.prepend(visibility);
    head.appendChild(visibilityLabel);
    card.appendChild(head);

    const controls = document.createElement("div");
    controls.className = "entry-controls";

    const natureWrap = document.createElement("label");
    natureWrap.textContent = "Nature";
    const natureSelect = document.createElement("select");
    natureSelect.innerHTML = [
      '<option value="neutral">Neutral</option>',
      '<option value="positive">Positive</option>',
      '<option value="negative">Negative</option>',
    ].join("");
    natureSelect.value = entry.nature;
    natureSelect.addEventListener("change", () => {
      updateEntry(entry.id, () => ({ nature: natureSelect.value }));
    });
    natureWrap.appendChild(natureSelect);

    const spWrap = document.createElement("label");
    spWrap.textContent = "Speed Points";
    const spInput = document.createElement("input");
    spInput.type = "number";
    spInput.min = String(SP_MIN);
    spInput.max = String(SP_MAX);
    spInput.step = "1";
    spInput.value = String(entry.speedPoints);
    spInput.addEventListener("change", () => {
      updateEntry(entry.id, () => ({
        speedPoints: clampInteger(spInput.value, SP_MIN, SP_MAX),
      }));
    });
    spWrap.appendChild(spInput);

    const stageWrap = document.createElement("label");
    stageWrap.textContent = "Stage";
    const stageInput = document.createElement("input");
    stageInput.type = "number";
    stageInput.min = String(STAGE_MIN);
    stageInput.max = String(STAGE_MAX);
    stageInput.step = "1";
    stageInput.value = String(entry.stage);
    stageInput.addEventListener("change", () => {
      updateEntry(entry.id, () => ({
        stage: clampInteger(stageInput.value, STAGE_MIN, STAGE_MAX),
      }));
    });
    stageWrap.appendChild(stageInput);

    const actions = document.createElement("div");
    actions.className = "entry-actions";
    const cloneBtn = document.createElement("button");
    cloneBtn.type = "button";
    cloneBtn.className = "secondary";
    cloneBtn.textContent = "Clone";
    cloneBtn.addEventListener("click", () => cloneEntry(entry.id));

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "danger";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeEntry(entry.id));
    actions.append(cloneBtn, removeBtn);

    controls.append(natureWrap, spWrap, stageWrap, actions);
    card.appendChild(controls);
    els.entriesList.appendChild(card);
  }

  renderSpeedChart({
    chartRoot: els.chartRoot,
    summaryNode: els.chartSummary,
    entries: computedEntries.filter((entry) => entry.visible),
  });
}

function bindForm() {
  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const state = store.getState();
    const pokemon = findPokemonByInput(els.pokemonInput.value, state.pokemonRows);
    if (!pokemon) {
      els.feedback.textContent = "Select a valid Pokemon from the list.";
      return;
    }

    const newEntry = createEntry({
      pokemonKey: pokemon.pokemonKey,
      nature: els.natureInput.value,
      speedPoints: els.spInput.value,
      stage: els.stageInput.value,
    });

    store.setState((prev) => ({
      ...prev,
      entries: [...prev.entries, newEntry],
    }));

    els.feedback.textContent = "";
    els.form.reset();
    els.natureInput.value = "neutral";
    els.spInput.value = "0";
    els.stageInput.value = "0";
    els.pokemonInput.focus();
  });
}

function bindResetDefaults() {
  els.resetDefaults.addEventListener("click", () => {
    const state = store.getState();
    const entries = hydrateEntriesFromConfig(state.defaultConfigEntries, state.pokemonRows);
    store.setState((prev) => ({
      ...prev,
      entries,
    }));
  });
}

async function init() {
  bindForm();
  bindResetDefaults();

  try {
    const [pokemonRows, defaultConfigEntries] = await Promise.all([
      loadPokemonData(),
      loadDefaultConfig(),
    ]);
    const entries = hydrateEntriesFromConfig(defaultConfigEntries, pokemonRows);
    buildPokemonOptions(pokemonRows);
    store.setState((state) => ({
      ...state,
      pokemonRows,
      defaultConfigEntries,
      entries,
    }));
  } catch (error) {
    els.feedback.textContent = error.message;
  }

  store.subscribe(renderEntries);
  renderEntries(store.getState());
}

init();
