/* eslint-disable vue/one-component-per-file */
/**
 * @file header-content.spec.ts
 *
 * Tests for the `useHeaderContent` composable (header-content.ts).
 *
 * What this file tests
 * --------------------
 * 1. **setHeaderContent** — maps HTMLElement nodes to the internal {tag, attrs, content} format.
 * 2. **headerContentVNodes** — computed that turns the internal format into h() VNodes.
 * 3. **provideHeaderContent / inject** — a parent's provided ref is picked up by a child.
 */
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

import { useHeaderContent } from './header-content';

// ---------------------------------------------------------------------------
// Helper: run a composable inside a minimal Vue component so that inject/provide work.
// ---------------------------------------------------------------------------
function withSetup<T>(composable: () => T): T {
  let result!: T;
  mount(defineComponent({
    setup() {
      result = composable();
      return () => h('div');
    },
  }));
  return result;
}

// ---------------------------------------------------------------------------
// Helper: create a real HTMLElement from an HTML string.
// ---------------------------------------------------------------------------
function makeNode(html: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.firstElementChild as HTMLElement;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useHeaderContent', () => {
  // -------------------------------------------------------------------------
  describe('setHeaderContent', () => {
    it('maps a single node to its tag, attrs, and innerHTML', () => {
      const { setHeaderContent, headerContent } = withSetup(useHeaderContent);

      const node = makeNode('<span class="foo">Hello</span>');
      setHeaderContent([node]);

      expect(headerContent.value).toHaveLength(1);
      expect(headerContent.value[0].tag).toBe('span');
      expect(headerContent.value[0].attrs).toEqual({ class: 'foo' });
      expect(headerContent.value[0].content).toBe('Hello');
    });

    it('lowercases tag names', () => {
      const { setHeaderContent, headerContent } = withSetup(useHeaderContent);

      // DOM always returns uppercase tagName for HTML elements
      const node = document.createElement('DIV');
      setHeaderContent([node]);

      expect(headerContent.value[0].tag).toBe('div');
    });

    it('handles nodes with no attributes', () => {
      const { setHeaderContent, headerContent } = withSetup(useHeaderContent);

      setHeaderContent([document.createElement('p')]);

      expect(headerContent.value[0].attrs).toEqual({});
    });

    it('maps multiple nodes in order', () => {
      const { setHeaderContent, headerContent } = withSetup(useHeaderContent);

      const nodes = [
        makeNode('<h1>Title</h1>'),
        makeNode('<p id="intro">Body</p>'),
      ];
      setHeaderContent(nodes);

      expect(headerContent.value).toHaveLength(2);
      expect(headerContent.value[0].tag).toBe('h1');
      expect(headerContent.value[1].tag).toBe('p');
      expect(headerContent.value[1].attrs).toEqual({ id: 'intro' });
    });

    it('replaces previous content on a second call', () => {
      const { setHeaderContent, headerContent } = withSetup(useHeaderContent);

      setHeaderContent([makeNode('<span>First</span>')]);
      expect(headerContent.value).toHaveLength(1);

      setHeaderContent([makeNode('<em>A</em>'), makeNode('<em>B</em>')]);
      expect(headerContent.value).toHaveLength(2);
      expect(headerContent.value[0].tag).toBe('em');
    });

    it('sets an empty array when called with no nodes', () => {
      const { setHeaderContent, headerContent } = withSetup(useHeaderContent);

      setHeaderContent([makeNode('<span>Something</span>')]);
      setHeaderContent([]);

      expect(headerContent.value).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  describe('headerContentVNodes', () => {
    it('returns an empty array initially', () => {
      const { headerContentVNodes } = withSetup(useHeaderContent);
      expect(headerContentVNodes.value).toHaveLength(0);
    });

    it('creates one VNode per node after setHeaderContent', () => {
      const { setHeaderContent, headerContentVNodes } = withSetup(useHeaderContent);

      setHeaderContent([makeNode('<span>A</span>'), makeNode('<span>B</span>')]);

      expect(headerContentVNodes.value).toHaveLength(2);
    });

    it('VNode tag matches the original element tag', () => {
      const { setHeaderContent, headerContentVNodes } = withSetup(useHeaderContent);

      setHeaderContent([makeNode('<em class="x">text</em>')]);

      const vnode = headerContentVNodes.value[0] as any;
      expect(vnode.type).toBe('em');
    });
  });

  // -------------------------------------------------------------------------
  describe('provideHeaderContent / inject', () => {
    it('child composable receives the ref provided by the parent', () => {
      let parentRef: any;
      let childHeaderContent: any;

      const Child = defineComponent({
        setup() {
          const { headerContent } = useHeaderContent();
          childHeaderContent = headerContent;
          return () => h('div');
        },
      });

      mount(defineComponent({
        components: { Child },
        setup() {
          const { provideHeaderContent } = useHeaderContent();
          // provideHeaderContent() creates a new ref and calls provide(); write to it directly
          // (setHeaderContent writes to the *injected* default ref, not the provided one)
          parentRef = provideHeaderContent();
          parentRef.value = [{ tag: 'b', attrs: {}, content: 'injected' }];
          return () => h(Child);
        },
      }));

      // The child's headerContent ref should be the same object as what the parent provided
      expect(childHeaderContent).toBe(parentRef);
      expect(childHeaderContent.value).toHaveLength(1);
      expect(childHeaderContent.value[0].tag).toBe('b');
    });
  });
});
