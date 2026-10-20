/**
 * @file renderers.ts
 *
 * Core cell-renderer registry and built-in transformer functions for df-grid.
 *
 * A cell renderer is a function `(value, rowValue, options) => RenderableValue`.
 * `DefaultRenderers` ships built-in implementations for every supported type:
 *   null-empty, null-null, plain, header, md, color, checkbox, link, email, file,
 *   ip4, ip6, ip, date, time, datetime, int, float, decimal, and the `-fast` variants
 *   null-null-fast, link-fast, email-fast, file-fast.
 *
 * `wrapWithPrePost` wraps a main `RenderableValue` with optional pre/post render values when
 * `preRender`/`postRender` are configured on the options. It is exported so a `ColumnDefinition.renderer`
 * function — see `useFormattedData`, which applies it to a column-level custom renderer's result the
 * same way every built-in renderer already applies it to its own — can be composed the same way outside
 * this file too, e.g. from a `setCellRenderer()` replacement.
 *
 * Runtime customisation:
 *  - `setCellRenderer(type, fn)` — replaces a renderer in `DefaultRenderers`
 *  - `getCellRenderers()` — returns a shallow copy of the current registry
 *
 * Per-column state for numeric renderers:
 *  - `gridColumnCreate(gridId, dataType, options)` — initialises formatting state for
 *    `int`, `float`, and `decimal` columns (delegates to `floatGridColumnCreate`)
 *  - `gridDestroy(gridId)` — tears down all per-column state for a grid instance
 */
import {
  HtmlString,
  isSimpleComponentDef,
  MdString,
  type RenderContentNonCallable,
  RenderableValue,
  SimpleComponentDef,
} from '@dynamicforms/vuetify-inputs';

import { translate } from '../translations';

import { header, HeaderOptions } from './header-renderers';
import { CellOptions, CellOptionsInternal, CellRendererTransformer, RowValue } from './interfaces';
import { float, floatGridColumnCreate, floatGridDestroy, int, IntOptions } from './numbers';
import { anchor, checkbox, color, date, DateTimeOptions, email, ip, ip4, ip6, link } from './simple-renderers';

// HTML a renderer built with every value from the record escaped
const html = (value: string): RenderableValue => new RenderableValue(new HtmlString(value));

// text, an element or a component: Vue escapes what it puts into the page
const content = (value: RenderContentNonCallable): RenderableValue => new RenderableValue(value);

const text = (value: unknown): RenderableValue => new RenderableValue(String(value ?? ''));

// The element of a component is the cell itself, stretched to its grid area. An element is put in a `div` that is the
// cell, so that it keeps its own size; text is put in such a `div` by MessagesWidget.
const inCell = (value: RenderContentNonCallable): RenderContentNonCallable =>
  isSimpleComponentDef(value) ? { componentName: 'div', children: value } : value;

const nullText = (): SimpleComponentDef => ({
  componentName: 'span',
  componentProps: { class: 'df-cell-null' },
  children: translate('NullValue'),
});

const t = (value: any, rowValue: RowValue, options: CellOptions) =>
  options?.transform ? options.transform(value, rowValue) : value;

const toRv = (val: RenderableValue | string | null): RenderableValue | null => {
  if (val == null) return null;
  if (typeof val === 'string') return text(val);
  return val;
};

export const wrapWithPrePost = (
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

const file = (value: any): RenderContentNonCallable => {
  if (!value) return '';
  const url = String(value).replace(/\/$/, '');
  const fileName = url.replace(/^.*[\\/]/, '');
  // a click opens the file and does not reach the row
  return anchor(url, fileName, { target: '_blank', rel: 'noopener', onClick: (e: Event) => e.stopPropagation() });
};

export interface RendererOptionsMap {
  'null-empty': CellOptions;
  'null-null': CellOptions;
  plain: CellOptions;
  header: HeaderOptions;
  md: CellOptions;
  color: CellOptions;
  checkbox: CellOptions;
  link: CellOptions;
  email: CellOptions;
  file: CellOptions;
  'null-null-fast': CellOptions;
  'link-fast': CellOptions;
  'email-fast': CellOptions;
  'file-fast': CellOptions;
  ip4: CellOptions;
  ip6: CellOptions;
  ip: CellOptions;
  date: DateTimeOptions;
  time: DateTimeOptions;
  datetime: DateTimeOptions;
  int: IntOptions;
  float: IntOptions;
  decimal: IntOptions;
}

export type RenderersMap = {
  [K in keyof RendererOptionsMap]: CellRendererTransformer<RendererOptionsMap[K]>;
};

export const DefaultRenderers: RenderersMap = {
  'null-empty': (value, rowValue, options) => wrapWithPrePost(new RenderableValue(''), value, rowValue, options),
  'null-null': (value, rowValue, options) => wrapWithPrePost(content(inCell(nullText())), value, rowValue, options),
  plain: (value: any, rowValue: RowValue, options: CellOptionsInternal) =>
    wrapWithPrePost(text(t(value, rowValue, options)), value, rowValue, options),
  header: (value: any, rowValue: RowValue, options: CellOptionsInternal<HeaderOptions>) =>
    wrapWithPrePost(header(value, rowValue, options), value, rowValue, options),
  md: (value: any, rowValue: RowValue, options: CellOptionsInternal) =>
    wrapWithPrePost(new RenderableValue(new MdString(t(value, rowValue, options))), value, rowValue, options),
  color: (value: any, rowValue: RowValue, options: CellOptionsInternal) =>
    wrapWithPrePost(content(color(t(value, rowValue, options))), value, rowValue, options),
  checkbox: (value: any, rowValue: RowValue, options: CellOptionsInternal) =>
    wrapWithPrePost(html(checkbox(t(value, rowValue, options))), value, rowValue, options),
  link: (value: any, rowValue: RowValue, options: CellOptionsInternal) =>
    wrapWithPrePost(content(inCell(link(t(value, rowValue, options)))), value, rowValue, options),
  email: (value: any, rowValue: RowValue, options: CellOptionsInternal) =>
    wrapWithPrePost(content(inCell(email(t(value, rowValue, options)))), value, rowValue, options),
  file: (value: any, rowValue: RowValue, options: CellOptionsInternal) =>
    wrapWithPrePost(content(inCell(file(t(value, rowValue, options)))), value, rowValue, options),
  // The -fast renderers render one element less: the `<a>` or the framed `null` is the cell itself, stretched to its
  // grid area. The `null` frame is drawn around the whole cell, the whole cell is the link, and a click anywhere in a
  // `file-fast` cell does not reach the row.
  'null-null-fast': (value, rowValue, options) =>
    wrapWithPrePost(new RenderableValue(translate('NullValue'), 'df-cell-null'), value, rowValue, options),
  'link-fast': (value: any, rowValue: RowValue, options: CellOptionsInternal) =>
    wrapWithPrePost(content(link(t(value, rowValue, options))), value, rowValue, options),
  'email-fast': (value: any, rowValue: RowValue, options: CellOptionsInternal) =>
    wrapWithPrePost(content(email(t(value, rowValue, options))), value, rowValue, options),
  'file-fast': (value: any, rowValue: RowValue, options: CellOptionsInternal) =>
    wrapWithPrePost(content(file(t(value, rowValue, options))), value, rowValue, options),
  ip4: (value: any, rowValue: RowValue, options: CellOptionsInternal) =>
    wrapWithPrePost(html(ip4(t(value, rowValue, options))), value, rowValue, options),
  ip6: (value: any, rowValue: RowValue, options: CellOptionsInternal) =>
    wrapWithPrePost(html(ip6(t(value, rowValue, options))), value, rowValue, options),
  ip: (value: any, rowValue: RowValue, options: CellOptionsInternal) =>
    wrapWithPrePost(html(ip(t(value, rowValue, options))), value, rowValue, options),
  date: (value: any, rowValue: RowValue, options: CellOptionsInternal<DateTimeOptions>) =>
    wrapWithPrePost(text(date(t(value, rowValue, options), 'P', options)), value, rowValue, options),
  time: (value: any, rowValue: RowValue, options: CellOptionsInternal<DateTimeOptions>) =>
    wrapWithPrePost(text(date(t(value, rowValue, options), 'p', options)), value, rowValue, options),
  datetime: (value: any, rowValue: RowValue, options: CellOptionsInternal<DateTimeOptions>) =>
    wrapWithPrePost(text(date(t(value, rowValue, options), 'P p', options)), value, rowValue, options),
  int: (value: any, rowValue: RowValue, options: CellOptionsInternal<IntOptions>) =>
    wrapWithPrePost(html(int(t(value, rowValue, options), options)), value, rowValue, options),
  float: (value: any, rowValue: RowValue, options: CellOptionsInternal<IntOptions>) =>
    wrapWithPrePost(html(float(t(value, rowValue, options), options)), value, rowValue, options),
  decimal: (value: any, rowValue: RowValue, options: CellOptionsInternal<IntOptions>) =>
    wrapWithPrePost(html(float(t(value, rowValue, options), options)), value, rowValue, options),
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
