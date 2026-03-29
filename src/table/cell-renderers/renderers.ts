import { MdString, RenderableValue, SimpleComponentDef } from '@dynamicforms/vue-forms';

import { header, HeaderOptions } from './header-renderers';
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

const toRv = (val: RenderableValue | string | null): RenderableValue | null => {
  if (val == null) return null;
  if (typeof val === 'string') return new RenderableValue(s(val));
  return val;
};

const wrapWithPrePost = (
  main: RenderableValue,
  value: any,
  rowValue: RowValue,
  options: CellOptionsInternal,
): RenderableValue => {
  if (!options.preRender && !options.postRender) return main;

  const cssClass = (options as any).cssClass as string | undefined;
  const contentClass = cssClass ? `content ${cssClass}` : 'content';
  const preRv = options.preRender ? toRv(options.preRender(value, rowValue)) : null;
  const postRv = options.postRender ? toRv(options.postRender(value, rowValue)) : null;

  const result = new RenderableValue({
    componentName: 'PreContentPost',
    componentProps: { pre: preRv, content: main, post: postRv, contentClass },
  } as SimpleComponentDef);
  result.classes = ['has-pre-post'];
  return result;
};

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
  header: HeaderOptions,
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
  'null-empty': (value, rowValue, options) => wrapWithPrePost(new RenderableValue(''), value, rowValue, options),
  'null-null': (value, rowValue, options) => wrapWithPrePost(
    new RenderableValue({ componentName: 'div', componentVHtml: 'null', componentProps: { class: 'df-cell-null' } }),
    value,
    rowValue,
    options,
  ),
  plain: (value: any, rowValue: RowValue, options: CellOptionsInternal) => (
    wrapWithPrePost(rv(t(value, rowValue, options)), value, rowValue, options)
  ),
  header: (value: any, rowValue: RowValue, options: CellOptionsInternal<HeaderOptions>) => (
    wrapWithPrePost(header(value, rowValue, options), value, rowValue, options)
  ),
  md: (value: any, rowValue: RowValue, options: CellOptionsInternal) => (
    wrapWithPrePost(new RenderableValue(new MdString(t(value, rowValue, options))), value, rowValue, options)
  ),
  color: (value: any, rowValue: RowValue, options: CellOptionsInternal) => (
    wrapWithPrePost(rv(color(t(value, rowValue, options))), value, rowValue, options)
  ),
  checkbox: (value: any, rowValue: RowValue, options: CellOptionsInternal) => (
    wrapWithPrePost(rv(checkbox(t(value, rowValue, options))), value, rowValue, options)
  ),
  link: (value: any, rowValue: RowValue, options: CellOptionsInternal) => (
    wrapWithPrePost(rv(link(t(value, rowValue, options))), value, rowValue, options)
  ),
  email: (value: any, rowValue: RowValue, options: CellOptionsInternal) => (
    wrapWithPrePost(rv(email(t(value, rowValue, options))), value, rowValue, options)
  ),
  file: (value: any, rowValue: RowValue, options: CellOptionsInternal) => (
    wrapWithPrePost(new RenderableValue(file(t(value, rowValue, options))), value, rowValue, options)
  ),
  ip4: (value: any, rowValue: RowValue, options: CellOptionsInternal) => (
    wrapWithPrePost(rv(ip4(t(value, rowValue, options))), value, rowValue, options)
  ),
  ip6: (value: any, rowValue: RowValue, options: CellOptionsInternal) => (
    wrapWithPrePost(rv(ip6(t(value, rowValue, options))), value, rowValue, options)
  ),
  ip: (value: any, rowValue: RowValue, options: CellOptionsInternal) => (
    wrapWithPrePost(rv(ip(t(value, rowValue, options))), value, rowValue, options)
  ),
  date: (value: any, rowValue: RowValue, options: CellOptionsInternal<DateTimeOptions>) => (
    wrapWithPrePost(rv(date(t(value, rowValue, options), 'P', options)), value, rowValue, options)
  ),
  time: (value: any, rowValue: RowValue, options: CellOptionsInternal<DateTimeOptions>) => (
    wrapWithPrePost(rv(date(t(value, rowValue, options), 'p', options)), value, rowValue, options)
  ),
  datetime: (value: any, rowValue: RowValue, options: CellOptionsInternal<DateTimeOptions>) => (
    wrapWithPrePost(rv(date(t(value, rowValue, options), 'P p', options)), value, rowValue, options)
  ),
  int: (value: any, rowValue: RowValue, options: CellOptionsInternal<IntOptions>) => (
    wrapWithPrePost(rv(int(t(value, rowValue, options), options)), value, rowValue, options)
  ),
  float: (value: any, rowValue: RowValue, options: CellOptionsInternal<IntOptions>) => (
    wrapWithPrePost(rv(float(t(value, rowValue, options), options)), value, rowValue, options)
  ),
  decimal: (value: any, rowValue: RowValue, options: CellOptionsInternal<IntOptions>) => (
    wrapWithPrePost(rv(float(t(value, rowValue, options), options)), value, rowValue, options)
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
