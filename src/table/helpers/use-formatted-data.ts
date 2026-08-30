/**
 * @file use-formatted-data.ts
 *
 * Vue composable that transforms raw row data into a list of renderable cell values.
 *
 * For each column in the provided definition list the composable:
 *  1. Reads the cell value from the row item using the column's `fieldName`
 *  2. Selects the renderer:
 *     - `nullHandler`, when the value is `null`/`undefined` and the column names one
 *     - the column's own `renderer` otherwise — a registry name (`'plain'` by default) or,
 *       when `renderer` is a function, that function itself, called directly instead of a
 *       registry lookup and then wrapped with `preRender`/`postRender` the same way every
 *       registry renderer already wraps itself
 *  3. Invokes the renderer to produce a `RenderableValue`
 *  4. Merges column-level CSS classes (`fieldName` + optional `cssClass`) with any classes
 *     returned by the renderer itself
 *
 * When `addRowResetItem` is `true`, a sentinel `<span class="df-grid-card-break-item">` is
 * appended to the result list, which the card layout uses to force a grid-row break between
 * column groups.
 */
import { RenderableValue } from '@dynamicforms/vue-forms';
import { computed } from 'vue';

import { RendererOptionsMap, RenderersMap, RowValue, wrapWithPrePost } from '../cell-renderers';
import { ColumnDefinition } from '../columns';

export interface FormattedDataProps {
  item: RowValue;
  columns: ColumnDefinition<keyof RendererOptionsMap>[];
  renderers: RenderersMap;
  addRowResetItem?: boolean;
}

export function useFormattedData(props: FormattedDataProps) {
  const formattedData = computed(() => {
    const itemValue = props.item;
    const renderersValue = props.renderers;

    const result = props.columns.map((column) => {
      const value = itemValue[column.fieldName];
      const rendererOptions = column.rendererOptions;
      const nullHandler = column.rendererOptions?.nullHandler as keyof RenderersMap;

      let res: RenderableValue;
      if (value == null && nullHandler != null) {
        res = renderersValue[nullHandler](value, itemValue, rendererOptions as any);
      } else if (typeof column.renderer === 'function') {
        const main = column.renderer(value, itemValue, rendererOptions as any);
        res = wrapWithPrePost(main, value, itemValue, rendererOptions as any);
      } else {
        res = renderersValue[column.renderer ?? 'plain'](value, itemValue, rendererOptions as any);
      }

      let extraClasses: any[] = [];
      if (Array.isArray(res.classes)) extraClasses = res.classes;
      else if (res.classes) extraClasses = [res.classes];
      res.classes = [column.fieldName, column.cssClass ?? '', ...extraClasses];
      return res;
    });

    if (props.addRowResetItem) {
      result.push(new RenderableValue({ componentName: 'span' }, 'df-grid-card-break-item'));
    }

    return result;
  });

  return { formattedData };
}
