import { MdString, RenderableValue, SimpleComponentDef } from '@dynamicforms/vue-forms';

import { CellOptionsInternal, CellRendererTransformer, RowValue } from './interfaces';
import { float, floatGridColumnCreate, floatGridDestroy, int } from './numbers';
import { checkbox, color, date, email, ip, ip4, ip6, link } from './simple-renderers';

const s = (vHtml: string): SimpleComponentDef => ({
  componentName: 'span',
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

export const DefaultRenderers: Record<string, CellRendererTransformer> = {
  plain: (value: any) => new RenderableValue(value),
  md: (value: any) => new RenderableValue(new MdString(value)),
  color: (value: any) => rv(color(value)),
  checkbox: (value: any) => rv(checkbox(value)),
  link: (value: any) => rv(link(value)),
  email: (value: any) => rv(email(value)),
  file: (value: any) => new RenderableValue(file(value)),
  ip4: (value: any) => rv(ip4(value)),
  ip6: (value: any) => rv(ip6(value)),
  ip: (value: any) => rv(ip(value)),
  date: (value: any, _: RowValue, options: CellOptionsInternal) => rv(date(value, 'P', options)),
  time: (value: any, _: RowValue, options: CellOptionsInternal) => rv(date(value, 'p', options)),
  datetime: (value: any, _: RowValue, options: CellOptionsInternal) => rv(date(value, 'P p', options)),
  int: (value: any, _: RowValue, options: CellOptionsInternal) => rv(int(value, options)),
  float: (value: any, _: RowValue, options: CellOptionsInternal) => rv(float(value, options)),
  decimal: (value: any, _: RowValue, options: CellOptionsInternal) => rv(float(value, options)),
};

export const setCellRenderer = (dataType: string, transform: CellRendererTransformer) => {
  DefaultRenderers[dataType] = transform;
};

export const getCellRenderers = () => ({ ...DefaultRenderers });

export const gridColumnCreate = (gridId: symbol, columnOptions: CellOptionsInternal) => {
  floatGridColumnCreate(gridId, columnOptions);
};

export const gridDestroy = (gridId: symbol) => {
  floatGridDestroy(gridId);
};
