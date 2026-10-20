import type { SimpleComponentDef } from '@dynamicforms/vuetify-inputs';
import { formatDate, parseISO } from 'date-fns';

import './simple-renderers.css';
import { escapeHtml, safeUrl } from './safe-content';

import { CellOptions, CellOptionsInternal } from '@/table/cell-renderers/interfaces';

// The element is the grid cell itself, stretched to the row; the swatch is its ::before. The value is a
// custom property set through the CSS object model: it cannot leave the property.
export const color = (value: any): SimpleComponentDef => ({
  componentName: 'div',
  componentProps: { class: 'df-cell-color', style: { '--df-cell-color': String(value ?? '') } },
});

const cbOptions = {
  // ✓✗☐  ✅❌⬜ ☑☒☐
  null: '<span style="color: gray;">☐</span>',
  true: '<span style="color: green;">✓</span>',
  false: '<span style="color: red;">✗</span>',
  xx: '??',
};

export const checkbox = (value: any): string => {
  switch (value) {
    case null:
      return cbOptions.null;
    case true:
      return cbOptions.true;
    case false:
      return cbOptions.false;
    default:
      return cbOptions.xx;
  }
};

export interface LinkOptions extends CellOptions {
  /** The URL schemes a link in the column may take. Default: the schemes `setAllowedUrlSchemes` sets. */
  urlSchemes?: readonly string[];
}

/**
 * A link to `href` showing `text`, or `text` alone where the scheme of `href` is not one of `schemes` (by default the
 * schemes `setAllowedUrlSchemes` sets). `extra` are further props of the `<a>`.
 */
export const anchor = (
  href: unknown,
  text: string,
  extra: Record<string, unknown> = {},
  schemes?: readonly string[],
): SimpleComponentDef | string => {
  const url = safeUrl(href, schemes);
  if (url === null) return text;
  return { componentName: 'a', componentProps: { href: url, textContent: text, ...extra } };
};

export const link = (value: any, schemes?: readonly string[]): SimpleComponentDef | string =>
  anchor(value, String(value ?? ''), {}, schemes);

export const email = (value: any, schemes?: readonly string[]): SimpleComponentDef | string => {
  const match = String(value).match(/^([^<]+)<.*>$|^([^@]+)@/);
  let name = String(value);
  if (match && match.length >= 1 && match[1]) name = match[1].trim();
  if (match && match.length >= 2 && match[2]) name = match[2];
  return anchor(`mailto:${value}`, name, {}, schemes);
};

// `text` is escaped already: an IPv6 address passes its escaped IPv4 part
const ip4Html = (text: string): string => {
  const segments = text.split('.');

  const formatted =
    segments.length === 4
      ? segments
          .map((t: string) => t.padStart(3, '0'))
          .map((t: string) => t.replace(/^0+/, (match: any) => `<span style="opacity: .5">${match}</span>`))
          .map((t: string) => `<span>${t}</span>`)
          .join('.')
      : text;

  return `<code>${formatted}</code>`;
};

export const ip4 = (value: any): string => ip4Html(escapeHtml(value));

export const ip6 = (value: string): string => {
  const segments = escapeHtml(value).split(':');
  const formatted = segments
    .map((t: string) => {
      if (t.includes('.')) return ip4Html(t);
      if (t === '') return t;
      return t.padStart(4, '0');
    })
    .map((t: string) =>
      t.includes('<span') ? t : t.replace(/^0+/, (match: any) => `<span style="opacity: .5">${match}</span>`),
    )
    .map((t: string) => (t.includes('.') || t === '' ? t : `<span>${t}</span>`))
    .join(':');

  return `<code>${formatted}</code>`;
};

export const ip = (value: string): string => {
  if (String(value).includes(':')) return ip6(value);
  return ip4(value);
};

export interface DateTimeOptions extends CellOptions {
  format?: string;
  parseISOPrefix?: string;
}

export const date = (
  value: string | Date,
  defaultFormat: string,
  options: CellOptionsInternal<DateTimeOptions>,
): string => {
  if (value instanceof Date) return formatDate(value, options?.format ?? defaultFormat);
  return formatDate(parseISO((options.parseISOPrefix ?? '') + value), options?.format ?? defaultFormat);
};
