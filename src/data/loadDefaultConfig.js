export async function loadDefaultConfig() {
  const response = await fetch("./default_chart_config.json");
  if (!response.ok) {
    throw new Error(`Failed to load default_chart_config.json: ${response.status}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.entries)) {
    return [];
  }

  return payload.entries;
}

