import { applySpriteConfigOverlays } from "../sprites/resolveSpriteForConfig.js";

const MIN_POSITION_PERCENT = 7;
const MAX_POSITION_PERCENT = 93;
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

function assignGroupBlocksByVerticalCollisions(groups) {
  const minVerticalDistance = MARKER_SIZE_PX + MARKER_GAP_PX;
  const lastYByColumn = [];

  for (const group of groups) {
    const requiredColumns = group.items.length;
    let baseColumn = 0;

    while (true) {
      let fits = true;
      for (let c = baseColumn; c < baseColumn + requiredColumns; c += 1) {
        if (lastYByColumn[c] !== undefined && Math.abs(group.topPx - lastYByColumn[c]) < minVerticalDistance) {
          fits = false;
          break;
        }
      }

      if (fits) {
        break;
      }
      baseColumn += 1;
    }

    group.baseColumn = baseColumn;
    for (let c = baseColumn; c < baseColumn + requiredColumns; c += 1) {
      lastYByColumn[c] = group.topPx;
    }
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

  const groupsBySpeed = new Map();
  for (const item of rawItems) {
    const speedKey = item.entry.finalSpeed;
    if (!groupsBySpeed.has(speedKey)) {
      groupsBySpeed.set(speedKey, []);
    }
    groupsBySpeed.get(speedKey).push(item);
  }

  const groupedItems = Array.from(groupsBySpeed.entries())
    .map(([speed, items]) => ({
      speed,
      items: items.sort((a, b) => a.entry.id - b.entry.id),
      topPercent: items[0].topPercent,
      topPx: items[0].topPx,
      baseColumn: 0,
    }))
    .sort((a, b) => a.topPx - b.topPx);

  assignGroupBlocksByVerticalCollisions(groupedItems);

  const placementItems = [];
  for (const group of groupedItems) {
    group.items.forEach((item, index) => {
      placementItems.push({
        ...item,
        column: group.baseColumn + index,
      });
    });
  }

  const columnWidth = MARKER_SIZE_PX + MARKER_GAP_PX;
  for (const item of placementItems) {
    const markerLeftPx = laneLeftPx + MARKER_LEFT_OFFSET_PX + item.column * columnWidth;
    chartRoot.appendChild(createMarker(item.entry, item.topPercent, markerLeftPx));
  }
}
