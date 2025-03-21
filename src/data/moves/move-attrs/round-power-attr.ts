import type { Pokemon } from "#app/field/pokemon";
import type { NumberHolder } from "#app/utils";
import type { Move } from "#app/data/moves/move";
import { VariableBasePowerAttr } from "#app/data/moves/move-attrs/variable-base-power-attr";

/**
 * Variable Power attribute for {@link https://bulbapedia.bulbagarden.net/wiki/Round_(move) | Round}.
 * Doubles power if another Pokemon has previously selected Round this turn.
 * @extends VariableBasePowerAttr
 */
export class RoundPowerAttr extends VariableBasePowerAttr {
  override apply(user: Pokemon, _target: Pokemon, _move: Move, power: NumberHolder): boolean {
    if (user.turnData?.joinedRound) {
      power.value *= 2;
      return true;
    }
    return false;
  }
}
