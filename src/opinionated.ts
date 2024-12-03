/**
 * File for opinionated ways to format common cases
 */

import { argbFromHex, Hct } from "@material/material-color-utilities";
import {
  TONE_RANGE,
  createMaterial,
  Format,
  type NamespaceResult,
  colorToNamespace,
} from "./core.js";

export function chainedMessage(
  chalk: typeof import("chalk").default,
  namespace: string | string[],
  ...s: unknown[]
): string {
  const header: string[] = [];

  const chalkFormat = Format.Chalk(chalk);
  if (typeof namespace === "string") {
    const fullNamespace = createMaterial(namespace).formatAs(chalkFormat);
    return `${fullNamespace.inverse(namespace)}: ${fullNamespace(...s)}`;
  }
  for (let i = 0; i < namespace.length; i++) {
    const currStep = createMaterial(namespace[i]);
    const mix =
      i + 1 < namespace.length ? currStep.subMaterial(namespace[i + 1]) : null;

    const baseChalk = currStep.formatAs(chalkFormat);
    header.push(
      i === namespace.length - 1 || i === 0
        ? baseChalk.inverse(namespace[i])
        : baseChalk(namespace[i]),
    );
    if (mix != null) {
      header.push(mix.formatAs(chalkFormat)("-"));
    }
  }
  const fullNamespace = createMaterial(namespace).formatAs(chalkFormat);
  return `${header.join("")}: ${fullNamespace(...s)}`;
}

export function matchColor(color: Hct | string): NamespaceResult {
  const desiredColor = (() => {
    const desiredColor =
      typeof color === "string" ? Hct.fromInt(argbFromHex(color)) : color;
    if (desiredColor.tone < TONE_RANGE.Min) {
      return Hct.from(desiredColor.hue, desiredColor.chroma, TONE_RANGE.Min);
    }
    if (desiredColor.tone > TONE_RANGE.Max) {
      return Hct.from(desiredColor.hue, desiredColor.chroma, TONE_RANGE.Max);
    }
    return desiredColor;
  })();
  return colorToNamespace(desiredColor);
}
