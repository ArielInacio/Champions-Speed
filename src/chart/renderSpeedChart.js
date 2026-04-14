import { applySpriteConfigOverlays } from "../sprites/resolveSpriteForConfig.js";

const MIN_POSITION_PERCENT = 7;
const MAX_POSITION_PERCENT = 93;
const MARKER_LEFT_OFFSET_PX = 14;
const OVERLAP_SPACING_PX = 20;

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

function createMarker(entry, indexInGroup, groupSize, topPercent, chartWidth, laneLeftPx) {
  const marker = document.createElement("div");
  marker.className = "speed-marker";
  marker.style.top = `${topPercent}%`;

  const offsetByGroup = groupSize > 1 ? indexInGroup * OVERLAP_SPACING_PX : 0;
  const maxLeft = Math.max(100, chartWidth - 45);
  const markerLeft = Math.min(maxLeft, laneLeftPx + MARKER_LEFT_OFFSET_PX + offsetByGroup);
  marker.style.left = `${markerLeft}px`;

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
  return MIN_POSITION_PERCENT + normalized * (MAX_POSITION_PERCENT - MIN_POSITION_PERCENT);
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
  const laneLeftPx = Number.parseInt(
    getComputedStyle(chartRoot).getPropertyValue("--lane-left"),
    10,
  ) || 68;

  summaryNode.textContent = `Showing ${entries.length} entries from ${minSpeed} to ${maxSpeed} final speed.`;

  const lane = document.createElement("div");
  lane.className = "speed-lane";
  chartRoot.appendChild(lane);

  const uniqueSpeeds = Array.from(new Set(entries.map((entry) => entry.finalSpeed))).sort((a, b) => a - b);
  const maxTicks = 45;
  const ticksToRender = [];
  if (uniqueSpeeds.length <= maxTicks) {
    ticksToRender.push(...uniqueSpeeds);
  } else {
    const targetTickCount = 25;
    const step = (uniqueSpeeds.length - 1) / (targetTickCount - 1);
    for (let i = 0; i < targetTickCount; i += 1) {
      ticksToRender.push(uniqueSpeeds[Math.round(i * step)]);
    }
  }

  for (const tickValue of Array.from(new Set(ticksToRender))) {
    const topPercent = speedToTopPercent(tickValue, minSpeed, range, hasSpread);
    chartRoot.appendChild(createTick(tickValue, topPercent));
  }

  const grouped = new Map();
  for (const entry of entries) {
    const key = String(entry.finalSpeed);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(entry);
  }

  for (const [speed, group] of grouped) {
    const topPercent = speedToTopPercent(Number(speed), minSpeed, range, hasSpread);
    group.forEach((entry, index) => {
      chartRoot.appendChild(createMarker(entry, index, group.length, topPercent, chartWidth, laneLeftPx));
    });
  }
}
