import { SchemeVibrant, hexFromArgb } from "@material/material-color-utilities";
import chalk from "chalk";
import { expect, test } from "vitest";
import {
  Format,
  createMaterial,
  matchColor,
  registerBrand,
  sourceAsPrimary,
} from "../src/index.js";

test("Format.Hex", () => {
  const namespace = createMaterial("foo").formatAs(Format.Hex);
  expect(namespace).toBe("#1db7d6");
});

test("Format.Hct", () => {
  const namespace = createMaterial("foo").formatAs(Format.Hct);
  expect(namespace.toInt()).toBe(0xff1db7d6);
});

test("Format.Scheme", () => {
  const SchemeVibrantNamespace = Format.Scheme(sourceAsPrimary(SchemeVibrant))(
    true,
    0,
  );
  const namespace = createMaterial("foo").formatAs(SchemeVibrantNamespace);

  expect(hexFromArgb(namespace.primaryPaletteKeyColor)).toBe("#1db7d6");
  expect(hexFromArgb(namespace.secondaryPaletteKeyColor)).toBe("#5a7b90");
  expect(hexFromArgb(namespace.tertiaryPaletteKeyColor)).toBe("#577aa2");
  expect(hexFromArgb(namespace.neutralPaletteKeyColor)).toBe("#6d797d");
  expect(hexFromArgb(namespace.neutralVariantPaletteKeyColor)).toBe("#6a7a7f");
});

test("Format.Custom", () => {
  const namespace = createMaterial("foo").formatAs(
    Format.Custom((namespace) => namespace.toInt().toString(16)),
  );
  expect(namespace).toBe("ff1db7d6");
});

test("Format.Chalk", () => {
  const materialChalk = createMaterial("foo").formatAs(Format.Chalk(chalk));
  expect(materialChalk("hello, world")).toBe("hello, world"); // vitest drops formatting
});

test("subMaterial", () => {
  const rootMaterial = createMaterial("foo");
  const namespace = rootMaterial.subMaterial("bar");

  const num = namespace.formatAs(Format.Hct).toInt().toString(16);
  expect(num).toBe("ff00c354");

  // make sure the array notation gives us the same result
  const num2 = createMaterial(["foo", "bar"])
    .formatAs(Format.Hct)
    .toInt()
    .toString(16);
  expect(num2).toBe(num);
});

test("registerBrand", () => {
  const baseColor = "#ff0000";
  const color = matchColor(baseColor);
  registerBrand("registerBrandTest", color.formatAs(Format.Hct));

  const namespace = createMaterial("registerBrandTest").formatAs(Format.Hct);
  expect(namespace.toInt()).toBe(color.formatAs(Format.Hct).toInt());
});
