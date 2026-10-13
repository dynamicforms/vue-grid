import { MessagesWidget, RenderableValue } from '@dynamicforms/vuetify-inputs';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import type { CellOptionsInternal } from './interfaces';
import { columnIdOption, columnNameOption, gridIdOption } from './internal-exports';
import { DefaultRenderers, gridColumnCreate, wrapWithPrePost } from './renderers';

const markup = '<img src=x onerror="window.injected = true">';

function options(): CellOptionsInternal {
  return {
    [gridIdOption]: Symbol('grid'),
    [columnIdOption]: Symbol('col'),
    [columnNameOption]: 'c',
    redrawColumn: vi.fn(),
  };
}

const render = (value: RenderableValue) => mount(MessagesWidget, { props: { message: [value] } });

describe('cell content from a record', () => {
  it.each(['plain', 'date', 'md'] as const)('"%s" renders markup in the value as text', (type) => {
    const value = type === 'date' ? new Date(2026, 0, 1) : markup;
    const wrapper = render(DefaultRenderers[type](value, {}, options()));

    expect(wrapper.find('img').exists()).toBe(false);
  });

  it('"plain" shows the markup as written', () => {
    expect(render(DefaultRenderers.plain(markup, {}, options())).text()).toBe(markup);
  });

  it.each(['float', 'int', 'decimal'] as const)('"%s" escapes a value that is not a number', (type) => {
    const opts = options();
    gridColumnCreate(opts[gridIdOption], type, opts);

    expect(
      render(DefaultRenderers[type](markup, {}, opts))
        .find('img')
        .exists(),
    ).toBe(false);
  });

  it('"link" renders a javascript: URL as text', () => {
    const wrapper = render(DefaultRenderers.link('javascript:window.injected=true', {}, options()));

    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.text()).toBe('javascript:window.injected=true');
  });

  it('"link" renders the value as the text of the link', () => {
    const wrapper = render(DefaultRenderers.link(`https://example.com/${markup}`, {}, options()));

    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('a').attributes('href')).toBe(`https://example.com/${markup}`);
  });

  it('"file" renders a link that opens in a new tab, without an inline script', () => {
    const wrapper = render(DefaultRenderers.file("/files/a'); alert(1); ('.pdf", {}, options()));
    const a = wrapper.find('a');

    expect(a.attributes('onclick')).toBeUndefined();
    expect(a.attributes('target')).toBe('_blank');
    expect(a.attributes('rel')).toBe('noopener');
  });

  it('"file" does not let a click reach the row', async () => {
    const onRowClick = vi.fn();
    const wrapper = mount(
      {
        components: { MessagesWidget },
        props: ['value'],
        template: '<div @click="$attrs.onRowClick()"><messages-widget :message="[value]" /></div>',
      },
      { props: { value: DefaultRenderers.file('/files/a.pdf', {}, options()), onRowClick } },
    );

    await wrapper.find('a').trigger('click');

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('"color" puts the value into the style property only', () => {
    const wrapper = render(DefaultRenderers.color(`red;" ${markup}`, {}, options()));

    expect(wrapper.find('img').exists()).toBe(false);
  });

  it('a string from preRender renders as text', () => {
    const opts = { ...options(), preRender: () => markup };
    const wrapper = mount(MessagesWidget, {
      props: { message: [wrapWithPrePost(new RenderableValue('x'), 'x', {}, opts)] },
      global: {
        stubs: {
          PreContentPost: {
            props: ['pre'],
            template: '<messages-widget :message="[pre]" />',
            components: { MessagesWidget },
          },
        },
      },
    });

    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.text()).toContain(markup);
  });
});
