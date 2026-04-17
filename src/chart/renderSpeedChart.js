import { applySpriteConfigOverlays } from "../sprites/resolveSpriteForConfig.js";

const MIN_POSITION_PERCENT = 3;
const MAX_POSITION_PERCENT = 97;
const MARKER_LEFT_OFFSET_PX = 34;
const MARKER_SIZE_PX = 65;
const MARKER_GAP_PX = 1;
const BASE_CHART_HEIGHT_PX = 420;
const CHART_VERTICAL_MARGINS_PX = 128;

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function createTick(value, topPercent) {
  const tick = document.createElement("div");
  tick.className = "chart-tick";
  tick.style.top = `${topPercent}%`;

  const label = document.createElement("span");
  label.className = "chart-tick-label";
  label.textContent = String(value);
  tick.appendChild(label);

  return tick;
}

function createMarker(entry, topPercent, markerLeftPx) {
  const marker = document.createElement("div");
  marker.className = "speed-marker";
  marker.style.top = `${topPercent}%`;
  marker.style.left = `${markerLeftPx}px`;
  marker.dataset.entryId = String(entry.id);
  marker.dataset.pokemonKey = entry.pokemonKey;
  marker.dataset.finalSpeed = entry.finalSpeed;
  marker.dataset.nature = entry.nature;
  marker.dataset.speedPoints = entry.speedPoints;

  const sprite = document.createElement("img");
  sprite.className = "speed-marker-sprite";
  if (entry.frontDefault) {
    sprite.src = entry.frontDefault;
  }
  sprite.alt = `${entry.displayName} sprite`;
  sprite.loading = "lazy";
  sprite.referrerPolicy = "no-referrer";

  const spriteWrap = document.createElement("div");
  spriteWrap.className = "speed-marker-sprite-wrap";
  spriteWrap.appendChild(sprite);
  applySpriteConfigOverlays(spriteWrap, {
    finalSpeed: entry.finalSpeed,
    nature: entry.nature,
    speedPoints: entry.speedPoints,
    stage: entry.stage,
  });
  marker.appendChild(spriteWrap);

  marker.addEventListener("click", () => {
    const entryId = entry.id;
    const event = new CustomEvent("highlightEntry", { detail: { entryId } });
    document.dispatchEvent(event);
  });

  return marker;
}

function speedToTopPercent(speed, minSpeed, range, hasSpread) {
  if (!hasSpread) {
    return 50;
  }
  const normalized = (speed - minSpeed) / range;
  return MAX_POSITION_PERCENT - normalized * (MAX_POSITION_PERCENT - MIN_POSITION_PERCENT);
}

function assignColumnsByVerticalCollisions(items) {
  const minVerticalDistance = MARKER_SIZE_PX + MARKER_GAP_PX;
  const occupiedYByColumn = [];

  for (const item of items) {
    let column = 0;
    while (true) {
      const occupied = occupiedYByColumn[column];
      if (!occupied || occupied.every((y) => Math.abs(item.topPx - y) >= minVerticalDistance)) {
        break;
      }
      column += 1;
    }
    item.column = column;
    if (!occupiedYByColumn[column]) {
      occupiedYByColumn[column] = [];
    }
    occupiedYByColumn[column].push(item.topPx);
  }
}

function computeChartHeightPx(range) {
  const byRange = range * 10 + CHART_VERTICAL_MARGINS_PX;
  return Math.max(BASE_CHART_HEIGHT_PX, byRange);
}

export function renderSpeedChart({ chartRoot, summaryNode, entries }) {
  clearNode(chartRoot);

  if (!entries.length) {
    chartRoot.style.height = `${BASE_CHART_HEIGHT_PX}px`;
    summaryNode.textContent = "Add visible entries to populate the chart.";
    return;
  }

  const minSpeed = Math.min(...entries.map((entry) => entry.finalSpeed));
  const maxSpeed = Math.max(...entries.map((entry) => entry.finalSpeed));
  const hasSpread = maxSpeed > minSpeed;
  const range = hasSpread ? maxSpeed - minSpeed : 1;
  const dynamicChartHeight = computeChartHeightPx(range);
  chartRoot.style.height = `${dynamicChartHeight}px`;

  const chartHeight = chartRoot.clientHeight || dynamicChartHeight;
  const laneLeftPx = Number.parseInt(
    getComputedStyle(chartRoot).getPropertyValue("--lane-left"),
    10,
  ) || 68;

  summaryNode.textContent = `Showing ${entries.length} entries from ${minSpeed} to ${maxSpeed} final speed.`;

  const lane = document.createElement("div");
  lane.className = "speed-lane";
  chartRoot.appendChild(lane);

  const uniqueSpeeds = Array.from(new Set(entries.map((entry) => entry.finalSpeed))).sort((a, b) => a - b);
  for (const tickValue of uniqueSpeeds) {
    const topPercent = speedToTopPercent(tickValue, minSpeed, range, hasSpread);
    chartRoot.appendChild(createTick(tickValue, topPercent));
  }

  const rawItems = entries
    .map((entry) => {
      const topPercent = speedToTopPercent(entry.finalSpeed, minSpeed, range, hasSpread);
      return {
        entry,
        topPercent,
        topPx: (topPercent / 100) * chartHeight,
      };
    });

  const sortedItems = rawItems
    .sort((a, b) => a.topPx - b.topPx || a.entry.id - b.entry.id);

  assignColumnsByVerticalCollisions(sortedItems);

  const columnWidth = MARKER_SIZE_PX + MARKER_GAP_PX;
  for (const item of sortedItems) {
    const markerLeftPx = laneLeftPx + MARKER_LEFT_OFFSET_PX + item.column * columnWidth;
    chartRoot.appendChild(createMarker(item.entry, item.topPercent, markerLeftPx));
  }
}
