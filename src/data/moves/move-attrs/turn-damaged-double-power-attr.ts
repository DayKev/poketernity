import type { Pokemon } from "#app/field/pokemon";
import type { NumberHolder } from "#app/utils";
import type { Move } from "#app/data/moves/move";
import { VariableBasePowerAttr } from "#app/data/moves/move-attrs/variable-base-power-attr";

/**
 * Attribute to double move power if the user was damaged by the target this turn.
 * Used for {@link https://bulbapedia.bulbagarden.net/wiki/Revenge_(move) | Revenge}
 * and {@link https://bulbapedia.bulbagarden.net/wiki/Avalanche_(move) | Avalanche}.
 * @extends VariableBasePowerAttr
 */
export class TurnDamagedDoublePowerAttr extends VariableBasePowerAttr {
  override apply(user: Pokemon, target: Pokemon, _move: Move, power: NumberHolder): boolean {
    if (user.turnData.attacksReceived.find((r) => r.damage && r.sourceId === target.id)) {
      power.value *= 2;
      return true;
    }

    return false;
  }
}
