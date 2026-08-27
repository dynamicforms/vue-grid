/**
 * @file sorting-indicator.spec.ts
 *
 * Tests for the `SortingIndicator` component (sorting-indicator.vue).
 *
 * What this file tests
 * --------------------
 * 1. **viewBox computation** — the SVG viewBox attribute is derived from the `direction` prop
 *    ('asc', 'desc', or undefined) and must match the expected dimensions.
 *
 * 2. **Conditional SVG paths** — the asc arrow, desc arrow, and sort-index badge are each
 *    controlled by a v-if in the template.
 */
import { mount } from '@vue/test-utils';

import SortingIndicator from './sorting-indicator.vue';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mountIndicator(props: { direction?: 'asc' | 'desc'; index?: number; sortable?: boolean }) {
  return mount(SortingIndicator, { props });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SortingIndicator', () => {
  // -------------------------------------------------------------------------
  describe('viewBox computation', () => {
    it('uses viewBox "0 0 32 52" when direction is "asc"', () => {
      const wrapper = mountIndicator({ direction: 'asc' });
      expect(wrapper.find('svg').attributes('viewBox')).toBe('0 0 32 52');
    });

    it('uses viewBox "0 16 32 68" when direction is "desc"', () => {
      const wrapper = mountIndicator({ direction: 'desc' });
      expect(wrapper.find('svg').attributes('viewBox')).toBe('0 16 32 68');
    });

    it('uses viewBox "0 0 32 68" when direction is undefined (both arrows visible)', () => {
      const wrapper = mountIndicator({});
      expect(wrapper.find('svg').attributes('viewBox')).toBe('0 0 32 68');
    });
  });

  // -------------------------------------------------------------------------
  describe('asc arrow path', () => {
    it('shows the asc path when direction is "asc"', () => {
      const wrapper = mountIndicator({ direction: 'asc' });
      expect(wrapper.find('[data-sort="asc"]').exists()).toBe(true);
    });

    it('shows the asc path when direction is undefined', () => {
      const wrapper = mountIndicator({});
      expect(wrapper.find('[data-sort="asc"]').exists()).toBe(true);
    });

    it('hides the asc path when direction is "desc"', () => {
      const wrapper = mountIndicator({ direction: 'desc' });
      expect(wrapper.find('[data-sort="asc"]').exists()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe('desc arrow path', () => {
    it('shows the desc path when direction is "desc"', () => {
      const wrapper = mountIndicator({ direction: 'desc' });
      expect(wrapper.find('[data-sort="desc"]').exists()).toBe(true);
    });

    it('shows the desc path when direction is undefined', () => {
      const wrapper = mountIndicator({});
      expect(wrapper.find('[data-sort="desc"]').exists()).toBe(true);
    });

    it('hides the desc path when direction is "asc"', () => {
      const wrapper = mountIndicator({ direction: 'asc' });
      expect(wrapper.find('[data-sort="desc"]').exists()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe('sortable', () => {
    it('draws the arrow svg when sortable is true (the default)', () => {
      const wrapper = mountIndicator({});
      expect(wrapper.find('svg').exists()).toBe(true);
    });

    it('draws no arrow svg when sortable is false', () => {
      const wrapper = mountIndicator({ sortable: false });
      expect(wrapper.find('svg').exists()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe('sort-index badge', () => {
    it('shows the sort-index badge when index is provided', () => {
      const wrapper = mountIndicator({ direction: 'asc', index: 2 });
      expect(wrapper.find('[data-sort="sort-index"]').exists()).toBe(true);
    });

    it('displays the index number inside the badge', () => {
      const wrapper = mountIndicator({ direction: 'asc', index: 3 });
      expect(wrapper.find('[data-sort="sort-index"] text').text()).toBe('3');
    });

    it('hides the sort-index badge when index is absent', () => {
      const wrapper = mountIndicator({ direction: 'asc' });
      expect(wrapper.find('[data-sort="sort-index"]').exists()).toBe(false);
    });

    it('hides the sort-index badge when index is undefined', () => {
      const wrapper = mountIndicator({});
      expect(wrapper.find('[data-sort="sort-index"]').exists()).toBe(false);
    });
  });
});
