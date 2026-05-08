import Header from "../layout/Header";
import type { Pokemon, MetaData } from "../../types";
import { useBattleCalcStore } from "../../store/useBattleCalcStore";
import CalcPokemonPanel from "./CalcPokemonPanel";
import CalcFieldPanel from "./CalcFieldPanel";
import { calcDamage } from "../../lib/damage-calc";
import { getAbilityModifiers } from "../../lib/damage-calc";

interface Props {
  allPokemon: Pokemon[];
  meta: MetaData;
}

export default function DamageCalcTab({ allPokemon, meta }: Props) {
  const store = useBattleCalcStore();
  const { slot1, slot2, weather, reflect1, reflect2, lightScreen1, lightScreen2 } = store;

  // Determine if attacker is intimidated by defender's ability
  const slot1Intimidated = !!slot2 && getAbilityModifiers(slot2.ability).intimidatesOpponent;
  const slot2Intimidated = !!slot1 && getAbilityModifiers(slot1.ability).intimidatesOpponent;

  // Calculate damage for each move for both directions
  const calcMoveResults = (
    attacker: typeof slot1,
    defender: typeof slot2,
    attackerIntimidated: boolean,
    reflect: boolean,
    lightScreen: boolean
  ) => {
    if (!attacker || !defender) return [];
    return attacker.moves.map((move) =>
      calcDamage({
        attacker,
        defender,
        move,
        weather,
        attackerIntimidated,
        reflect,
        lightScreen,
        isSingles: store.isSingles,
      })
    );
  };

  const results1to2 = calcMoveResults(slot1, slot2, slot1Intimidated, reflect2, lightScreen2);
  const results2to1 = calcMoveResults(slot2, slot1, slot2Intimidated, reflect1, lightScreen1);

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      <Header meta={meta} onLogout={undefined} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-screen-xl mx-auto px-3 py-4">
          {/* Three-column layout */}
          <div className="flex flex-col lg:flex-row gap-3 items-start">
            {/* Pokémon 1 (left) */}
            <div className="flex-1 min-w-0">
              <CalcPokemonPanel
                slot="slot1"
                allPokemon={allPokemon}
                moveResults={results1to2}
                defenderHp={slot2?.stats.hp ?? 0}
                label="Pokémon 1 (Attacker)"
              />
            </div>

            {/* Field (center) */}
            <div className="lg:w-56 flex-shrink-0">
              <CalcFieldPanel />
            </div>

            {/* Pokémon 2 (right) */}
            <div className="flex-1 min-w-0">
              <CalcPokemonPanel
                slot="slot2"
                allPokemon={allPokemon}
                moveResults={results2to1}
                defenderHp={slot1?.stats.hp ?? 0}
                label="Pokémon 2 (Opponent)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
