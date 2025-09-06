import { isNumber, isPlainObject } from 'lodash-es';

import { CellOptions, CellOptionsInternal } from './interfaces';
import { columnIdOption } from './internal-exports';

export interface LocaleWithOptions {
  locale?: string;
  localeOptions?: Intl.NumberFormatOptions;
}

type RLocaleWithOptions = Required<LocaleWithOptions>;

const defaultLocaleOptions: Intl.NumberFormatOptions = { useGrouping: false };

function isLocaleWithOptions(obj: any): obj is LocaleWithOptions {
  return isPlainObject(obj) && ('locale' in obj);
}

class Measurement {
  protected formatter: Intl.NumberFormat;

  public maxWhole: number = 0;

  public maxDecimals: number = 0;

  protected decimalSeparator: string;

  protected thousandsSeparator: string;

  constructor(protected locale: RLocaleWithOptions) {
    this.formatter = new Intl.NumberFormat(locale.locale, locale.localeOptions);

    const parts = this.formatter.formatToParts(1234.56);
    this.thousandsSeparator = parts.find((p) => p.type === 'group')?.value || '';
    this.decimalSeparator = parts.find((p) => p.type === 'decimal')?.value || '.';
  }

  recreateFormatter() {
    this.locale.localeOptions.minimumIntegerDigits = this.maxWhole;
    this.locale.localeOptions.minimumFractionDigits = this.maxDecimals;
    this.formatter = new Intl.NumberFormat(this.locale.locale, this.locale.localeOptions);
  }

  format(value: number) {
    return this.formatter.format(value);
  }

  getInteger(value: string) {
    return value.split(this.decimalSeparator)[0];
  }

  getFraction(value: string) {
    const s = value.split(this.decimalSeparator);
    return s.length > 1 ? s[1] : '';
  }
}

const measurements: Record<symbol, Measurement> = {};
const gridColumns: Record<symbol, symbol[]> = {};

export interface IntOptions extends CellOptions {
  /**
   * selected user locale for formatting the numbers. if not provided, default browser locale will be used
   */
  locale?: string | LocaleWithOptions;
  /**
   * pad the whole part of the number to specified number of characters. default 0. 'auto' will dynamically pad to
   * longest value encountered within the grid
   */
  padToLength?: number | 'auto';
}

export const float = (value: number | string, options: CellOptionsInternal<IntOptions>): string => {
  const msr = measurements[options[columnIdOption]];
  const v = Number.isNaN(Number.parseFloat(<string>value)) ? String(value) : msr.format(<number>value);

  const wholeLen = msr.getInteger(v).length;
  if (wholeLen > msr.maxWhole && options.padToLength === 'auto') {
    msr.maxWhole = wholeLen;
    msr.recreateFormatter();
    options.redrawColumn();
  }
  const fractionLen = msr.getFraction(v).length;
  if (fractionLen > msr.maxDecimals && options.padToLength === 'auto') {
    msr.maxDecimals = fractionLen;
    msr.recreateFormatter();
    options.redrawColumn();
  }

  const result = v
    .replace(/^(0+)(?=\d)/, (match: any) => `<span style="opacity: .5">${match}</span>`)
    .replace(/\D\d*?(0+)$/, (match, zeros) => match.replace(zeros, `<span style="opacity: .5">${zeros}</span>`));
  return `<span>${result}</span>`;
};

export const int = (value: number | string, options: CellOptionsInternal<IntOptions>): string => {
  const msr = measurements[options[columnIdOption]];
  const res = float(value, options);
  let fractionLen = msr.getFraction(res).length;
  if (fractionLen) fractionLen++; // include the decimal separator
  return res.substring(0, res.length - fractionLen);
};

export function floatGridColumnCreate(gridId: symbol, options: CellOptionsInternal<IntOptions>) {
  const locale: RLocaleWithOptions = (
    isLocaleWithOptions(options.locale) ?
      { locale: options.locale.locale, localeOptions: options.locale.localeOptions ?? { ...defaultLocaleOptions } } :
      { locale: options.locale, localeOptions: { ...defaultLocaleOptions } }
  ) as RLocaleWithOptions;
  if (isNumber(options.padToLength)) locale.localeOptions.minimumIntegerDigits = options.padToLength;
  locale.localeOptions.maximumFractionDigits = locale.localeOptions.maximumFractionDigits ?? 20;
  measurements[options[columnIdOption]] = new Measurement(locale);

  // remember the column so that we may clean up later
  if (!(gridId in gridColumns)) gridColumns[gridId] = [];
  gridColumns[gridId].push(options[columnIdOption]);
}

export function floatGridDestroy(gridId: symbol) {
  gridColumns[gridId]?.forEach((columnId) => delete measurements[columnId]);
}
