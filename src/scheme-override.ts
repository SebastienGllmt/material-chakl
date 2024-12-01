import {
  type DynamicScheme,
  type Hct,
  TonalPalette,
} from "@material/material-color-utilities";

type Constructor = new (...args: any[]) => DynamicScheme;

/**
 * Overrides the primaryPalette of the DynamicScheme at constructor-time
 */
export function sourceAsPrimary<T extends Constructor>(baseScheme: T): T {
  class DirectScheme extends baseScheme {
    constructor(...args: any[]) {
      super(...args);
      // cast away "readonly"
      (this.primaryPalette as any) = TonalPalette.fromHct(this.sourceColorHct);
    }
  }
  return DirectScheme;
}
/**
 * Overrides the primaryPalette of the DynamicScheme at runtime
 */
export function overrideSourceAsPrimary<T extends DynamicScheme>(
  dynamicScheme: T,
): T {
  // cast away "readonly"
  (dynamicScheme.primaryPalette as any) = TonalPalette.fromHct(
    dynamicScheme.sourceColorHct,
  );
  return dynamicScheme;
}

export type SchemeConstructor<
  A extends any[],
  Result extends DynamicScheme,
> = new (sourceColorHct: Hct, ...args: A) => Result;
/**
 * Returns a DynamicScheme constructor with the first parameter pre-filled with the constructed color
 */
export function buildScheme<A extends any[], Result extends DynamicScheme>(
  Scheme: SchemeConstructor<A, Result>,
  fixedValue: Hct,
): (...args: A) => Result {
  return (...args: A) => {
    return new Scheme(fixedValue, ...args);
  };
}
