import type { Pokemon } from "#app/field/pokemon";
import { type NumberHolder, toDmgValue } from "#app/utils";
import type { Move } from "#app/data/moves/move";
import { VariableBasePowerAttr } from "#app/data/moves/move-attrs/variable-base-power-attr";

/**
 * Attribute to set move power equal to 150 * the user's HP ratio.
 * @extends VariableBasePowerAttr
 * @see {@link https://bulbapedia.bulbagarden.net/wiki/Move_variations#Variations_of_Eruption | Variations of Eruption}
 */
export class HpPowerAttr extends VariableBasePowerAttr {
  override apply(user: Pokemon, _target: Pokemon, _move: Move, power: NumberHolder): boolean {
    power.value = toDmgValue(150 * user.getHpRatio());

    return true;
  }
}
