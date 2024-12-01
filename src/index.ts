export * from "./scheme-override.js";
import {
  Blend,
  type DynamicScheme,
  Hct,
  hexFromArgb,
} from "@material/material-color-utilities";
import fnv1a from "./fnv1a.js";
import type { SchemeConstructor } from "./scheme-override.js";
import { buildScheme } from "./scheme-override.js";

/**
 * Given a seed of randomly generated bites, allow consuming bits as needed
 * Note: this only works up to the 32 bits
 */
function consumableRandomness(seed: number): {
  consume: (val: number) => number;
} {
  let remainingRandomness = seed >>> 0; // Convert to unsigned 32-bit integer
  return {
    consume: (val: number) => {
      const result = remainingRandomness % val;

      const bitsConsumed = Math.ceil(Math.log2(val));
      remainingRandomness = remainingRandomness >>> bitsConsumed; // Use unsigned right shift

      return result;
    },
  };
}

/**
 * Generates a color deterministically based on the seed provided
 */
export function colorFromSeed(seed: number): Hct {
  const randomness = consumableRandomness(seed);

  const hue = randomness.consume(360);

  // pick a tone that guarantees chroma >= 48 exists (see justification.md to learn more)
  const tone = 68 + randomness.consume(3);

  // pick a chroma >= 48
  const minChroma = 48;
  const maxChroma = Hct.from(hue, 200, tone).chroma; // pick a chroma that is way too high and see what it gets clamped to
  const range = maxChroma - minChroma;
  const chroma = minChroma + randomness.consume(range);

  return Hct.from(hue, chroma, tone);
}

type HexColor = `#${string}`;

export type FormatType<T> = (namespace: Hct) => T;
export const Format = {
  Hct: (namespace: Hct): Hct => namespace,
  Hex: (namespace: Hct): HexColor => hexFromArgb(namespace.toInt()) as HexColor,
  Chalk:
    (chalk: typeof import("chalk").default) =>
    (namespace: Hct): typeof import("chalk").default =>
      chalk.hex(hexFromArgb(namespace.toInt())),
  Scheme:
    <Args extends any[], Result extends DynamicScheme>(
      scheme: SchemeConstructor<Args, Result>,
    ) =>
    (...args: Args) =>
    (namespace: Hct): Result =>
      buildScheme(scheme, namespace)(...args),
  Custom:
    <T>(fn: (namespace: Hct) => T) =>
    (namespace: Hct): T =>
      fn(namespace),
};

type NamespaceResult = {
  formatAs: <T>(format: FormatType<T>) => T;
  subMaterial: (namespace: string) => NamespaceResult;
};

const hctCache: Record<string, Hct> = {};
function getHct(namespace: string, cache: boolean): Hct {
  if (cache && namespace in hctCache) {
    return hctCache[namespace];
  }
  const color = colorFromSeed(Number(fnv1a(namespace, { size: 32 })));
  if (cache) {
    hctCache[namespace] = color;
  }
  return color;
}

export type MaterialOptions = {
  cache?: boolean;
};

/**
 * Creates a material for the given namespaces
 *
 * @param namespace a single namespace, or a hierarchy of namespaces (ex: `["parent", "child"]`)
 * @param options options used to construct the material
 * @returns a new material
 */
export function createMaterial(
  namespace: string | string[] | [Hct, string],
  options: MaterialOptions = {},
): NamespaceResult {
  const cache = options.cache ?? true;
  const color = (() => {
    if (typeof namespace === "string") {
      return getHct(namespace, cache);
    }
    const allColors = namespace.map((color) => {
      if (typeof color === "string") return getHct(color, cache).toInt();
      return color.toInt();
    });

    let finalColor = allColors[allColors.length - 1];
    for (let i = allColors.length - 2; i >= 0; i--) {
      // shift the color towards the parent
      finalColor = Blend.harmonize(finalColor, allColors[i]);
    }
    return Hct.fromInt(finalColor);
  })();
  return {
    formatAs: <T>(format: FormatType<T>) => format(color),
    subMaterial: (subNamespace: string) =>
      createMaterial([color, subNamespace], options),
  } as NamespaceResult;
}
