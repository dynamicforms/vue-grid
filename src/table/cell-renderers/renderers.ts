import { MdString, RenderableValue, SimpleComponentDef } from '@dynamicforms/vue-forms';

import { CellOptions, CellOptionsInternal, CellRendererTransformer, RowValue } from './interfaces';
import { float, floatGridColumnCreate, floatGridDestroy, int, IntOptions } from './numbers';
import { checkbox, color, date, DateTimeOptions, email, ip, ip4, ip6, link } from './simple-renderers';

const s = (vHtml: string): SimpleComponentDef => ({
  componentName: 'div',
  componentVHtml: vHtml,
});

const rv = (value: string): RenderableValue => new RenderableValue(s(value));

const t = (value: any, rowValue: RowValue, options: CellOptions) => (
  options?.transform ? options.transform(value, rowValue) : value
);

const file = (value: any): SimpleComponentDef | string => {
  if (value) {
    const func = `(function(e) { 
        e.preventDefault(); 
        e.stopPropagation(); 
        window.open('${value.replace(/\/$/, '')}', '_blank');
      })`.replace(/\s+/g, ' '); // replace to remove excessive whitespace and newlines
    const fileName = value.replace(/^.*[\\/]/, '');
    return s(`<a href="javascript:void(0)" onclick="${func}(event)">${fileName}</a>`);
  }
  return '';
};

export interface RendererOptionsMap {
  'null-empty': CellOptions,
  'null-null': CellOptions,
  plain: CellOptions,
  md: CellOptions,
  color: CellOptions,
  checkbox: CellOptions,
  link: CellOptions,
  email: CellOptions,
  file: CellOptions,
  ip4: CellOptions,
  ip6: CellOptions,
  ip: CellOptions,
  date: DateTimeOptions,
  time: DateTimeOptions,
  datetime: DateTimeOptions,
  int: IntOptions,
  float: IntOptions,
  decimal: IntOptions,
}

export type RenderersMap = {
  [K in keyof RendererOptionsMap]: CellRendererTransformer<RendererOptionsMap[K]>
};

export const DefaultRenderers: RenderersMap = {
  'null-empty': () => new RenderableValue(''),
  'null-null': () => new RenderableValue(
    { componentName: 'div', componentVHtml: 'null', componentProps: { class: 'df-cell-null' } },
  ),
  plain: (value: any, rowValue: RowValue, options: CellOptionsInternal) => rv(t(value, rowValue, options)),
  md: (value: any, rowValue: RowValue, options: CellOptionsInternal) => (
    new RenderableValue(new MdString(t(value, rowValue, options)))
  ),
  color: (value: any, rowValue: RowValue, options: CellOptionsInternal) => rv(color(t(value, rowValue, options))),
  checkbox: (value: any, rowValue: RowValue, options: CellOptionsInternal) => rv(checkbox(t(value, rowValue, options))),
  link: (value: any, rowValue: RowValue, options: CellOptionsInternal) => rv(link(t(value, rowValue, options))),
  email: (value: any, rowValue: RowValue, options: CellOptionsInternal) => rv(email(t(value, rowValue, options))),
  file: (value: any, rowValue: RowValue, options: CellOptionsInternal) => (
    new RenderableValue(file(t(value, rowValue, options)))
  ),
  ip4: (value: any, rowValue: RowValue, options: CellOptionsInternal) => rv(ip4(t(value, rowValue, options))),
  ip6: (value: any, rowValue: RowValue, options: CellOptionsInternal) => rv(ip6(t(value, rowValue, options))),
  ip: (value: any, rowValue: RowValue, options: CellOptionsInternal) => rv(ip(t(value, rowValue, options))),
  date: (value: any, rowValue: RowValue, options: CellOptionsInternal<DateTimeOptions>) => (
    rv(date(t(value, rowValue, options), 'P', options))
  ),
  time: (value: any, rowValue: RowValue, options: CellOptionsInternal<DateTimeOptions>) => (
    rv(date(t(value, rowValue, options), 'p', options))
  ),
  datetime: (value: any, rowValue: RowValue, options: CellOptionsInternal<DateTimeOptions>) => (
    rv(date(t(value, rowValue, options), 'P p', options))
  ),
  int: (value: any, rowValue: RowValue, options: CellOptionsInternal<IntOptions>) => (
    rv(int(t(value, rowValue, options), options))
  ),
  float: (value: any, rowValue: RowValue, options: CellOptionsInternal<IntOptions>) => (
    rv(float(t(value, rowValue, options), options))
  ),
  decimal: (value: any, rowValue: RowValue, options: CellOptionsInternal<IntOptions>) => (
    rv(float(t(value, rowValue, options), options))
  ),
};

export const setCellRenderer = (dataType: keyof RendererOptionsMap, transform: CellRendererTransformer) => {
  DefaultRenderers[dataType] = transform;
};

export const getCellRenderers = () => ({ ...DefaultRenderers });

export function gridColumnCreate<R extends keyof RendererOptionsMap>(
  gridId: symbol,
  dataType: R,
  columnOptions: CellOptionsInternal<RendererOptionsMap[R]>,
): void {
  if (['int', 'float', 'decimal'].includes(dataType)) floatGridColumnCreate(gridId, columnOptions);
}

export const gridDestroy = (gridId: symbol) => {
  floatGridDestroy(gridId);
};
