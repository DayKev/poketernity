import { allSpecies } from "#data/data-lists";
import { starterPassiveAbilities } from "#data/passives";
import { AbilityId } from "#enums/ability-id";
import { PokemonShapes } from "#enums/pokemon-shapes";
import { SpeciesGroups } from "#enums/pokemon-species-groups";
import { SpeciesId } from "#enums/species-id";
import { Pokedex } from "#test/data/smogon_data";
import { GameManager } from "#test/test-utils/game-manager";
import { isNil } from "#utils/common-utils";
import { readFileSync, writeFileSync } from "node:fs";
import Phaser from "phaser";
import { afterEach, beforeAll, beforeEach, describe, it } from "vitest";

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

type SpeciesEntry = {
  id: string;
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
  forms?;
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
  // From PokeAPI, growth rate, shape, capture rate, base friendship

  it.each([{ gen: 1 }, { gen: 2 }, { gen: 3 }, { gen: 4 }, { gen: 5 }, { gen: 6 }, { gen: 7 }, { gen: 8 }, { gen: 9 }])(
    "write json files: $gen",
    async ({ gen }) => {
      const speciesEntries: SpeciesEntry[] = [];
      const pokeapiEntries = JSON.parse(readFileSync("./test/data/pokeapi_species.json", "utf-8"));
      const showdownEntries = Object.entries(Pokedex);
      const speciesSample = allSpecies.filter((sp) => sp.generation === gen);

      for (const sp of speciesSample) {
        let speciesId = sp.speciesId;
        const speciesEnumName = SpeciesId[speciesId];
        console.log(speciesEnumName);
        const region = sp.getRegion();
        if (region > 0) {
          speciesId = speciesId - 2000 * region;
        }
        const speciesEntry: any = {};
        const filteredEntry = showdownEntries.filter((x) => x[1]["num"] === speciesId && isNil(x[1]["baseSpecies"]));
        if (filteredEntry.length === 0) {
          console.error(
            `------ Missing entry for ${speciesEnumName} (id: ${sp.speciesId}, adjusted id: ${speciesId}, name: ${sp.name})`,
          );
          continue;
        }
        const smogonKey = filteredEntry[0][1].name.toLowerCase();
        const smogonEntry = Pokedex[smogonKey];
        if (smogonEntry) {
          const pokeapiEntry = pokeapiEntries.filter((x) => x["id"] === speciesId)[0];
          speciesEntry["id"] = speciesEnumName;
          speciesEntry["types"] = smogonEntry["types"].map((x) => x.toUpperCase());
          const statsObject: BaseStats = {
            hp: smogonEntry.baseStats.hp,
            atk: smogonEntry.baseStats.atk,
            def: smogonEntry.baseStats.def,
            spa: smogonEntry.baseStats.spa,
            spd: smogonEntry.baseStats.spd,
            spe: smogonEntry.baseStats.spe,
          };
          speciesEntry["baseStats"] = statsObject;
          const abilityObj: SpeciesAbilities = { A1: "" };
          processAbilities(abilityObj, smogonEntry.abilities, speciesId);
          speciesEntry["abilities"] = abilityObj;
          if (!(smogonEntry.gender && smogonEntry["gender"] !== "N")) {
            if (smogonEntry.genderRatio) {
              speciesEntry["genderRatio"] = smogonEntry.genderRatio;
            } else {
              speciesEntry["genderRatio"] = { M: 0.5, F: 0.5 };
            }
          }
          speciesEntry["weight"] = smogonEntry.weightkg;
          speciesEntry["height"] = smogonEntry.heightm;
          if (smogonEntry["prevo"]) {
            try {
              const prevoName = (smogonEntry.prevo as string)
                .normalize("NFD")
                .replace(/\p{Diacritic}/gu, "")
                .toLowerCase();
              const prevoNameCondensed = prevoName.replace(/[-:\s]/g, "");
              if (prevoName !== prevoNameCondensed) {
                console.error("special name found:", prevoName, prevoNameCondensed);
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
            } catch (err) {
              console.log(smogonEntry);
              const prevoName = (smogonEntry.prevo as string)
                .normalize("NFD")
                .replace(/\p{Diacritic}/gu, "")
                .toLowerCase();
              console.log(
                smogonEntry["prevo"],
                "|",
                smogonEntry.prevo,
                "|",
                prevoName,
                "|",
                prevoName.replace(/[-:\s]/g, ""),
              );
              throw new Error(err);
            }
          }
          const smogonEvos: string[] = smogonEntry["evos"];
          if (smogonEvos) {
            const evoList: string[] = [];
            for (const x of smogonEvos) {
              if (speciesEnumName === "PORYGON2") {
                evoList.push("PORYGON_Z");
              }
              const dexEntry = Pokedex[x.toLowerCase()];
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
          speciesEntry["color"] = (smogonEntry.color as string).toUpperCase();
          speciesEntry["shape"] = PokemonShapes[pokeapiEntry["shape_id"]];
          speciesEntry["captureRate"] = pokeapiEntry["capture_rate"];
          speciesEntry["baseFriendship"] = pokeapiEntry["base_happiness"];
          speciesEntry["growthRate"] = GrowthRate_PokeAPI[pokeapiEntry["growth_rate_id"]];
          speciesEntry["speciesGroup"] = SpeciesGroups[sp.group];
          speciesEntry["hasGenderDiff"] = sp.genderDiffs;
          if (sp.canChangeForm) {
            speciesEntries["forms"] = [];
          }
        }
        speciesEntries.push(speciesEntry);
      }

      writeFileSync(`./test/data/pokemon_species_0${gen}.json`, JSON.stringify(speciesEntries));
      // retrieveMegaPokemon(showdownEntries.filter((x) => x[1]["forme"] && x[1]["forme"] === "Mega"));
    },
  );

  function processAbilities(abilityObj: SpeciesAbilities, smogonData, speciesId) {
    abilityObj.A1 = smogonData["0"].toUpperCase().replace(" ", "_");
    if ("1" in smogonData) {
      abilityObj.A2 = smogonData["1"].toUpperCase().replace(" ", "_");
    }
    if ("H" in smogonData) {
      abilityObj.H = smogonData["H"].toUpperCase().replace(" ", "_");
    }
    if (starterPassiveAbilities[speciesId]) {
      abilityObj.P = AbilityId[starterPassiveAbilities[speciesId]];
    }
  }

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
