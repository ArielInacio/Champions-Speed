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

function createTick(value, topPercent, chartWidth, laneLeftPx) {
  const tick = document.createElement("div");
  tick.className = "chart-tick";
  tick.style.top = `${topPercent}%`;

  const label = document.createElement("span");
  label.className = "chart-tick-label";
  label.textContent = String(value);
  tick.appendChild(label);

  return tick;
}

function createMarker(entry, topPercent) {
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
    finalSpeed: entry.finalSpeed,
    nature: entry.nature,
    speedPoints: entry.speedPoints,
    stage: entry.stage,
  });
  marker.appendChild(spriteWrap);

  return marker;
}

function createStackGroup(markers, baseLeftPx, topPercent) {
  const stack = document.createElement("div");
  stack.className = "speed-marker-stack collapsed";
  stack.style.top = `${topPercent}%`;
  stack.style.left = `${baseLeftPx}px`;
  stack.dataset.stackCount = String(markers.length);

  if (markers.length > 1) {
    markers[0].setAttribute("data-stack-count", String(markers.length));
  }

  markers.forEach((marker, index) => {
    marker.style.position = index === 0 ? "relative" : "absolute";
    marker.style.left = "0";
    marker.style.top = "0";
    stack.appendChild(marker);
  });

  stack.addEventListener("mouseenter", () => {
    stack.classList.remove("collapsed");
    stack.classList.add("expanded");
  });

  stack.addEventListener("mouseleave", () => {
    stack.classList.remove("expanded");
    stack.classList.add("collapsed");
  });

  return stack;
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
    chartRoot.appendChild(createTick(tickValue, topPercent, chartWidth, laneLeftPx));
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

  const columnWidth = MARKER_SIZE_PX + MARKER_GAP_PX;

  for (const group of groupedItems) {
    const baseLeftPx = laneLeftPx + MARKER_LEFT_OFFSET_PX + group.baseColumn * columnWidth;

    const stackKey = (entry) => `${entry.nature}|${entry.speedPoints}`;
    const stacksByConfig = new Map();

    for (const item of group.items) {
      const key = stackKey(item.entry);
      if (!stacksByConfig.has(key)) {
        stacksByConfig.set(key, []);
      }
      stacksByConfig.get(key).push(item);
    }

    const stackGroups = Array.from(stacksByConfig.values());
    stackGroups.forEach((stackItems, stackIndex) => {
      const markers = stackItems.map((item) => createMarker(item.entry, group.topPercent));
      const stackLeftPx = baseLeftPx + stackIndex * columnWidth;
      const stack = createStackGroup(markers, stackLeftPx, group.topPercent);
      chartRoot.appendChild(stack);
    });
  }
}
