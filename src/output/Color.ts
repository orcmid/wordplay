import type Decimal from 'decimal.js';
import toStructure from '../native/toStructure';
import type Value from '@runtime/Value';
import Output from './Output';
import { toDecimal } from './Verse';
import ColorJS from 'colorjs.io';
import { TYPE_SYMBOL } from '@parser/Symbols';
import { getBind } from '@translation/getBind';
import Evaluate from '../nodes/Evaluate';
import MeasurementLiteral from '../nodes/MeasurementLiteral';
import Reference from '../nodes/Reference';
import type LanguageCode from '../translation/LanguageCode';
import Unit from '../nodes/Unit';

export const ColorType = toStructure(`
    ${getBind((t) => t.output.color.definition, TYPE_SYMBOL)}(
        ${getBind((t) => t.output.color.lightness)}•%
        ${getBind((t) => t.output.color.chroma)}•#
        ${getBind((t) => t.output.color.hue)}•#°
    )
`);

export default class Color extends Output {
    readonly lightness: Decimal;
    readonly chroma: Decimal;
    readonly hue: Decimal;

    constructor(value: Value, l: Decimal, c: Decimal, h: Decimal) {
        super(value);

        this.lightness = l;
        this.chroma = c;
        this.hue = h;
    }

    toCSS() {
        return new ColorJS(
            ColorJS.spaces.lch,
            [
                this.lightness.toNumber() * 100,
                this.chroma.toNumber(),
                this.hue.toNumber(),
            ],
            1
        )
            .to('srgb')
            .toString();
    }

    equals(color: Color) {
        return (
            this.lightness.equals(color.lightness) &&
            this.chroma.equals(color.chroma) &&
            this.hue.equals(color.hue)
        );
    }
}

export function createColorLiteral(
    languages: LanguageCode[],
    lightness: number,
    chroma: number,
    hue: number
) {
    return Evaluate.make(
        Reference.make(ColorType.names.getTranslation(languages), ColorType),
        [
            MeasurementLiteral.make(lightness),
            MeasurementLiteral.make(chroma),
            MeasurementLiteral.make(hue, Unit.make(['°'])),
        ]
    );
}

export function toColor(value: Value | undefined) {
    if (value === undefined) return undefined;

    const l = toDecimal(value.resolve('lightness'));
    const c = toDecimal(value.resolve('chroma'));
    const h = toDecimal(value.resolve('hue'));

    return l && c && h ? new Color(value, l, c, h) : undefined;
}
