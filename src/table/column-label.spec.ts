import { HtmlString, MdString, type RenderContent } from '@dynamicforms/vuetify-inputs';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';

import { type ColumnDefinition, columnLabel, columnLabelText, createColumn } from './columns';
import DfGridHeader from './df-grid-header.vue';
import PreContentPost from './helpers/pre-content-post.vue';
import SortingIndicator from './helpers/sorting-indicator.vue';

const markup = '<img src=x onerror="window.injected = true">';

function mountHeader(columns: ColumnDefinition<any>[]) {
  return mount(DfGridHeader, {
    props: { columns, gridId: Symbol('grid'), gridClass: '', sortState: [] },
    global: { components: { PreContentPost, SortingIndicator } },
  });
}

const headerCell = (wrapper: ReturnType<typeof mountHeader>, fieldName: string) =>
  wrapper.find(`.df-grid.card.header .df-grid.cell.${fieldName} .content`);

describe('column label', () => {
  describe('in the header cell', () => {
    it('renders a string as text', () => {
      const wrapper = mountHeader([createColumn('name', 'Name')]);

      expect(headerCell(wrapper, 'name').text()).toBe('Name');
    });

    it('renders markup in a string as text', () => {
      const wrapper = mountHeader([createColumn('name', markup)]);
      const cell = headerCell(wrapper, 'name');

      expect(cell.find('img').exists()).toBe(false);
      expect(cell.text()).toBe(markup);
    });

    it('renders an MdString as markdown', () => {
      const wrapper = mountHeader([createColumn('name', new MdString('**Name**'))]);

      expect(headerCell(wrapper, 'name').find('strong').text()).toBe('Name');
    });

    it('renders an HtmlString as HTML', () => {
      const wrapper = mountHeader([createColumn('name', new HtmlString('<em>Name</em>'))]);

      expect(headerCell(wrapper, 'name').find('em').text()).toBe('Name');
    });

    it('renders a component', () => {
      const label = { componentName: 'span', componentProps: { class: 'label-badge' }, children: 'Name' };
      const wrapper = mountHeader([createColumn('name', label)]);

      const content = headerCell(wrapper, 'name');

      expect(content.element.tagName).toBe('SPAN');
      expect(content.classes()).toContain('label-badge');
      expect(content.text()).toBe('Name');
    });

    it('renders what a function answers', () => {
      const wrapper = mountHeader([createColumn('name', () => new MdString('*Name*'))]);

      expect(headerCell(wrapper, 'name').find('em').text()).toBe('Name');
    });

    it('follows a change of what a function label reads, with the same column', async () => {
      const locale = ref<'en' | 'sl'>('en');
      const messages = { en: 'Name', sl: 'Ime' };
      const t = () => messages[locale.value];
      const columns = [createColumn('name', () => t())];
      const wrapper = mountHeader(columns);

      expect(headerCell(wrapper, 'name').text()).toBe('Name');

      locale.value = 'sl';
      await nextTick();

      expect(headerCell(wrapper, 'name').text()).toBe('Ime');
    });

    it('passes the rendered label to the layout measurement after a function label changes', async () => {
      const locale = ref<'en' | 'sl'>('en');
      const headerContent = ref<{ content: string }[]>([]);
      const wrapper = mount(DfGridHeader, {
        props: {
          columns: [createColumn('name', () => new HtmlString(`<em>${locale.value === 'en' ? 'Name' : 'Ime'}</em>`))],
          gridId: Symbol('grid'),
          gridClass: '',
          sortState: [],
        },
        global: { components: { PreContentPost, SortingIndicator }, provide: { headerContent } },
      });
      await nextTick();

      expect(headerContent.value[0].content).toContain('<em>Name</em>');

      locale.value = 'sl';
      await nextTick();

      expect(headerCell(wrapper, 'name').text()).toBe('Ime');
      expect(headerContent.value[0].content).toContain('<em>Ime</em>');
    });

    it('gives the header slot the label as it reads now', () => {
      const wrapper = mount(DfGridHeader, {
        props: { columns: [createColumn('name', () => 'Name')], gridId: Symbol('grid'), gridClass: '', sortState: [] },
        slots: { header: '<template #header="{ item }"><div class="custom">{{ item.name }}</div></template>' },
      });

      expect(wrapper.find('.custom').text()).toBe('Name');
    });
  });

  describe('as text', () => {
    it.each<[string, RenderContent, string]>([
      ['a string', 'Name', 'Name'],
      ['an MdString', new MdString('**Name**'), '**Name**'],
      ['an HtmlString', new HtmlString('<em>Name</em> &amp; more'), 'Name & more'],
      ['a component', { componentName: 'span', children: 'Name' }, 'Name'],
      ['a function', () => new HtmlString('<b>Name</b>'), 'Name'],
    ])('reads %s', (_kind, label, text) => {
      expect(columnLabelText({ label })).toBe(text);
    });

    it('calls a function label on every read', () => {
      const locale = ref('en');
      const column = { label: () => (locale.value === 'en' ? 'Name' : 'Ime') };

      expect(columnLabel(column)).toBe('Name');
      locale.value = 'sl';
      expect(columnLabel(column)).toBe('Ime');
    });

    it('is the column in the filter placeholder', () => {
      const wrapper = mountHeader([createColumn('name', () => new HtmlString('<em>Name</em>'))]);

      expect((wrapper.vm as any).filterPlaceholder(wrapper.props('columns')[0])).toBe('Filter Name...');
    });
  });
});
