import { allSpecies } from "#data/data-lists";
import { starterPassiveAbilities } from "#data/passives";
import { AbilityId } from "#enums/ability-id";
import { ElementalType } from "#enums/elemental-type";
import { GrowthRate } from "#enums/growth-rates";
import type { PokemonColors } from "#enums/pokemon-colors";
import { PokemonRegion } from "#enums/pokemon-regions";
import { PokemonShapes } from "#enums/pokemon-shapes";
import { SpeciesGroups } from "#enums/pokemon-species-groups";
import { SpeciesId } from "#enums/species-id";
import { Stat } from "#enums/stat";
import { Pokedex } from "#test/data/smogon_data";
import { GameManager } from "#test/test-utils/game-manager";
import { isNil } from "#utils/common-utils";
import { readFileSync, writeFileSync } from "node:fs";
import Phaser from "phaser";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

interface GenderRatio {
  M: number;
  F: number;
}

interface SpeciesAbilities {
  A1: string;
  A2?: string;
  H?: string;
  P?: string;
}

interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

// enum FormType {
//   COSMETIC,
//   MEGA,
//   GIGANTAMAX,
//   REGIONAL,
//   ALTERNATE,
//   BATTLE,
// }

enum GrowthRate_PokeAPI {
  SLOW = 1,
  MEDIUM,
  FAST,
  MEDIUM_SLOW,
  SLOW_THEN_VERY_FAST,
  FAST_THEN_VERY_SLOW,
}

const GrowthRateMap = {
  [GrowthRate_PokeAPI.SLOW_THEN_VERY_FAST]: GrowthRate.ERRATIC,
  [GrowthRate_PokeAPI.FAST]: GrowthRate.FAST,
  [GrowthRate_PokeAPI.MEDIUM]: GrowthRate.MEDIUM_FAST,
  [GrowthRate_PokeAPI.MEDIUM_SLOW]: GrowthRate.MEDIUM_SLOW,
  [GrowthRate_PokeAPI.SLOW]: GrowthRate.SLOW,
  [GrowthRate_PokeAPI.FAST_THEN_VERY_SLOW]: GrowthRate.FLUCTUATING,
};

type SpeciesEntry = {
  id: string;
  speciesId: number;
  types: string[];
  baseStats: BaseStats;
  abilities: SpeciesAbilities;
  genderRatio: GenderRatio;
  weight: number;
  height: number;
  prevo?: string;
  evos?: string | string[];
  color: string;
  shape: string;
  captureRate: number;
  baseFriendship: number;
  growthRate: string;
  speciesGroup: string;
  hasGenderDiff: boolean;
  forms?; // TODO
};

type PokeAPI_Data = {
  id: number;
  identifier: string;
  generation_id: number;
  evolves_from_species_id: string | number;
  evolution_chain_id: number;
  color_id: PokemonColors;
  shape_id: PokemonShapes;
  habitat_id: number;
  gender_rate: number;
  capture_rate: number;
  base_happiness: number;
  is_baby: number;
  hatch_counter: number;
  has_gender_differences: number;
  growth_rate_id: number;
  forms_switchable: number;
  is_legendary: number;
  is_mythical: number;
  order: number;
  conquest_order: string;
};

describe("Data - Pokemon Species", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;

  beforeAll(() => {
    phaserGame = new Phaser.Game({
      type: Phaser.HEADLESS,
    });
  });

  afterEach(() => {
    game.phaseInterceptor.restoreOg();
  });

  beforeEach(() => {
    game = new GameManager(phaserGame);
  });

  // From PokeAPI: growth rate, shape, capture rate, base friendship

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])("write json files: gen %d", async (gen) => {
    const speciesEntries: SpeciesEntry[] = [];
    const pokeapiEntries: PokeAPI_Data[] = JSON.parse(readFileSync("./test/data/pokeapi_species.json", "utf-8"));
    const showdownEntries = Object.entries(Pokedex);
    const speciesSample = allSpecies.filter((sp) => sp.generation === gen);

    for (const sp of speciesSample) {
      if (sp.speciesId === SpeciesId.PALDEA_TAUROS) {
        continue;
      }
      let speciesId = sp.speciesId;
      const speciesEnumName = SpeciesId[speciesId];
      // console.log(speciesEnumName);

      const region = sp.getRegion();
      speciesId = speciesId - 2000 * region;

      const speciesEntry: any = { speciesId: sp.speciesId };

      const filteredEntry = showdownEntries.filter((x) => {
        const idMatch = x[1]["num"] === speciesId;
        const baseSpecies: string | undefined = x[1]["baseSpecies"];
        const forme: string | undefined = x[1]["forme"];
        if (speciesEnumName === "ETERNAL_FLOETTE") {
          return idMatch && baseSpecies === "Floette" && forme === "Eternal";
        }
        if (speciesEnumName === "BLOODMOON_URSALUNA") {
          return idMatch && baseSpecies === "Ursaluna" && forme === "Bloodmoon";
        }
        if (speciesEnumName === "MINIOR") {
          return idMatch && baseSpecies === "Minior" && forme === "Meteor";
        }
        const regionMatch = setRegionMatch(region, isNil(baseSpecies), forme);
        const mega = forme?.includes("Mega");
        const gmax = forme === "Gmax";
        return idMatch && regionMatch && !mega && !gmax;
      });
      const dexEntryMissingErrorMessage = `Missing entry for ${speciesEnumName} (id: ${sp.speciesId}, adjusted id: ${speciesId}, name: ${sp.name})`;
      expect(filteredEntry, dexEntryMissingErrorMessage).not.toHaveLength(0);

      const smogonKey = filteredEntry[0][1].name.toLowerCase().replace(/[^\w\d]/g, "");
      const smogonEntry = Pokedex[smogonKey];
      expect(smogonEntry, dexEntryMissingErrorMessage).toBeDefined();

      const pokeapiEntry = pokeapiEntries.filter((x) => x["id"] === speciesId)[0];

      speciesEntry["id"] = speciesEnumName;
      speciesEntry["types"] = smogonEntry["types"].map((x) => x.toUpperCase());
      expect(speciesEntry["types"][0]).toBe(ElementalType[sp.type1]);
      if (!isNil(sp.type2)) {
        expect(speciesEntry["types"][1]).toBeDefined();
        expect(speciesEntry["types"][1]).toBe(ElementalType[sp.type2]);
      }

      // const statsObject: BaseStats = {
      //   hp: smogonEntry.baseStats.hp,
      //   atk: smogonEntry.baseStats.atk,
      //   def: smogonEntry.baseStats.def,
      //   spa: smogonEntry.baseStats.spa,
      //   spd: smogonEntry.baseStats.spd,
      //   spe: smogonEntry.baseStats.spe,
      // };
      const statsObject: BaseStats = {
        hp: sp.getBaseStat(Stat.HP),
        atk: sp.getBaseStat(Stat.ATK),
        def: sp.getBaseStat(Stat.DEF),
        spa: sp.getBaseStat(Stat.SPATK),
        spd: sp.getBaseStat(Stat.SPDEF),
        spe: sp.getBaseStat(Stat.SPD),
      };
      expect(smogonEntry.baseStats.hp).toBe(sp.getBaseStat(Stat.HP));
      expect(smogonEntry.baseStats.atk).toBe(sp.getBaseStat(Stat.ATK));
      expect(smogonEntry.baseStats.def).toBe(sp.getBaseStat(Stat.DEF));
      expect(smogonEntry.baseStats.spa).toBe(sp.getBaseStat(Stat.SPATK));
      expect(smogonEntry.baseStats.spd).toBe(sp.getBaseStat(Stat.SPDEF));
      expect(smogonEntry.baseStats.spe).toBe(sp.getBaseStat(Stat.SPD));
      speciesEntry["baseStats"] = statsObject;

      const abilityObj: SpeciesAbilities = { A1: AbilityId[sp.ability1] };
      const a1 = smogonEntry.abilities["0"].toUpperCase().replace(/[- ]/g, "_").replace(/'/g, "");
      const a2 = smogonEntry.abilities["1"]?.toUpperCase().replace(/[- ]/g, "_").replace(/'/g, "");
      const h = smogonEntry.abilities["H"]?.toUpperCase().replace(/[- ]/g, "_").replace(/'/g, "");

      expect(a1, `${speciesEnumName} first ability should be: ${a1} is: ${abilityObj.A1}`).toBe(abilityObj.A1);
      if (sp.ability2 !== sp.ability1) {
        abilityObj.A2 = AbilityId[sp.ability2];
        expect(a2, `${speciesEnumName} second ability should be: ${a2} is: ${abilityObj.A2}`).toBe(abilityObj.A2);
      } else {
        expect(!!a2).toBe(sp.ability2 !== sp.ability1);
      }
      if (sp.abilityHidden) {
        abilityObj.H = AbilityId[sp.abilityHidden];
        const pktyCustomHidden = [
          SpeciesId.METAPOD,
          SpeciesId.KAKUNA,
          SpeciesId.PUPITAR,
          SpeciesId.CASCOON,
          SpeciesId.SILCOON,
          SpeciesId.FERROSEED,
          SpeciesId.ETERNAL_FLOETTE,
        ];
        if (!pktyCustomHidden.includes(sp.speciesId)) {
          expect(h, `${speciesEnumName} hidden ability should be: ${h} is: ${abilityObj.H}`).toBe(abilityObj.H);
        }
      } else {
        expect(!!h).toBe(!!sp.abilityHidden);
      }
      if (starterPassiveAbilities[sp.speciesId]) {
        abilityObj.P = AbilityId[starterPassiveAbilities[sp.speciesId]];
      }
      speciesEntry["abilities"] = abilityObj;

      // todo: validate
      if (!(smogonEntry.gender && smogonEntry["gender"] !== "N")) {
        if (smogonEntry.genderRatio) {
          speciesEntry["genderRatio"] = smogonEntry.genderRatio;
        } else {
          speciesEntry["genderRatio"] = { M: 0.5, F: 0.5 };
        }
      }

      speciesEntry["weight"] = smogonEntry.weightkg;
      expect(
        speciesEntry["weight"],
        `${speciesEnumName} weight should be: ${speciesEntry["weight"]} is: ${sp.weight}`,
      ).toBe(sp.weight);
      speciesEntry["height"] = smogonEntry.heightm;
      expect(
        speciesEntry["height"],
        `${speciesEnumName} height should be: ${speciesEntry["height"]} is: ${sp.height}`,
      ).toBe(sp.height);

      // todo: validate
      if (smogonEntry["prevo"]) {
        const prevoName = smogonEntry.prevo
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .toLowerCase();
        const prevoNameCondensed = prevoName.replace(/[^\w\d]/g, "");
        if (prevoName !== prevoNameCondensed) {
          // console.error("special name found:", prevoName, prevoNameCondensed);
        }
        const preevoId = Pokedex[prevoNameCondensed].num;
        const prevoRegional = SpeciesId[preevoId + 2000 * region];
        if (speciesEnumName === "ETERNAL_FLOETTE" || speciesEnumName === "BLOODMOON_URSALUNA") {
          // do nothing
        } else if (region && !isNil(prevoRegional)) {
          speciesEntry["prevo"] = prevoRegional;
        } else {
          speciesEntry["prevo"] = SpeciesId[preevoId];
        }
      }

      // todo: validate
      const smogonEvos = smogonEntry["evos"];
      if (smogonEvos) {
        const evoList: string[] = [];
        for (const x of smogonEvos) {
          const id = x.toLowerCase().replace(/-/g, "");
          const dexEntry = Pokedex[id];
          if (dexEntry) {
            const evoId = dexEntry.num;
            if (region) {
              switch (speciesEntry["id"]) {
                case "ETERNAL_FLOETTE":
                  break;
                case "GALAR_MEOWTH":
                  evoList.push(SpeciesId[SpeciesId.PERRSERKER]);
                  break;
                case "GALAR_YAMASK":
                  evoList.push(SpeciesId[SpeciesId.RUNERIGUS]);
                  break;
                case "HISUI_SNEASEL":
                  evoList.push(SpeciesId[SpeciesId.SNEASLER]);
                  break;
                case "PALDEA_WOOPER":
                  evoList.push(SpeciesId[SpeciesId.CLODSIRE]);
                  break;
                default: {
                  const evoRegion = SpeciesId[evoId + 2000 * region];
                  if (!isNil(evoRegion)) {
                    evoList.push(evoRegion);
                  } else {
                    const evoBase = SpeciesId[evoId];
                    if (!isNil(evoBase)) {
                      evoList.push(evoBase);
                    } else {
                      evoList.push("Could not get evo for" + speciesEnumName);
                    }
                  }
                  break;
                }
              }
            } else {
              evoList.push(SpeciesId[evoId]);
            }
          }
        }
        if (evoList.length > 0) {
          speciesEntry["evos"] = evoList;
        }
      }
      speciesEntry["color"] = smogonEntry.color?.toUpperCase();
      speciesEntry["shape"] = PokemonShapes[pokeapiEntry["shape_id"]];

      const pktyCatchRateExceptions = [
        SpeciesId.BELDUM,
        SpeciesId.METANG,
        SpeciesId.METAGROSS,
        SpeciesId.WALKING_WAKE,
        SpeciesId.IRON_LEAVES,
        SpeciesId.TERAPAGOS,
      ];
      if (!pktyCatchRateExceptions.includes(sp.speciesId)) {
        expect(
          sp.catchRate,
          `${speciesEnumName} catch rate should be: ${pokeapiEntry["capture_rate"]} is: ${sp.catchRate}`,
        ).toBe(pokeapiEntry["capture_rate"]);
      }
      speciesEntry["captureRate"] = sp.catchRate; // pokeapiEntry["capture_rate"];

      const pokeapiFriendshipValueErrors = [
        SpeciesId.PICHU,
        SpeciesId.WYRDEER,
        SpeciesId.KLEAVOR,
        SpeciesId.URSALUNA,
        SpeciesId.BASCULEGION,
        SpeciesId.SNEASLER,
        SpeciesId.OVERQWIL,
        SpeciesId.ENAMORUS,
        SpeciesId.BLOODMOON_URSALUNA,
        SpeciesId.DIPPLIN,
        SpeciesId.POLTCHAGEIST,
        SpeciesId.SINISTCHA,
        SpeciesId.OGERPON,
      ];
      if (!pokeapiFriendshipValueErrors.includes(sp.speciesId)) {
        expect(
          sp.baseFriendship,
          `${speciesEnumName} base friendship should be: ${pokeapiEntry["base_happiness"]} is: ${sp.baseFriendship}`,
        ).toBe(pokeapiEntry["base_happiness"]);
      }
      speciesEntry["baseFriendship"] = sp.baseFriendship; // pokeapiEntry["base_happiness"];

      // pokeapi dipplin value is incorrect
      if (sp.speciesId !== SpeciesId.DIPPLIN) {
        expect(sp.growthRate).toBe(GrowthRateMap[pokeapiEntry["growth_rate_id"]]);
      }
      speciesEntry["growthRate"] = GrowthRate[sp.growthRate];

      speciesEntry["speciesGroup"] = SpeciesGroups[sp.group];

      speciesEntry["hasGenderDiff"] = sp.genderDiffs;

      // todo
      if (sp.canChangeForm) {
        speciesEntries["forms"] = [];
      }

      speciesEntries.push(speciesEntry);
    }

    writeFileSync(`./test/data/pokemon_species_0${gen}.json`, JSON.stringify(speciesEntries));
    // retrieveMegaPokemon(showdownEntries.filter((x) => x[1]["forme"] && x[1]["forme"] === "Mega"));
  });

  // function processAbilities(abilityObj: SpeciesAbilities, smogonData: SpeciesAbility, speciesId: number) {
  //   abilityObj.A1 = smogonData["0"].toUpperCase().replace(/[- ]/g, "_").replace(/'/g, "");
  //   if ("1" in smogonData) {
  //     abilityObj.A2 = smogonData["1"]!.toUpperCase().replace(/[- ]/g, "_").replace(/'/g, "");
  //   }
  //   if ("H" in smogonData) {
  //     abilityObj.H = smogonData["H"]!.toUpperCase().replace(" ", "_");
  //   }
  //   if (starterPassiveAbilities[speciesId]) {
  //     abilityObj.P = AbilityId[starterPassiveAbilities[speciesId]];
  //   }
  // }

  // function retrieveMegaPokemon(megaList) {
  //   const printList: any[] = [];
  //   megaList.forEach((x) => {
  //     const megaEntry = x[1];
  //     const printOut = {};
  //     printOut["formCategory"] = FormCategory[FormCategory["MEGA"]];
  //     printOut["types"] = megaEntry["types"];
  //     printOut["baseStats"] = megaEntry["baseStats"];
  //     const ability = { A1: megaEntry["abilities"]["0"].toUpperCase().replace(" ", "_") };
  //     printOut["abilities"] = ability;
  //     printOut["height"] = megaEntry["heightm"];
  //     printOut["weight"] = megaEntry["weightkg"];
  //     printList.push(printOut);
  //   });
  //   writeFileSync("./test/data/megaPokemon.json", JSON.stringify(printList));
  // }
});

function setRegionMatch(region: PokemonRegion, regionMatch: boolean, forme: string | undefined): boolean {
  switch (region) {
    case PokemonRegion.NORMAL:
      return regionMatch;
    case PokemonRegion.ALOLA:
      return forme === "Alola";
    case PokemonRegion.GALAR:
      return forme === "Galar";
    case PokemonRegion.HISUI:
      return forme === "Hisui";
    case PokemonRegion.PALDEA:
      return forme === "Paldea";
  }
}
