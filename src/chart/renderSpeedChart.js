import { applySpriteConfigOverlays } from "../sprites/resolveSpriteForConfig.js";

const MIN_POSITION_PERCENT = 7;
const MAX_POSITION_PERCENT = 93;
const MARKER_LEFT_OFFSET_PX = 22;
const MARKER_SIZE_PX = 40;
const MARKER_GAP_PX = 1;

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
    nature: entry.nature,
    speedPoints: entry.speedPoints,
    stage: entry.stage,
  });
  marker.appendChild(spriteWrap);

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
  const lastYByColumn = [];

  for (const item of items) {
    let column = 0;
    while (column < lastYByColumn.length) {
      if (Math.abs(item.topPx - lastYByColumn[column]) >= minVerticalDistance) {
        break;
      }
      column += 1;
    }
    item.column = column;
    lastYByColumn[column] = item.topPx;
  }
}

export function renderSpeedChart({ chartRoot, summaryNode, entries }) {
  clearNode(chartRoot);

  if (!entries.length) {
    summaryNode.textContent = "Add visible entries to populate the chart.";
    return;
  }

  const minSpeed = Math.min(...entries.map((entry) => entry.finalSpeed));
  const maxSpeed = Math.max(...entries.map((entry) => entry.finalSpeed));
  const hasSpread = maxSpeed > minSpeed;
  const range = hasSpread ? maxSpeed - minSpeed : 1;
  const chartWidth = chartRoot.clientWidth || 800;
  const chartHeight = chartRoot.clientHeight || 760;
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

  const placementItems = entries
    .map((entry) => {
      const topPercent = speedToTopPercent(entry.finalSpeed, minSpeed, range, hasSpread);
      return {
        entry,
        topPercent,
        topPx: (topPercent / 100) * chartHeight,
        column: 0,
      };
    })
    .sort((a, b) => a.topPx - b.topPx);

  assignColumnsByVerticalCollisions(placementItems);

  const columnWidth = MARKER_SIZE_PX + MARKER_GAP_PX;
  for (const item of placementItems) {
    const maxLeft = Math.max(laneLeftPx + MARKER_LEFT_OFFSET_PX, chartWidth - MARKER_SIZE_PX - 2);
    const markerLeftPx = Math.min(
      maxLeft,
      laneLeftPx + MARKER_LEFT_OFFSET_PX + item.column * columnWidth,
    );
    chartRoot.appendChild(createMarker(item.entry, item.topPercent, markerLeftPx));
  }
}
