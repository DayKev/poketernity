import { differentFileFn } from "#utils/anim-utils";

// testing `noFloatingPromises` in Biome 2.5.8+

function sameFileFn(): Promise<void> {
  return new Promise((resolve) => {
    resolve();
  });
}
export function testA(): void {
  const localFn = () => {};

  // both emit diagnostics as expected
  differentFileFn().then(() => localFn());
  sameFileFn().then(() => localFn());
}
