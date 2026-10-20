/**
 * @file cell-element.spec.ts
 *
 * The element each renderer renders as the cell. `MessagesWidget` renders the element of a component as the cell
 * itself: `null-null`, `link`, `email` and `file` put their element in a `div` that is the cell, the `-fast` variants
 * render it as the cell.
 */
import { MessagesWidget, RenderableValue } from '@dynamicforms/vuetify-inputs';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import type { CellOptionsInternal } from './interfaces';
import { columnIdOption, columnNameOption, gridIdOption } from './internal-exports';
import { DefaultRenderers } from './renderers';

function options(): CellOptionsInternal {
  return {
    [gridIdOption]: Symbol('grid'),
    [columnIdOption]: Symbol('col'),
    [columnNameOption]: 'c',
    redrawColumn: vi.fn(),
  };
}

const cell = (value: RenderableValue) =>
  mount(MessagesWidget, { props: { message: [value], classes: 'df-grid cell' } }).find('.df-grid.cell');

describe('cell element', () => {
  it.each([
    ['link', 'https://example.com'],
    ['email', 'ana@example.com'],
    ['file', '/files/a.pdf'],
  ] as const)('"%s" puts the link in a div that is the cell', (type, value) => {
    const element = cell(DefaultRenderers[type](value, {}, options()));

    expect(element.element.tagName).toBe('DIV');
    expect(element.find(':scope > a').exists()).toBe(true);
  });

  it.each([
    ['link-fast', 'https://example.com'],
    ['email-fast', 'ana@example.com'],
    ['file-fast', '/files/a.pdf'],
  ] as const)('"%s" renders the link as the cell', (type, value) => {
    expect(cell(DefaultRenderers[type](value, {}, options())).element.tagName).toBe('A');
  });

  it('"link" renders a refused URL as the text of the cell', () => {
    const element = cell(DefaultRenderers.link('javascript:x', {}, options()));

    expect(element.element.tagName).toBe('DIV');
    expect(element.find('a').exists()).toBe(false);
    expect(element.text()).toBe('javascript:x');
  });

  it('"null-null" puts the framed text in a div that is the cell', () => {
    const element = cell(DefaultRenderers['null-null'](null, {}, options()));

    expect(element.classes()).not.toContain('df-cell-null');
    expect(element.find(':scope > span.df-cell-null').text()).toBe('null');
  });

  it('"null-null-fast" frames the cell', () => {
    const element = cell(DefaultRenderers['null-null-fast'](null, {}, options()));

    expect(element.classes()).toContain('df-cell-null');
    expect(element.text()).toBe('null');
  });
});
