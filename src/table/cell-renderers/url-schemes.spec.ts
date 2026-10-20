/**
 * @file url-schemes.spec.ts
 *
 * The URL schemes a link in a cell may take: `defaultUrlSchemes`, the schemes `setAllowedUrlSchemes` sets for every
 * grid, and the `urlSchemes` a column's `rendererOptions` name.
 */
import { RenderableValue } from '@dynamicforms/vuetify-inputs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';

import type { CellOptionsInternal } from './interfaces';
import { columnIdOption, columnNameOption, gridIdOption } from './internal-exports';
import { DefaultRenderers } from './renderers';
import { defaultUrlSchemes, getAllowedUrlSchemes, safeUrl, setAllowedUrlSchemes } from './safe-content';
import type { LinkOptions } from './simple-renderers';

function options(extra: LinkOptions = {}): CellOptionsInternal<LinkOptions> {
  return {
    [gridIdOption]: Symbol('grid'),
    [columnIdOption]: Symbol('col'),
    [columnNameOption]: 'c',
    redrawColumn: vi.fn(),
    ...extra,
  };
}

// a -fast renderer renders the `<a>` as the cell, the others put it in a `div`
const isLink = (value: RenderableValue) =>
  value.componentName === 'a' || (value.componentChildren[0] as { componentName?: string })?.componentName === 'a';

describe('URL schemes', () => {
  afterEach(() => setAllowedUrlSchemes(defaultUrlSchemes));

  it('takes http, https, mailto and tel by default', () => {
    expect(getAllowedUrlSchemes()).toEqual(['http', 'https', 'mailto', 'tel']);
    expect(safeUrl('ftp://ftp.example.com')).toBeNull();
    expect(safeUrl('tel:+38612345678')).toBe('tel:+38612345678');
  });

  it('takes a URL without a scheme whatever the schemes', () => {
    setAllowedUrlSchemes([]);
    expect(safeUrl('/files/a.pdf')).toBe('/files/a.pdf');
  });

  it('setAllowedUrlSchemes sets the schemes of every column that names none', () => {
    setAllowedUrlSchemes(['https', 'FTP']);

    expect(getAllowedUrlSchemes()).toEqual(['https', 'ftp']);
    expect(isLink(DefaultRenderers.link('ftp://ftp.example.com', {}, options()))).toBe(true);
    expect(isLink(DefaultRenderers['link-fast']('ftp://ftp.example.com', {}, options()))).toBe(true);
    expect(isLink(DefaultRenderers['email-fast']('ana@example.com', {}, options()))).toBe(false);
  });

  it('without mailto an email address renders as text', () => {
    setAllowedUrlSchemes(['http', 'https']);

    const cell = DefaultRenderers.email('ana@example.com', {}, options());
    expect(isLink(cell)).toBe(false);
    expect(cell.resolvedText).toBe('ana');
  });

  it("a column's urlSchemes take the place of the schemes setAllowedUrlSchemes sets", () => {
    setAllowedUrlSchemes(['ftp']);
    const opts = options({ urlSchemes: ['https'] });

    expect(isLink(DefaultRenderers['link-fast']('https://w3.org', {}, opts))).toBe(true);
    expect(isLink(DefaultRenderers['link-fast']('ftp://ftp.example.com', {}, opts))).toBe(false);
    expect(isLink(DefaultRenderers['file-fast']('ftp://ftp.example.com/a.pdf', {}, opts))).toBe(false);
  });

  it('a cell rendered in a computed is rendered again when the schemes are set', () => {
    const cell = computed(() => DefaultRenderers['link-fast']('ftp://ftp.example.com', {}, options()));
    expect(isLink(cell.value)).toBe(false);

    setAllowedUrlSchemes([...defaultUrlSchemes, 'ftp']);
    expect(isLink(cell.value)).toBe(true);
  });
});
