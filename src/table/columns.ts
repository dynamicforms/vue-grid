import { RendererOptionsMap } from './cell-renderers';

export interface ColumnDefinition<R extends keyof RendererOptionsMap = 'plain'> {
  fieldName: string;
  label: string;
  renderer?: R;
  rendererOptions?: RendererOptionsMap[R];
  cssClass?: string;
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
  return { fieldName, label, renderer, ...(otherOptions ?? {}) };
}
