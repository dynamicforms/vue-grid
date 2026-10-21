import { createTranslatable } from '@dynamicforms/translatable';

export const { translate, translateStrings } = createTranslatable({
  Loading: 'Loading…',
  NoData: 'No data',
  FilterColumn: 'Filter {column}...',
  CancelSelectionMode: 'Cancel selection mode',
  InvertSelection: 'Invert selection',
  SelectionCountSelected: '{count} items selected',
  SelectionCountExcluded: '{count} items excluded',
  ActiveFilters: 'Active filters: {count}',
  RecordCount: '{count} records',
  RecordCountOfTotal: '{count} of {total} records',
  NullValue: 'null',
});
