import requests
import mwparserfromhell
import json
import re
from datetime import datetime

API_URL = "https://bulbapedia.bulbagarden.net/w/api.php"
PAGE = "List of Pokémon in Pokémon Champions"


def fetch_wikitext():
    params = {
        "action": "query",
        "prop": "revisions",
        "titles": PAGE,
        "rvprop": "content",
        "format": "json",
        "formatversion": 2
    }

    res = requests.get(API_URL, params=params, timeout=15)
    res.raise_for_status()

    return res.json()["query"]["pages"][0]["revisions"][0]["content"]


def normalize_form_to_region(form):
    mapping = {
        "Alolan Form": "Alola",
        "Galarian Form": "Galar",
        "Hisuian Form": "Hisui",
        "Paldean Form": "Paldea"
    }

    for k, v in mapping.items():
        if k in form:
            return v

    return None

def scrape():
    text = fetch_wikitext()
    wikicode = mwparserfromhell.parse(text)

    results = []

    for template in wikicode.filter_templates():
        name = template.name.strip().lower()

        if not (name.startswith("gdex/champs") or name.startswith("msp/champs")) :
            continue

        params = template.params
        if len(params) < 2:
            continue

        ndex_raw = str(params[0].value).strip()
        base_name = str(params[1].value).strip()

        ndex = int(ndex_raw.lstrip("0"))

        ig = None

        for p in params:
            pname = str(p.name).strip()
            pvalue = str(p.value).strip()

            if pname == "ig":
                # "Mega X" -> "Mega-X"
                if any(item in pvalue for  item in ["Mega" ]):
                    ig = pvalue.replace(" ", "-")
            if pname == "form":
                # "Mega X" -> "Mega-X"
                if any(item in pvalue for  item in [ "-Alola", "-Galar", "-Hisui", "-Paldea", "-Female", "-Male" ]):
                    ig = pvalue.replace(" ", "-")        
            #elif pname == "form":
            #    form = pvalue

        results.append({
            "ndex": ndex,
            "name": base_name,
            "ig": ig 
        })

    # dedupe + sort
    unique = {(p["ndex"], p["name"], p["ig"]): p for p in results}
    final = list(unique.values())
    final.sort(key=lambda x: (x["ndex"], x["name"], x["ig"] or ""))

    #sanity check
    if len(final) < 50:
        raise ValueError(f"Too few Pokémon parsed: {len(final)}")

    return final


def save(data):
    with open("pokemon_champions.json", "w", encoding="utf-8") as f:
        json.dump({
            "last_updated": datetime.utcnow().isoformat(),
            "count": len(data),
            "pokemon": data
        }, f, indent=2, ensure_ascii=False)


import os

def diff_and_save(data, path="pokemon_champions.json"):
    old = []
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            old = json.load(f).get("pokemon", [])

    old_set = {(p["ndex"], p["name"]) for p in old}
    new_set = {(p["ndex"], p["name"]) for p in data}

    added = new_set - old_set

    if added:
        print("New Pokémon detected:")
        for a in sorted(added):
            print(a)

    save(data)
    
    
def format_name(p):
    return f"{p['name']}{p['ig']}" if p["ig"] else p["name"]


def read_champions_json_to_list(path="pokemon_champions.json"):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            old = json.load(f).get("pokemon", [])
    
    simple_list = [format_name(p) for p in old]
    
    
    return simple_list
     
     


if __name__ == "__main__":
    data = scrape()
    diff_and_save(data)
    print(f"Saved {len(data)} Pokémon")
    #print(fetch_wikitext()[:5000])



    


