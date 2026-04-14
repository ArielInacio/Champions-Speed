import { loadPokemonData } from "./data/loadPokemon.js";
import { loadDefaultConfig } from "./data/loadDefaultConfig.js";
import { createStore } from "./state.js";
import { calculateFinalSpeed } from "./speed/calculateFinalSpeed.js";
import { renderSpeedChart } from "./chart/renderSpeedChart.js";

const store = createStore({
  pokemonRows: [],
  entries: [],
  defaultConfigEntries: [],
  entriesSearchQuery: "",
});

const STAGE_MIN = -6;
const STAGE_MAX = 6;
const SP_MIN = 0;
const SP_MAX = 32;
const ENTRIES_STORAGE_KEY = "champions-speed.entries.v1";

let nextEntryId = 1;

const els = {
  leftColumn: document.querySelector(".left-column"),
  chartColumn: document.querySelector(".chart-column"),
  titlePanel: document.getElementById("title-panel"),
  addPanel: document.getElementById("add-panel"),
  selectedPanel: document.getElementById("selected-panel"),
  form: document.getElementById("add-entry-form"),
  pokemonInput: document.getElementById("pokemon-input"),
  pokemonList: document.getElementById("pokemon-list"),
  natureInput: document.getElementById("nature-input"),
  spInput: document.getElementById("sp-input"),
  stageInput: document.getElementById("stage-input"),
  feedback: document.getElementById("form-feedback"),
  emptyState: document.getElementById("entries-empty"),
  entriesList: document.getElementById("entries-list"),
  entriesSearch: document.getElementById("entries-search"),
  chartRoot: document.getElementById("speed-chart"),
  chartSummary: document.getElementById("chart-summary"),
  resetDefaults: document.getElementById("reset-defaults"),
  clearSaved: document.getElementById("clear-saved"),
};

function loadSavedEntriesFromStorage() {
  try {
    const raw = localStorage.getItem(ENTRIES_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveEntriesToStorage(entries) {
  try {
    localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage failures silently (private mode/quota/full).
  }
}

function clearSavedEntriesFromStorage() {
  try {
    localStorage.removeItem(ENTRIES_STORAGE_KEY);
  } catch {
    // Ignore storage failures silently.
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch {
    // Graceful fallback: app works normally without SW.
  }
}

function syncLeftColumnHeight() {
  if (!els.selectedPanel || !els.entriesList) {
    return;
  }

  if (window.matchMedia("(max-width: 1080px)").matches) {
    els.selectedPanel.style.height = "";
    els.selectedPanel.style.maxHeight = "";
    els.entriesList.style.maxHeight = "";
    return;
  }

  const panelStyles = getComputedStyle(els.selectedPanel);
  const listStyles = getComputedStyle(els.entriesList);
  const searchWrap = els.selectedPanel.querySelector(".entries-search-wrap");
  const header = els.selectedPanel.querySelector(".panel-header");
  const firstCard = els.entriesList.querySelector(".entry-card");

  const panelPaddingTop = Number.parseFloat(panelStyles.paddingTop || "0") || 0;
  const panelPaddingBottom = Number.parseFloat(panelStyles.paddingBottom || "0") || 0;
  const searchMarginBottom = searchWrap
    ? (Number.parseFloat(getComputedStyle(searchWrap).marginBottom || "0") || 0)
    : 0;
  const rowGap = Number.parseFloat(listStyles.rowGap || "0") || 0;

  const headerHeight = header?.offsetHeight ?? 42;
  const searchHeight = searchWrap?.offsetHeight ?? 40;
  const cardHeight = firstCard?.offsetHeight ?? 68;
  const visibleCards = 5;
  const listVisibleHeight = cardHeight * visibleCards + rowGap * Math.max(0, visibleCards - 1);

  const panelHeight = panelPaddingTop
    + panelPaddingBottom
    + headerHeight
    + searchHeight
    + searchMarginBottom
    + listVisibleHeight;

  els.entriesList.style.maxHeight = `${Math.max(120, Math.floor(listVisibleHeight))}px`;
  els.selectedPanel.style.height = `${Math.max(220, Math.floor(panelHeight))}px`;
  els.selectedPanel.style.maxHeight = `${Math.max(220, Math.floor(panelHeight))}px`;
}

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
  const normalizeLegacyKey = (key) => String(key ?? "").replace(/^\d+:/, "");
  return configEntries
    .map((item) => {
      if (!item) {
        return null;
      }
      const normalizedKey = normalizeLegacyKey(item.pokemonKey);
      return validKeys.has(normalizedKey)
        ? { ...item, pokemonKey: normalizedKey }
        : null;
    })
    .filter(Boolean)
    .map((item) => createEntry(item));
}

function sortRawEntriesByComputedSpeed(entries, pokemonRows) {
  const pokemonMap = byKey(pokemonRows);
  return [...entries].sort((a, b) => {
    const pokemonA = pokemonMap.get(a.pokemonKey);
    const pokemonB = pokemonMap.get(b.pokemonKey);

    const speedA = pokemonA
      ? calculateFinalSpeed({
        baseSpeed: pokemonA.speed,
        nature: a.nature,
        speedPoints: a.speedPoints,
        stage: a.stage,
      })
      : -Infinity;

    const speedB = pokemonB
      ? calculateFinalSpeed({
        baseSpeed: pokemonB.speed,
        nature: b.nature,
        speedPoints: b.speedPoints,
        stage: b.stage,
      })
      : -Infinity;

    if (speedB !== speedA) {
      return speedB - speedA;
    }

    const nameA = pokemonA?.displayName ?? "";
    const nameB = pokemonB?.displayName ?? "";
    if (nameA !== nameB) {
      return nameA.localeCompare(nameB);
    }

    return a.id - b.id;
  });
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

function normalizeSearchText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesEntrySearch(entry, rawQuery) {
  const query = normalizeSearchText(rawQuery);
  if (!query) {
    return true;
  }

  const haystack = normalizeSearchText(
    `${entry.displayName} ${entry.baseSpeed} ${entry.finalSpeed} ${entry.nature} ${entry.speedPoints} ${entry.stage}`,
  );
  return haystack.includes(query);
}

function renderEntries(state) {
  const computedEntries = buildComputedEntries(state).sort((a, b) => {
    if (b.finalSpeed !== a.finalSpeed) {
      return b.finalSpeed - a.finalSpeed;
    }
    if (a.displayName !== b.displayName) {
      return a.displayName.localeCompare(b.displayName);
    }
    return a.id - b.id;
  });
  const filteredEntries = computedEntries.filter((entry) => matchesEntrySearch(entry, state.entriesSearchQuery));

  els.entriesList.innerHTML = "";

  if (!state.entries.length) {
    els.emptyState.style.display = "block";
    els.emptyState.textContent = "No Pokemon selected yet.";
  } else if (!filteredEntries.length) {
    els.emptyState.style.display = "block";
    els.emptyState.textContent = "No selected Pokemon matches your search.";
  } else {
    els.emptyState.style.display = "none";
  }

  for (const entry of filteredEntries) {
    const card = document.createElement("article");
    card.className = "entry-card";
    card.dataset.entryId = String(entry.id);

    const head = document.createElement("div");
    head.className = "entry-head";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "entry-title";
    title.textContent = entry.displayName;
    titleWrap.appendChild(title);

    const subtitle = document.createElement("p");
    subtitle.className = "entry-subtitle";
    subtitle.textContent = `Base ${entry.baseSpeed} | Final ${entry.finalSpeed}`;
    titleWrap.appendChild(subtitle);
    head.appendChild(titleWrap);

    const headActions = document.createElement("div");
    headActions.className = "entry-head-actions";

    const visibilityLabel = document.createElement("label");
    visibilityLabel.className = "entry-visible";
    visibilityLabel.textContent = "Visible";
    const visibility = document.createElement("input");
    visibility.type = "checkbox";
    visibility.checked = entry.visible;
    visibility.addEventListener("change", () => {
      updateEntry(entry.id, () => ({ visible: visibility.checked }));
    });
    visibilityLabel.prepend(visibility);
    headActions.appendChild(visibilityLabel);

    const actions = document.createElement("div");
    actions.className = "entry-actions";
    const cloneBtn = document.createElement("button");
    cloneBtn.type = "button";
    cloneBtn.className = "secondary mini icon-button";
    cloneBtn.textContent = "⧉";
    cloneBtn.title = "Clone entry";
    cloneBtn.setAttribute("aria-label", "Clone entry");
    cloneBtn.addEventListener("click", () => cloneEntry(entry.id));

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "danger mini icon-button icon-delete";
    removeBtn.textContent = "🗑";
    removeBtn.title = "Remove entry";
    removeBtn.setAttribute("aria-label", "Remove entry");
    removeBtn.addEventListener("click", () => removeEntry(entry.id));
    actions.append(cloneBtn, removeBtn);
    headActions.appendChild(actions);
    head.appendChild(headActions);
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
    spWrap.textContent = "SP";
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

    controls.append(natureWrap, spWrap, stageWrap);
    card.appendChild(controls);
    els.entriesList.appendChild(card);
  }

  renderSpeedChart({
    chartRoot: els.chartRoot,
    summaryNode: els.chartSummary,
    entries: computedEntries.filter((entry) => entry.visible),
  });

  syncLeftColumnHeight();
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
    const entries = sortRawEntriesByComputedSpeed(
      hydrateEntriesFromConfig(state.defaultConfigEntries, state.pokemonRows),
      state.pokemonRows,
    );
    store.setState((prev) => ({
      ...prev,
      entries,
    }));
  });
}

function bindClearSaved() {
  if (!els.clearSaved) {
    return;
  }

  els.clearSaved.addEventListener("click", () => {
    clearSavedEntriesFromStorage();
  });
}

function bindEntriesSearch() {
  if (!els.entriesSearch) {
    return;
  }

  const applySearch = () => {
    const value = els.entriesSearch.value ?? "";
    store.setState((prev) => ({
      ...prev,
      entriesSearchQuery: value,
    }));
  };

  els.entriesSearch.addEventListener("input", applySearch);
  els.entriesSearch.addEventListener("search", applySearch);
  els.entriesSearch.addEventListener("keyup", applySearch);
}

async function init() {
  registerServiceWorker();
  bindForm();
  bindResetDefaults();
  bindClearSaved();
  bindEntriesSearch();

  try {
    const [pokemonRows, defaultConfigEntries] = await Promise.all([
      loadPokemonData(),
      loadDefaultConfig(),
    ]);
    const defaultEntries = sortRawEntriesByComputedSpeed(
      hydrateEntriesFromConfig(defaultConfigEntries, pokemonRows),
      pokemonRows,
    );
    const savedEntriesRaw = loadSavedEntriesFromStorage();
    const savedEntries = savedEntriesRaw
      ? sortRawEntriesByComputedSpeed(hydrateEntriesFromConfig(savedEntriesRaw, pokemonRows), pokemonRows)
      : null;
    const entries = savedEntries && savedEntries.length ? savedEntries : defaultEntries;
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

  store.subscribe((state) => {
    renderEntries(state);
    saveEntriesToStorage(state.entries);
  });
  renderEntries(store.getState());
  window.addEventListener("resize", syncLeftColumnHeight);
  requestAnimationFrame(syncLeftColumnHeight);
}

init();
