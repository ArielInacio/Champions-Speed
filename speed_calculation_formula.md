The stat calculation has also been updated to integrate SPs.

HP Formula
HP = floor(((2 * B + 31) * L) / 100) + L + 10 + SP_HP
Other Stats
Stat = floor((floor(((2 * B + 31) * L) / 100) + 5 + SP) * N)
Where:

B = Base stat

L = Level (fixed at 50)

SP = Stat Points assigned

N = Nature multiplier (1.1 / 1.0 / 0.9)

Stage multipliers
When a move is used that increases or decreases a stat of a Pokémon in battle, it will be multiplied according to the following fractions, depending on the generation:

For Attack, Defense, Special, Sp. Attack, Sp. Defense, and Speed
Stage multipliers
−6: 2/8
-5: 2/7
-4: 2/6
-3: 2/5
-2: 2/4
-1: 2/3
0:  2/2
+1: 3/2
+2: 4/2
+3: 5/2
+4: 6/2
+5: 7/2
+6: 8/2
