function buildPokemonKey(pokemon) {
  const form = pokemon.ig ?? "base";
  return `${pokemon.name}:${form}`;
}

function buildDisplayName(pokemon) {
  return `${pokemon.name}${pokemon.ig ?? ""}`;
}

export async function loadPokemonData() {
  const response = await fetch("./processed_pokemon.json");
  if (!response.ok) {
    throw new Error(`Failed to load processed_pokemon.json: ${response.status}`);
  }

  const rows = await response.json();
  return rows
    .map((pokemon) => ({
      ...pokemon,
      pokemonKey: buildPokemonKey(pokemon),
      displayName: buildDisplayName(pokemon),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
