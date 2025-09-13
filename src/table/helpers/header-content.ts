import { computed, h, inject, provide, Ref, ref } from 'vue';

type HeaderContent = { tag: string, attrs: Record<string, string>, content: string }[];

// eslint-disable-next-line import/prefer-default-export
export function useHeaderContent() {
  const headerContent = inject('headerContent', ref<HeaderContent>([])) as Ref<HeaderContent>;
  return {
    provideHeaderContent: () => {
      const hc = ref<HeaderContent>([]);
      provide('headerContent', hc);
      return hc;
    },
    headerContent, // not relevant for df-grid which obtains its own ref by calling provideHeaderContent()
    setHeaderContent: (nodes: HTMLElement[]) => {
      headerContent.value = nodes.map((node: HTMLElement) => ({
        tag: node.tagName.toLowerCase(),
        attrs: Object.fromEntries(
          Array.from(node.attributes).map((attr) => [attr.name, attr.value]),
        ),
        content: node.innerHTML,
      }));
    },
    headerContentVNodes: computed(() => headerContent.value.map(
      (c) => h(c.tag, { ...c.attrs, innerHTML: c.content }),
    )),
  };
}
