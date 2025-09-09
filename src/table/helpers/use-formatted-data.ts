import { RenderableValue } from '@dynamicforms/vue-forms';
import { computed } from 'vue';

import { RendererOptionsMap, RenderersMap, RowValue } from '../cell-renderers';
import { ColumnDefinition } from '../columns';

export interface FormattedDataProps {
  item: RowValue;
  columns: ColumnDefinition<keyof RendererOptionsMap>[];
  renderers: RenderersMap;
  addRowResetItem?: boolean;
}

// eslint-disable-next-line import/prefer-default-export
export function useFormattedData(props: FormattedDataProps) {
  const formattedData = computed(() => {
    const itemValue = props.item;
    const renderersValue = props.renderers;

    const result = props.columns.map((column) => {
      const value = itemValue[column.fieldName];
      let renderer = renderersValue[column.renderer ?? 'plain'];
      const rendererOptions = column.rendererOptions;
      const nullHandler = column.rendererOptions?.nullHandler as keyof RenderersMap;

      if (value == null && nullHandler != null) {
        renderer = renderersValue[nullHandler];
      }

      const res = renderer(value, itemValue, rendererOptions as any);
      res.classes = [column.fieldName, column.cssClass];
      return res;
    });

    if (props.addRowResetItem) {
      result.push(new RenderableValue({ componentName: 'span' }, 'df-grid-card-break-item'));
    }

    return result;
  });

  return { formattedData };
}
