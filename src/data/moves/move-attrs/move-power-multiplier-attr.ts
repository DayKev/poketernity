import type { Pokemon } from "#app/field/pokemon";
import type { NumberHolder } from "#app/utils";
import type { Move } from "#app/data/moves/move";
import { VariableBasePowerAttr } from "#app/data/moves/move-attrs/variable-base-power-attr";

/**
 * Attribute to multiply move power by the output of
 * a set {@linkcode powerMultiplierFunc | function}.
 * @extends VariableBasePowerAttr
 */
export class MovePowerMultiplierAttr extends VariableBasePowerAttr {
  private powerMultiplierFunc: (user: Pokemon, target: Pokemon, move: Move) => number;

  constructor(powerMultiplier: (user: Pokemon, target: Pokemon, move: Move) => number) {
    super();

    this.powerMultiplierFunc = powerMultiplier;
  }

  override apply(user: Pokemon, target: Pokemon, move: Move, power: NumberHolder): boolean {
    power.value *= this.powerMultiplierFunc(user, target, move);

    return true;
  }
}
