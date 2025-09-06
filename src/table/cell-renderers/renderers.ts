import { MdString, RenderableValue, SimpleComponentDef } from '@dynamicforms/vue-forms';

import { CellOptions, CellOptionsInternal, CellRendererTransformer, RowValue } from './interfaces';
import { float, floatGridColumnCreate, floatGridDestroy, int, IntOptions } from './numbers';
import { checkbox, color, date, DateTimeOptions, email, ip, ip4, ip6, link } from './simple-renderers';

const s = (vHtml: string): SimpleComponentDef => ({
  componentName: 'div',
  componentVHtml: vHtml,
});

function rv(value: string): RenderableValue {
  return new RenderableValue(s(value));
}

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
  plain: (value: any) => rv(value),
  md: (value: any) => new RenderableValue(new MdString(value)),
  color: (value: any) => rv(color(value)),
  checkbox: (value: any) => rv(checkbox(value)),
  link: (value: any) => rv(link(value)),
  email: (value: any) => rv(email(value)),
  file: (value: any) => new RenderableValue(file(value)),
  ip4: (value: any) => rv(ip4(value)),
  ip6: (value: any) => rv(ip6(value)),
  ip: (value: any) => rv(ip(value)),
  date: (value: any, _: RowValue, options: CellOptionsInternal<DateTimeOptions>) => rv(date(value, 'P', options)),
  time: (value: any, _: RowValue, options: CellOptionsInternal<DateTimeOptions>) => rv(date(value, 'p', options)),
  datetime: (value: any, _: RowValue, options: CellOptionsInternal<DateTimeOptions>) => rv(date(value, 'P p', options)),
  int: (value: any, _: RowValue, options: CellOptionsInternal<IntOptions>) => rv(int(value, options)),
  float: (value: any, _: RowValue, options: CellOptionsInternal<IntOptions>) => rv(float(value, options)),
  decimal: (value: any, _: RowValue, options: CellOptionsInternal<IntOptions>) => rv(float(value, options)),
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
