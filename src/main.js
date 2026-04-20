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
  activeEntryId: null,
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
  managePanel: document.getElementById("manage-panel"),
  form: document.getElementById("add-entry-form"),
  pokemonInput: document.getElementById("pokemon-input"),
  pokemonList: document.getElementById("pokemon-list"),
  natureInput: document.getElementById("nature-input"),
  spInput: document.getElementById("sp-input"),
  stageInput: document.getElementById("stage-input"),
  feedback: document.getElementById("form-feedback"),
  emptyState: document.getElementById("entries-empty"),
  entriesList: document.getElementById("entries-list"),
  entryCombobox: document.getElementById("entry-combobox"),
  entryComboboxInput: document.getElementById("entry-combobox-input"),
  entryListbox: document.getElementById("entry-listbox"),
  entrySelectorWrap: document.getElementById("entry-selector-wrap"),
  chartRoot: document.getElementById("speed-chart"),
  chartSummary: document.getElementById("chart-summary"),
  resetDefaults: document.getElementById("reset-defaults"),
  clearSaved: document.getElementById("clear-saved"),
  exportConfig: document.getElementById("export-config"),
  importConfig: document.getElementById("import-config"),
  importDialog: document.getElementById("import-dialog"),
  importText: document.getElementById("import-text"),
  importFormatShowdown: document.getElementById("import-format-showdown"),
  importAppend: document.getElementById("import-append"),
  importReplace: document.getElementById("import-replace"),
  importCancel: document.getElementById("import-cancel"),
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
  if (!els.managePanel || !els.entriesList) {
    return;
  }

  if (window.matchMedia("(max-width: 1080px)").matches) {
    els.managePanel.style.height = "";
    els.managePanel.style.maxHeight = "";
    els.entriesList.style.maxHeight = "";
    return;
  }

  els.managePanel.style.height = "";
  els.managePanel.style.maxHeight = "";
  els.entriesList.style.maxHeight = "";
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

function resolvePokemonKeyFromToken(token, pokemonRows) {
  const clean = String(token ?? "").trim();
  const normalized = clean.replace(/^\d+:/, "");
  if (!normalized) {
    return null;
  }

  const byKeyLower = new Map();
  const byDisplayLower = new Map();
  for (const pokemon of pokemonRows) {
    byKeyLower.set(pokemon.pokemonKey.toLowerCase(), pokemon.pokemonKey);
    byDisplayLower.set(pokemon.displayName.toLowerCase(), pokemon.pokemonKey);
  }

  const direct = byKeyLower.get(normalized.toLowerCase());
  if (direct) {
    return direct;
  }

  const byDisplay = byDisplayLower.get(normalized.toLowerCase());
  if (byDisplay) {
    return byDisplay;
  }

  if (!normalized.includes(":")) {
    const maybeBase = byKeyLower.get(`${normalized.toLowerCase()}:base`);
    if (maybeBase) {
      return maybeBase;
    }
  }

  const dashIdx = normalized.indexOf("-");
  if (dashIdx > 0) {
    const withColon = normalized.slice(0, dashIdx) + ":" + normalized.slice(dashIdx);
    const maybeColon = byKeyLower.get(withColon.toLowerCase());
    if (maybeColon) {
      return maybeColon;
    }
  }

  return null;
}

const POSITIVE_NATURES = new Set(["timid", "hasty", "jolly", "naive"]);
const NEGATIVE_NATURES = new Set(["brave", "relaxed", "quiet", "sassy"]);

function showdownNatureToAppNature(natureName) {
  const lower = natureName.trim().toLowerCase();
  if (POSITIVE_NATURES.has(lower)) return "positive";
  if (NEGATIVE_NATURES.has(lower)) return "negative";
  return "neutral";
}

function parseShowdownText(text, pokemonRows) {
  const parsedEntries = [];
  const errors = [];

  const blocks = String(text ?? "")
    .split(/\r?\n\s*\r?\n/);

  blocks.forEach((block, blockIndex) => {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;

    const headerLine = lines[0];
    const nameMatch = headerLine.match(/^([^(@]+?)(?:\s*\([^)]*\))?(?:\s*@\s*(.+))?$/);
    if (!nameMatch) {
      errors.push(`Block ${blockIndex + 1}: could not parse name from '${headerLine}'.`);
      return;
    }

    const rawName = nameMatch[1].trim();
    const item = nameMatch[2]?.trim() ?? "";

    const pokemonKey = resolvePokemonKeyFromToken(rawName, pokemonRows);
    if (!pokemonKey) {
      errors.push(`Block ${blockIndex + 1}: unknown Pokemon '${rawName}'.`);
      return;
    }

    let nature = "neutral";
    let sp = 0;
    const stage = item.toLowerCase() === "choice scarf" ? 1 : 0;

    for (const line of lines.slice(1)) {
      const natureMatch = line.match(/^(\w+)\s+Nature$/i);
      if (natureMatch) {
        nature = showdownNatureToAppNature(natureMatch[1]);
        continue;
      }
      const evMatch = line.match(/^EVs:\s*(.+)$/i);
      if (evMatch) {
        const speMatch = evMatch[1].match(/(\d+)\s*Spe/i);
        if (speMatch) {
          sp = clampInteger(Number.parseInt(speMatch[1], 10), SP_MIN, SP_MAX);
        }
      }
    }

    parsedEntries.push({ pokemonKey, nature, speedPoints: sp, stage, visible: true });
  });

  return { parsedEntries, errors };
}

function parseVisibleValue(raw) {
  if (raw === undefined) {
    return true;
  }
  const normalized = String(raw).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n", "off"].includes(normalized)) {
    return false;
  }
  return null;
}

function parseImportEntriesFromText(text, pokemonRows) {
  const lines = String(text ?? "").split(/\r?\n/);
  const parsedEntries = [];
  const errors = [];

  lines.forEach((lineRaw, index) => {
    const line = lineRaw.trim();
    const lineNumber = index + 1;
    if (!line || line.startsWith("#") || line.startsWith("//")) {
      return;
    }

    const parts = line.split(",").map((part) => part.trim());
    if (parts.length < 4) {
      errors.push(`Line ${lineNumber}: expected at least 4 fields.`);
      return;
    }

    const pokemonKey = resolvePokemonKeyFromToken(parts[0], pokemonRows);
    if (!pokemonKey) {
      errors.push(`Line ${lineNumber}: unknown Pokemon '${parts[0]}'.`);
      return;
    }

    const nature = parts[1].toLowerCase();
    if (!["neutral", "positive", "negative"].includes(nature)) {
      errors.push(`Line ${lineNumber}: nature must be neutral/positive/negative.`);
      return;
    }

    const sp = Number.parseInt(parts[2], 10);
    const stage = Number.parseInt(parts[3], 10);
    if (Number.isNaN(sp) || Number.isNaN(stage)) {
      errors.push(`Line ${lineNumber}: SP and Stage must be integers.`);
      return;
    }

    const visible = parseVisibleValue(parts[4]);
    if (visible === null) {
      errors.push(`Line ${lineNumber}: visible must be true/false (or 1/0).`);
      return;
    }

    parsedEntries.push({
      pokemonKey,
      nature,
      speedPoints: clampInteger(sp, SP_MIN, SP_MAX),
      stage: clampInteger(stage, STAGE_MIN, STAGE_MAX),
      visible,
    });
  });

  return { parsedEntries, errors };
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

function setActiveEntry(entryId) {
  store.setState((prev) => ({ ...prev, activeEntryId: entryId ?? null }));
}

function buildEntryCard(entry) {
  const card = document.createElement("article");
  card.className = "entry-card";
  card.dataset.entryId = String(entry.id);
  card.dataset.pokemonKey = entry.pokemonKey;
  card.dataset.finalSpeed = entry.finalSpeed;

  card.addEventListener("click", (e) => {
    if (e.target.closest("button, input, select")) {
      return;
    }
    highlightMarkerForEntry(entry.id);
  });

  const head = document.createElement("div");
  head.className = "entry-head";

  const titleWrap = document.createElement("div");
  const title = document.createElement("h3");
  title.className = "entry-title";
  title.textContent = ` ${entry.displayName} | ${entry.finalSpeed}`;
  titleWrap.appendChild(title);
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
  cloneBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
  cloneBtn.title = "Duplicate entry";
  cloneBtn.setAttribute("aria-label", "Duplicate entry");
  cloneBtn.addEventListener("click", () => cloneEntry(entry.id));

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "danger mini icon-button icon-delete";
  removeBtn.textContent = "✕";
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
  return card;
}

function renderComboboxOptions(computedEntries, filterText) {
  if (!els.entryListbox) return;
  const query = normalizeSearchText(filterText);
  els.entryListbox.innerHTML = "";
  const fragment = document.createDocumentFragment();

  const filtered = query
    ? computedEntries.filter((e) => matchesEntrySearch(e, filterText))
    : computedEntries;

  for (const entry of filtered) {
    const li = document.createElement("li");
    li.className = "entry-listbox-option";
    li.setAttribute("role", "option");
    li.dataset.entryId = String(entry.id);

    const stageText = entry.stage !== 0 ? `${entry.stage > 0 ? `+${entry.stage}` : entry.stage} ` : "";
    const spText = entry.speedPoints > 0 ? `${entry.speedPoints}SP ` : "";
    const natureName = entry.nature === "positive" ? "positive" : entry.nature === "negative" ? "negative" : "neutral";
    li.innerHTML = `<span class="lbo-name">${entry.displayName}</span><span class="lbo-meta">${stageText}${spText}${natureName}</span><span class="lbo-speed">${entry.finalSpeed}</span>`;

    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      selectComboboxEntry(entry.id, computedEntries);
    });
    fragment.appendChild(li);
  }

  els.entryListbox.appendChild(fragment);

  els.entryListbox.addEventListener("wheel", (e) => {
    const atTop = els.entryListbox.scrollTop === 0;
    const atBottom = els.entryListbox.scrollTop + els.entryListbox.clientHeight >= els.entryListbox.scrollHeight;
    if (!(atTop && e.deltaY < 0) && !(atBottom && e.deltaY > 0)) {
      e.stopPropagation();
    }
  }, { passive: true });
}

function selectComboboxEntry(entryId, computedEntries) {
  const entry = computedEntries.find((e) => e.id === entryId);
  if (!entry) return;

  if (els.entryComboboxInput) {
    els.entryComboboxInput.value = entry.displayName;
  }
  closeEntryDropdown();
  setActiveEntry(entryId);
}

function openEntryDropdown() {
  if (!els.entryCombobox || !els.entryListbox) return;
  els.entryCombobox.setAttribute("aria-expanded", "true");
  els.entryCombobox.classList.add("open");
  els.entryListbox.hidden = false;
}

function closeEntryDropdown() {
  if (!els.entryCombobox || !els.entryListbox) return;
  els.entryCombobox.setAttribute("aria-expanded", "false");
  els.entryCombobox.classList.remove("open");
  els.entryListbox.hidden = true;
}

function renderEntries(state) {
  const computedEntries = buildComputedEntries(state).sort((a, b) => {
    if (b.finalSpeed !== a.finalSpeed) return b.finalSpeed - a.finalSpeed;
    if (a.displayName !== b.displayName) return a.displayName.localeCompare(b.displayName);
    return a.id - b.id;
  });

  const hasEntries = state.entries.length > 0;
  const showSelector = hasEntries;

  if (els.entrySelectorWrap) {
    els.entrySelectorWrap.style.display = showSelector ? "" : "none";
  }

  if (!hasEntries) {
    els.emptyState.style.display = "block";
    els.emptyState.textContent = "No Pokemon selected yet.";
    els.entriesList.innerHTML = "";
  } else {
    els.emptyState.style.display = "none";
  }

  let activeId = state.activeEntryId;
  if (hasEntries && (activeId === null || !computedEntries.find((e) => e.id === activeId))) {
    activeId = computedEntries[0].id;
    if (activeId !== state.activeEntryId) {
      store.setState((prev) => ({ ...prev, activeEntryId: activeId }));
      return;
    }
  }

  const currentFilterText = els.entryComboboxInput?.value ?? "";
  renderComboboxOptions(computedEntries, currentFilterText);

  const activeEntry = computedEntries.find((e) => e.id === activeId);
  if (activeEntry && els.entryComboboxInput) {
    const isDropdownOpen = els.entryCombobox?.classList.contains("open");
    if (!isDropdownOpen) {
      els.entryComboboxInput.value = activeEntry.displayName;
    }
  }

  els.entriesList.innerHTML = "";
  if (activeEntry) {
    const card = buildEntryCard(activeEntry);
    els.entriesList.appendChild(card);
  }

  const activeCardEl = els.entriesList.querySelector(".entry-card");
  if (activeCardEl) {
    activeCardEl.classList.add("highlighted");
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
    store.setState((prev) => ({
      ...prev,
      entries: [],
    }));
  });
}

function bindEntriesSearch() {
  if (!els.entryComboboxInput) return;

  const onInput = () => {
    const state = store.getState();
    const computedEntries = buildComputedEntries(state).sort((a, b) => {
      if (b.finalSpeed !== a.finalSpeed) return b.finalSpeed - a.finalSpeed;
      if (a.displayName !== b.displayName) return a.displayName.localeCompare(b.displayName);
      return a.id - b.id;
    });
    openEntryDropdown();
    renderComboboxOptions(computedEntries, els.entryComboboxInput.value);
  };

  els.entryComboboxInput.addEventListener("input", onInput);

  els.entryComboboxInput.addEventListener("focus", () => {
    const state = store.getState();
    if (!state.entries.length) return;
    els.entryComboboxInput.select();
    const computedEntries = buildComputedEntries(state).sort((a, b) => {
      if (b.finalSpeed !== a.finalSpeed) return b.finalSpeed - a.finalSpeed;
      if (a.displayName !== b.displayName) return a.displayName.localeCompare(b.displayName);
      return a.id - b.id;
    });
    openEntryDropdown();
    renderComboboxOptions(computedEntries, "");
  });

  els.entryComboboxInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeEntryDropdown();
      const state = store.getState();
      const activeEntry = buildComputedEntries(state).find((en) => en.id === state.activeEntryId);
      if (activeEntry) els.entryComboboxInput.value = activeEntry.displayName;
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const items = els.entryListbox?.querySelectorAll(".entry-listbox-option") ?? [];
      if (!items.length) return;
      const focused = els.entryListbox?.querySelector(".entry-listbox-option.focused");
      let nextIdx = 0;
      if (focused) {
        const arr = Array.from(items);
        const cur = arr.indexOf(focused);
        nextIdx = e.key === "ArrowDown" ? Math.min(cur + 1, arr.length - 1) : Math.max(cur - 1, 0);
        focused.classList.remove("focused");
      } else {
        nextIdx = e.key === "ArrowDown" ? 0 : items.length - 1;
      }
      items[nextIdx].classList.add("focused");
      items[nextIdx].scrollIntoView({ block: "nearest" });
      return;
    }
    if (e.key === "Enter") {
      const focused = els.entryListbox?.querySelector(".entry-listbox-option.focused");
      if (focused) {
        e.preventDefault();
        const entryId = Number(focused.dataset.entryId);
        const state = store.getState();
        const computedEntries = buildComputedEntries(state);
        selectComboboxEntry(entryId, computedEntries);
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#entry-selector-wrap")) {
      closeEntryDropdown();
    }
  });
}

function clearHighlights() {
  document.querySelectorAll(".entry-card.highlighted, .speed-marker.highlighted").forEach((el) => {
    el.classList.remove("highlighted");
  });
}

function highlightMarkerForEntry(entryId) {
  clearHighlights();
  const marker = document.querySelector(`.speed-marker[data-entry-id="${entryId}"]`);
  if (marker) {
    marker.classList.add("highlighted");
    marker.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  }
}

function highlightEntryForMarker(entryId) {
  clearHighlights();
  closeEntryDropdown();
  setActiveEntry(entryId);
  const marker = document.querySelector(`.speed-marker[data-entry-id="${entryId}"]`);
  if (marker) {
    marker.classList.add("highlighted");
  }
}

function applyImportedEntries(mode) {
  const state = store.getState();
  const text = els.importText?.value ?? "";
  const isShowdown = els.importFormatShowdown?.checked;
  const { parsedEntries, errors } = isShowdown
    ? parseShowdownText(text, state.pokemonRows)
    : parseImportEntriesFromText(text, state.pokemonRows);

  if (!parsedEntries.length) {
    const errorText = errors.length ? `\n\n${errors.slice(0, 8).join("\n")}` : "";
    alert(`No valid entries were imported.${errorText}`);
    return;
  }

  const imported = parsedEntries.map((entry) => createEntry(entry));
  const mergedEntries = mode === "replace"
    ? imported
    : [...state.entries, ...imported];
  const sorted = sortRawEntriesByComputedSpeed(mergedEntries, state.pokemonRows);

  store.setState((prev) => ({
    ...prev,
    entries: sorted,
  }));

  if (els.importDialog?.open) {
    els.importDialog.close();
  }

  const message = `Imported ${parsedEntries.length} entries.` + (errors.length
    ? `\nSkipped ${errors.length} lines:\n${errors.slice(0, 8).join("\n")}`
    : "");
  alert(message);
}

function exportKeyToken(pokemonKey) {
  return pokemonKey.endsWith(":base") ? pokemonKey.slice(0, -5) : pokemonKey;
}

function exportEntriesToText(entries, pokemonRows) {
  const lines = entries.map((entry) => {
    const token = exportKeyToken(entry.pokemonKey);
    return `${token},${entry.nature},${entry.speedPoints},${entry.stage},${entry.visible}`;
  });
  return lines.join("\n");
}

function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function bindImportConfig() {
  if (!els.importConfig || !els.importDialog || !els.importText) {
    return;
  }

  const csvHint = els.importDialog.querySelector(".import-hint-csv");
  const showdownHint = els.importDialog.querySelector(".import-hint-showdown");
  const CSV_PLACEHOLDER = "Venusaur,neutral,0,0\nCharizard:-Mega-Y,positive,32,1,true";
  const SHOWDOWN_PLACEHOLDER = "Froslass (F) @ Choice Scarf\nAbility: Snow Cloak\nLevel: 50\nEVs: 2 HP / 32 SpA / 32 Spe\nHasty Nature\n- Blizzard";

  els.importDialog.querySelectorAll("input[name='import-format']").forEach((radio) => {
    radio.addEventListener("change", () => {
      const isShowdown = els.importFormatShowdown?.checked;
      if (csvHint) csvHint.hidden = isShowdown;
      if (showdownHint) showdownHint.hidden = !isShowdown;
      els.importText.placeholder = isShowdown ? SHOWDOWN_PLACEHOLDER : CSV_PLACEHOLDER;
    });
  });

  els.importConfig.addEventListener("click", () => {
    els.importDialog.showModal();
    els.importText.focus();
  });

  els.importAppend?.addEventListener("click", () => applyImportedEntries("append"));
  els.importReplace?.addEventListener("click", () => applyImportedEntries("replace"));
  els.importCancel?.addEventListener("click", () => {
    els.importDialog.close();
  });
}

function bindExportConfig() {
  if (!els.exportConfig) {
    return;
  }

  els.exportConfig.addEventListener("click", () => {
    const state = store.getState();
    if (!state.entries.length) {
      alert("No entries to export.");
      return;
    }
    const content = exportEntriesToText(state.entries, state.pokemonRows);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    downloadTextFile(content, `champions-speed-config-${timestamp}.txt`);
  });
}

function bindInfoTooltip() {
  const wrap = document.querySelector(".info-icon-wrap");
  const tip = wrap?.querySelector(".info-tooltip");
  if (!wrap || !tip) return;
  document.body.appendChild(tip);

  function showTip() {
    const rect = wrap.getBoundingClientRect();
    const GAP = 8;
    tip.style.display = "block";
    const tipW = tip.offsetWidth;
    let left = rect.left;
    if (left + tipW > window.innerWidth - GAP) {
      left = window.innerWidth - tipW - GAP;
    }
    tip.style.left = `${Math.max(GAP, left)}px`;
    tip.style.top = `${rect.bottom + GAP}px`;
  }

  function hideTip() {
    tip.style.display = "none";
  }

  wrap.addEventListener("mouseenter", showTip);
  wrap.addEventListener("mouseleave", hideTip);
  wrap.addEventListener("focus", showTip);
  wrap.addEventListener("blur", hideTip);
}

async function init() {
  registerServiceWorker();
  bindForm();
  bindResetDefaults();
  bindClearSaved();
  bindImportConfig();
  bindExportConfig();
  bindInfoTooltip();

  document.addEventListener("highlightEntry", (e) => {
    highlightEntryForMarker(e.detail.entryId);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".entry-card, .speed-marker")) {
      clearHighlights();
    }
  });

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

  bindEntriesSearch();

  store.subscribe((state) => {
    renderEntries(state);
    saveEntriesToStorage(state.entries);
  });
  renderEntries(store.getState());
  window.addEventListener("resize", syncLeftColumnHeight);
  requestAnimationFrame(syncLeftColumnHeight);

  const scrollHint = document.getElementById("chart-scroll-hint");
  if (scrollHint) {
    const onScroll = () => {
      scrollHint.classList.add("hidden");
      window.removeEventListener("scroll", onScroll, { passive: true });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  setTimeout(() => {
    const chart = els.chartRoot;
    if (!chart) return;
    const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches || navigator.maxTouchPoints > 0;
    if (isTouch) return;
    const chartTop = chart.getBoundingClientRect().top + window.scrollY;
    const target = Math.round(chartTop + chart.offsetHeight * 0.4);
    const start = window.scrollY;
    const distance = target - start;
    if (distance <= 80) return;

    const duration = 900;
    let startTime = null;

    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, start + distance * easeInOut(progress));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }, 600);
}

init();
