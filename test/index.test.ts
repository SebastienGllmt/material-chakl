import { expect, test } from 'vitest'
import { createMaterial, Format, sourceAsPrimary } from '../src/index.js'
import { hexFromArgb, SchemeVibrant } from '@material/material-color-utilities';
import chalk from 'chalk';

test('Format.Hex', () => {
  const namespace = createMaterial('foo').formatAs(Format.Hex);
  expect(namespace).toBe('#bc99fd')
})

test('Format.Hct', () => {
  const namespace = createMaterial('foo').formatAs(Format.Hct);
  expect(namespace.toInt()).toBe(0xffbc99fd)
})

test('Format.Scheme', () => {
  const SchemeVibrantNamespace = Format.Scheme(sourceAsPrimary(SchemeVibrant))(true, 0)
  const namespace = createMaterial('foo').formatAs(SchemeVibrantNamespace);

  expect(hexFromArgb(namespace.primaryPaletteKeyColor)).toBe('#bc99fd');
  expect(hexFromArgb(namespace.secondaryPaletteKeyColor)).toBe('#856f92');
  expect(hexFromArgb(namespace.tertiaryPaletteKeyColor)).toBe('#936995');
  expect(hexFromArgb(namespace.neutralPaletteKeyColor)).toBe('#7b7582');
  expect(hexFromArgb(namespace.neutralVariantPaletteKeyColor)).toBe('#7b7484')
})

test('Format.Custom', () => {
  const namespace = createMaterial('foo').formatAs(Format.Custom((namespace) => namespace.toInt()));
  expect(namespace).toBe(0xffbc99fd)
})

test('Format.Chalk', () => {
  const materialChalk = createMaterial('foo').formatAs(Format.Chalk(chalk));
  expect(materialChalk('hello, world')).toBe("hello, world") // vitest drops formatting
})

test('subMaterial', () => {
  const rootMaterial = createMaterial('foo');
  const namespace = rootMaterial.subMaterial('bar');

  const num = namespace.formatAs(Format.Hct).toInt()
  expect(num).toBe(0xff65abff);

  // make sure the array notation gives us the same result
  const num2 = createMaterial(['foo', 'bar']).formatAs(Format.Hct).toInt();
  expect(num2).toBe(num);
})
