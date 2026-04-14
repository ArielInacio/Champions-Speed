function clampStage(stage) {
  const parsed = Number.parseInt(stage, 10);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return Math.min(6, Math.max(-6, parsed));
}

function clampSpeedPoints(speedPoints) {
  const parsed = Number.parseInt(speedPoints, 10);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return Math.min(32, Math.max(0, parsed));
}

function createNatureIndicator(nature) {
  const node = document.createElement("span");
  node.className = "sprite-overlay sprite-overlay-nature";

  if (nature === "positive") {
    node.textContent = "+";
    node.classList.add("nature-positive");
    return node;
  }

  if (nature === "negative") {
    node.textContent = "-";
    node.classList.add("nature-negative");
    return node;
  }

  node.textContent = "o";
  node.classList.add("nature-neutral");
  return node;
}

function createSpeedPointsIndicator(speedPoints) {
  const safeSp = clampSpeedPoints(speedPoints);
  if (safeSp <= 0) {
    return null;
  }

  const node = document.createElement("span");
  node.className = "sprite-overlay sprite-overlay-sp";
  node.textContent = String(safeSp);
  return node;
}

function createStageIndicator(stage) {
  const safeStage = clampStage(stage);
  if (safeStage === 0) {
    return null;
  }

  const node = document.createElement("span");
  node.className = "sprite-overlay sprite-overlay-stage";

  const isPositive = safeStage > 0;
  const arrow = isPositive ? "↑" : "↓";
  const count = Math.abs(safeStage);
  node.textContent = arrow.repeat(count);
  node.classList.add(isPositive ? "stage-positive" : "stage-negative");

  return node;
}

export function applySpriteConfigOverlays(container, { nature, speedPoints, stage }) {
  const sp = createSpeedPointsIndicator(speedPoints);
  if (sp) {
    container.appendChild(sp);
  }

  container.appendChild(createNatureIndicator(nature));

  const stageNode = createStageIndicator(stage);
  if (stageNode) {
    container.appendChild(stageNode);
  }
}

