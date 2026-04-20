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

  let svgInner;
  if (nature === "positive") {
    node.classList.add("nature-positive");
    svgInner = `<svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><polygon points="5,1 9,9 1,9"/></svg>`;
  } else if (nature === "negative") {
    node.classList.add("nature-negative");
    svgInner = `<svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><polygon points="5,9 9,1 1,1"/></svg>`;
  } else {
    node.classList.add("nature-neutral");
    svgInner = `<svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="4"/></svg>`;
  }

  node.innerHTML = svgInner;
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

function createFinalSpeedIndicator(finalSpeed){
  if (finalSpeed < 0){
    return null;
  }
  const node = document.createElement("span")
  node.className = "sprite-overlay sprite-overlay-final-speed"
  node.textContent = String(finalSpeed);
  return node
}

function createStageIndicator(stage) {
  const safeStage = clampStage(stage);
  if (safeStage === 0) {
    return null;
  }

  const node = document.createElement("span");
  node.className = "sprite-overlay sprite-overlay-stage";

  const isPositive = safeStage > 0;
  const count = Math.abs(safeStage);
  node.classList.add(isPositive ? "stage-positive" : "stage-negative");

  const arrowPath = isPositive
    ? `<polygon points="5,1 9,8 1,8"/>`
    : `<polygon points="5,9 9,2 1,2"/>`;

  const arrow = `<svg width="7" height="7" viewBox="0 0 10 10" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="display:block">${arrowPath}</svg>`;

  const col = (n) => {
    const wrap = document.createElement("span");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:1px;";
    wrap.innerHTML = arrow.repeat(n);
    return wrap;
  };

  if (count <= 3) {
    node.appendChild(col(count));
  } else {
    node.style.flexDirection = "row-reverse";
    node.style.gap = "2px";
    node.appendChild(col(3));
    node.appendChild(col(count - 3));
  }

  return node;
}

export function applySpriteConfigOverlays(container, {finalSpeed, nature, speedPoints, stage }) {
  const final = createFinalSpeedIndicator(finalSpeed)
  container.appendChild(final)

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

