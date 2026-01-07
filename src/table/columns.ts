import { filter, find, isArray, isEmpty, isNumber, isObject, isString } from 'lodash-es';
import { computed } from 'vue';

import { gridColumnCreate, RendererOptionsMap } from './cell-renderers';
import { CellOptionsInternal, columnIdOption, columnNameOption, gridIdOption } from './cell-renderers/internal-exports';
import { Sortable } from './columns-sorting';
import { GridProps } from './df-grid-types';

export interface ColumnDefinition<R extends keyof RendererOptionsMap = 'plain'> {
  fieldName: string;
  label: string;
  renderer?: R;
  rendererOptions?: RendererOptionsMap[R];
  sortable: Sortable;
  cssClass?: string | undefined;
}

export type AnyColumnDefinition = {
  [K in keyof RendererOptionsMap]: ColumnDefinition<K>
}[keyof RendererOptionsMap];

export function createColumn<R extends keyof RendererOptionsMap>(
  fieldName: string,
  label: string,
  renderer?: R,
  otherOptions?: Omit<ColumnDefinition, 'fieldName' | 'label' | 'renderer'>,
): ColumnDefinition<R> {
  const result = { fieldName, label, renderer, sortable: true, ...(otherOptions ?? {}) };

  // If renderer is 'header' and rendererOptions doesn't have sortState, add default
  if (renderer === 'header') {
    if (result.rendererOptions == null) result.rendererOptions = { };
    const opts = result.rendererOptions as any;
    if (opts.sortState === undefined) opts.sortState = { direction: undefined, index: undefined, sortable: true };
  }

  return result as ColumnDefinition<R>;
}

export type ColumnFilterSelectors = (number | string | { [key: string]: number })[];
export type ColumnDefinitionsList = ColumnDefinition<keyof RendererOptionsMap>[];

export interface ResponsiveColumnDefinition {
  name?: string;
  cssClass: string;
  columns: ColumnDefinitionsList;
}

export type ResponsiveColumnDefinitions = ColumnDefinitionsList | ResponsiveColumnDefinition[];

export function filterColumns(columns: ColumnDefinitionsList, selectors: ColumnFilterSelectors): ColumnDefinitionsList {
  return selectors.map((selector) => {
    if (isNumber(selector)) return columns[selector];
    if (isString(selector)) return find(columns, { fieldName: selector });
    if (isObject(selector)) {
      const [fieldName, occurrence] = Object.entries(selector)[0];
      return filter(columns, { fieldName })[occurrence];
    }
    return null;
  }).filter(Boolean) as ColumnDefinitionsList;
}

function isResponsiveDefinition(columns: ResponsiveColumnDefinitions): columns is ResponsiveColumnDefinition[] {
  if (!isArray(columns)) throw new Error('columns prop must be an array');

  const firstDefinition = columns[0];
  return (('name' in firstDefinition || 'cssClass' in firstDefinition) && 'columns' in firstDefinition);
}

const makeColumnRenderOptsInternal = (
  columns: ColumnDefinitionsList,
  gridId: symbol,
) => columns.map((column) => {
  const opt: CellOptionsInternal =
    (column.rendererOptions ?? { nullHandler: 'null-null' }) as CellOptionsInternal;
  opt[gridIdOption] = gridId;
  opt[columnNameOption] = column.fieldName;
  opt[columnIdOption] = Symbol('grid-column');

  gridColumnCreate(gridId, column.renderer as keyof RendererOptionsMap, opt);
  return { ...column, rendererOptions: opt };
});

export function useColumns(props: GridProps, gridId: symbol) {
  const builtColumns = computed(() => {
    if (isResponsiveDefinition(props.columns)) {
      return props.columns.map((cDef, idx) => {
        const ret = {
          name: cDef.name ?? cDef.cssClass,
          cssClass: cDef.cssClass,
          columns: cDef.columns,
          columnRenderOptsInternal: computed(() => makeColumnRenderOptsInternal(cDef.columns, gridId)),
        };
        if (!isString(ret.name) || isEmpty(ret.name)) {
          throw new Error(`column definition ${idx} must have a name or cssClasses assigned and non-empty`);
        }
        return ret;
      });
    }
    return [{
      name: 'default',
      cssClass: '',
      columns: props.columns,
      columnRenderOptsInternal: computed(
        () => makeColumnRenderOptsInternal(props.columns as ColumnDefinitionsList, gridId),
      ),
    }];
  });
  const actualActiveColumns = computed(() => props.activeColumns ?? builtColumns.value[0].name);
  const columns = computed(() => (
    builtColumns.value.find((c) => c.name === actualActiveColumns.value) ?? builtColumns.value[0]
  ));

  return {
    active: actualActiveColumns,
    builtColumns,
    activeColumnsDefinition: columns,

    name: computed(() => columns.value.name!),
    cssClass: computed(() => columns.value.cssClass),
    columns: computed(() => columns.value.columns),
  };
}
