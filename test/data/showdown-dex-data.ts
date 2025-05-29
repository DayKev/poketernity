/**
 * Dex Data
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * @license MIT
 */

// from showdown's utils.ts
function getString(str: any): string {
  return typeof str === "string" || typeof str === "number" ? `${str}` : "";
}

interface AnyObject {
  [k: string]: any;
}

type ID = "" | (Lowercase<string> & { __isID: true });

type Nonstandard = "Past" | "Future" | "Unobtainable" | "CAP" | "LGPE" | "Custom" | "Gigantamax";

interface EffectData {
  name?: string;
  desc?: string;
  duration?: number;
  durationCallback?: (this: any, target: any, source: any, effect: any | null) => number;
  effectType?: string;
  infiltrates?: boolean;
  isNonstandard?: Nonstandard | null;
  shortDesc?: string;
}

type EffectType =
  | "Condition"
  | "Pokemon"
  | "Move"
  | "Item"
  | "Ability"
  | "Format"
  | "Nature"
  | "Ruleset"
  | "Weather"
  | "Status"
  | "Terrain"
  | "Rule"
  | "ValidatorRule";

/**
 * Converts anything to an ID. An ID must have only lowercase alphanumeric
 * characters.
 *
 * If a string is passed, it will be converted to lowercase and
 * non-alphanumeric characters will be stripped.
 *
 * If an object with an ID is passed, its ID will be returned.
 * Otherwise, an empty string will be returned.
 *
 * Generally assigned to the global toID, because of how
 * commonly it's used.
 */
function toID(text: any): ID {
  if (typeof text !== "string") {
    if (text) {
      text = text.id || text.userid || text.roomid || text;
    }
    if (typeof text === "number") {
      text = `${text}`;
    } else if (typeof text !== "string") {
      return "";
    }
  }
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "") as ID;
}

export abstract class BasicEffect implements EffectData {
  /**
   * ID. This will be a lowercase version of the name with all the
   * non-alphanumeric characters removed. So, for instance, "Mr. Mime"
   * becomes "mrmime", and "Basculin-Blue-Striped" becomes
   * "basculinbluestriped".
   */
  id: ID;
  /**
   * Name. Currently does not support Unicode letters, so "Flabébé"
   * is "Flabebe" and "Nidoran♀" is "Nidoran-F".
   */
  name: string;
  /**
   * Full name. Prefixes the name with the effect type. For instance,
   * Leftovers would be "item: Leftovers", confusion the status
   * condition would be "confusion", etc.
   */
  fullname: string;
  /** Effect type. */
  effectType: EffectType;
  /**
   * Does it exist? For historical reasons, when you use an accessor
   * for an effect that doesn't exist, you get a dummy effect that
   * doesn't do anything, and this field set to false.
   */
  exists: boolean;
  /**
   * Dex number? For a Pokemon, this is the National Dex number. For
   * other effects, this is often an internal ID (e.g. a move
   * number). Not all effects have numbers, this will be 0 if it
   * doesn't. Nonstandard effects (e.g. CAP effects) will have
   * negative numbers.
   */
  num: number;
  /**
   * The generation of Pokemon game this was INTRODUCED (NOT
   * necessarily the current gen being simulated.) Not all effects
   * track generation; this will be 0 if not known.
   */
  gen: number;
  /**
   * A shortened form of the description of this effect.
   * Not all effects have this.
   */
  shortDesc: string;
  /** The full description for this effect. */
  desc: string;
  /**
   * Is this item/move/ability/pokemon nonstandard? Specified for effects
   * that have no use in standard formats: made-up pokemon (CAP),
   * glitches (MissingNo etc), Pokestar pokemon, etc.
   */
  isNonstandard: Nonstandard | null;
  /** The duration of the condition - only for pure conditions. */
  duration?: number;
  /** Whether or not the condition is ignored by Baton Pass - only for pure conditions. */
  noCopy: boolean;
  /** Whether or not the condition affects fainted Pokemon. */
  affectsFainted: boolean;
  /** Moves only: what status does it set? */
  status?: ID;
  /** Moves only: what weather does it set? */
  weather?: ID;
  /** ??? */
  sourceEffect: string;

  constructor(data: AnyObject) {
    this.name = getString(data.name).trim();
    this.id = data.realMove ? toID(data.realMove) : toID(this.name); // Hidden Power hack
    this.fullname = getString(data.fullname) || this.name;
    this.effectType = (getString(data.effectType) as EffectType) || "Condition";
    this.exists = data.exists ?? !!this.id;
    this.num = data.num || 0;
    this.gen = data.gen || 0;
    this.shortDesc = data.shortDesc || "";
    this.desc = data.desc || "";
    this.isNonstandard = data.isNonstandard || null;
    this.duration = data.duration;
    this.noCopy = !!data.noCopy;
    this.affectsFainted = !!data.affectsFainted;
    this.status = (data.status as ID) || undefined;
    this.weather = (data.weather as ID) || undefined;
    this.sourceEffect = data.sourceEffect || "";
  }

  toString() {
    return this.name;
  }
}
