import requests as rq
import json


    
def format_name(p):
    base_name = str(p['name']).replace(".","").replace(" ", "-")
    return f"{base_name}{p['ig']}" if p["ig"] else base_name

def get_pokemon_speed(pokemon):
    pokemon_name =format_name(pokemon)
    base_url = "https://pokeapi.co/api/v2/"
    url = f"{base_url}pokemon/{pokemon_name}/"
    
    response = rq.get(url)
    if response.status_code != 200:
        print(f"Failed to fetch data for {pokemon_name}: {response.status_code}")
        raise Exception(f"Failed to fetch data for {pokemon_name}: {response.status_code}")
    
    pokemon_info = response.json()
    speed = pokemon_info['stats'][5]['base_stat']
    front_default = pokemon_info.get('sprites', {}).get('front_default')
    print(f'{pokemon_name}: {speed}')
    return {
        "speed": speed,
        "front_default": front_default,
    }

# Process the JSON and extract speed values

def get_species_varieties(pokemon):
    species_name =  pokemon['name']
    base_url = "https://pokeapi.co/api/v2/"
    url = f"{base_url}pokemon-species/{species_name}/"
    response = rq.get(url)
    if response.status_code != 200:
        raise Exception(f"Failed to fetch data for species {species_name}: {response.status_code}")
    species_info = response.json()
    varieties = [variety['pokemon']['name'] for variety in species_info["varieties"]]
    return varieties
    

def get_pokemons_speed():
    with open("pokemon_champions.json", "r") as f:
        champions_pokemon = json.load(f)
    processed_pokemon_data = []
    for pokemon in champions_pokemon['pokemon']:
        if 'name' in pokemon:
            try:
                pokemon_data = get_pokemon_speed(pokemon)
                processed_pokemon_data.append({
                    **pokemon,
                    **pokemon_data,
                })
            except:
                varieties = get_species_varieties(pokemon)
                pokemon_data = get_pokemon_speed({"name":varieties[0], "ig": None})
                processed_pokemon_data.append({
                    **pokemon,
                    **pokemon_data,
                })    



    # Save the processed data to a new JSON file
    with open('processed_pokemon.json', 'w') as f:
        json.dump(processed_pokemon_data, f, indent=4)
        
if __name__ == "__main__":
    get_pokemons_speed()
    #print(get_species_varieties({"name": "Gourgeist"}))

            
