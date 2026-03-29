import { MdString, RenderableValue, SimpleComponentDef } from '@dynamicforms/vue-forms';

import type { ColumnSortState } from '../columns-sorting';
import { useGridMouseEventsPosition } from '../df-grid-mouse-events';

import type { CellOptions, CellOptionsInternal } from './interfaces';

export interface HeaderOptions extends CellOptions {
  sortState: ColumnSortState;
  icon?: string;
}

const { processPosition } = useGridMouseEventsPosition();

export const header = (
  value: string | MdString,
  rowValue: any,
  options: CellOptionsInternal<HeaderOptions>,
): RenderableValue => {
  const preRv = options.icon ?
    new RenderableValue({
      componentName: 'CachedIcon',
      componentProps: { name: options.icon, class: 'df-header-icon' },
    } as SimpleComponentDef) :
    null;

  const postRv = new RenderableValue({
    componentName: 'SortingIndicator',
    componentProps: { ...options.sortState },
  } as SimpleComponentDef);

  const result = new RenderableValue({
    componentName: 'PreContentPost',
    componentProps: {
      pre: preRv,
      content: new RenderableValue(value),
      post: postRv,
      contentClass: 'content',
      onPointerleave: (e: PointerEvent) => processPosition('leave', e),
      onPointerenter: (e: PointerEvent) => processPosition('enter', e),
    },
  } as SimpleComponentDef);
  result.classes = ['has-pre-post'];
  return result;
};
