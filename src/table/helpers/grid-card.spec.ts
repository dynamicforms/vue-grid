/**
 * @file grid-card.spec.ts
 *
 * Tests for the `GridCard` component (grid-card.vue).
 *
 * GridCard is a thin wrapper around `useFormattedData` + MessagesWidget.
 * Its only logic is the `noWrapperItem` prop which toggles whether a wrapping div is rendered.
 * The data-formatting logic is fully covered by use-formatted-data.spec.ts.
 */
import { mount } from '@vue/test-utils';
import { vi } from 'vitest';
import { defineComponent } from 'vue';

import { DefaultRenderers } from '../cell-renderers';

import GridCard from './grid-card.vue';

// ---------------------------------------------------------------------------
// Mock MessagesWidget — it's a UI component that renders complex markup;
// we only care whether it's present, not what it looks like.
// ---------------------------------------------------------------------------

vi.mock('@dynamicforms/vue-forms', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dynamicforms/vue-forms')>();
  return {
    ...actual,
    MessagesWidget: defineComponent({
      name: 'MessagesWidget',
      props: { message: { type: Object, default: null }, classes: { type: String, default: '' } },
      template: '<div class="messages-widget"/>',
    }),
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseProps = {
  item: { name: 'Alice' },
  columns: [],
  renderers: DefaultRenderers,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GridCard', () => {
  it('renders a .df-grid.card wrapper div when noWrapperItem is false (default)', () => {
    const wrapper = mount(GridCard, { props: baseProps });
    expect(wrapper.find('.df-grid.card').exists()).toBe(true);
  });

  it('does not render a wrapper div when noWrapperItem is true', () => {
    const wrapper = mount(GridCard, { props: { ...baseProps, noWrapperItem: true } });
    expect(wrapper.find('.df-grid.card').exists()).toBe(false);
  });

  it('always renders a MessagesWidget', () => {
    const withWrapper = mount(GridCard, { props: baseProps });
    expect(withWrapper.find('.messages-widget').exists()).toBe(true);

    const withoutWrapper = mount(GridCard, { props: { ...baseProps, noWrapperItem: true } });
    expect(withoutWrapper.find('.messages-widget').exists()).toBe(true);
  });
});
