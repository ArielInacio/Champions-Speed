Showdown Exports Champions Pokemon in the format:

```
Froslass (F) @ Choice Scarf  
Ability: Snow Cloak  
Level: 50  
EVs: 2 HP / 32 SpA / 32 Spe  
Hasty Nature  
- Aurora Veil  
- Avalanche  
- Blizzard  
- Body Slam
```
We need to parse name, EVs to SP, nature, and item

Name will be matching the pokemon name in the database. Alternate forms such as Mega, will have a - symbol before the form name.

EVs allocated to 'Spe' must be converted to SP

Nature must be converted accordinly:
Timid,Hasty,Jolly,Naive -> Positive
Brave, Relaxed, Quiet, Sassy -> Negative
Any other nature -> Neutral

Item will add +1 to Stage if is Choice Scarf, any other item or no item will be 0 

visibility will be true by default

The former example translates to:
Froslass,positive,32,1,true

Another Example:

```
Charizard-Mega-X @ Charizardite X  
Ability: Tough Claws  
Level: 50  
EVs: 32 Atk / 32 Spe  
Adamant Nature  
- Acrobatics  
- Air Slash  
- Body Slam  
- Brick Break
```

This translates to:
Charizard-Mega-X,neutral,32,0,true

Another Example:

```
Palafin @ Leftovers  
Ability: Zero to Hero  
Level: 50  
EVs: 32 HP / 32 Atk  
Naughty Nature  
- Agility  
- Aqua Tail  
- Blizzard  
- Aura Sphere
```

This translates to:
Palafin,neutral,0,0,true