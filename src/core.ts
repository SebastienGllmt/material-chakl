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
  consume: (val: number, precision: number) => number;
} {
  let remainingRandomness = seed >>> 0; // Convert to unsigned 32-bit integer
  return {
    consume: (val, precision) => {
      const bits = Math.ceil(Math.log2(val));
      // take `bits` for the whole number part, plus `precision` extra bits for the floating point parts
      const mask = (1 << (bits + precision)) - 1;
      // take a number within the bit range
      const result = remainingRandomness % mask;
      // note: `result` is a number from [0, 2^bits]
      //       so we need to rescale it to [0, val]
      //       do this by dividing by mask (becomes a [0,1] range)
      //       then multiply by val
      //       DANGER: multiply first before dividing to avoid precision loss!
      //               we have up to Number.MAX_SAFE_INTEGER, so multiplication won't lead to precision loss
      //               but division can, so we leave it to last
      const final = (result * val) / mask;
      remainingRandomness = remainingRandomness >>> (bits + precision); // Use unsigned right shift
      return final;
    },
  };
}

export const TONE_RANGE = {
  Min: 68,
  Max: 70,
};

/**
 * Generates a color deterministically based on the seed provided
 */
export function colorFromSeed(seed: number): Hct {
  // note: sum of `bits` in this function adds up to exactly 32
  const randomness = consumableRandomness(seed);
  const hue = randomness.consume(
    360, // 9 bits
    5, // 5 bits
  );
  // pick a tone that guarantees chroma >= 48 exists (see justification.md to learn more)
  const tone =
    TONE_RANGE.Min +
    randomness.consume(
      TONE_RANGE.Max - TONE_RANGE.Min, // 2 bits
      5, // 5 bits
    );
  // pick a chroma >= 48
  const minChroma = 48;
  const maxChroma = Hct.from(hue, 200, tone).chroma; // pick a chroma that is way too high and see what it gets clamped to
  const range = maxChroma - minChroma;
  const chroma =
    minChroma +
    randomness.consume(
      range, // at most 6 bits on the tone interval we care about (could be up to 8 bits otherwise)
      5, // 5 bit
    );
  return Hct.from(hue, chroma, tone);
}

type HexColor = `#${string}`;

/**
 * Generic function to format a namespace into a resulting type
 */
export type FormatType<T> = (namespace: Hct) => T;

/**
 * Static type representing all the different formatters supported by material-chalk
 */
export const Format = {
  /**
   * Format as a HCT <Hue, Chroma, Tone> tuple used by Material Design
   */
  Hct: (namespace: Hct): Hct => namespace,
  /**
   * Format as a color hex code (ex. #ff0000 for red). Output is always lowercase
   */
  Hex: (namespace: Hct): HexColor => hexFromArgb(namespace.toInt()) as HexColor,
  /**
   * Decorates a given `chalk` object with the color of this material
   */
  Chalk:
    (chalk: typeof import("chalk").default) =>
    (namespace: Hct): typeof import("chalk").default =>
      chalk.hex(hexFromArgb(namespace.toInt())),
  /**
   * Use the material as the source color for a Material Design scheme
   */
  Scheme:
    <Args extends any[], Result extends DynamicScheme>(
      scheme: SchemeConstructor<Args, Result>,
    ) =>
    (...args: Args) =>
    (namespace: Hct): Result =>
      buildScheme(scheme, namespace)(...args),
  /**
   * Custom formatter if none of the existing ones satisfy a use-case
   */
  Custom:
    <T>(fn: (namespace: Hct) => T) =>
    (namespace: Hct): T =>
      fn(namespace),
};

/**
 * Utility functions to working with a namespace
 */
export type NamespaceResult = {
  formatAs: <T>(format: FormatType<T>) => T;
  subMaterial: (namespace: string) => NamespaceResult;
};

const hctCache: Record<string, Hct> = {};
function getHct(namespace: string, cache: boolean): Hct {
  // always look at the cache content
  // so that `registerBrand` always resolves properly
  if (namespace in hctCache) {
    return hctCache[namespace];
  }
  const color = colorFromSeed(Number(fnv1a(namespace, { size: 32 })));
  if (cache) {
    hctCache[namespace] = color;
  }
  return color;
}

/**
 * Force a specific color to be used for a namespace.
 * This is useful if you need to force a brand color for a namespace
 *
 * This will cause the specified color to be used even deep inside `createMaterial` calls
 *
 * Careful: this is change is global, so if you use this in a library,
 *          only use it for namespaces that are unlikely to be used by downstream users
 * @param namespace - the namespace to override
 * @param color - the color to use (see `matchColor` on how to generate this color easily)
 */
export function registerBrand(namespace: string, color: Hct) {
  hctCache[namespace] = color;
}

/**
 * Options used when generating a material for a namespace
 */
export type MaterialOptions = {
  /**
   * Cache the HCT color generated for a given namespace
   */
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
  return colorToNamespace(color, options);
}

/**
 * Wrap a color with some utility functions to make it easier to work with. See `NamespaceResult`
 */
export function colorToNamespace(
  color: Hct,
  options: MaterialOptions = {},
): NamespaceResult {
  return {
    formatAs: <T>(format: FormatType<T>) => format(color),
    subMaterial: (subNamespace: string) =>
      createMaterial([color, subNamespace], options),
  } as NamespaceResult;
}
