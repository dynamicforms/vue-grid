import { formatDate, parseISO } from 'date-fns';

import './simple-renderers.css';
import { CellOptions, CellOptionsInternal } from '@/table/cell-renderers/interfaces';

export const color = (value: any): string => `<div class="df-cell-color" style="background-color: ${value};"/>`;

const cbOptions = {
  // ✓✗☐  ✅❌⬜ ☑☒☐
  null: '<span style="color: gray;">☐</span>',
  true: '<span style="color: green;">✓</span>',
  false: '<span style="color: red;">✗</span>',
  xx: '??',
};

export const checkbox = (value: any): string => {
  switch (value) {
  case null: return cbOptions.null;
  case true: return cbOptions.true;
  case false: return cbOptions.false;
  default: return cbOptions.xx;
  }
};

export const link = (value: any): string => `<a href="${value}">${value}</a>`;

export const email = (value: any): string => {
  const match = String(value).match(/^([^<]+)<.*>$|^([^@]+)@/);
  let name = String(value);
  if (match && match.length >= 1 && match[1]) name = match[1].trim();
  if (match && match.length >= 2 && match[2]) name = match[2];
  return `<a href="mailto:${value}">${name}</a>`;
};

export const ip4 = (value: any): string => {
  const segments = String(value).split('.');

  const formatted = segments.length === 4 ?
    segments
      .map((t: string) => t.padStart(3, '0'))
      .map((t: string) => t.replace(/^0+/, (match: any) => `<span style="opacity: .5">${match}</span>`))
      .map((t: string) => `<span>${t}</span>`)
      .join('.') :
    value;

  return `<code>${formatted}</code>`;
};

export const ip6 = (value: string): string => {
  const segments = String(value).split(':');
  const formatted = segments
    .map((t: string) => {
      if (t.includes('.')) return ip4(t);
      if (t === '') return t;
      return t.padStart(4, '0');
    })
    .map((t: string) => (
      t.includes('<span') ?
        t :
        t.replace(/^0+/, (match: any) => `<span style="opacity: .5">${match}</span>`)
    ))
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
