/**
 * @file grid-card-aria.spec.ts
 *
 * Tests that `GridCard` binds its `cellAttrs` on every cell element MessagesWidget renders.
 */
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { DefaultRenderers } from '../cell-renderers';

import GridCard from './grid-card.vue';

const props = {
  item: { name: 'Alice', city: 'Ljubljana' },
  columns: [
    { fieldName: 'name', label: 'Name', rendererOptions: {} as any },
    { fieldName: 'city', label: 'City', rendererOptions: {} as any },
  ],
  renderers: DefaultRenderers,
};

describe('GridCard — cellAttrs', () => {
  it('binds an attribute set on every cell', () => {
    const wrapper = mount(GridCard, { props: { ...props, cellAttrs: { role: 'cell' } } });
    const cells = wrapper.findAll('.df-grid.cell');
    expect(cells).toHaveLength(2);
    cells.forEach((cell) => expect(cell.attributes('role')).toBe('cell'));
  });

  it('binds the attributes a function returns per cell', () => {
    const wrapper = mount(GridCard, {
      props: { ...props, noWrapperItem: true, cellAttrs: (_item: unknown, index: number) => ({ 'data-n': index }) },
    });
    expect(wrapper.findAll('.df-grid.cell').map((cell) => cell.attributes('data-n'))).toEqual(['0', '1']);
  });

  it('renders cells without a role when cellAttrs is not given', () => {
    const wrapper = mount(GridCard, { props });
    wrapper.findAll('.df-grid.cell').forEach((cell) => expect(cell.attributes('role')).toBeUndefined());
  });
});
