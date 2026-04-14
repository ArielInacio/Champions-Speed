import { applySpriteConfigOverlays } from "../sprites/resolveSpriteForConfig.js";

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function createTick(value, bottomPercent) {
  const tick = document.createElement("div");
  tick.className = "chart-tick";
  tick.style.bottom = `${bottomPercent}%`;

  const label = document.createElement("span");
  label.className = "chart-tick-label";
  label.textContent = String(value);
  tick.appendChild(label);

  return tick;
}

function createMarker(entry, indexInGroup, groupSize, bottomPercent) {
  const marker = document.createElement("div");
  marker.className = "speed-marker";
  marker.style.bottom = `${bottomPercent}%`;

  const spread = 92;
  const start = 50 - spread / 2;
  const step = groupSize === 1 ? 0 : spread / (groupSize - 1);
  const leftPercent = start + indexInGroup * step;
  marker.style.left = `${leftPercent}%`;

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

  const label = document.createElement("span");
  label.className = "speed-marker-label";
  label.textContent = `${entry.displayName} (${entry.finalSpeed})`;
  marker.appendChild(label);

  return marker;
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

  summaryNode.textContent = `Showing ${entries.length} entries from ${minSpeed} to ${maxSpeed} final speed.`;

  const lane = document.createElement("div");
  lane.className = "speed-lane";
  chartRoot.appendChild(lane);

  const ticksToRender = new Set([minSpeed, maxSpeed]);
  if (hasSpread) {
    ticksToRender.add(Math.floor(minSpeed + range * 0.25));
    ticksToRender.add(Math.floor(minSpeed + range * 0.5));
    ticksToRender.add(Math.floor(minSpeed + range * 0.75));
  }

  for (const tickValue of Array.from(ticksToRender).sort((a, b) => a - b)) {
    const bottomPercent = hasSpread ? ((tickValue - minSpeed) / range) * 100 : 50;
    chartRoot.appendChild(createTick(tickValue, bottomPercent));
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
    const bottomPercent = hasSpread ? ((Number(speed) - minSpeed) / range) * 100 : 50;
    group.forEach((entry, index) => {
      chartRoot.appendChild(createMarker(entry, index, group.length, bottomPercent));
    });
  }
}
