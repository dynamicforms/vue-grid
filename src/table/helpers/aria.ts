/**
 * @file aria.ts
 *
 * ARIA attributes of the grid's table semantics: element ids the table's `aria-owns` refers to and the attribute
 * sets bound on rows and cells.
 */
import { Comment, Fragment, Text, type VNode } from 'vue';

export type CellAttrs = Record<string, unknown>;

/** Attributes of a record cell. */
export const bodyCellAttrs: Readonly<CellAttrs> = Object.freeze({ role: 'cell' });

/** Attributes of a header cell. */
export const columnHeaderCellAttrs: Readonly<CellAttrs> = Object.freeze({ role: 'columnheader' });

/** The header row's element id. */
export function headerRowDomId(domId: string): string {
  return `${domId}-header`;
}

/** The filter row's element id. */
export function filterRowDomId(domId: string): string {
  return `${domId}-filter`;
}

/** The body rowgroup's element id. */
export function bodyRowGroupDomId(domId: string): string {
  return `${domId}-body`;
}

/** The summary row's element id. */
export function summaryRowDomId(domId: string): string {
  return `${domId}-summary`;
}

function renderedNodes(vnodes: VNode[]): VNode[] {
  return vnodes.flatMap((vnode) => {
    if (vnode.type === Comment) return [];
    if (vnode.type === Text) return String(vnode.children ?? '').trim() === '' ? [] : [vnode];
    if (vnode.type === Fragment) return renderedNodes(vnode.children as VNode[]);
    return [vnode];
  });
}

/** The single html element slot output renders, or `undefined` for no content, several nodes, text or a component. */
export function singleElementRoot(vnodes: VNode[] | undefined): VNode | undefined {
  const rendered = renderedNodes(vnodes ?? []);
  return rendered.length === 1 && typeof rendered[0].type === 'string' ? rendered[0] : undefined;
}
